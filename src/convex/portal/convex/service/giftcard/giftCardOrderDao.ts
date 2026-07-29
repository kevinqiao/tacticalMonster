import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { internalMutation, internalQuery } from "../../_generated/server";
import { PORTAL_GIFTCARD_REWARD_LINK_CACHE_MS } from "../../data/portalGiftCardEconomy";

export const getOrderByOrderId = internalQuery({
  args: { orderId: v.string() },
  handler: async (ctx, { orderId }) => {
    return await ctx.db
      .query("portal_giftcard_orders")
      .withIndex("by_orderId", (q) => q.eq("orderId", orderId))
      .unique();
  },
});

export const markOrderProcessing = internalMutation({
  args: { orderId: v.string() },
  handler: async (ctx, { orderId }) => {
    const row = await ctx.db
      .query("portal_giftcard_orders")
      .withIndex("by_orderId", (q) => q.eq("orderId", orderId))
      .unique();
    if (!row || row.status !== "pending") return { ok: false as const };
    const now = Date.now();
    await ctx.db.patch(row._id, {
      status: "processing",
      attemptCount: row.attemptCount + 1,
      lastAttemptAt: now,
    });
    return { ok: true as const };
  },
});

export const markOrderFulfilled = internalMutation({
  args: {
    orderId: v.string(),
    tangoReferenceOrderId: v.string(),
    tangoOrderId: v.optional(v.string()),
    rewardLink: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("portal_giftcard_orders")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .unique();
    if (!row || row.status === "fulfilled" || row.status === "refunded") {
      return { ok: false as const };
    }
    const now = Date.now();
    await ctx.db.patch(row._id, {
      status: "fulfilled",
      tangoReferenceOrderId: args.tangoReferenceOrderId,
      tangoOrderId: args.tangoOrderId,
      rewardLink: args.rewardLink,
      rewardLinkExpiresAt: args.rewardLink
        ? now + PORTAL_GIFTCARD_REWARD_LINK_CACHE_MS
        : undefined,
      fulfilledAt: now,
    });
    return { ok: true as const };
  },
});

export const cacheOrderRewardLink = internalMutation({
  args: {
    orderId: v.string(),
    rewardLink: v.string(),
  },
  handler: async (ctx, { orderId, rewardLink }) => {
    const row = await ctx.db
      .query("portal_giftcard_orders")
      .withIndex("by_orderId", (q) => q.eq("orderId", orderId))
      .unique();
    if (!row) return { ok: false as const };
    const now = Date.now();
    await ctx.db.patch(row._id, {
      rewardLink,
      rewardLinkExpiresAt: now + PORTAL_GIFTCARD_REWARD_LINK_CACHE_MS,
    });
    return { ok: true as const };
  },
});

export const failOrderAndRefund = internalMutation({
  args: {
    orderId: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, { orderId, reason }) => {
    const row = await ctx.db
      .query("portal_giftcard_orders")
      .withIndex("by_orderId", (q) => q.eq("orderId", orderId))
      .unique();
    if (!row) return { ok: false as const, error: "not_found" as const };
    if (row.status === "refunded" || row.status === "fulfilled") {
      return { ok: true as const, alreadyFinal: true as const };
    }

    const refund = await ctx.runMutation(
      internal.service.reward.casualRewardRegistry.refundPortalCoins,
      {
        uid: row.uid,
        amount: row.priceCoins,
        reason: `giftcard_refund:${orderId}`,
        scopeKey: row.scopeKey ?? "shared",
        ...(row.lobbyId ? { lobbyId: row.lobbyId } : {}),
      }
    );

    const now = Date.now();
    if (!refund.ok) {
      await ctx.db.patch(row._id, {
        status: "failed",
        failureReason: `${reason};refund_failed:${refund.error}`,
        lastAttemptAt: now,
      });
      return { ok: false as const, error: refund.error };
    }

    await ctx.db.patch(row._id, {
      status: "refunded",
      failureReason: reason,
      lastAttemptAt: now,
    });

    return { ok: true as const };
  },
});
