/**
 * Portal 周积分：结算加分只写入 portal_weekly_league_members（+ ledger 审计）。
 * Prefer lobby-scoped member when the run carries lobbyId.
 */
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { PORTAL_WEEKLY_LEAGUE_ENABLED } from "../../data/portalWeeklyLeagueConfig";
import type {
  CasualReferenceScoreQuantiles,
  PortalSoloPointsOverride,
  PortalTournamentDefinition,
} from "../../data/portalTournamentConfigs";
import {
  inferSoloSegmentFromBinding,
  portalRankPointDelta,
  portalSoloRewardTier,
} from "../../data/portalTournamentConfigs";
import { weeklyPeriodKey } from "../../utils/casualTaskPeriod";
import { applySoloSuccessDailyCapAtSettle } from "../ads/portalSoloSuccessDaily";
import { checkAndUnlockBadgesCore } from "../badge/portalBadgeService";
import { portalMatchWinDeltas } from "../badge/portalBadgeUnlockLogic";
import { addSeasonHonorXp } from "../season/portalSeasonHonorService";
import { persistPlayerMatchChallengeOutcome } from "../tournament/settle/playerMatchChallengeOutcome";
import { listPlayerGamesForSeat } from "../tournament/shared/casualPlayerGameTypes";
import {
  ensureWeeklyLeagueProfileForScope,
  findWeeklyLeagueProfile,
} from "../weeklyLeague/casualWeeklyLeagueProfile";
import {
  ensurePortalWeeklyLeagueMemberForScope,
  getWeeklyLeagueMemberByScope,
} from "../weeklyLeague/portalWeeklyLeagueService";
import {
  isTownLeagueScopeKey,
  leagueScopeDisplaySlug,
  resolveLeagueScope,
} from "../../data/portalLeagueScope";
import { addTownSeasonPlayXp } from "../town/townSeasonHonor";

export type PortalWeeklyMode = "solo" | "multi";

