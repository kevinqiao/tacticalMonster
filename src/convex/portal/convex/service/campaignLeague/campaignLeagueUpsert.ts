import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import type { CampaignLeagueMode } from "./campaignLeagueConfig";
import { ensureCampaignLeagueBoardAndBots } from "./campaignLeagueBotFill";
import { campaignMultiRankPointsDeltaForPlace } from "./campaignMultiRankPoints";
import { campaignSoloPointsDelta } from "./campaignSoloPoints";

export async function upsertCampaignLeagueHumanEntry(
  ctx: MutationCtx,
  args: {
    campaignId: string;
    partnerId: number;
    uid: string;
    score: number;
    rank?: number;
    isPassed?: boolean;
    mode: CampaignLeagueMode;
    dueTime: number;
    startsAt?: number;
  }
): Promise<void> {
  const now = Date.now();
  await ensureCampaignLeagueBoardAndBots(ctx, {
    campaignId: args.campaignId,
    partnerId: args.partnerId,
    mode: args.mode,
    dueTime: args.dueTime,
    startsAt: args.startsAt,
    now,
  });

  const existing = await ctx.db
    .query("campaign_league_entries")
    .withIndex("by_campaign_uid", (q) =>
      q.eq("campaignId", args.campaignId).eq("uid", args.uid)
    )
    .unique();

  const pointsDelta =
    args.mode === "multi" && typeof args.rank === "number"
      ? campaignMultiRankPointsDeltaForPlace(args.rank)
      : args.mode === "solo"
        ? campaignSoloPointsDelta(args.isPassed)
        : undefined;

  if (!existing) {
    await ctx.db.insert("campaign_league_entries", {
      campaignId: args.campaignId,
      uid: args.uid,
      isBot: false,
      // Optional raw score snapshot; leaderboard sorts by rankPoints for both modes.
      bestScore: args.mode === "solo" ? args.score : undefined,
      rankPoints: pointsDelta ?? 0,
      plays: 1,
      lastSubmittedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    return;
  }

  if (existing.isBot) {
    return;
  }

  const patch: Partial<Doc<"campaign_league_entries">> = {
    plays: existing.plays + 1,
    lastSubmittedAt: now,
    updatedAt: now,
  };
  if (args.mode === "solo") {
    patch.bestScore = Math.max(existing.bestScore ?? 0, args.score);
  }
  if (pointsDelta != null) {
    patch.rankPoints = (existing.rankPoints ?? 0) + pointsDelta;
  }
  await ctx.db.patch(existing._id, patch);
}
