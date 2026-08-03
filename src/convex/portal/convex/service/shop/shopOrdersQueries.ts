import { v } from "convex/values";

import { authedQuery } from "../../custom/session";
import { formatFaceValueDisplay } from "../../data/portalGiftCardEconomy";
import { PORTAL_SHOP_SKU_CATALOG } from "../../data/portalShopCatalog";

/**
 * Unified shop order history: gift cards + Stripe iap packs.
 * Sorted by created/fulfilled time descending.
 */
export const listMyShopOrders = authedQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const cap = Math.min(Math.max(limit ?? 30, 1), 50);
    const uid = ctx.uid;

    const giftRows = await ctx.db
      .query("portal_giftcard_orders")
      .withIndex("by_uid_created", (q) => q.eq("uid", uid))
      .order("desc")
      .take(cap);

    // Prefer createdAt index (pending + fulfilled). Merge legacy rows that only have fulfilledAt.
    const iapByCreated = await ctx.db
      .query("portal_shop_iap_fulfillments")
      .withIndex("by_uid_createdAt", (q) => q.eq("uid", uid))
      .order("desc")
      .take(cap);
    const iapLegacy = await ctx.db
      .query("portal_shop_iap_fulfillments")
      .withIndex("by_uid_fulfilledAt", (q) => q.eq("uid", uid))
      .order("desc")
      .take(cap);
    const iapByRef = new Map<string, (typeof iapByCreated)[number]>();
    for (const row of [...iapByCreated, ...iapLegacy]) {
      if (!iapByRef.has(row.paymentRef)) iapByRef.set(row.paymentRef, row);
    }
    const iapRows = [...iapByRef.values()]
      .sort(
        (a, b) =>
          (b.createdAt ?? b.fulfilledAt ?? 0) - (a.createdAt ?? a.fulfilledAt ?? 0)
      )
      .slice(0, cap);

    const skuCache = new Map<
      string,
      {
        title: string;
        brandName?: string;
        priceCents?: number;
        currency?: string;
      }
    >();
    async function skuMeta(skuId: string) {
      let meta = skuCache.get(skuId);
      if (meta) return meta;
      const row = await ctx.db
        .query("portal_shop_skus")
        .withIndex("by_skuId", (q) => q.eq("skuId", skuId))
        .unique();
      const seed = PORTAL_SHOP_SKU_CATALOG.find((s) => s.skuId === skuId);
      meta = {
        title: row?.title ?? seed?.title ?? skuId,
        brandName: row?.brandName ?? seed?.brandName,
        priceCents: row?.priceCents ?? seed?.priceCents,
        currency: row?.currency ?? seed?.currency,
      };
      skuCache.set(skuId, meta);
      return meta;
    }

    const now = Date.now();
    const giftOrders = await Promise.all(
      giftRows.map(async (o) => {
        const meta = await skuMeta(o.skuId);
        const linkCached =
          Boolean(o.rewardLink) &&
          (o.rewardLinkExpiresAt == null || o.rewardLinkExpiresAt > now);
        return {
          orderKind: "giftcard" as const,
          orderId: o.orderId,
          skuId: o.skuId,
          title: meta.title,
          brandName: meta.brandName,
          faceValueDisplay: formatFaceValueDisplay(o.faceValueLocal, o.faceValueCurrency),
          priceCoins: o.priceCoins,
          status: o.status,
          failureReason: o.failureReason,
          createdAt: o.createdAt,
          fulfilledAt: o.fulfilledAt,
          canRedeem: o.status === "fulfilled",
          canResendEmail: o.status === "fulfilled" && Boolean(o.deliveryEmail),
          hasCachedLink: linkCached,
        };
      })
    );

    const iapOrders = await Promise.all(
      iapRows.map(async (o) => {
        const meta = await skuMeta(o.skuId);
        const seed = PORTAL_SHOP_SKU_CATALOG.find((s) => s.skuId === o.skuId);
        const status =
          o.status ?? (o.fulfilledAt != null ? ("fulfilled" as const) : ("pending" as const));
        const createdAt = o.createdAt ?? o.fulfilledAt ?? 0;
        return {
          orderKind: "iap" as const,
          orderId: o.paymentRef,
          skuId: o.skuId,
          title: meta.title,
          status,
          createdAt,
          fulfilledAt: o.fulfilledAt,
          grantTicketCount: o.ticketsGranted,
          grantCoinCount: o.coinsGranted,
          priceCents: meta.priceCents ?? seed?.priceCents,
          currency: meta.currency ?? seed?.currency,
          canRedeem: false,
          canResendEmail: false,
          hasCachedLink: false,
        };
      })
    );

    const orders = [...giftOrders, ...iapOrders]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, cap);

    return { orders };
  },
});
