import type { QueryCtx } from "../../_generated/server";
import type { PortalWeeklyBoardMode } from "../../data/portalWeeklyBoardBotConfig";
import { loadBotPersonaDisplayMap } from "../botPersona/portalBotPersonaService";
import {
  estimatePortalWeeklyBoardBotMatchCount,
  resolvePortalWeeklyBoardBotPoints,
} from "./portalWeeklyBoardBotPoints";
import {
  getPortalWeeklyBoardCohort,
  listPortalWeeklyBoardBotMembers,
} from "./portalWeeklyBoardBotFill";

export type PortalLeaderboardEntry = {
  uid: string;
  points: number;
  matchCount: number;
  isBot: boolean;
  botPersonaId?: string;
  displayName: string;
  avatarUrl?: string;
};

export type PortalLeaderboardRankedRow = PortalLeaderboardEntry & {
  rank: number;
};

function botBoardUid(cohortId: string, slot: number): string {
  return `__portal_board_bot:${cohortId}:${slot}`;
}

export async function buildMergedPortalWeeklyLeaderboard(
  ctx: QueryCtx,
  args: {
    gameType: string;
    mode: PortalWeeklyBoardMode;
    weekKey: string;
    now?: number;
    humanLimit?: number;
  }
): Promise<PortalLeaderboardEntry[]> {
  const now = args.now ?? Date.now();
  const humanLimit = args.humanLimit ?? 200;

  const humans = await ctx.db
    .query("portal_weekly_points")
    .withIndex("by_game_mode_week_points", (q) =>
      q.eq("gameType", args.gameType).eq("mode", args.mode).eq("weekKey", args.weekKey)
    )
    .order("desc")
    .take(humanLimit);

  const entries: PortalLeaderboardEntry[] = humans.map((h) => ({
    uid: h.uid,
    points: h.points,
    matchCount: h.matchCount,
    isBot: false,
    displayName: h.uid.slice(0, 12),
  }));

  const cohort = await getPortalWeeklyBoardCohort(ctx, {
    gameType: args.gameType,
    mode: args.mode,
    weekKey: args.weekKey,
  });

  if (!cohort) {
    return entries;
  }

  const members = await listPortalWeeklyBoardBotMembers(ctx, cohort._id);
  const personaIds = members.map((m) => m.botPersonaId);
  const personaMap = await loadBotPersonaDisplayMap(ctx, personaIds);

  for (const member of members) {
    const points = resolvePortalWeeklyBoardBotPoints(
      {
        slot: member.slot,
        revealAt: member.revealAt,
        weekEndPoints: member.weekEndPoints,
      },
      {
        _id: String(cohort._id),
        mode: cohort.mode,
        startsAt: cohort.startsAt,
        endsAt: cohort.endsAt,
        status: cohort.status,
      },
      now
    );
    if (points == null) continue;

    const persona = personaMap.get(member.botPersonaId);
    entries.push({
      uid: botBoardUid(String(cohort._id), member.slot),
      points,
      matchCount: estimatePortalWeeklyBoardBotMatchCount({
        mode: args.mode,
        points,
      }),
      isBot: true,
      botPersonaId: member.botPersonaId,
      displayName: persona?.displayName ?? member.botPersonaId,
      ...(persona?.avatarUrl ? { avatarUrl: persona.avatarUrl } : {}),
    });
  }

  entries.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (a.isBot !== b.isBot) return a.isBot ? 1 : -1;
    return a.uid.localeCompare(b.uid);
  });

  return entries;
}

export function rankPortalLeaderboardEntries(
  entries: PortalLeaderboardEntry[],
  limit: number
): PortalLeaderboardRankedRow[] {
  return entries.slice(0, limit).map((e, i) => ({
    ...e,
    rank: i + 1,
  }));
}

export async function findHumanRankOnMergedBoard(
  ctx: QueryCtx,
  args: {
    uid: string;
    gameType: string;
    mode: PortalWeeklyBoardMode;
    weekKey: string;
    now?: number;
  }
): Promise<number | null> {
  const entries = await buildMergedPortalWeeklyLeaderboard(ctx, args);
  const idx = entries.findIndex((e) => !e.isBot && e.uid === args.uid);
  return idx >= 0 ? idx + 1 : null;
}
