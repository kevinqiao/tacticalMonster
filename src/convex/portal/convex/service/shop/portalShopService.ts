import { v } from "convex/values";

import { internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { internalMutation, internalQuery, mutation } from "../../_generated/server";
import { authedMutation, authedQuery } from "../../custom/session";
import { formatFaceValueDisplay } from "../../data/portalGiftCardEconomy";
import {
  mapPortalShopSkuRow,
  PORTAL_SHOP_SKU_CATALOG,
  resolveGrantTicketCount,
  type PortalShopSkuSeed,
} from "../../data/portalShopCatalog";
import {
  isPortalShopSkuVisibleForPartner,
  resolvePortalShopSessionPartnerId,
} from "../../data/portalShopPartner";
import { buildRedemptionProfileView } from "../giftcard/giftCardEligibility";
import { weeklyPeriodKey } from "../../utils/casualTaskPeriod";
import { defaultPortalPartnerShopSettings } from "../../data/portalPartnerShopSettings";
import { findResolvedShopSku, resolvePortalShopCatalog } from "./shopCatalogResolve";
import { getPlayerWalletBalances } from "../economy/portalWalletDao";
import { resolveEconomyScope } from "../economy/resolveEconomyScope";
import { loadPartnerShopSettings } from "./partnerShopSettings";

function catalogSeedForSkuId(skuId: string): PortalShopSkuSeed | undefined {
  return PORTAL_SHOP_SKU_CATALOG.find((c) => c.skuId === skuId);
}

function shopSkuDbPayload(s: PortalShopSkuSeed) {
  const grantTicketCount = resolveGrantTicketCount(s);
  return {
    skuId: s.skuId,
    title: s.title,
    description: s.description,
    priceCoins: s.priceCoins,
    grantTicketCount,
    grantCoinCount: Math.max(0, Math.floor(s.grantCoinCount ?? 0)),
    weeklyPurchaseLimit: s.weeklyPurchaseLimit,
    active: true,
    sortOrder: s.sortOrder,
    skuKind: s.skuKind ?? "virtual",
    stripePriceId: s.stripePriceId,
    priceCents: s.priceCents,
    currency: s.currency,
    region: s.region,
    faceValueUsd: s.faceValueUsd,
    faceValueLocal: s.faceValueLocal,
    faceValueCurrency: s.faceValueCurrency,
    tangoUtid: s.tangoUtid,
    brandName: s.brandName,
    brandLogoUrl: s.brandLogoUrl,
    scarcityMultiplier: s.scarcityMultiplier,
    minAccountAgeDays: s.minAccountAgeDays,
    requiresVerifiedContact: s.requiresVerifiedContact,
    shopSection: s.shopSection,
    partnerIds: s.partnerIds,
    voucherRewardText: s.voucherRewardText,
    voucherValidityDays: s.voucherValidityDays,
    listInShop: s.listInShop,
  };
}

function shopSkuPartnerIds(
  row: Doc<"portal_shop_skus">,
  cat?: PortalShopSkuSeed
): number[] | undefined {
  if (row.partnerIds != null) return row.partnerIds;
  return cat?.partnerIds;
}

function shopSkuVisibleForUid(row: Doc<"portal_shop_skus">, uid: string): boolean {
  const cat = catalogSeedForSkuId(row.skuId);
  const partnerIds = shopSkuPartnerIds(row, cat);
  return isPortalShopSkuVisibleForPartner(
    partnerIds,
    resolvePortalShopSessionPartnerId(uid)
  );
}

/** Keep partnerIds / listInShop for catalog resolve (mapPortalShopSkuRow drops them). */
function shopSkuSeedFromDbRow(r: Doc<"portal_shop_skus">): PortalShopSkuSeed {
  const cat = catalogSeedForSkuId(r.skuId);
  const grantTicketCount = resolveGrantTicketCount({
    grantTicketCount: r.grantTicketCount ?? cat?.grantTicketCount,
    grantReplayTokenCount: r.grantReplayTokenCount ?? cat?.grantReplayTokenCount,
  });
  return {
    skuId: r.skuId,
    // Shared catalog copy can be stale; the checked-in catalog owns its title.
    title: cat?.title ?? r.title,
    description: r.description ?? cat?.description,
    priceCoins: r.priceCoins,
    grantTicketCount,
    grantCoinCount: r.grantCoinCount ?? cat?.grantCoinCount ?? 0,
    weeklyPurchaseLimit: r.weeklyPurchaseLimit ?? cat?.weeklyPurchaseLimit,
    sortOrder: r.sortOrder,
    skuKind: r.skuKind ?? cat?.skuKind ?? "virtual",
    stripePriceId: r.stripePriceId ?? cat?.stripePriceId,
    priceCents: r.priceCents ?? cat?.priceCents,
    currency: r.currency ?? cat?.currency,
    region: r.region ?? cat?.region,
    faceValueUsd: r.faceValueUsd ?? cat?.faceValueUsd,
    faceValueLocal: r.faceValueLocal ?? cat?.faceValueLocal,
    faceValueCurrency: r.faceValueCurrency ?? cat?.faceValueCurrency,
    tangoUtid: r.tangoUtid ?? cat?.tangoUtid,
    brandName: r.brandName ?? cat?.brandName,
    brandLogoUrl: r.brandLogoUrl ?? cat?.brandLogoUrl,
    scarcityMultiplier: r.scarcityMultiplier ?? cat?.scarcityMultiplier,
    minAccountAgeDays: r.minAccountAgeDays ?? cat?.minAccountAgeDays,
    requiresVerifiedContact: r.requiresVerifiedContact ?? cat?.requiresVerifiedContact,
    shopSection: r.shopSection ?? cat?.shopSection,
    partnerIds: r.partnerIds ?? cat?.partnerIds,
    voucherRewardText: r.voucherRewardText ?? cat?.voucherRewardText,
    voucherValidityDays: r.voucherValidityDays ?? cat?.voucherValidityDays,
    listInShop: r.listInShop ?? cat?.listInShop,
  };
}

function masterSkus(rows: Doc<"portal_shop_skus">[]) {
  const byId = new Map(rows.map((row) => [row.skuId, row]));
  const shared = PORTAL_SHOP_SKU_CATALOG.map((seed) => ({
    ...seed,
    active: true,
    ...(byId.has(seed.skuId)
      ? { ...shopSkuSeedFromDbRow(byId.get(seed.skuId)!), title: seed.title }
      : {}),
  }));
  const sharedIds = new Set(PORTAL_SHOP_SKU_CATALOG.map((seed) => seed.skuId));
  const exclusive = rows
    .filter((row) => !sharedIds.has(row.skuId))
    .map((row) => ({ ...shopSkuSeedFromDbRow(row), active: row.active }));
  return [...shared, ...exclusive];
}

type ShopEconomyCtx = {
  partnerId: number;
  scopeKey: string;
  lobbyId: Id<"portal_lobbies"> | null;
  /** Lobby id used for assortment overlay (null = partner base only). */
  settingsLobbyId: Id<"portal_lobbies"> | null;
};

async function resolveShopEconomy(
  ctx: QueryCtx | MutationCtx,
  uid: string,
  lobbyId?: Id<"portal_lobbies"> | null
): Promise<ShopEconomyCtx> {
  const partnerId = resolvePortalShopSessionPartnerId(uid) ?? 0;
  try {
    const scope = await resolveEconomyScope(ctx, {
      partnerId,
      lobbyId: lobbyId ?? null,
    });
    return {
      partnerId,
      scopeKey: scope.scopeKey,
      lobbyId: scope.lobbyId,
      // Assortment overlay follows the join lobby even when wallet scope is shared
      // (e.g. crazygames solitaire: Free coins + gift cards only).
      settingsLobbyId: lobbyId ?? null,
    };
  } catch {
    // isolated without lobbyId — keep partner base catalog; wallet stays shared fallback
    // only for list; purchase should fail separately.
    return {
      partnerId,
      scopeKey: "shared",
      lobbyId: null,
      settingsLobbyId: lobbyId ?? null,
    };
  }
}

async function resolveForPartner(
  ctx: QueryCtx | MutationCtx,
  partnerId: number | null,
  rows: Doc<"portal_shop_skus">[],
  settingsLobbyId?: Id<"portal_lobbies"> | null
) {
  const settings =
    partnerId == null
      ? defaultPortalPartnerShopSettings(-1)
      : ((await loadPartnerShopSettings(ctx, partnerId, settingsLobbyId ?? null)) ??
        defaultPortalPartnerShopSettings(partnerId));
  return resolvePortalShopCatalog({
    partnerId,
    masterSkus: masterSkus(rows),
    settings,
  });
}

async function findWeeklyPurchaseCounter(
  ctx: QueryCtx | MutationCtx,
  uid: string,
  skuId: string,
  weekKey: string,
  scopeKey: string
) {
  if (scopeKey !== "shared") {
    return await ctx.db
      .query("portal_shop_weekly_purchase_counters")
      .withIndex("by_uid_scopeKey_sku_week", (q) =>
        q
          .eq("uid", uid)
          .eq("scopeKey", scopeKey)
          .eq("skuId", skuId)
          .eq("weekKey", weekKey)
      )
      .unique();
  }
  const rows = await ctx.db
    .query("portal_shop_weekly_purchase_counters")
    .withIndex("by_uid_sku_week", (q) =>
      q.eq("uid", uid).eq("skuId", skuId).eq("weekKey", weekKey)
    )
    .collect();
  return (
    rows.find((r) => r.scopeKey == null || r.scopeKey === "shared") ?? null
  );
}

async function listWeeklyCountersForUid(
  ctx: QueryCtx | MutationCtx,
  uid: string,
  weekKey: string,
  scopeKey: string
) {
  const rows = await ctx.db
    .query("portal_shop_weekly_purchase_counters")
    .withIndex("by_uid_week", (q) => q.eq("uid", uid).eq("weekKey", weekKey))
    .collect();
  if (scopeKey === "shared") {
    return rows.filter((r) => r.scopeKey == null || r.scopeKey === "shared");
  }
  return rows.filter((r) => r.scopeKey === scopeKey);
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
  args: {
    lobbyId: v.optional(v.id("portal_lobbies")),
  },
  handler: async (ctx, { lobbyId }) => {
    const econ = await resolveShopEconomy(ctx, ctx.uid, lobbyId ?? null);
    const rows = await ctx.db.query("portal_shop_skus").collect();
    const weekKey = weeklyPeriodKey(Date.now());
    const counters = await listWeeklyCountersForUid(
      ctx,
      ctx.uid,
      weekKey,
      econ.scopeKey
    );
    const countBySku = new Map(counters.map((c) => [c.skuId, c.count]));

    const player = await ctx.db
      .query("portal_players")
      .withIndex("by_uid", (q) => q.eq("uid", ctx.uid))
      .unique();
    const wallet = await getPlayerWalletBalances(ctx, ctx.uid, econ.scopeKey);

    const catalogRows = (
      await resolveForPartner(
        ctx,
        econ.partnerId,
        rows,
        econ.settingsLobbyId
      )
    ).map((sku) => mapPortalShopSkuRow(sku));

    return {
      coins: wallet.coins,
      scopeKey: econ.scopeKey,
      lobbyId: econ.lobbyId,
      redemptionProfile: buildRedemptionProfileView(player, { ok: true }),
      skus: catalogRows.map((mapped) => {
        const bought = countBySku.get(mapped.skuId) ?? 0;
        const limit = mapped.weeklyPurchaseLimit;
        return {
          ...mapped,
          purchasedThisWeek: bought,
          remainingThisWeek: limit != null ? Math.max(0, limit - bought) : null,
          locked: false,
          lockReason: null,
        };
      }),
    };
  },
});

