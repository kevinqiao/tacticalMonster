import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { weeklyPeriodKey } from "../../utils/casualTaskPeriod";
import type { PortalTournamentDefinition } from "../../data/portalTournamentConfigs";
import {
  isPortalP75Success,
  portalRankPointDelta,
  portalSoloPointDelta,
} from "../../data/portalTournamentConfigs";
import { ensurePortalWeeklyBoardBots } from "./portalWeeklyBoardBotFill";

export type PortalWeeklyMode = "solo" | "multi";

export function portalModeFromDef(def: PortalTournamentDefinition): PortalWeeklyMode {
  return def.matchType === "solo_p75" ? "solo" : "multi";
}

export async function getWeeklyPointsRow(
  ctx: QueryCtx | MutationCtx,
  args: { uid: string; gameType: string; mode: PortalWeeklyMode; weekKey: string }
) {
  return await ctx.db
    .query("portal_weekly_points")
    .withIndex("by_uid_game_mode_week", (q) =>
      q
        .eq("uid", args.uid)
        .eq("gameType", args.gameType)
        .eq("mode", args.mode)
        .eq("weekKey", args.weekKey)
    )
    .unique();
}

export async function addWeeklyPoints(
  ctx: MutationCtx,
  args: {
    uid: string;
    gameType: string;
    mode: PortalWeeklyMode;
    delta: number;
    now?: number;
  }
): Promise<{ points: number; weekKey: string }> {
  const now = args.now ?? Date.now();
  const weekKey = weeklyPeriodKey(now);
  const existing = await getWeeklyPointsRow(ctx, {
    uid: args.uid,
    gameType: args.gameType,
    mode: args.mode,
    weekKey,
  });
  const nextPoints = (existing?.points ?? 0) + args.delta;
  const nextCount = (existing?.matchCount ?? 0) + 1;
  if (existing) {
    await ctx.db.patch(existing._id, {
      points: nextPoints,
      matchCount: nextCount,
      updatedAt: now,
    });
  } else {
    await ctx.db.insert("portal_weekly_points", {
      uid: args.uid,
      gameType: args.gameType,
      mode: args.mode,
      weekKey,
      points: nextPoints,
      matchCount: nextCount,
      updatedAt: now,
    });
  }

  await ensurePortalWeeklyBoardBots(ctx, {
    gameType: args.gameType,
    mode: args.mode,
    weekKey,
    now,
  });

  return { points: nextPoints, weekKey };
}

export async function applyPortalMatchPoints(
  ctx: MutationCtx,
  args: {
    uid: string;
    def: PortalTournamentDefinition;
    score: number;
    rank?: number;
    seedScoreThreshold?: number;
    runTournamentId: Id<"portal_run_tournaments">;
    now?: number;
  }
): Promise<{ pointDelta: number; weeklyPointsAfter: number; weekKey: string }> {
  const now = args.now ?? Date.now();
  const mode = portalModeFromDef(args.def);
  let delta = 0;
  let reason = "multi_rank";
  let p75Success: boolean | undefined;
  if (args.def.matchType === "solo_p75") {
    delta = portalSoloPointDelta(args.def, args.score, args.seedScoreThreshold);
    p75Success = isPortalP75Success(args.def, args.score, args.seedScoreThreshold);
    reason = p75Success ? "solo_p75_success" : "solo_p75_fail";
  } else {
    const rank = args.rank ?? 1;
    delta = portalRankPointDelta(args.def, rank);
    reason = `multi_rank_${rank}`;
  }
  const { points, weekKey } = await addWeeklyPoints(ctx, {
    uid: args.uid,
    gameType: args.def.gameType,
    mode,
    delta,
    now,
  });
  await ctx.db.insert("portal_point_ledger", {
    uid: args.uid,
    runTournamentId: args.runTournamentId,
    gameType: args.def.gameType,
    mode,
    weekKey,
    delta,
    reason,
    rank: args.rank,
    p75Success,
    createdAt: now,
  });
  const pt = await ctx.db
    .query("portal_run_player_tournaments")
    .withIndex("by_tournament_uid", (q) =>
      q.eq("tournamentId", args.runTournamentId).eq("uid", args.uid)
    )
    .unique();
  if (pt) {
    await ctx.db.patch(pt._id, {
      pointDelta: delta,
      weeklyPointsAfter: points,
      updatedAt: now,
    });
  }
  return { pointDelta: delta, weeklyPointsAfter: points, weekKey };
}
