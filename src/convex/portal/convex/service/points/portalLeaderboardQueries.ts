import { v } from "convex/values";

import { mutation, query } from "../../_generated/server";
import { authedQuery } from "../../custom/session";

import { weeklyPeriodKey, weeklyWindowMsShanghai } from "../../utils/casualTaskPeriod";

import { getWeeklyPointsRow } from "./portalWeeklyPointsService";

import type { PortalWeeklyMode } from "./portalWeeklyPointsService";

import {
  buildMergedPortalWeeklyLeaderboard,
  findHumanRankOnMergedBoard,
  rankPortalLeaderboardEntries,
} from "./portalLeaderboardMerge";
import { ensurePortalWeeklyBoardBots } from "./portalWeeklyBoardBotFill";
import {
  backfillWeeklyTotalPointsForGameWeek,
  findHumanRankOnTotalBoard,
  getWeeklyTotalPointsRow,
  listWeeklyTotalPointsForGameWeek,
} from "./portalWeeklyTotalPointsService";

export const ensureWeeklyBoardBotsForGame = mutation({
  args: {
    gameType: v.string(),
    weekKey: v.optional(v.string()),
  },
  handler: async (ctx, { gameType, weekKey }) => {
    const now = Date.now();
    const key = weekKey ?? weeklyPeriodKey(now);
    const modes: PortalWeeklyMode[] = ["solo", "multi"];
    const results = [];
    for (const mode of modes) {
      const r = await ensurePortalWeeklyBoardBots(ctx, {
        gameType,
        mode,
        weekKey: key,
        now,
      });
      results.push({ mode, seeded: r.seeded, cohortId: r.cohortId });
    }
    return { weekKey: key, results };
  },
});

/** 幂等：从分模式积分表回填本周统一总榜（上线迁移 + 客户端首屏触发）。 */
export const ensureWeeklyTotalPointsForGame = mutation({
  args: {
    gameType: v.string(),
    weekKey: v.optional(v.string()),
  },
  handler: async (ctx, { gameType, weekKey }) => {
    const now = Date.now();
    const key = weekKey ?? weeklyPeriodKey(now);
    const { synced } = await backfillWeeklyTotalPointsForGameWeek(ctx, {
      gameType,
      weekKey: key,
      now,
    });
    return { weekKey: key, synced };
  },
});

export const getWeeklyLeaderboard = query({
  args: {
    gameType: v.string(),
    mode: v.union(v.literal("solo"), v.literal("multi")),
    limit: v.optional(v.number()),
    weekKey: v.optional(v.string()),
  },
  handler: async (ctx, { gameType, mode, limit, weekKey }) => {
    const now = Date.now();
    const key = weekKey ?? weeklyPeriodKey(now);
    const n = Math.min(Math.max(limit ?? 50, 1), 100);
    const window = weeklyWindowMsShanghai(now);

    const merged = await buildMergedPortalWeeklyLeaderboard(ctx, {
      gameType,
      mode,
      weekKey: key,
      now,
    });
    const rows = rankPortalLeaderboardEntries(merged, n);

    return {
      weekKey: key,
      weekEndsAt: window.endsAt,
      rows: rows.map((r) => ({
        rank: r.rank,
        uid: r.uid,
        points: r.points,
        matchCount: r.matchCount,
        displayName: r.displayName,
        isBot: r.isBot,
        ...(r.botPersonaId ? { botPersonaId: r.botPersonaId } : {}),
        ...(r.avatarUrl ? { avatarUrl: r.avatarUrl } : {}),
      })),
    };
  },
});

/** 本周统一总榜：solo + multi 积分合并，仅真人。 */
export const getPortalWeeklyTotalLeaderboard = query({
  args: {
    gameType: v.string(),
    limit: v.optional(v.number()),
    weekKey: v.optional(v.string()),
  },
  handler: async (ctx, { gameType, limit, weekKey }) => {
    const now = Date.now();
    const key = weekKey ?? weeklyPeriodKey(now);
    const n = Math.min(Math.max(limit ?? 50, 1), 100);
    const window = weeklyWindowMsShanghai(now);

    const entries = await listWeeklyTotalPointsForGameWeek(ctx, {
      gameType,
      weekKey: key,
      limit: n,
    });

    return {
      weekKey: key,
      weekEndsAt: window.endsAt,
      rows: entries.map((r, i) => ({
        rank: i + 1,
        uid: r.uid,
        points: r.totalPoints,
        matchCount: r.matchCount,
        soloPoints: r.soloPoints,
        multiPoints: r.multiPoints,
        displayName: r.uid.slice(0, 12),
        isBot: false,
      })),
    };
  },
});

export const getMyWeeklyPoints = authedQuery({
  args: {
    gameType: v.string(),
  },
  handler: async (ctx, { gameType }) => {
    const uid = ctx.uid;
    const now = Date.now();
    const weekKey = weeklyPeriodKey(now);
    const modes: PortalWeeklyMode[] = ["solo", "multi"];
    const byMode: Record<
      PortalWeeklyMode,
      { points: number; matchCount: number; rank: number | null }
    > = {
      solo: { points: 0, matchCount: 0, rank: null },
      multi: { points: 0, matchCount: 0, rank: null },
    };
    for (const mode of modes) {
      const row = await getWeeklyPointsRow(ctx, { uid, gameType, mode, weekKey });
      byMode[mode] = {
        points: row?.points ?? 0,
        matchCount: row?.matchCount ?? 0,
        rank: null,
      };
      const rank = await findHumanRankOnMergedBoard(ctx, {
        uid,
        gameType,
        mode,
        weekKey,
        now,
      });
      if (rank != null) byMode[mode].rank = rank;
    }

    const totalRow = await getWeeklyTotalPointsRow(ctx, { uid, gameType, weekKey });
    const totalRank = await findHumanRankOnTotalBoard(ctx, { uid, gameType, weekKey });
    const soloPoints = byMode.solo.points;
    const multiPoints = byMode.multi.points;

    const window = weeklyWindowMsShanghai(now);
    return {
      weekKey,
      weekEndsAt: window.endsAt,
      byMode,
      total: {
        points: totalRow?.totalPoints ?? soloPoints + multiPoints,
        matchCount: totalRow?.matchCount ?? byMode.solo.matchCount + byMode.multi.matchCount,
        soloPoints: totalRow?.soloPoints ?? soloPoints,
        multiPoints: totalRow?.multiPoints ?? multiPoints,
        rank: totalRank,
      },
    };
  },
});
