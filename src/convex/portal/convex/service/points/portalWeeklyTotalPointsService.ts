import { syncMemberWeeklyPointsFromTotal } from "../weeklyLeague/portalWeeklyLeagueMemberSync";
import {
  getWeeklyPointsRow,
  type PortalWeeklyMode,
} from "./portalWeeklyPointsService";

export type PortalWeeklyTotalPointsRow = {
  uid: string;
  gameType: string;
  weekKey: string;
  totalPoints: number;
  soloPoints: number;
  multiPoints: number;
  matchCount: number;
  updatedAt: number;
};

const MODES: PortalWeeklyMode[] = ["solo", "multi"];

export async function getWeeklyTotalPointsRow(
  ctx: QueryCtx | MutationCtx,
  args: { uid: string; gameType: string; weekKey: string }
) {
  return await ctx.db
    .query("portal_weekly_total_points")
    .withIndex("by_uid_game_week", (q) =>
      q.eq("uid", args.uid).eq("gameType", args.gameType).eq("weekKey", args.weekKey)
    )
    .unique();
}

export function comparePortalWeeklyTotalPoints(
  a: Pick<PortalWeeklyTotalPointsRow, "totalPoints" | "uid">,
  b: Pick<PortalWeeklyTotalPointsRow, "totalPoints" | "uid">
): number {
  if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
  return a.uid.localeCompare(b.uid);
}

/** 从 solo/multi 分表重算并 upsert 统一总榜行。 */
export async function syncWeeklyTotalPoints(
  ctx: MutationCtx,
  args: {
    uid: string;
    gameType: string;
    weekKey: string;
    now?: number;
  }
): Promise<PortalWeeklyTotalPointsRow> {
  const now = args.now ?? Date.now();
  let soloPoints = 0;
  let multiPoints = 0;
  let matchCount = 0;

  for (const mode of MODES) {
    const row = await getWeeklyPointsRow(ctx, {
      uid: args.uid,
      gameType: args.gameType,
      mode,
      weekKey: args.weekKey,
    });
    if (!row) continue;
    if (mode === "solo") soloPoints = row.points;
    else multiPoints = row.points;
    matchCount += row.matchCount;
  }

  const totalPoints = soloPoints + multiPoints;
  const payload = {
    totalPoints,
    soloPoints,
    multiPoints,
    matchCount,
    updatedAt: now,
  };

  const existing = await getWeeklyTotalPointsRow(ctx, args);
  if (existing) {
    await ctx.db.patch(existing._id, payload);
    await syncMemberWeeklyPointsFromTotal(ctx, {
      uid: args.uid,
      gameType: args.gameType,
      weekKey: args.weekKey,
      totalPoints,
      now,
    });
    return {
      uid: args.uid,
      gameType: args.gameType,
      weekKey: args.weekKey,
      ...payload,
    };
  }

  await ctx.db.insert("portal_weekly_total_points", {
    uid: args.uid,
    gameType: args.gameType,
    weekKey: args.weekKey,
    ...payload,
  });
  await syncMemberWeeklyPointsFromTotal(ctx, {
    uid: args.uid,
    gameType: args.gameType,
    weekKey: args.weekKey,
    totalPoints,
    now,
  });
  return {
    uid: args.uid,
    gameType: args.gameType,
    weekKey: args.weekKey,
    ...payload,
  };
}

/**
 * 幂等回填：扫描某 gameType+weekKey 下所有分模式积分行，重建总榜。
 * 用于上线前已有 `portal_weekly_points` 数据的迁移。
 */
export async function backfillWeeklyTotalPointsForGameWeek(
  ctx: MutationCtx,
  args: { gameType: string; weekKey: string; now?: number }
): Promise<{ synced: number }> {
  const now = args.now ?? Date.now();
  const byUid = new Map<string, { soloPoints: number; multiPoints: number; matchCount: number }>();

  for (const mode of MODES) {
    const rows = await ctx.db
      .query("portal_weekly_points")
      .withIndex("by_game_mode_week_points", (q) =>
        q.eq("gameType", args.gameType).eq("mode", mode).eq("weekKey", args.weekKey)
      )
      .collect();

    for (const row of rows) {
      const cur = byUid.get(row.uid) ?? { soloPoints: 0, multiPoints: 0, matchCount: 0 };
      if (mode === "solo") cur.soloPoints = row.points;
      else cur.multiPoints = row.points;
      cur.matchCount += row.matchCount;
      byUid.set(row.uid, cur);
    }
  }

  let synced = 0;
  for (const [uid, parts] of byUid) {
    await syncWeeklyTotalPoints(ctx, {
      uid,
      gameType: args.gameType,
      weekKey: args.weekKey,
      now,
    });
    synced += 1;
  }
  return { synced };
}

export async function listWeeklyTotalPointsForGameWeek(
  ctx: QueryCtx,
  args: { gameType: string; weekKey: string; limit?: number }
): Promise<PortalWeeklyTotalPointsRow[]> {
  const limit = Math.min(Math.max(args.limit ?? 100, 1), 500);
  const rows = await ctx.db
    .query("portal_weekly_total_points")
    .withIndex("by_game_week_points", (q) =>
      q.eq("gameType", args.gameType).eq("weekKey", args.weekKey)
    )
    .collect();

  return [...rows].sort(comparePortalWeeklyTotalPoints).slice(0, limit);
}

export async function findHumanRankOnTotalBoard(
  ctx: QueryCtx,
  args: { uid: string; gameType: string; weekKey: string }
): Promise<number | null> {
  const myRow = await getWeeklyTotalPointsRow(ctx, args);
  if (!myRow) return null;

  const all = await ctx.db
    .query("portal_weekly_total_points")
    .withIndex("by_game_week_points", (q) =>
      q.eq("gameType", args.gameType).eq("weekKey", args.weekKey)
    )
    .collect();

  const sorted = [...all].sort(comparePortalWeeklyTotalPoints);
  const idx = sorted.findIndex((r) => r.uid === args.uid);
  return idx >= 0 ? idx + 1 : null;
}
