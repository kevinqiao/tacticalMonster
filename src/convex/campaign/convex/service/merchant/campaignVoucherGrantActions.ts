"use node";

import { v } from "convex/values";

import { internalAction } from "../../_generated/server";
import {
  grantPartnerVoucherFromCampaignViaHttp,
  syncCampaignVoucherStatusViaHttp,
} from "../bridge/portalPartnerVoucherGrantBridge";

/**
 * Runs outside the Campaign mutation so it can call the Portal deployment.
 * Portal uses `campaign:${issueKey}` as its idempotency key.
 */
export const grantIssuedCouponToPortalBackpack = internalAction({
  args: {
    uid: v.string(),
    partnerId: v.number(),
    campaignId: v.string(),
    portalSkuId: v.string(),
    issueKey: v.string(),
    preferredCode: v.string(),
  },
  handler: async (_ctx, args) => {
    const result = await grantPartnerVoucherFromCampaignViaHttp({
      uid: args.uid,
      partnerId: args.partnerId,
      campaignId: args.campaignId,
      portalSkuId: args.portalSkuId,
      grantKey: args.issueKey,
      preferredCode: args.preferredCode,
    });
    if (!result.ok) {
      console.error("[merchantCampaign] Portal voucher grant failed", {
        campaignId: args.campaignId,
        issueKey: args.issueKey,
        error: result.error,
      });
    }
    return result;
  },
});

/** Mirrors a completed Campaign store operation onto the same-code Portal item. */
export const syncCampaignVoucherStatusToPortalBackpack = internalAction({
  args: {
    partnerId: v.number(),
    campaignId: v.string(),
    code: v.string(),
    status: v.union(v.literal("redeemed"), v.literal("void")),
    actorUid: v.optional(v.string()),
    storeId: v.optional(v.string()),
    staffNote: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const result = await syncCampaignVoucherStatusViaHttp(args);
    // Legacy-only coupons do not have a Portal mirror; keep the Campaign operation successful.
    if (!result.ok && result.error !== "not_found") {
      console.error("[merchantCampaign] Portal voucher status sync failed", {
        campaignId: args.campaignId,
        code: args.code,
        status: args.status,
        error: result.error,
      });
    }
    return result;
  },
});