async function recordWeeklyPurchase(
  ctx: MutationCtx,
  uid: string,
  skuId: string,
  now: number,
  scopeKey: string,
  lobbyId: Id<"portal_lobbies"> | null
) {
  const weekKey = weeklyPeriodKey(now);
  const row = await findWeeklyPurchaseCounter(ctx, uid, skuId, weekKey, scopeKey);
  if (row) {
    await ctx.db.patch(row._id, { count: row.count + 1, updatedAt: now });
  } else {
    await ctx.db.insert("portal_shop_weekly_purchase_counters", {
      uid,
      skuId,
      weekKey,
      count: 1,
      updatedAt: now,
      scopeKey,
      ...(lobbyId ? { lobbyId } : {}),
    });
  }
}

export const purchasePortalShopSku = authedMutation({
  args: {
    skuId: v.string(),
    lobbyId: v.optional(v.id("portal_lobbies")),
  },
  handler: async (ctx, { skuId, lobbyId }) => {
    const partnerId = resolvePortalShopSessionPartnerId(ctx.uid) ?? 0;
    let econ: ShopEconomyCtx;
    try {
      const scope = await resolveEconomyScope(ctx, {
        partnerId,
        lobbyId: lobbyId ?? null,
      });
      econ = {
        partnerId,
        scopeKey: scope.scopeKey,
        lobbyId: scope.lobbyId,
        settingsLobbyId: lobbyId ?? null,
      };
    } catch {
      return { ok: false as const, error: "lobby_required_for_isolated_economy" as const };
    }

    const rows = await ctx.db.query("portal_shop_skus").collect();
    const effective = await resolveForPartner(
      ctx,
      econ.partnerId,
      rows,
      econ.settingsLobbyId
    );
    const sku = findResolvedShopSku(effective, skuId);
    if (!sku) {
      return { ok: false as const, error: "sku_not_found" as const };
    }
    const row = sku;
    const skuKind = sku.skuKind ?? "virtual";
    if (skuKind === "iap") {
      return { ok: false as const, error: "iap_use_payment_provider" as const };
    }
    const now = Date.now();
    const weekKey = weeklyPeriodKey(now);
    const counter = await findWeeklyPurchaseCounter(
      ctx,
      ctx.uid,
      skuId,
      weekKey,
      econ.scopeKey
    );
    const bought = counter?.count ?? 0;
    if (sku.weeklyPurchaseLimit != null && bought >= sku.weeklyPurchaseLimit) {
      return { ok: false as const, error: "weekly_limit_reached" as const };
    }

    const player = await ctx.db
      .query("portal_players")
      .withIndex("by_uid", (q) => q.eq("uid", ctx.uid))
      .unique();

    const spendArgs = {
      uid: ctx.uid,
      amount: sku.priceCoins,
      scopeKey: econ.scopeKey,
      ...(econ.lobbyId ? { lobbyId: econ.lobbyId } : {}),
    };

    if (skuKind === "giftcard") {
      if (!row.tangoUtid || row.faceValueLocal == null || !row.faceValueCurrency || !row.region) {
        return { ok: false as const, error: "sku_not_configured" as const };
      }

      const spend = await ctx.runMutation(
        internal.service.reward.casualRewardRegistry.spendPortalCoins,
        { ...spendArgs, reason: `giftcard:${skuId}` }
      );
      if (!spend.ok) {
        return spend;
      }

      const orderId = `gc_${ctx.uid}_${now}_${skuId}`;
      await ctx.db.insert("portal_giftcard_orders", {
        orderId,
        uid: ctx.uid,
        skuId,
        region: row.region,
        priceCoins: sku.priceCoins,
        faceValueUsd: row.faceValueUsd ?? row.faceValueLocal,
        faceValueLocal: row.faceValueLocal,
        faceValueCurrency: row.faceValueCurrency,
        tangoUtid: row.tangoUtid,
        status: "pending",
        deliveryEmail: player?.verifiedEmail,
        attemptCount: 0,
        createdAt: now,
        scopeKey: econ.scopeKey,
        ...(econ.lobbyId ? { lobbyId: econ.lobbyId } : {}),
      });

      await recordWeeklyPurchase(
        ctx,
        ctx.uid,
        skuId,
        now,
        econ.scopeKey,
        econ.lobbyId
      );

      await ctx.scheduler.runAfter(
        0,
        internal.service.giftcard.giftCardFulfillmentAction.fulfillTangoGiftCardOrder,
        { orderId }
      );

      return {
        ok: true as const,
        skuKind: "giftcard" as const,
        orderId,
        status: "processing" as const,
        spentCoins: sku.priceCoins,
        faceValueDisplay: formatFaceValueDisplay(row.faceValueLocal, row.faceValueCurrency),
      };
    }

    if (skuKind === "voucher") {
      const spend = await ctx.runMutation(
        internal.service.reward.casualRewardRegistry.spendPortalCoins,
        { ...spendArgs, reason: `voucher:${skuId}` }
      );
      if (!spend.ok) return spend;
      const expiresAt =
        sku.voucherValidityDays != null && sku.voucherValidityDays > 0
          ? now + sku.voucherValidityDays * 24 * 60 * 60 * 1000
          : undefined;
      await ctx.runMutation(internal.service.backpack.portalBackpackService.grantBackpackVoucher, {
        uid: ctx.uid,
        skuId,
        title: sku.title,
        ...(sku.voucherRewardText ? { rewardText: sku.voucherRewardText } : {}),
        ...(expiresAt ? { expiresAt } : {}),
        ...(econ.partnerId != null ? { partnerId: econ.partnerId } : {}),
        source: `shop:${ctx.uid}:${now}:${skuId}`,
      });
      await recordWeeklyPurchase(
        ctx,
        ctx.uid,
        skuId,
        now,
        econ.scopeKey,
        econ.lobbyId
      );
      return {
        ok: true as const,
        skuKind: "voucher" as const,
        skuId,
        spentCoins: sku.priceCoins,
      };
    }

    const spend = await ctx.runMutation(
      internal.service.reward.casualRewardRegistry.spendPortalCoins,
      { ...spendArgs, reason: `shop:${skuId}` }
    );
    if (!spend.ok) {
      return spend;
    }

    const grantTicketCount = resolveGrantTicketCount(sku);
    if (grantTicketCount > 0) {
      const grant = await ctx.runMutation(
        internal.service.reward.casualRewardRegistry.grantPortalTickets,
        {
          uid: ctx.uid,
          amount: grantTicketCount,
          reason: `shop:${skuId}`,
          scopeKey: econ.scopeKey,
          ...(econ.lobbyId ? { lobbyId: econ.lobbyId } : {}),
        }
      );
      if (!grant.ok) {
        return grant;
      }
    }
    await recordWeeklyPurchase(
      ctx,
      ctx.uid,
      skuId,
      now,
      econ.scopeKey,
      econ.lobbyId
    );

    return {
      ok: true as const,
      skuKind: "virtual" as const,
      skuId,
      spentCoins: sku.priceCoins,
      grantTicketCount,
      grantReplayTokenCount: grantTicketCount,
    };
  },
});

