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
import { requirePartnerCampaignOpsViaHttp } from "../bridge/partnerStaffBridge";
import { listCampaignVouchersViaHttp } from "../bridge/portalPartnerVoucherGrantBridge";
import { resolveRewardModel, usesLeaderboard } from "./campaignRewardModel";
import { maxLeaderboardRankFromRules } from "./campaignRankRewardTiers";
import { resolveCampaignTournament } from "./campaignTournament";

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
      mode: resolveCampaignTournament(campaign)?.mode,
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
    const mode = resolveCampaignTournament(campaign)?.mode ?? "solo";
    const result = await ensureCampaignLeagueBotsViaHttp({
      campaignId: campaign.campaignId,
      partnerId: campaign.partnerId,
      mode,
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
    mode: resolveCampaignTournament(campaign)?.mode,
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

/** Staff coupon list — proxied to Portal's backpack (source of truth). */
export const listCampaignCouponsForStaff = authedAction({
  args: {
    partnerId: v.number(),
    campaignId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requirePartnerCampaignOpsViaHttp({
      partnerId: args.partnerId,
      uid: ctx.uid,
    });
    const result = await listCampaignVouchersViaHttp(args);
    if (!result.ok) {
      console.error("[merchantCampaign] listCampaignCouponsForStaff portal failed", result.error);
      return [];
    }
    return result.items;
  },
});
