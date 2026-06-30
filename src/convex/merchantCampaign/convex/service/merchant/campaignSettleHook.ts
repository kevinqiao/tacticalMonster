import { v } from "convex/values";
import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { internalMutation, mutation, query } from "../../_generated/server";
import { authedMutation, authedQuery } from "../../custom/session";
import { ensureCampaignBoardBots } from "../campaignBoard/campaignBoardBotFill";
import {
  buildMergedCampaignLeaderboard,
  rankCampaignLeaderboardRows,
} from "../campaignBoard/campaignLeaderboardMerge";
import {
  evaluatePassRunRules,
  finalizeCampaignLeaderboardRewardsCore,
  getCampaignSettlementPublic,
  issueCouponsForRules,
  resolveRewardModel,
  usesLeaderboard,
} from "./campaignLeaderboardSettlement";
import { generateCouponCode, newId, requireStaff } from "./merchantStaff";
import { campaignMultiRankPointsDeltaForPlace } from "../../data/campaignMultiRankPoints";

export async function updateCampaignLeaderboard(
  ctx: MutationCtx,
  args: {
    campaignId: string;
    uid: string;
    score: number;
    rank?: number;
    mode: "solo" | "multi";
  }
) {
  const existing = await ctx.db
    .query("campaign_leaderboard_entries")
    .withIndex("by_campaign_uid", (q) =>
      q.eq("campaignId", args.campaignId).eq("uid", args.uid)
    )
    .unique();
  const now = Date.now();
  const rankPoints =
    args.mode === "multi" && typeof args.rank === "number"
      ? campaignMultiRankPointsDeltaForPlace(args.rank)
      : undefined;

  if (!existing) {
    await ctx.db.insert("campaign_leaderboard_entries", {
      campaignId: args.campaignId,
      uid: args.uid,
      bestScore: args.mode === "solo" ? args.score : undefined,
      rankPoints: rankPoints ?? (args.mode === "multi" ? 0 : undefined),
      plays: 1,
      lastSubmittedAt: now,
      updatedAt: now,
    });
    return;
  }

  const patch: Partial<Doc<"campaign_leaderboard_entries">> = {
    plays: existing.plays + 1,
    lastSubmittedAt: now,
    updatedAt: now,
  };
  if (args.mode === "solo") {
    patch.bestScore = Math.max(existing.bestScore ?? 0, args.score);
  }
  if (args.mode === "multi" && rankPoints != null) {
    patch.rankPoints = (existing.rankPoints ?? 0) + rankPoints;
  }
  await ctx.db.patch(existing._id, patch);
}

export const onRunSettledInternal = internalMutation({
  args: {
    campaignId: v.string(),
    merchantId: v.string(),
    uid: v.string(),
    matchId: v.string(),
    score: v.number(),
    rank: v.optional(v.number()),
    p75Success: v.optional(v.boolean()),
    gameType: v.string(),
    mode: v.union(v.literal("solo"), v.literal("multi")),
  },
  handler: async (ctx, args) => {
    const campaign = (await ctx.db
      .query("merchant_campaigns")
      .withIndex("by_campaignId", (q) => q.eq("campaignId", args.campaignId))
      .unique()) as Doc<"merchant_campaigns"> | null;
    if (!campaign || campaign.merchantId !== args.merchantId) {
      return { ok: false as const, error: "campaign_not_found" as const };
    }

    const rewardModel = resolveRewardModel(campaign);

    if (usesLeaderboard(rewardModel)) {
      await updateCampaignLeaderboard(ctx, {
        campaignId: args.campaignId,
        uid: args.uid,
        score: args.score,
        rank: args.rank,
        mode: args.mode,
      });
      await ensureCampaignBoardBots(ctx, { campaign });
      return { ok: true as const, issued: [] as const };
    }

    const matchedRules = evaluatePassRunRules({
      rules: campaign.rewardRules,
      score: args.score,
      p75Success: args.p75Success,
      mode: args.mode,
    });

    const issued = await issueCouponsForRules(ctx, {
      campaign,
      uid: args.uid,
      matchId: args.matchId,
      rules: matchedRules,
    });

    return { ok: true as const, issued };
  },
});

export const getMyCampaignCoupon = authedQuery({
  args: { campaignId: v.string() },
  handler: async (ctx, args) => {
    const uid = ctx.uid;
    const rows = await ctx.db
      .query("merchant_coupons")
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
        .query("merchant_coupons")
        .withIndex("by_campaign_uid", (q) =>
          q.eq("campaignId", args.campaignId!).eq("uid", uid)
        )
        .collect();
    }
    const all = await ctx.db.query("merchant_coupons").collect();
    return all.filter((c) => c.uid === uid);
  },
});

export const listPlayerCouponsForMerchant = authedQuery({
  args: { merchantId: v.string() },
  handler: async (ctx, args) => {
    const uid = ctx.uid;
    const rows = await ctx.db
      .query("merchant_coupons")
      .withIndex("by_merchant_status", (q) => q.eq("merchantId", args.merchantId))
      .collect();
    return rows
      .filter((c) => c.uid === uid)
      .sort((a, b) => b.issuedAt - a.issuedAt);
  },
});