export type ApplyPortalMatchPointsResult = {
  pointDelta: number;
  weeklyPointsAfter: number;
  weekKey: string;
  soloRewardsMuted?: boolean;
  xpGranted?: number;
};

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
    seedScoreQuantiles?: CasualReferenceScoreQuantiles;
    runTournamentId: Id<"portal_run_tournaments">;
    now?: number;
    /** Prefer player join lobby over run.lobbyId (cross-lobby shared matchmaking). */
    joinLobbyId?: Id<"portal_lobbies"> | null;
    joinLeagueScopeKey?: string | null;
    rewardsOverride?: {
      soloPoints?: PortalSoloPointsOverride;
      rankPoints?: Record<string, number>;
      coins?: {
        soloSuccess?: number;
        soloFail?: number;
        rankCoins?: Record<string, number>;
      };
    } | null;
  }
): Promise<ApplyPortalMatchPointsResult> {
  const now = args.now ?? Date.now();
  const mode = portalModeFromDef(args.def);
  let delta = 0;
  let reason = "multi_rank";
  let p75Success: boolean | undefined;
  let soloRewardsMuted = false;
  let xpGranted: number | undefined;
  const runRow = await ctx.db.get(args.runTournamentId);
  const leagueScope = resolveLeagueScope({
    leagueScopeKey: args.joinLeagueScopeKey,
    lobbyId: args.joinLobbyId ?? runRow?.lobbyId,
    gameType: args.def.gameType,
  });
  const leagueScopeKey = leagueScope?.leagueScopeKey ?? null;
  const lobbyId = leagueScope?.lobbyId ?? null;

  if (args.def.matchType === "solo_p75") {
    const pm = await ctx.db
      .query("portal_run_player_matches")
      .withIndex("by_run_uid", (q) =>
        q.eq("tournamentId", args.runTournamentId).eq("uid", args.uid)
      )
      .first();
    const games = pm ? await listPlayerGamesForSeat(ctx, pm._id) : [];
    const binding = games[0]?.seedBinding;
    const segment = inferSoloSegmentFromBinding(binding);
    const quantiles = args.seedScoreQuantiles ?? binding?.scoreQuantiles;
    const reward = portalSoloRewardTier({
      def: args.def,
      score: args.score,
      clearThreshold: args.seedScoreThreshold,
      segment,
      quantiles,
      rewardsOverride: args.rewardsOverride,
    });
    p75Success = reward.challengeSuccess;
    const cap = await applySoloSuccessDailyCapAtSettle(ctx, {
      uid: args.uid,
      lobbyId: lobbyId ?? null,
      scopeKey: leagueScopeKey,
      tournamentId: args.def.tournamentId,
      p75Success: p75Success === true,
      nowMs: now,
    });
    soloRewardsMuted = cap.muted;
    if (soloRewardsMuted) {
      delta = 0;
      reason = `${reward.reason}_capped`;
    } else {
      delta = reward.delta;
      reason = reward.reason;
    }
  } else {
    const rank = args.rank ?? 1;
    delta = portalRankPointDelta(args.def, rank, args.rewardsOverride);
    reason = `multi_rank_${rank}`;
  }

  const gameType = args.def.gameType;
  const weekKey = weeklyPeriodKey(now);
  let weeklyPointsAfter = Math.max(0, delta);
  let appliedDelta = weeklyPointsAfter;

  if (PORTAL_WEEKLY_LEAGUE_ENABLED && leagueScopeKey) {
    await ensurePortalWeeklyLeagueMemberForScope(
      ctx,
      args.uid,
      leagueScopeKey,
      leagueScope ? leagueScopeDisplaySlug(leagueScope) : "scope",
      now
    );
    const member = await getWeeklyLeagueMemberByScope(ctx, {
      uid: args.uid,
      leagueScopeKey,
      weekKey,
    });
    if (!member) {
      throw new Error(
        `portal weekly league member missing after ensure uid=${args.uid} leagueScopeKey=${leagueScopeKey}`
      );
    }
    weeklyPointsAfter = Math.max(0, member.weeklyPoints + delta);
    appliedDelta = weeklyPointsAfter - member.weeklyPoints;
    await ctx.db.patch(member._id, {
      weeklyPoints: weeklyPointsAfter,
      updatedAt: now,
    });
  }

  await ctx.db.insert("portal_point_ledger", {
    uid: args.uid,
    runTournamentId: args.runTournamentId,
    gameType,
    ...(leagueScopeKey ? { leagueScopeKey } : {}),
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
  await persistPlayerMatchChallengeOutcome(ctx, {
    uid: args.uid,
    runTournamentId: String(args.runTournamentId),
    seedScoreThreshold: args.seedScoreThreshold,
    challengeSuccess: p75Success,
    now,
  });

  // Town Season XP stays on the town: scope. Lobby badges / Season stay lobby-scoped.
  if (leagueScopeKey && isTownLeagueScopeKey(leagueScopeKey) && !soloRewardsMuted) {
    const xp = await addTownSeasonPlayXp(ctx, {
      uid: args.uid,
      leagueScopeKey,
      now,
    });
    xpGranted = Math.max(0, Math.floor(xp.xpGranted));
  } else if (leagueScopeKey && isTownLeagueScopeKey(leagueScopeKey) && soloRewardsMuted) {
    xpGranted = 0;
  } else if (lobbyId && leagueScopeKey && !soloRewardsMuted) {
    await ensureWeeklyLeagueProfileForScope(ctx, args.uid, leagueScopeKey, now);
    const profile = await findWeeklyLeagueProfile(ctx, args.uid, leagueScopeKey);
    if (profile) {
      const { matchWin, multiWin } = portalMatchWinDeltas({
        mode,
        rank: args.rank,
        p75Success,
      });
      let totalMatchWins = profile.totalMatchWins ?? 0;
      let totalMultiplayerWins = profile.totalMultiplayerWins ?? 0;
      if (multiWin) {
        totalMatchWins += 1;
        totalMultiplayerWins += 1;
      } else if (matchWin) {
        totalMatchWins += 1;
      }
      if (matchWin) {
        await ctx.db.patch(profile._id, {
          totalMatchWins,
          totalMultiplayerWins,
          updatedAt: now,
        });
      }
      await checkAndUnlockBadgesCore(ctx, {
        uid: args.uid,
        lobbyId,
        event: {
          kind: "match_settled",
          peakLeagueTier: profile.peakLeagueTier,
          totalMatchWins,
          totalMultiplayerWins,
        },
        now,
      });
      // Flat per-match Season XP (win/lose both use play bucket; uncapped).
      const xp = await addSeasonHonorXp(ctx, {
        uid: args.uid,
        lobbyId,
        kind: "play",
        now,
      });
      xpGranted = Math.max(0, Math.floor(xp.xpGranted));
    }
  } else if (lobbyId && soloRewardsMuted) {
    xpGranted = 0;
  }

  if (pt) {
    await ctx.db.patch(pt._id, {
      pointDelta: appliedDelta,
      weeklyPointsAfter,
      ...(xpGranted != null ? { xpGranted } : {}),
      updatedAt: now,
    });
  }

  return {
    pointDelta: appliedDelta,
    weeklyPointsAfter,
    weekKey,
    ...(soloRewardsMuted ? { soloRewardsMuted: true } : {}),
    ...(xpGranted != null ? { xpGranted } : {}),
  };
}
