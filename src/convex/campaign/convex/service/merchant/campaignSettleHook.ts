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

export const getMyCampaignCoupon = authedQuery({
  args: { campaignId: v.string() },
  handler: async (ctx, args) => {
    const uid = ctx.uid;
    const rows = await ctx.db
      .query("coupons")
      .withIndex("by_campaign_uid", (q) =>
        q.eq("campaignId", args.campaignId).eq("uid", uid)
      )
      .collect();
    const sorted = rows
      .filter((c) => c.status !== "void")
      .sort((a, b) => b.issuedAt - a.issuedAt);
    return sorted[0] ?? null;
  },
});

export const listPlayerCoupons = authedQuery({
  args: { campaignId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const uid = ctx.uid;
    if (args.campaignId) {
      return await ctx.db
        .query("coupons")
        .withIndex("by_campaign_uid", (q) =>
          q.eq("campaignId", args.campaignId!).eq("uid", uid)
        )
        .collect();
    }
    const all = await ctx.db.query("coupons").collect();
    return all.filter((c) => c.uid === uid);
  },
});

export const listPlayerCouponsForPartner = authedQuery({
  args: { partnerId: v.number() },
  handler: async (ctx, args) => {
    const uid = ctx.uid;
    const rows = await ctx.db
      .query("coupons")
      .withIndex("by_partner_status", (q) => q.eq("partnerId", args.partnerId))
      .collect();
    return rows
      .filter((c) => c.uid === uid)
      .sort((a, b) => b.issuedAt - a.issuedAt);
  },
});

export const listCampaignCouponsForStaff = authedQuery({
  args: {
    partnerId: v.number(),
    campaignId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;

    if (args.campaignId) {
      const rows = await ctx.db
        .query("coupons")
        .withIndex("by_campaignId", (q) => q.eq("campaignId", args.campaignId!))
        .collect();
      return rows
        .filter((c) => c.partnerId === args.partnerId)
        .sort((a, b) => b.issuedAt - a.issuedAt)
        .slice(0, limit);
    }

    const rows = await ctx.db
      .query("coupons")
      .withIndex("by_partner_status", (q) => q.eq("partnerId", args.partnerId))
      .collect();
    return rows.sort((a, b) => b.issuedAt - a.issuedAt).slice(0, limit);
  },
});

export const getCampaignSettlementStatus = query({
  args: { campaignId: v.string() },
  handler: async (ctx, args) => getCampaignSettlementPublic(ctx, args.campaignId),
});

export const getCampaignReport = authedQuery({
  args: { partnerId: v.number(), campaignId: v.string() },
  handler: async (ctx, args) => {
    const campaign = (await ctx.db
      .query("campaigns")
      .withIndex("by_campaignId", (q) => q.eq("campaignId", args.campaignId))
      .unique()) as Doc<"campaigns"> | null;
    if (!campaign || campaign.partnerId !== args.partnerId) {
      return {
        rewardModel: null,
        participants: 0,
        plays: 0,
        issued: 0,
        redeemed: 0,
        redemptionRate: 0,
        settlement: await getCampaignSettlementPublic(ctx, args.campaignId),
      };
    }
    const coupons = await ctx.db
      .query("coupons")
      .withIndex("by_campaignId", (q) => q.eq("campaignId", args.campaignId))
      .collect();
    const issued = coupons.filter((c) => c.status === "issued" || c.status === "redeemed").length;
    const redeemed = coupons.filter((c) => c.status === "redeemed").length;
    const settlement = await getCampaignSettlementPublic(ctx, args.campaignId);
    const uniqueUids = new Set(coupons.map((c) => c.uid));
    return {
      rewardModel: resolveRewardModel(campaign),
      /** Leaderboard participants live on Portal; coupon-based approx for reports. */
      participants: uniqueUids.size,
      plays: coupons.length,
      issued,
      redeemed,
      redemptionRate: issued > 0 ? redeemed / issued : 0,
      settlement,
    };
  },
});