export const listCampaignCouponsForStaff = authedQuery({
  args: {
    merchantId: v.string(),
    campaignId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx, { merchantId: args.merchantId, uid: ctx.uid });
    const limit = args.limit ?? 100;

    if (args.campaignId) {
      const rows = await ctx.db
        .query("merchant_coupons")
        .withIndex("by_campaignId", (q) => q.eq("campaignId", args.campaignId!))
        .collect();
      return rows
        .filter((c) => c.merchantId === args.merchantId)
        .sort((a, b) => b.issuedAt - a.issuedAt)
        .slice(0, limit);
    }

    const rows = await ctx.db
      .query("merchant_coupons")
      .withIndex("by_merchant_status", (q) => q.eq("merchantId", args.merchantId))
      .collect();
    return rows.sort((a, b) => b.issuedAt - a.issuedAt).slice(0, limit);
  },
});

export const getCampaignSettlementStatus = query({
  args: { campaignId: v.string() },
  handler: async (ctx, args) => getCampaignSettlementPublic(ctx, args.campaignId),
});

/** Idempotent leaderboard coupon issuance when a campaign ends (player-triggered cron). */
export const triggerCampaignLeaderboardSettlement = authedMutation({
  args: { campaignId: v.string() },
  handler: async (ctx, args) => {
    const campaign = (await ctx.db
      .query("merchant_campaigns")
      .withIndex("by_campaignId", (q) => q.eq("campaignId", args.campaignId))
      .unique()) as Doc<"merchant_campaigns"> | null;
    if (!campaign) {
      return { ok: false as const, error: "campaign_not_found" as const };
    }
    return await finalizeCampaignLeaderboardRewardsCore(ctx, campaign);
  },
});

export const finalizeCampaignLeaderboardRewardsStaff = authedMutation({
  args: {
    merchantId: v.string(),
    campaignId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx, { merchantId: args.merchantId, uid: ctx.uid });
    const campaign = (await ctx.db
      .query("merchant_campaigns")
      .withIndex("by_campaignId", (q) => q.eq("campaignId", args.campaignId))
      .unique()) as Doc<"merchant_campaigns"> | null;
    if (!campaign || campaign.merchantId !== args.merchantId) {
      return { ok: false as const, error: "not_found" as const };
    }
    return await finalizeCampaignLeaderboardRewardsCore(ctx, campaign);
  },
});

export const ensureCampaignBoardBotsForLeaderboard = mutation({
  args: { campaignId: v.string() },
  handler: async (ctx, { campaignId }) => {
    const campaign = await ctx.db
      .query("merchant_campaigns")
      .withIndex("by_campaignId", (q) => q.eq("campaignId", campaignId))
      .unique();
    if (!campaign) {
      return { ok: false as const, error: "campaign_not_found" as const };
    }
    if (!usesLeaderboard(resolveRewardModel(campaign))) {
      return { ok: true as const, seeded: false as const };
    }
    const result = await ensureCampaignBoardBots(ctx, { campaign });
    return { ok: true as const, seeded: result.seeded };
  },
});

export const getCampaignLeaderboard = query({
  args: { campaignId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const campaign = (await ctx.db
      .query("merchant_campaigns")
      .withIndex("by_campaignId", (q) => q.eq("campaignId", args.campaignId))
      .unique()) as Doc<"merchant_campaigns"> | null;
    if (!campaign) return [];
    if (!usesLeaderboard(resolveRewardModel(campaign))) {
      return [];
    }
    const limit = args.limit ?? 20;
    const merged = await buildMergedCampaignLeaderboard(ctx, { campaign });
    return rankCampaignLeaderboardRows(merged, limit).map(
      ({ sortValue: _sortValue, ...row }) => row
    );
  },
});

export const getCampaignReport = authedQuery({
  args: { merchantId: v.string(), campaignId: v.string() },
  handler: async (ctx, args) => {
    await requireStaff(ctx, { uid: ctx.uid, merchantId: args.merchantId });
    const campaign = (await ctx.db
      .query("merchant_campaigns")
      .withIndex("by_campaignId", (q) => q.eq("campaignId", args.campaignId))
      .unique()) as Doc<"merchant_campaigns"> | null;
    const coupons = await ctx.db
      .query("merchant_coupons")
      .withIndex("by_campaignId", (q) => q.eq("campaignId", args.campaignId))
      .collect();
    const issued = coupons.filter((c) => c.status === "issued" || c.status === "redeemed").length;
    const redeemed = coupons.filter((c) => c.status === "redeemed").length;
    const board = await ctx.db
      .query("campaign_leaderboard_entries")
      .withIndex("by_campaign_uid", (q) => q.eq("campaignId", args.campaignId))
      .collect();
    const settlement = await getCampaignSettlementPublic(ctx, args.campaignId);
    return {
      rewardModel: campaign ? resolveRewardModel(campaign) : null,
      participants: board.length,
      plays: board.reduce((s, r) => s + r.plays, 0),
      issued,
      redeemed,
      redemptionRate: issued > 0 ? redeemed / issued : 0,
      settlement,
    };
  },
});