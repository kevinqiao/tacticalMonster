/**
 * Portal 周积分：结算加分只写入 portal_weekly_league_members（+ ledger 审计）。
 * Prefer lobby-scoped member when the run carries lobbyId.
 */
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { PORTAL_WEEKLY_LEAGUE_ENABLED } from "../../data/portalWeeklyLeagueConfig";
import type { PortalTournamentDefinition } from "../../data/portalTournamentConfigs";
import {
  isPortalP75Success,
  portalRankPointDelta,
  portalSoloPointDelta,
} from "../../data/portalTournamentConfigs";
import { weeklyPeriodKey } from "../../utils/casualTaskPeriod";
import {
  ensurePortalWeeklyLeagueMember,
  ensurePortalWeeklyLeagueMemberForLobby,
  getWeeklyLeagueMember,
  getWeeklyLeagueMemberByLobby,
} from "../weeklyLeague/portalWeeklyLeagueService";
import { persistPlayerMatchChallengeOutcome } from "../tournament/settle/playerMatchChallengeOutcome";

export type PortalWeeklyMode = "solo" | "multi";

export function portalModeFromDef(def: PortalTournamentDefinition): PortalWeeklyMode {
  return def.matchType === "solo_p75" ? "solo" : "multi";
}

/** 结算加分：确保本周已入组，再累加 league member.weeklyPoints。 */
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
    // Free multi and coin multi both use def.rankPoints (same table).
    delta = portalRankPointDelta(args.def, rank);
    reason = `multi_rank_${rank}`;
  }

  const gameType = args.def.gameType;
  const weekKey = weeklyPeriodKey(now);
  let weeklyPointsAfter = Math.max(0, delta);
  let appliedDelta = weeklyPointsAfter;

  const runRow = await ctx.db.get(args.runTournamentId);
  const lobbyId = runRow?.lobbyId;

  if (PORTAL_WEEKLY_LEAGUE_ENABLED) {
    if (lobbyId) {
      const lobby = await ctx.db.get(lobbyId);
      await ensurePortalWeeklyLeagueMemberForLobby(
        ctx,
        args.uid,
        lobbyId,
        lobby?.slug ?? "lobby",
        now
      );
      const member = await getWeeklyLeagueMemberByLobby(ctx, {
        uid: args.uid,
        lobbyId,
        weekKey,
      });
      if (!member) {
        throw new Error(
          `portal weekly league member missing after ensure uid=${args.uid} lobbyId=${lobbyId}`
        );
      }
      weeklyPointsAfter = Math.max(0, member.weeklyPoints + delta);
      appliedDelta = weeklyPointsAfter - member.weeklyPoints;
      await ctx.db.patch(member._id, {
        weeklyPoints: weeklyPointsAfter,
        updatedAt: now,
      });
    } else {
      await ensurePortalWeeklyLeagueMember(ctx, args.uid, gameType, now);
      const member = await getWeeklyLeagueMember(ctx, {
        uid: args.uid,
        gameType,
        weekKey,
      });
      if (!member) {
        throw new Error(
          `portal weekly league member missing after ensure uid=${args.uid} gameType=${gameType}`
        );
      }
      weeklyPointsAfter = Math.max(0, member.weeklyPoints + delta);
      appliedDelta = weeklyPointsAfter - member.weeklyPoints;
      await ctx.db.patch(member._id, {
        weeklyPoints: weeklyPointsAfter,
        updatedAt: now,
      });
    }
  }

  await ctx.db.insert("portal_point_ledger", {
    uid: args.uid,
    runTournamentId: args.runTournamentId,
    gameType,
    ...(lobbyId ? { lobbyId } : {}),
    mode,
    weekKey,
    delta: appliedDelta,
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
      pointDelta: appliedDelta,
      weeklyPointsAfter,
      updatedAt: now,
    });
  }

  await persistPlayerMatchChallengeOutcome(ctx, {
    uid: args.uid,
    runTournamentId: String(args.runTournamentId),
    seedScoreThreshold: args.seedScoreThreshold,
    challengeSuccess: p75Success,
    now,
  });

  return { pointDelta: appliedDelta, weeklyPointsAfter, weekKey };
}
