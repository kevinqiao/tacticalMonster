import type { Doc } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import {
  generateDisplayName,
  resolvePlayerDisplayName,
} from "../../../../shared/displayName";
import type { CampaignLeagueMode } from "./campaignLeagueConfig";
import {
  getCampaignLeagueBoard,
  listCampaignLeagueBotEntries,
} from "./campaignLeagueBotFill";
import {
  estimateCampaignLeagueBotPlayCount,
  resolveCampaignLeagueBotState,
} from "./campaignLeagueBotPoints";

export type CampaignLeagueLeaderboardRow = {
  uid: string;
  displayName: string;
  isBot: boolean;
  bestScore?: number;
  rankPoints?: number;
  plays: number;
  botPersonaId?: string;
  sortValue: number;
};

function sortValueForHuman(
  mode: CampaignLeagueMode,
  row: Doc<"campaign_league_entries">
): number {
  // Both solo (+3/-1) and multi (5/3/1/-1/-2) accumulate on rankPoints.
  void mode;
  return row.rankPoints ?? 0;
}

export async function listCampaignLeagueHumans(
  ctx: QueryCtx,
  args: { campaignId: string; mode: CampaignLeagueMode; limit?: number }
): Promise<Doc<"campaign_league_entries">[]> {
  const humanLimit = args.limit ?? 200;
  void args.mode;
  const rows = await ctx.db
    .query("campaign_league_entries")
    .withIndex("by_campaign_rankPoints", (q) => q.eq("campaignId", args.campaignId))
    .order("desc")
    .take(humanLimit * 2);
  return rows.filter((r) => !r.isBot).slice(0, humanLimit);
}

export async function buildMergedCampaignLeagueLeaderboard(
  ctx: QueryCtx,
  args: {
    campaignId: string;
    mode: CampaignLeagueMode;
    now?: number;
    humanLimit?: number;
  }
): Promise<CampaignLeagueLeaderboardRow[]> {
  const now = args.now ?? Date.now();
  const mode = args.mode;
  const humans = await listCampaignLeagueHumans(ctx, {
    campaignId: args.campaignId,
    mode,
    limit: args.humanLimit ?? 200,
  });

  const entries: CampaignLeagueLeaderboardRow[] = humans.map((h) => {
    const sortValue = sortValueForHuman(mode, h);
    return {
      uid: h.uid,
      displayName: resolvePlayerDisplayName({ uid: h.uid }),
      isBot: false,
      bestScore: h.bestScore,
      rankPoints: sortValue,
      plays: h.plays,
      sortValue,
    };
  });

  const board = await getCampaignLeagueBoard(ctx, args.campaignId);
  if (!board) {
    return entries;
  }

  const bots = await listCampaignLeagueBotEntries(ctx, args.campaignId);
  const cohortKey = `${args.campaignId}|${board._id}`;
  const humanTop = humans.reduce((max, h) => Math.max(max, sortValueForHuman(mode, h)), 0);

  for (const bot of bots) {
    if (bot.slot == null || bot.botPeriodEndValue == null) continue;
    const botState = resolveCampaignLeagueBotState(
      {
        slot: bot.slot,
        revealAt: bot.revealAt ?? board.startsAt,
        botPeriodEndValue: bot.botPeriodEndValue,
      },
      {
        startsAt: board.startsAt,
        dueTime: board.dueTime,
        status: board.status,
      },
      now,
      { mode, cohortKey, humanTop }
    );
    if (botState == null) continue;

    const value = botState.rankPoints;
    const plays =
      mode === "multi"
        ? botState.plays
        : estimateCampaignLeagueBotPlayCount({ mode, value });
    entries.push({
      uid: bot.uid,
      displayName: generateDisplayName(bot.botPersonaId ?? bot.uid),
      isBot: true,
      botPersonaId: bot.botPersonaId,
      rankPoints: value,
      plays,
      sortValue: value,
    });
  }

  entries.sort((a, b) => {
    if (b.sortValue !== a.sortValue) return b.sortValue - a.sortValue;
    if (a.isBot !== b.isBot) return a.isBot ? 1 : -1;
    return a.displayName.localeCompare(b.displayName);
  });

  return entries;
}

export function rankCampaignLeagueRows(
  rows: CampaignLeagueLeaderboardRow[],
  limit: number
): Array<CampaignLeagueLeaderboardRow & { rank: number }> {
  return rows.slice(0, limit).map((row, index) => ({
    ...row,
    rank: index + 1,
  }));
}
