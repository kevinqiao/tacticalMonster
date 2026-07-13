import type { Doc } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import type { CampaignBoardMode } from "../../data/campaignBoardBotConfig";
import { generateDisplayName, resolvePlayerDisplayName } from "../../../../shared/displayName";
import {
  estimateCampaignBoardBotPlayCount,
  resolveCampaignBoardBotState,
} from "./campaignBoardBotPoints";
import {
  getCampaignBoardCohort,
  listCampaignBoardBotMembers,
} from "./campaignBoardBotFill";

export type CampaignLeaderboardRow = {
  uid: string;
  displayName: string;
  isBot: boolean;
  bestScore?: number;
  rankPoints?: number;
  plays: number;
  botPersonaId?: string;
  sortValue: number;
};

function botBoardUid(campaignId: string, slot: number): string {
  return `__campaign_board_bot:${campaignId}:${slot}`;
}

function sortValueForHuman(
  mode: CampaignBoardMode,
  row: Doc<"campaign_leaderboard_entries">
): number {
  if (mode === "solo") {
    return row.bestScore ?? 0;
  }
  return row.rankPoints ?? 0;
}

function sortValueForBot(mode: CampaignBoardMode, value: number): number {
  return value;
}

export async function buildMergedCampaignLeaderboard(
  ctx: QueryCtx,
  args: {
    campaign: Doc<"merchant_campaigns">;
    now?: number;
    humanLimit?: number;
  }
): Promise<CampaignLeaderboardRow[]> {
  const now = args.now ?? Date.now();
  const mode = args.campaign.mode as CampaignBoardMode;
  const humanLimit = args.humanLimit ?? 200;

  let humans: Doc<"campaign_leaderboard_entries">[];
  if (mode === "solo") {
    humans = await ctx.db
      .query("campaign_leaderboard_entries")
      .withIndex("by_campaign_score", (q) => q.eq("campaignId", args.campaign.campaignId))
      .order("desc")
      .take(humanLimit);
  } else {
    humans = await ctx.db
      .query("campaign_leaderboard_entries")
      .withIndex("by_campaign_rankPoints", (q) =>
        q.eq("campaignId", args.campaign.campaignId)
      )
      .order("desc")
      .take(humanLimit);
  }

  const entries: CampaignLeaderboardRow[] = humans.map((h) => {
    const sortValue = sortValueForHuman(mode, h);
    return {
      uid: h.uid,
      displayName: resolvePlayerDisplayName({ uid: h.uid }),
      isBot: false,
      bestScore: mode === "solo" ? sortValue : h.bestScore,
      rankPoints: mode === "multi" ? sortValue : h.rankPoints,
      plays: h.plays,
      sortValue,
    };
  });

  const cohort = await getCampaignBoardCohort(ctx, args.campaign.campaignId);
  if (!cohort) {
    return entries;
  }

  const members = await listCampaignBoardBotMembers(ctx, cohort._id);
  const cohortKey = `${args.campaign.campaignId}|${cohort._id}`;
  const humanTop = humans.reduce(
    (max, h) => Math.max(max, sortValueForHuman(mode, h)),
    0
  );

  for (const member of members) {
    const botState = resolveCampaignBoardBotState(
      {
        slot: member.slot,
        revealAt: member.revealAt,
        periodEndValue: member.periodEndValue,
      },
      {
        startsAt: cohort.startsAt,
        endsAt: cohort.endsAt,
        status: cohort.status,
      },
      now,
      {
        mode,
        cohortKey,
        humanTop,
      }
    );
    if (botState == null) continue;

    const value = botState.rankPoints;
    const plays =
      mode === "multi"
        ? botState.plays
        : estimateCampaignBoardBotPlayCount({ mode, value });
    entries.push({
      uid: botBoardUid(args.campaign.campaignId, member.slot),
      displayName: generateDisplayName(member.botPersonaId),
      isBot: true,
      botPersonaId: member.botPersonaId,
      bestScore: mode === "solo" ? value : undefined,
      rankPoints: mode === "multi" ? value : undefined,
      plays,
      sortValue: sortValueForBot(mode, value),
    });
  }

  entries.sort((a, b) => {
    if (b.sortValue !== a.sortValue) return b.sortValue - a.sortValue;
    if (a.isBot !== b.isBot) return a.isBot ? 1 : -1;
    return a.displayName.localeCompare(b.displayName);
  });

  return entries;
}

export function rankCampaignLeaderboardRows(
  rows: CampaignLeaderboardRow[],
  limit: number
): Array<CampaignLeaderboardRow & { rank: number }> {
  return rows.slice(0, limit).map((row, index) => ({
    ...row,
    rank: index + 1,
  }));
}
