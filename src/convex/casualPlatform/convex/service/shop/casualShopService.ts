import { v } from "convex/values";
import { internal } from "../../_generated/api";
import {
  CASUAL_SHOP_SKU_CATALOG,
  mapCasualShopSkuRow,
  type CasualShopSkuSeed,
} from "../../data/casualShopCatalog";
import { grantReplayTokens } from "../tournament/replay/casualReplayTokens";
import { applyScaledCurrencyCost } from "../../data/casualTournamentConfigs";
import type { Doc } from "../../_generated/dataModel";
import { internalMutation, mutation, query, type MutationCtx } from "../../_generated/server";

function catalogSeedForSkuId(skuId: string): CasualShopSkuSeed | undefined {
  return CASUAL_SHOP_SKU_CATALOG.find((c) => c.skuId === skuId);
}

async function insertShopSkuFromSeed(ctx: MutationCtx, s: CasualShopSkuSeed) {
  await ctx.db.insert("casual_shop_skus", {
    skuId: s.skuId,
    title: s.title,
    skuKind: s.skuKind ?? "virtual",
    iapPriceLabel: s.iapPriceLabel,
    priceCoins: s.priceCoins,
    priceGems: s.priceGems,
    grantCoins: s.grantCoins,
    grantGems: s.grantGems,
    grantSkinId: s.grantSkinId,
    grantReplayTokenCount: s.grantReplayTokenCount,
    active: true,
  });
}

function shopSkuFromDbRow(r: Doc<"casual_shop_skus">) {
  const cat = catalogSeedForSkuId(r.skuId);
  return mapCasualShopSkuRow({
    skuId: r.skuId,
    title: r.title,
    skuKind: r.skuKind ?? cat?.skuKind ?? "virtual",
    iapPriceLabel: r.iapPriceLabel ?? cat?.iapPriceLabel,
    priceCoins: r.priceCoins ?? cat?.priceCoins,
    priceGems: r.priceGems ?? cat?.priceGems,
    grantCoins: r.grantCoins ?? cat?.grantCoins,
    grantGems: r.grantGems ?? cat?.grantGems,
    grantSkinId: r.grantSkinId ?? cat?.grantSkinId,
    grantReplayTokenCount: r.grantReplayTokenCount ?? cat?.grantReplayTokenCount,
  });
}

/** DB 已有旧种子时，把配表里缺失的 SKU（如再战令）补进 `casual_shop_skus`。 */
async function ensureShopCatalogInDb(ctx: MutationCtx) {
  let inserted = 0;
  const any = await ctx.db.query("casual_shop_skus").first();
  if (!any) {
    for (const s of CASUAL_SHOP_SKU_CATALOG) {
      await insertShopSkuFromSeed(ctx, s);
      inserted++;
    }
    return { ok: true as const, seeded: true as const, inserted };
  }
  for (const s of CASUAL_SHOP_SKU_CATALOG) {
    const existing = await ctx.db
      .query("casual_shop_skus")
      .withIndex("by_skuId", (q) => q.eq("skuId", s.skuId))
      .unique();
    if (!existing) {
      await insertShopSkuFromSeed(ctx, s);
      inserted++;
    }
  }
  return { ok: true as const, seeded: inserted > 0, inserted };
}

export const listActiveShopSkus = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("casual_shop_skus").collect();
    const active = rows.filter((r) => r.active);
    const seen = new Set<string>();
    const out = [];
    for (const r of active) {
      seen.add(r.skuId);
      out.push(shopSkuFromDbRow(r));
    }
    for (const c of CASUAL_SHOP_SKU_CATALOG) {
      if (!seen.has(c.skuId)) {
        out.push(mapCasualShopSkuRow(c));
      }
    }
    if (out.length > 0) return out;
    return CASUAL_SHOP_SKU_CATALOG.map(mapCasualShopSkuRow);
  },
});

