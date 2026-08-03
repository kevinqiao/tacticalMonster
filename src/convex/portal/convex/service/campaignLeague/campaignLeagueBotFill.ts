import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import type { CampaignLeagueMode } from "./campaignLeagueConfig";
import {
  campaignLeagueBotUid,
  pickCampaignLeagueBotPersonaId,
} from "./campaignLeagueBotPersona";
import { computeCampaignLeagueBotPeriodEndValue } from "./campaignLeagueBotPoints";
import { planCampaignLeagueBotRevealSchedule } from "./campaignLeagueBotReveal";

export async function getCampaignLeagueBoard(
  ctx: QueryCtx | MutationCtx,
  campaignId: string
): Promise<Doc<"campaign_league_boards"> | null> {
  return await ctx.db
    .query("campaign_league_boards")
    .withIndex("by_campaignId", (q) => q.eq("campaignId", campaignId))
    .unique();
}

/**
 * Idempotent: create board + seed ~15 bot entries on first call.
 * Safe to call from first human upsert or ensure-bots HTTP.
 */
export async function ensureCampaignLeagueBoardAndBots(
  ctx: MutationCtx,
  args: {
    campaignId: string;
    partnerId: number;
    mode: CampaignLeagueMode;
    dueTime: number;
    startsAt?: number;
    now?: number;
  }
): Promise<{ seeded: boolean; boardId: Id<"campaign_league_boards"> | null }> {
  const now = args.now ?? Date.now();
  const existing = await getCampaignLeagueBoard(ctx, args.campaignId);
  if (existing) {
    return { seeded: false, boardId: existing._id };
  }

  const startsAt = args.startsAt ?? now;
  const humanAnchorAt = now;
  const dueTime = args.dueTime > 0 ? args.dueTime : startsAt + 7 * 24 * 3600 * 1000;

  const boardId = await ctx.db.insert("campaign_league_boards", {
    campaignId: args.campaignId,
    partnerId: args.partnerId,
    mode: args.mode,
    startsAt,
    dueTime,
    humanAnchorAt,
    status: now >= dueTime ? ("closed" as const) : ("open" as const),
    createdAt: now,
    updatedAt: now,
  });

  const cohortKey = `${args.campaignId}|${boardId}`;
  const schedule = planCampaignLeagueBotRevealSchedule({
    cohortKey,
    startsAt,
    humanAnchorAt,
  });

  for (const plan of schedule) {
    const periodEndValue = computeCampaignLeagueBotPeriodEndValue({
      mode: args.mode,
      cohortKey,
      slot: plan.slot,
    });
    await ctx.db.insert("campaign_league_entries", {
      campaignId: args.campaignId,
      uid: campaignLeagueBotUid(args.campaignId, plan.slot),
      isBot: true,
      plays: 0,
      revealAt: plan.revealAt,
      botPeriodEndValue: periodEndValue,
      botPersonaId: pickCampaignLeagueBotPersonaId(args.campaignId, plan.slot),
      slot: plan.slot,
      createdAt: now,
      updatedAt: now,
    });
  }

  return { seeded: true, boardId };
}

export async function listCampaignLeagueBotEntries(
  ctx: QueryCtx | MutationCtx,
  campaignId: string
): Promise<Doc<"campaign_league_entries">[]> {
  return await ctx.db
    .query("campaign_league_entries")
    .withIndex("by_campaign_bots", (q) => q.eq("campaignId", campaignId).eq("isBot", true))
    .collect();
}