export const syncPortalShopCatalogMutation = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.runMutation(internal.service.shop.portalShopService.syncPortalShopCatalog, {});
  },
});

/** Checkout prep for Stripe — resolved iap SKU + economy scope for the authed buyer. */
export const resolveIapCheckoutSkuInternal = internalQuery({
  args: {
    uid: v.string(),
    skuId: v.string(),
    lobbyId: v.optional(v.id("portal_lobbies")),
  },
  handler: async (ctx, { uid, skuId, lobbyId }) => {
    const partnerId = resolvePortalShopSessionPartnerId(uid) ?? 0;
    let econ: ShopEconomyCtx;
    try {
      const scope = await resolveEconomyScope(ctx, {
        partnerId,
        lobbyId: lobbyId ?? null,
      });
      econ = {
        partnerId,
        scopeKey: scope.scopeKey,
        lobbyId: scope.lobbyId,
        settingsLobbyId: lobbyId ?? null,
      };
    } catch {
      return { ok: false as const, error: "lobby_required_for_isolated_economy" as const };
    }

    const rows = await ctx.db.query("portal_shop_skus").collect();
    const effective = await resolveForPartner(
      ctx,
      econ.partnerId,
      rows,
      econ.settingsLobbyId
    );
    const sku = findResolvedShopSku(effective, skuId);
    if (!sku || (sku.skuKind ?? "virtual") !== "iap") {
      return { ok: false as const, error: "sku_not_found" as const };
    }
    const stripePriceId = sku.stripePriceId?.trim();
    if (!stripePriceId) {
      return { ok: false as const, error: "sku_not_configured" as const };
    }

    const now = Date.now();
    const weekKey = weeklyPeriodKey(now);
    const counter = await findWeeklyPurchaseCounter(
      ctx,
      uid,
      skuId,
      weekKey,
      econ.scopeKey
    );
    const bought = counter?.count ?? 0;
    if (sku.weeklyPurchaseLimit != null && bought >= sku.weeklyPurchaseLimit) {
      return { ok: false as const, error: "weekly_limit_reached" as const };
    }

    return {
      ok: true as const,
      skuId: sku.skuId,
      stripePriceId,
      title: sku.title,
      grantTicketCount: resolveGrantTicketCount(sku),
      grantCoinCount: Math.max(0, Math.floor(sku.grantCoinCount ?? 0)),
      scopeKey: econ.scopeKey,
      lobbyId: econ.lobbyId,
      partnerId: econ.partnerId,
    };
  },
});

