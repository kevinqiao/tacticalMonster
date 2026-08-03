"use node";

import { v } from "convex/values";

import { action } from "../../_generated/server";
import { authedAction } from "../../custom/session";
import {
  assertStoreStaffForStoreViaHttp,
  resolveStoreViaHttp,
} from "../bridge/storeStaffBridge";
import { requirePartnerCampaignOpsViaHttp } from "../bridge/partnerStaffBridge";
import {
  redeemCampaignVoucherStoreViaHttp,
  syncCampaignVoucherStatusViaHttp,
  validateCampaignVoucherViaHttp,
} from "../bridge/portalPartnerVoucherGrantBridge";

/**
 * Campaign no longer stores coupons locally — Portal's backpack is the
 * source of truth. Validate/redeem/void proxy to the Portal merchant bridge
 * by voucher code, keyed off the same-code voucher Portal issued.
 */
export const validateCouponCode = action({
  args: { storeId: v.string(), code: v.string() },
  handler: async (_ctx, args) => {
    const store = await resolveStoreViaHttp({ storeId: args.storeId });
    if (!store.ok || store.status !== "active") {
      return { ok: false as const, error: "not_found" as const };
    }
    const result = await validateCampaignVoucherViaHttp({
      partnerId: store.partnerId,
      code: args.code,
    });
    if (!result.ok) {
      return { ok: false as const, error: result.error };
    }
    const voucher = result.voucher;
    return {
      ok: true as const,
      coupon: {
        couponId: voucher.itemId,
        code: voucher.code,
        rewardSnapshot: {
          type: "free_item" as const,
          itemLabel: voucher.title,
          displayText: voucher.rewardText,
        },
        issuedAt: 0,
        activatesAt: 0,
        expiresAt: voucher.expiresAt ?? 0,
      },
    };
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
    const result = await redeemCampaignVoucherStoreViaHttp({
      partnerId: assert.partnerId,
      code: args.code,
      storeId: args.storeId,
      staffUid: ctx.uid,
      ...(args.staffNote ? { staffNote: args.staffNote } : {}),
    });
    if (!result.ok) {
      return { ok: false as const, error: result.error };
    }
    return { ok: true as const, couponId: result.data.itemId };
  },
});

/** Voids a not-yet-redeemed campaign voucher by code (campaignId scopes the lookup on Portal). */
export const voidCoupon = authedAction({
  args: {
    storeId: v.string(),
    campaignId: v.string(),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const assert = await assertStoreStaffForStoreViaHttp({
      storeId: args.storeId,
      uid: ctx.uid,
    });
    if (!assert.ok) {
      throw new Error(assert.error === "forbidden" ? "forbidden" : assert.error);
    }
    const result = await syncCampaignVoucherStatusViaHttp({
      partnerId: assert.partnerId,
      campaignId: args.campaignId,
      code: args.code,
      status: "void",
      actorUid: ctx.uid,
      storeId: args.storeId,
    });
    if (!result.ok) {
      return { ok: false as const, error: result.error };
    }
    return { ok: true as const, couponId: result.data.itemId };
  },
});

/**
 * Partner-admin void by campaign + code (no store scoping) — for the merchant
 * campaign console's coupon list, which only has partnerId/campaignId context.
 */
export const voidCouponForStaff = authedAction({
  args: {
    partnerId: v.number(),
    campaignId: v.string(),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    await requirePartnerCampaignOpsViaHttp({ partnerId: args.partnerId, uid: ctx.uid });
    const result = await syncCampaignVoucherStatusViaHttp({
      partnerId: args.partnerId,
      campaignId: args.campaignId,
      code: args.code,
      status: "void",
      actorUid: ctx.uid,
    });
    if (!result.ok) {
      return { ok: false as const, error: result.error };
    }
    return { ok: true as const, couponId: result.data.itemId };
  },
});
