"use node";

import { v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Doc } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";
import { action } from "../../_generated/server";
import { authedAction } from "../../custom/session";
import {
  ensureCampaignLeagueBotsViaHttp,
  fetchCampaignLeagueHumansRankedViaHttp,
  fetchCampaignLeagueLeaderboardViaHttp,
} from "../bridge/portalCampaignLeagueBridge";
import { resolveRewardModel, usesLeaderboard } from "./campaignRewardModel";
import { maxLeaderboardRankFromRules } from "./campaignRankRewardTiers";

async function loadCampaign(
  ctx: ActionCtx,
  campaignId: string
): Promise<Doc<"campaigns"> | null> {
  return await ctx.runQuery(
    internal.service.merchant.campaignSettleHook.getCampaignDocInternal,
    { campaignId }
  );
}

/** Proxy Portal merged leaderboard (humans + bots). */
export const getCampaignLeaderboard = action({
  args: { campaignId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const campaign = await loadCampaign(ctx, args.campaignId);
    if (!campaign) return [];
    if (!usesLeaderboard(resolveRewardModel(campaign))) return [];

    const fetched = await fetchCampaignLeagueLeaderboardViaHttp({
      campaignId: args.campaignId,
      limit: args.limit ?? 20,
      mode: campaign.mode,
    });
    if (!fetched.ok) {
      console.error("[merchantCampaign] getCampaignLeaderboard portal failed", fetched.error);
      return [];
    }
    return fetched.rows;
  },
});

/** Ensure Portal campaign league bots (idempotent; usually already seeded on first settle). */
export const ensureCampaignBoardBotsForLeaderboard = action({
  args: { campaignId: v.string() },
  handler: async (ctx, { campaignId }) => {
    const campaign = await loadCampaign(ctx, campaignId);
    if (!campaign) {
      return { ok: false as const, error: "campaign_not_found" as const };
    }
    if (!usesLeaderboard(resolveRewardModel(campaign))) {
      return { ok: true as const, seeded: false as const };
    }
    const result = await ensureCampaignLeagueBotsViaHttp({
      campaignId: campaign.campaignId,
      partnerId: campaign.partnerId,
      mode: campaign.mode,
      dueTime: campaign.endsAt,
      startsAt: campaign.startsAt,
    });
    if (!result.ok) {
      return { ok: false as const, error: result.error };
    }
    return { ok: true as const, seeded: result.seeded };
  },
});

async function finalizeFromPortal(
  ctx: ActionCtx,
  campaign: Doc<"campaigns">
) {
  const rules = campaign.rewardRules.filter(
    (r) => r.kind === "campaign_leaderboard_rank_top_n"
  );
  const maxTopN = maxLeaderboardRankFromRules(rules) || 100;

  const ranked = await fetchCampaignLeagueHumansRankedViaHttp({
    campaignId: campaign.campaignId,
    limit: maxTopN,
    mode: campaign.mode,
  });
  if (!ranked.ok) {
    return { ok: false as const, error: ranked.error };
  }

  return await ctx.runMutation(
    internal.service.merchant.campaignLeaderboardSettlement
      .finalizeCampaignLeaderboardRewardsInternal,
    {
      campaignId: campaign.campaignId,
      rankedHumans: ranked.rows.map((r) => ({
        uid: r.uid,
        rank: r.rank,
      })),
    }
  );
}

/** Idempotent leaderboard coupon issuance when a campaign ends (player-triggered). */
export const triggerCampaignLeaderboardSettlement = authedAction({
  args: { campaignId: v.string() },
  handler: async (ctx, args) => {
    const campaign = await loadCampaign(ctx, args.campaignId);
    if (!campaign) {
      return { ok: false as const, error: "campaign_not_found" as const };
    }
    return await finalizeFromPortal(ctx, campaign);
  },
});

export const finalizeCampaignLeaderboardRewardsStaff = authedAction({
  args: {
    partnerId: v.number(),
    campaignId: v.string(),
  },
  handler: async (ctx, args) => {
    const campaign = await loadCampaign(ctx, args.campaignId);
    if (!campaign || campaign.partnerId !== args.partnerId) {
      return { ok: false as const, error: "not_found" as const };
    }
    return await finalizeFromPortal(ctx, campaign);
  },
});