function isIapOrderFulfilled(row: {
  status?: "pending" | "fulfilled" | "expired";
  fulfilledAt?: number;
}): boolean {
  if (row.status === "fulfilled") return true;
  if (row.status === "pending" || row.status === "expired") return false;
  // Legacy rows: no status, but fulfilledAt set.
  return row.fulfilledAt != null;
}

/** Checkout Session created → pending intent row (for funnel / 我的订单). */
export const recordPendingStripeCheckout = internalMutation({
  args: {
    paymentRef: v.string(),
    uid: v.string(),
    skuId: v.string(),
    scopeKey: v.string(),
    lobbyId: v.optional(v.id("portal_lobbies")),
    ticketsGranted: v.number(),
    coinsGranted: v.number(),
  },
  handler: async (ctx, args) => {
    const ref = args.paymentRef.trim();
    if (!ref) {
      return { ok: false as const, error: "iap_payment_ref_required" as const };
    }
    const existing = await ctx.db
      .query("portal_shop_iap_fulfillments")
      .withIndex("by_paymentRef", (q) => q.eq("paymentRef", ref))
      .unique();
    if (existing) {
      return { ok: true as const, duplicate: true as const };
    }
    const now = Date.now();
    await ctx.db.insert("portal_shop_iap_fulfillments", {
      paymentRef: ref,
      uid: args.uid,
      skuId: args.skuId,
      scopeKey: args.scopeKey,
      ...(args.lobbyId ? { lobbyId: args.lobbyId } : {}),
      ticketsGranted: Math.max(0, Math.floor(args.ticketsGranted)),
      coinsGranted: Math.max(0, Math.floor(args.coinsGranted)),
      status: "pending",
      createdAt: now,
    });
    return { ok: true as const, duplicate: false as const };
  },
});

