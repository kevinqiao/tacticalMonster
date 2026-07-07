"use node";

import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";
import { isTangoConfigured, tangoCreateOrder } from "./tangoClient";

export const fulfillTangoGiftCardOrder = internalAction({
  args: { orderId: v.string() },
  handler: async (ctx, { orderId }) => {
    const order = await ctx.runQuery(
      internal.service.giftcard.giftCardOrderDao.getOrderByOrderId,
      { orderId }
    );
    if (!order || order.status !== "pending") {
      return { ok: true as const, skipped: true as const };
    }

    if (!isTangoConfigured()) {
      await ctx.runMutation(internal.service.giftcard.giftCardOrderDao.failOrderAndRefund, {
        orderId,
        reason: "tango_not_configured",
      });
      return { ok: false as const, error: "tango_not_configured" as const };
    }

    await ctx.runMutation(internal.service.giftcard.giftCardOrderDao.markOrderProcessing, {
      orderId,
    });

    const mockMode =
      process.env.TANGO_MOCK_FULFILL === "1" || process.env.TANGO_MOCK_FULFILL === "true";
    const accountIdentifier =
      process.env.TANGO_ACCOUNT_IDENTIFIER?.trim() ?? (mockMode ? "MOCK_ACCOUNT" : "");
    if (!accountIdentifier) {
      await ctx.runMutation(internal.service.giftcard.giftCardOrderDao.failOrderAndRefund, {
        orderId,
        reason: "tango_account_missing",
      });
      return { ok: false as const, error: "tango_account_missing" as const };
    }

    try {
      const sendEmail =
        process.env.TANGO_SEND_EMAIL === "1" || process.env.TANGO_SEND_EMAIL === "true";
      const result = await tangoCreateOrder({
        accountIdentifier,
        utid: order.tangoUtid,
        amount: order.faceValueLocal,
        externalRefID: order.orderId,
        recipientEmail: order.deliveryEmail,
        sendEmail: sendEmail && Boolean(order.deliveryEmail),
      });

      let rewardLink = result.rewardLink;
      if (!rewardLink && result.referenceOrderID) {
        const { tangoGetOrder } = await import("./tangoClient");
        const fetched = await tangoGetOrder(result.referenceOrderID);
        rewardLink = fetched.rewardLink;
      }

      await ctx.runMutation(internal.service.giftcard.giftCardOrderDao.markOrderFulfilled, {
        orderId,
        tangoReferenceOrderId: result.referenceOrderID,
        tangoOrderId: result.orderId,
        rewardLink,
      });

      return { ok: true as const, orderId };
    } catch (e) {
      const reason = e instanceof Error ? e.message : "tango_fulfillment_failed";
      await ctx.runMutation(internal.service.giftcard.giftCardOrderDao.failOrderAndRefund, {
        orderId,
        reason,
      });
      return { ok: false as const, error: reason };
    }
  },
});
