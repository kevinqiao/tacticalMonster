import { v } from "convex/values";
import type { Doc } from "../../_generated/dataModel";
import { internalMutation, internalQuery, query } from "../../_generated/server";
import { authedQuery } from "../../custom/session";
import {
  evaluatePassRunRules,
  getCampaignSettlementPublic,
  issueCouponsForRules,
  resolveRewardModel,
  usesLeaderboard,
} from "./campaignLeaderboardSettlement";

/**
 * Portal settle HTTP for pass_per_run coupon issue.
 * Leaderboard mode is handled on Portal; if somehow called, no-op.
 */
export const onRunSettledInternal = internalMutation({
  args: {
    campaignId: v.string(),
    partnerId: v.number(),
    uid: v.string(),
    runTournamentId: v.string(),
    matchId: v.optional(v.string()),
    score: v.number(),
    rank: v.optional(v.number()),
    isPassed: v.optional(v.boolean()),
    gameType: v.string(),
    mode: v.union(v.literal("solo"), v.literal("multi")),
  },
  handler: async (ctx, args) => {
    const campaign = (await ctx.db
      .query("campaigns")
      .withIndex("by_campaignId", (q) => q.eq("campaignId", args.campaignId))
      .unique()) as Doc<"campaigns"> | null;
    if (!campaign || campaign.partnerId !== args.partnerId) {
      return { ok: false as const, error: "campaign_not_found" as const };
    }

    const rewardModel = resolveRewardModel(campaign);

    if (usesLeaderboard(rewardModel)) {
      return { ok: true as const, issued: [] as const };
    }

    const matchedRules = evaluatePassRunRules({
      rules: campaign.rewardRules,
      score: args.score,
      isPassed: args.isPassed,
      rank: args.rank,
      mode: args.mode,
    });

    const issued = await issueCouponsForRules(ctx, {
      source: "pass_run",
      campaign,
      uid: args.uid,
      runTournamentId: args.runTournamentId,
      matchId: args.matchId,
      rules: matchedRules,
    });

    return { ok: true as const, issued };
  },
});

export const getCampaignDocInternal = internalQuery({
  args: { campaignId: v.string() },
  handler: async (ctx, args) => {
    return (await ctx.db
      .query("campaigns")
      .withIndex("by_campaignId", (q) => q.eq("campaignId", args.campaignId))
      .unique()) as Doc<"campaigns"> | null;
  },
});

/**
 * @deprecated Coupons no longer live in Campaign; Portal's backpack owns the
 * player-facing voucher state. Kept as a stub so old FE call sites do not
 * hard-crash while they migrate to Portal's `listMyBackpackItems`.
 */
export const getMyCampaignCoupon = authedQuery({
  args: { campaignId: v.string() },
  handler: async () => {
    return null;
  },
});

/** @deprecated see getMyCampaignCoupon. */
export const listPlayerCoupons = authedQuery({
  args: { campaignId: v.optional(v.string()) },
  handler: async () => {
    return [] as Array<never>;
  },
});

/** @deprecated see getMyCampaignCoupon. */
export const listPlayerCouponsForPartner = authedQuery({
  args: { partnerId: v.number() },
  handler: async () => {
    return [] as Array<never>;
  },
});

// `listCampaignCouponsForStaff` moved to campaignSettleHookActions.ts — it now
// proxies to Portal's backpack over HTTP, which requires the Node action
// runtime ("use node") and cannot live alongside these V8 queries/mutations.

export const getCampaignSettlementStatus = query({
  args: { campaignId: v.string() },
  handler: async (ctx, args) => getCampaignSettlementPublic(ctx, args.campaignId),
});

/**
 * Coupon issuance/redemption counters now live on Portal's backpack; only
 * the leaderboard settlement snapshot (embedded on the campaign doc) stays
 * local. Use `listCampaignCouponsForStaff` for per-voucher detail.
 */
export const getCampaignReport = authedQuery({
  args: { partnerId: v.number(), campaignId: v.string() },
  handler: async (ctx, args) => {
    const campaign = (await ctx.db
      .query("campaigns")
      .withIndex("by_campaignId", (q) => q.eq("campaignId", args.campaignId))
      .unique()) as Doc<"campaigns"> | null;
    const settlement = await getCampaignSettlementPublic(ctx, args.campaignId);
    if (!campaign || campaign.partnerId !== args.partnerId) {
      return {
        rewardModel: null,
        participants: 0,
        plays: 0,
        issued: 0,
        redeemed: 0,
        redemptionRate: 0,
        settlement,
      };
    }
    return {
      rewardModel: resolveRewardModel(campaign),
      participants: settlement.winnerCount ?? 0,
      plays: 0,
      issued: settlement.couponsIssued ?? 0,
      redeemed: 0,
      redemptionRate: 0,
      settlement,
    };
  },
});