/** Mark a pending Checkout intent as expired (session timed out / abandoned). */
export const expirePendingStripeCheckout = internalMutation({
  args: { paymentRef: v.string() },
  handler: async (ctx, { paymentRef }) => {
    const ref = paymentRef.trim();
    if (!ref) return { ok: false as const, error: "iap_payment_ref_required" as const };
    const row = await ctx.db
      .query("portal_shop_iap_fulfillments")
      .withIndex("by_paymentRef", (q) => q.eq("paymentRef", ref))
      .unique();
    if (!row) return { ok: true as const, missing: true as const };
    if (isIapOrderFulfilled(row)) {
      return { ok: true as const, alreadyFulfilled: true as const };
    }
    await ctx.db.patch(row._id, { status: "expired" });
    return { ok: true as const };
  },
});

/**
 * Stripe Checkout success → grant tickets + coins (no coin spend).
 * Idempotent on paymentRef (Checkout Session id). Upgrades pending → fulfilled.
 */
export const fulfillStripeShopPurchase = internalMutation({
  args: {
    paymentRef: v.string(),
    uid: v.string(),
    skuId: v.string(),
    scopeKey: v.string(),
    lobbyId: v.optional(v.id("portal_lobbies")),
  },
  handler: async (ctx, { paymentRef, uid, skuId, scopeKey, lobbyId }) => {
    const ref = paymentRef.trim();
    if (!ref) {
      return { ok: false as const, error: "iap_payment_ref_required" as const };
    }

    const existing = await ctx.db
      .query("portal_shop_iap_fulfillments")
      .withIndex("by_paymentRef", (q) => q.eq("paymentRef", ref))
      .unique();
    if (existing && isIapOrderFulfilled(existing)) {
      return {
        ok: true as const,
        duplicate: true as const,
        ticketsGranted: existing.ticketsGranted,
        coinsGranted: existing.coinsGranted,
      };
    }
    if (existing?.status === "expired") {
      return { ok: false as const, error: "order_expired" as const };
    }

    const seed = catalogSeedForSkuId(skuId);
    const dbRow = await ctx.db
      .query("portal_shop_skus")
      .withIndex("by_skuId", (q) => q.eq("skuId", skuId))
      .unique();
    const skuKind = dbRow?.skuKind ?? seed?.skuKind ?? "virtual";
    if (skuKind !== "iap") {
      return { ok: false as const, error: "iap_sku_only" as const };
    }
    if (dbRow && dbRow.active === false) {
      return { ok: false as const, error: "sku_unavailable" as const };
    }

    const ticketsGranted = resolveGrantTicketCount({
      grantTicketCount: dbRow?.grantTicketCount ?? seed?.grantTicketCount,
      grantReplayTokenCount: dbRow?.grantReplayTokenCount ?? seed?.grantReplayTokenCount,
    });
    const coinsGranted = Math.max(
      0,
      Math.floor(dbRow?.grantCoinCount ?? seed?.grantCoinCount ?? 0)
    );
    if (ticketsGranted <= 0 && coinsGranted <= 0) {
      return { ok: false as const, error: "iap_grant_zero" as const };
    }

    if (ticketsGranted > 0) {
      const grant = await ctx.runMutation(
        internal.service.reward.casualRewardRegistry.grantPortalTickets,
        {
          uid,
          amount: ticketsGranted,
          reason: `stripe:${skuId}`,
          scopeKey,
          ...(lobbyId ? { lobbyId } : {}),
        }
      );
      if (!grant.ok) return grant;
    }
    if (coinsGranted > 0) {
      const grant = await ctx.runMutation(
        internal.service.reward.casualRewardRegistry.grantCasualReward,
        {
          uid,
          kind: "coins" as const,
          amount: coinsGranted,
          reason: `stripe:${skuId}`,
          scopeKey,
          ...(lobbyId ? { lobbyId } : {}),
        }
      );
      if (!grant.ok) return grant;
    }

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "fulfilled",
        ticketsGranted,
        coinsGranted,
        fulfilledAt: now,
        createdAt: existing.createdAt ?? now,
        scopeKey,
        ...(lobbyId ? { lobbyId } : {}),
      });
    } else {
      await ctx.db.insert("portal_shop_iap_fulfillments", {
        paymentRef: ref,
        uid,
        skuId,
        scopeKey,
        ...(lobbyId ? { lobbyId } : {}),
        ticketsGranted,
        coinsGranted,
        status: "fulfilled",
        createdAt: now,
        fulfilledAt: now,
      });
    }
    await recordWeeklyPurchase(ctx, uid, skuId, now, scopeKey, lobbyId ?? null);

    return {
      ok: true as const,
      duplicate: false as const,
      ticketsGranted,
      coinsGranted,
    };
  },
});
