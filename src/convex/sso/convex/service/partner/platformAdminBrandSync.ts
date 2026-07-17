"use node";

import { v } from "convex/values";

import { internalAction } from "../../_generated/server";
import { upsertPartnerBrandViaHttp } from "../bridge/merchantCampaignStaffBridge";

/** After SSO partner.slug is set for campaignOps, mirror into campaign partner_brands. */
export const syncPartnerBrandSlug = internalAction({
  args: {
    partnerId: v.number(),
    slug: v.string(),
  },
  handler: async (_ctx, args) => {
    const result = await upsertPartnerBrandViaHttp(args);
    if (!result.ok) {
      console.error("[sso] syncPartnerBrandSlug failed", args, result.error);
      throw new Error(result.error);
    }
    return result;
  },
});
