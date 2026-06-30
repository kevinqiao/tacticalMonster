import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import type { CampaignBoardMode } from "../../data/campaignBoardBotConfig";
import { pickCampaignBotPersonaId } from "./campaignBotPersonaDefaults";
import { computeCampaignBoardBotPeriodEndValue } from "./campaignBoardBotPoints";
import { planCampaignBoardBotRevealSchedule } from "./campaignBoardBotReveal";

export async function getCampaignBoardCohort(
  ctx: QueryCtx | MutationCtx,
  campaignId: string
) {
  return await ctx.db
    .query("campaign_board_cohorts")
    .withIndex("by_campaignId", (q) => q.eq("campaignId", campaignId))
    .unique();
}

/**
 * 活动开放（startsAt）后 seed cohort + bot 池（幂等）；入榜时间轴以 startsAt 为锚点。
 */
export async function ensureCampaignBoardBots(
  ctx: MutationCtx,
  args: {
    campaign: Doc<"merchant_campaigns">;
    now?: number;
  }
): Promise<{ seeded: boolean; cohortId: Id<"campaign_board_cohorts"> | null }> {
  const now = args.now ?? Date.now();
  const { campaign } = args;

  const existing = await getCampaignBoardCohort(ctx, campaign.campaignId);
  if (existing) {
    return { seeded: false, cohortId: existing._id };
  }

  if (now < campaign.startsAt) {
    return { seeded: false, cohortId: null };
  }

  const humanAnchorAt = campaign.startsAt;

  const cohortKey = campaign.campaignId;
  const cohortId = await ctx.db.insert("campaign_board_cohorts", {
    campaignId: campaign.campaignId,
    merchantId: campaign.merchantId,
    mode: campaign.mode,
    startsAt: campaign.startsAt,
    endsAt: campaign.endsAt,
    humanAnchorAt,
    status: now >= campaign.endsAt ? ("closed" as const) : ("open" as const),
    createdAt: now,
    updatedAt: now,
  });

  const schedule = planCampaignBoardBotRevealSchedule({
    cohortKey: `${cohortKey}|${cohortId}`,
    startsAt: campaign.startsAt,
    humanAnchorAt,
  });

  for (const plan of schedule) {
    const periodEndValue = computeCampaignBoardBotPeriodEndValue({
      mode: campaign.mode as CampaignBoardMode,
      cohortKey: `${cohortKey}|${cohortId}`,
      slot: plan.slot,
    });
    await ctx.db.insert("campaign_board_bot_members", {
      cohortId,
      campaignId: campaign.campaignId,
      slot: plan.slot,
      botPersonaId: pickCampaignBotPersonaId(campaign.campaignId, plan.slot),
      revealAt: plan.revealAt,
      periodEndValue,
      createdAt: now,
      updatedAt: now,
    });
  }

  return { seeded: true, cohortId };
}

export async function listCampaignBoardBotMembers(
  ctx: QueryCtx,
  cohortId: Id<"campaign_board_cohorts">
) {
  return await ctx.db
    .query("campaign_board_bot_members")
    .withIndex("by_cohort", (q) => q.eq("cohortId", cohortId))
    .collect();
}
