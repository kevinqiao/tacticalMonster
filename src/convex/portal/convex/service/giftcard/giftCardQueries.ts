import { v } from "convex/values";

import { authedMutation, authedQuery } from "../../custom/session";
import { formatFaceValueDisplay } from "../../data/portalGiftCardEconomy";
import {
  buildRedemptionProfileView,
  canChangeRedemptionRegion,
  isValidRedemptionRegion,
} from "./giftCardEligibility";

export const syncRedemptionProfile = authedMutation({
  args: {
    verifiedEmail: v.optional(v.string()),
    verifiedPhone: v.optional(v.string()),
    redemptionRegion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let player = await ctx.db
      .query("portal_players")
      .withIndex("by_uid", (q) => q.eq("uid", ctx.uid))
      .unique();

    if (!player) {
      const id = await ctx.db.insert("portal_players", {
        uid: ctx.uid,
        createdAt: now,
        updatedAt: now,
      });
      player = (await ctx.db.get(id))!;
    }

    const patch: Record<string, unknown> = {
      updatedAt: now,
      redemptionProfileSyncedAt: now,
    };

    const email = args.verifiedEmail?.trim();
    const phone = args.verifiedPhone?.trim();
    if (email) {
      patch.verifiedEmail = email;
      patch.contactVerifiedAt = now;
    }
    if (phone) {
      patch.verifiedPhone = phone;
      patch.contactVerifiedAt = now;
    }

    const region = args.redemptionRegion?.trim().toUpperCase();
    if (region) {
      if (!isValidRedemptionRegion(region)) {
        return { ok: false as const, error: "invalid_region" as const };
      }
      if (player.redemptionRegion && player.redemptionRegion !== region) {
        if (!canChangeRedemptionRegion(player, now)) {
          return { ok: false as const, error: "region_locked" as const };
        }
      }
      if (!player.redemptionRegion) {
        patch.redemptionRegion = region;
        patch.redemptionRegionLockedAt = now;
      }
    }

    if (!player.createdAt) {
      patch.createdAt = player.updatedAt ?? now;
    }

    await ctx.db.patch(player._id, patch);

    const updated = await ctx.db.get(player._id);
    return {
      ok: true as const,
      profile: buildRedemptionProfileView(updated, { ok: true }, now),
    };
  },
});

export const listMyGiftCardOrders = authedQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const cap = Math.min(Math.max(limit ?? 20, 1), 50);
    const rows = await ctx.db
      .query("portal_giftcard_orders")
      .withIndex("by_uid_created", (q) => q.eq("uid", ctx.uid))
      .order("desc")
      .take(cap);

    const skuCache = new Map<string, { title: string; brandName?: string }>();
    return {
      orders: await Promise.all(
        rows.map(async (o) => {
          let meta = skuCache.get(o.skuId);
          if (!meta) {
            const sku = await ctx.db
              .query("portal_shop_skus")
              .withIndex("by_skuId", (q) => q.eq("skuId", o.skuId))
              .unique();
            meta = { title: sku?.title ?? o.skuId, brandName: sku?.brandName };
            skuCache.set(o.skuId, meta);
          }
          const faceValueDisplay = formatFaceValueDisplay(o.faceValueLocal, o.faceValueCurrency);
          const now = Date.now();
          const linkCached =
            Boolean(o.rewardLink) &&
            (o.rewardLinkExpiresAt == null || o.rewardLinkExpiresAt > now);
          return {
            orderId: o.orderId,
            skuId: o.skuId,
            title: meta.title,
            brandName: meta.brandName,
            faceValueDisplay,
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
      ),
    };
  },
});

export const getGiftCardRedemption = authedQuery({
  args: { orderId: v.string() },
  handler: async (ctx, { orderId }) => {
    const order = await ctx.db
      .query("portal_giftcard_orders")
      .withIndex("by_orderId", (q) => q.eq("orderId", orderId))
      .unique();
    if (!order || order.uid !== ctx.uid) {
      return { ok: false as const, error: "not_found" as const };
    }
    if (order.status !== "fulfilled") {
      return { ok: false as const, error: "not_ready" as const };
    }

    const now = Date.now();
    if (
      order.rewardLink &&
      (order.rewardLinkExpiresAt == null || order.rewardLinkExpiresAt > now)
    ) {
      return {
        ok: true as const,
        rewardLink: order.rewardLink,
        expiresAt: order.rewardLinkExpiresAt ?? null,
      };
    }

    return { ok: true as const, needsRefresh: true as const };
  },
});

export const getRedemptionProfile = authedQuery({
  args: {},
  handler: async (ctx) => {
    const player = await ctx.db
      .query("portal_players")
      .withIndex("by_uid", (q) => q.eq("uid", ctx.uid))
      .unique();
    return buildRedemptionProfileView(player, { ok: true });
  },
});
