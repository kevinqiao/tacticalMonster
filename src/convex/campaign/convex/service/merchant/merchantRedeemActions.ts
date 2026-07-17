"use node";

import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { action } from "../../_generated/server";
import { authedAction } from "../../custom/session";
import {
  assertStoreStaffForStoreViaHttp,
  resolveStoreViaHttp,
} from "../bridge/storeStaffBridge";

export const validateCouponCode = action({
  args: { storeId: v.string(), code: v.string() },
  handler: async (ctx, args) => {
    const store = await resolveStoreViaHttp({ storeId: args.storeId });
    if (!store.ok || store.status !== "active") {
      return { ok: false as const, error: "not_found" as const };
    }
    return await ctx.runQuery(internal.service.merchant.merchantRedeem.validateCouponCodeCore, {
      partnerId: store.partnerId,
      code: args.code,
    });
  },
});

export const redeemCoupon = authedAction({
  args: {
    storeId: v.string(),
    code: v.string(),
    staffNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const assert = await assertStoreStaffForStoreViaHttp({
      storeId: args.storeId,
      uid: ctx.uid,
    });
    if (!assert.ok) {
      throw new Error(assert.error === "forbidden" ? "forbidden" : assert.error);
    }
    return await ctx.runMutation(internal.service.merchant.merchantRedeem.redeemCouponCore, {
      storeId: args.storeId,
      partnerId: assert.partnerId,
      uid: ctx.uid,
      code: args.code,
      staffNote: args.staffNote,
    });
  },
});

export const voidCoupon = authedAction({
  args: {
    storeId: v.string(),
    couponId: v.string(),
  },
  handler: async (ctx, args) => {
    const assert = await assertStoreStaffForStoreViaHttp({
      storeId: args.storeId,
      uid: ctx.uid,
    });
    if (!assert.ok) {
      throw new Error(assert.error === "forbidden" ? "forbidden" : assert.error);
    }
    return await ctx.runMutation(internal.service.merchant.merchantRedeem.voidCouponCore, {
      partnerId: assert.partnerId,
      couponId: args.couponId,
    });
  },
});
