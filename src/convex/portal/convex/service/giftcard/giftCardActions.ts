"use node";

import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { authedAction } from "../../custom/session";
import { tangoGetOrder, tangoResendOrderEmail } from "./tangoClient";

export const refreshGiftCardRedemption = authedAction({
  args: { orderId: v.string() },
  handler: async (ctx, { orderId }) => {
    const order = await ctx.runQuery(
      internal.service.giftcard.giftCardOrderDao.getOrderByOrderId,
      { orderId }
    );
    if (!order || order.uid !== ctx.uid) {
      return { ok: false as const, error: "not_found" as const };
    }
    if (order.status !== "fulfilled") {
      return { ok: false as const, error: "not_ready" as const };
    }

    const ref = order.tangoReferenceOrderId ?? order.orderId;
    try {
      const fetched = await tangoGetOrder(ref);
      if (!fetched.rewardLink) {
        return { ok: false as const, error: "link_unavailable" as const };
      }
      await ctx.runMutation(internal.service.giftcard.giftCardOrderDao.cacheOrderRewardLink, {
        orderId,
        rewardLink: fetched.rewardLink,
      });
      return {
        ok: true as const,
        rewardLink: fetched.rewardLink,
        expiresAt: Date.now() + 72 * 60 * 60 * 1000,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "refresh_failed";
      return { ok: false as const, error: msg };
    }
  },
});

export const resendGiftCardEmail = authedAction({
  args: { orderId: v.string() },
  handler: async (ctx, { orderId }) => {
    const order = await ctx.runQuery(
      internal.service.giftcard.giftCardOrderDao.getOrderByOrderId,
      { orderId }
    );
    if (!order || order.uid !== ctx.uid) {
      return { ok: false as const, error: "not_found" as const };
    }
    if (order.status !== "fulfilled" || !order.deliveryEmail) {
      return { ok: false as const, error: "not_ready" as const };
    }
    const ref = order.tangoReferenceOrderId ?? order.orderId;
    try {
      await tangoResendOrderEmail(ref);
      return { ok: true as const };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "resend_failed";
      return { ok: false as const, error: msg };
    }
  },
});