/** 开发/运营：把配表中新 SKU 写入 DB（幂等，仅补缺）。 */
export const syncShopCatalogSkus = mutation({
  args: {},
  handler: async (ctx) => ensureShopCatalogInDb(ctx),
});

export const seedShopSkusIfEmpty = internalMutation({
  args: {},
  handler: async (ctx) => ensureShopCatalogInDb(ctx),
});

export const purchaseSku = mutation({
  args: { uid: v.string(), skuId: v.string() },
  handler: async (ctx, { uid, skuId }) => {
    await ctx.runMutation(internal.service.shop.casualShopService.seedShopSkusIfEmpty, {});
    const sku = await ctx.db
      .query("casual_shop_skus")
      .withIndex("by_skuId", (q) => q.eq("skuId", skuId))
      .unique();
    if (!sku || !sku.active) {
      return { ok: false as const, error: "sku_unavailable" };
    }
    if (sku.skuKind === "iap") {
      return { ok: false as const, error: "iap_use_payment_provider" };
    }
    const paysSoftCurrency = sku.priceCoins != null || sku.priceGems != null;
    if ((sku.grantGems ?? 0) > 0 && paysSoftCurrency) {
      return { ok: false as const, error: "gems_grant_requires_fiat" };
    }
    const spendsCoins = sku.priceCoins != null && sku.priceCoins > 0;
    if (spendsCoins && (sku.grantCoins ?? 0) > 0) {
      return { ok: false as const, error: "coin_for_coin_shop_disabled" };
    }
    const player = await ctx.runQuery(internal.dao.casualPlayerDao.findByUid, { uid });
    if (!player) return { ok: false as const, error: "no_player" };

    const modifiers = await ctx.runQuery(
      internal.service.activity.casualActivityService.resolveSeasonActivityModifiers,
      { shopSkuId: skuId }
    );
    let priceCoins = sku.priceCoins;
    let priceGems = sku.priceGems;
    if (priceCoins != null) {
      priceCoins = applyScaledCurrencyCost(
        priceCoins,
        modifiers.coinsCostMultiplier,
        modifiers.coinsCostDelta
      );
    }
    if (priceGems != null) {
      priceGems = applyScaledCurrencyCost(
        priceGems,
        modifiers.gemsCostMultiplier,
        modifiers.gemsCostDelta
      );
    }

    if (sku.skuKind === "skin" && sku.grantSkinId) {
      const pcSkin = player.coins ?? 0;
      const pgSkin = player.gems ?? 0;
      if (priceGems != null && pgSkin < priceGems) {
        return { ok: false as const, error: "insufficient_gems" };
      }
      if (priceCoins != null && pcSkin < priceCoins) {
        return { ok: false as const, error: "insufficient_coins" };
      }
      await ctx.runMutation(internal.dao.casualPlayerDao.patchByUid, {
        uid,
        coins: priceCoins != null ? pcSkin - priceCoins : pcSkin,
        gems: priceGems != null ? pgSkin - priceGems : pgSkin,
      });
      const gr = await ctx.runMutation(internal.service.reward.casualRewardRegistry.grantCasualReward, {
        uid,
        kind: "skin",
        amount: 0,
        skinId: sku.grantSkinId,
        source: "shop",
      });
      if (!gr.ok) return { ok: false as const, error: "skin_grant_failed" };
      return { ok: true as const, activityIds: modifiers.activityIds };
    }

    const pc = player.coins ?? 0;
    const pg = player.gems ?? 0;
    if (priceCoins != null && pc < priceCoins) {
      return { ok: false as const, error: "insufficient_coins" };
    }
    if (priceGems != null && pg < priceGems) {
      return { ok: false as const, error: "insufficient_gems" };
    }
    let nextCoins = pc;
    let nextGems = pg;
    if (priceCoins != null) nextCoins -= priceCoins;
    if (priceGems != null) nextGems -= priceGems;
    await ctx.runMutation(internal.dao.casualPlayerDao.patchByUid, {
      uid,
      coins: nextCoins,
      gems: nextGems,
    });
    if (sku.grantCoins && sku.grantCoins > 0) {
      await ctx.runMutation(internal.service.reward.casualRewardRegistry.grantCasualReward, {
        uid,
        kind: "coins",
        amount: sku.grantCoins,
      });
    }
    if (sku.grantGems && sku.grantGems > 0) {
      await ctx.runMutation(internal.service.reward.casualRewardRegistry.grantCasualReward, {
        uid,
        kind: "gems",
        amount: sku.grantGems,
      });
    }
    const catalogRow = CASUAL_SHOP_SKU_CATALOG.find((s) => s.skuId === skuId);
    const replayGrant =
      sku.grantReplayTokenCount ?? catalogRow?.grantReplayTokenCount ?? 0;
    if (replayGrant > 0) {
      await grantReplayTokens(ctx, uid, replayGrant);
    }
    return { ok: true as const, activityIds: modifiers.activityIds };
  },
});

