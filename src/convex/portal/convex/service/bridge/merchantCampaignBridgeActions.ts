"use node";

import { v } from "convex/values";
import { internalAction } from "../../_generated/server";
import { notifyMerchantOnRunSettledViaHttp } from "./merchantCampaignBridge";

export const notifyOnRunSettled = internalAction({
  args: {
    campaignId: v.string(),
    merchantId: v.string(),
    uid: v.string(),
    matchId: v.string(),
    gameType: v.string(),
    mode: v.union(v.literal("solo"), v.literal("multi")),
    score: v.number(),
    rank: v.optional(v.number()),
    p75Success: v.optional(v.boolean()),
  },
  handler: async (_ctx, args) => {
    const result = await notifyMerchantOnRunSettledViaHttp(args);
    if (!result.ok) {
      console.warn("[portal] merchant on-run-settled failed", args.matchId, result.error);
    }
    return result;
  },
});
