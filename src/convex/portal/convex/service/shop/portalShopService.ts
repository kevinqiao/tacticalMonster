import { v } from "convex/values";

import { internal } from "../../_generated/api";
import type { Doc } from "../../_generated/dataModel";
import { internalMutation, mutation } from "../../_generated/server";
import { authedMutation, authedQuery } from "../../custom/session";
import {
  mapPortalShopSkuRow,
  PORTAL_SHOP_SKU_CATALOG,
  type PortalShopSkuSeed,
} from "../../data/portalShopCatalog";
import { weeklyPeriodKey } from "../../utils/casualTaskPeriod";
import { grantReplayTokens } from "../tournament/replay/casualReplayTokens";

function catalogSeedForSkuId(skuId: string): PortalShopSkuSeed | undefined {
  return PORTAL_SHOP_SKU_CATALOG.find((c) => c.skuId === skuId);
}

function shopSkuDbPayload(s: PortalShopSkuSeed) {
  return {
    skuId: s.skuId,
    title: s.title,
    description: s.description,
    priceCoins: s.priceCoins,
    grantReplayTokenCount: s.grantReplayTokenCount,
    weeklyPurchaseLimit: s.weeklyPurchaseLimit,
    active: true,
    sortOrder: s.sortOrder,
  };
}

function shopSkuFromDbRow(r: Doc<"portal_shop_skus">) {
  const cat = catalogSeedForSkuId(r.skuId);
  return mapPortalShopSkuRow({
    skuId: r.skuId,
    title: r.title,
    description: r.description ?? cat?.description,
    priceCoins: r.priceCoins,
    grantReplayTokenCount: r.grantReplayTokenCount ?? cat?.grantReplayTokenCount,
    weeklyPurchaseLimit: r.weeklyPurchaseLimit ?? cat?.weeklyPurchaseLimit,
    sortOrder: r.sortOrder,
  });
}

export const syncPortalShopCatalog = internalMutation({
  args: {},
  handler: async (ctx) => {
    let upserted = 0;
    for (const seed of PORTAL_SHOP_SKU_CATALOG) {
      const existing = await ctx.db
        .query("portal_shop_skus")
        .withIndex("by_skuId", (q) => q.eq("skuId", seed.skuId))
        .unique();
      const payload = shopSkuDbPayload(seed);
      if (existing) {
        await ctx.db.patch(existing._id, payload);
      } else {
        await ctx.db.insert("portal_shop_skus", payload);
      }
      upserted += 1;
    }
    return { upserted };
  },
});

export const listPortalShopSkus = authedQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("portal_shop_skus").collect();
    const active = rows
      .filter((r) => r.active)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.skuId.localeCompare(b.skuId));
    const weekKey = weeklyPeriodKey(Date.now());
    const counters = await ctx.db
      .query("portal_shop_weekly_purchase_counters")
      .withIndex("by_uid_week", (q) => q.eq("uid", ctx.uid).eq("weekKey", weekKey))
      .collect();
    const countBySku = new Map(counters.map((c) => [c.skuId, c.count]));

    const player = await ctx.db
      .query("portal_players")
      .withIndex("by_uid", (q) => q.eq("uid", ctx.uid))
      .unique();

    const catalogRows =
      active.length > 0
        ? active.map((r) => shopSkuFromDbRow(r))
        : PORTAL_SHOP_SKU_CATALOG.map((s) => mapPortalShopSkuRow(s));

    return {
      coins: player?.coins ?? 0,
      skus: catalogRows.map((mapped) => {
        const bought = countBySku.get(mapped.skuId) ?? 0;
        const limit = mapped.weeklyPurchaseLimit;
        return {
          ...mapped,
          purchasedThisWeek: bought,
          remainingThisWeek: limit != null ? Math.max(0, limit - bought) : null,
        };
      }),
    };
  },
});

async function recordWeeklyPurchase(
  ctx: Parameters<typeof purchasePortalShopSku.handler>[0],
  uid: string,
  skuId: string,
  now: number
) {
  const weekKey = weeklyPeriodKey(now);
  const row = await ctx.db
    .query("portal_shop_weekly_purchase_counters")
    .withIndex("by_uid_sku_week", (q) =>
      q.eq("uid", uid).eq("skuId", skuId).eq("weekKey", weekKey)
    )
    .unique();
  if (row) {
    await ctx.db.patch(row._id, { count: row.count + 1, updatedAt: now });
  } else {
    await ctx.db.insert("portal_shop_weekly_purchase_counters", {
      uid,
      skuId,
      weekKey,
      count: 1,
      updatedAt: now,
    });
  }
}

export const purchasePortalShopSku = authedMutation({
  args: { skuId: v.string() },
  handler: async (ctx, { skuId }) => {
    await ctx.runMutation(internal.service.shop.portalShopService.syncPortalShopCatalog, {});
    const row = await ctx.db
      .query("portal_shop_skus")
      .withIndex("by_skuId", (q) => q.eq("skuId", skuId))
      .unique();
    if (!row?.active) {
      return { ok: false as const, error: "sku_not_found" as const };
    }
    const sku = shopSkuFromDbRow(row);
    const now = Date.now();
    const weekKey = weeklyPeriodKey(now);
    const counter = await ctx.db
      .query("portal_shop_weekly_purchase_counters")
      .withIndex("by_uid_sku_week", (q) =>
        q.eq("uid", ctx.uid).eq("skuId", skuId).eq("weekKey", weekKey)
      )
      .unique();
    const bought = counter?.count ?? 0;
    if (sku.weeklyPurchaseLimit != null && bought >= sku.weeklyPurchaseLimit) {
      return { ok: false as const, error: "weekly_limit_reached" as const };
    }

    const spend = await ctx.runMutation(internal.service.reward.casualRewardRegistry.spendPortalCoins, {
      uid: ctx.uid,
      amount: sku.priceCoins,
      reason: `shop:${skuId}`,
    });
    if (!spend.ok) {
      return spend;
    }

    if ((sku.grantReplayTokenCount ?? 0) > 0) {
      await grantReplayTokens(ctx, ctx.uid, sku.grantReplayTokenCount!);
    }
    await recordWeeklyPurchase(ctx, ctx.uid, skuId, now);

    return {
      ok: true as const,
      skuId,
      spentCoins: sku.priceCoins,
      grantReplayTokenCount: sku.grantReplayTokenCount ?? 0,
    };
  },
});

export const syncPortalShopCatalogMutation = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.runMutation(internal.service.shop.portalShopService.syncPortalShopCatalog, {});
  },
});