/**
 * 法币 IAP 成功后发放钻石（须带支付渠道唯一 paymentRef 幂等）。
 * 活动：`casual_shop_sku` / `global` 命中下对 `grantGems` 基数应用 `iapGrantGemsMultiplier`（连乘）与 `iapGrantGemsDelta`（求和），再 `floor(base×mult+delta)`。
 */
export const fulfillIapShopPurchase = mutation({
  args: {
    uid: v.string(),
    skuId: v.string(),
    paymentRef: v.string(),
  },
  handler: async (ctx, { uid, skuId, paymentRef }) => {
    await ctx.runMutation(internal.service.shop.casualShopService.seedShopSkusIfEmpty, {});
    if (!paymentRef.trim()) {
      return { ok: false as const, error: "iap_payment_ref_required" };
    }
    const dup = await ctx.db
      .query("casual_shop_iap_fulfillments")
      .withIndex("by_paymentRef", (q) => q.eq("paymentRef", paymentRef))
      .unique();
    if (dup) {
      return { ok: false as const, error: "iap_duplicate_payment_ref" };
    }

    const sku = await ctx.db
      .query("casual_shop_skus")
      .withIndex("by_skuId", (q) => q.eq("skuId", skuId))
      .unique();
    if (!sku || !sku.active) {
      return { ok: false as const, error: "sku_unavailable" };
    }
    if (sku.skuKind !== "iap") {
      return { ok: false as const, error: "iap_sku_only" };
    }
    const baseGems = sku.grantGems ?? 0;
    if (baseGems <= 0) {
      return { ok: false as const, error: "iap_no_grant_gems" };
    }

    const player = await ctx.runQuery(internal.dao.casualPlayerDao.findByUid, { uid });
    if (!player) return { ok: false as const, error: "no_player" };

    const modifiers = await ctx.runQuery(
      internal.service.activity.casualActivityService.resolveSeasonActivityModifiers,
      { shopSkuId: skuId }
    );
    const gemsGranted = applyScaledCurrencyCost(
      baseGems,
      modifiers.iapGrantGemsMultiplier,
      modifiers.iapGrantGemsDelta
    );
    if (gemsGranted <= 0) {
      return { ok: false as const, error: "iap_grant_zero" };
    }

    await ctx.runMutation(internal.service.reward.casualRewardRegistry.grantCasualReward, {
      uid,
      kind: "gems",
      amount: gemsGranted,
    });
    await ctx.db.insert("casual_shop_iap_fulfillments", {
      paymentRef,
      uid,
      skuId,
      gemsGranted,
      activityIdsJson:
        modifiers.activityIds.length > 0 ? JSON.stringify(modifiers.activityIds) : undefined,
      fulfilledAt: Date.now(),
    });

    return {
      ok: true as const,
      gemsGranted,
      baseGems,
      activityIds: modifiers.activityIds,
    };
  },
});
