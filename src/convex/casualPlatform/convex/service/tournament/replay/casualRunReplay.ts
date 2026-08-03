/**
 * 再战：同一 `templateId` + `matchId` + `gameId`；仅本人 `replaying`，保留 bot 与同桌。
 */
import { v } from "convex/values";
import type { Id } from "../../../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../../../_generated/server";
import { getTournamentDefinition, isPeriodScopedTournament } from "../../../data/casualTournamentConfigs";
import { effectiveScoreAggregation } from "../../../data/casualTournamentConfigs";
import {
  RUN_PLAYER_TOURNAMENT_OPEN,
  RUN_TOURNAMENT_OPEN,
} from "../join/casualTournamentJoinCore";
import { consumeReplayToken } from "./casualReplayTokens";
import {
  canUseReplayForTemplate,
  isReplayableFinished,
  promoteFinishedToConfirmedIfExpired,
} from "../shared/casualPlayerMatchStatus";
import { findOldestUnusedReplayTokenId } from "./casualReplayPassService";
import {
  findPlayerGameByGameId,
  listPlayerGamesForSeat,
} from "../shared/casualPlayerGameTypes";

export type AuthorizeCasualRunReplayResult =
  | {
      ok: true;
      gameId: string;
      templateId: string;
      matchId: string;
      replayEpoch: number;
    }
  | { ok: false; error: string };

export type StartCasualRunReplayResult =
  | {
      ok: true;
      gameId: string;
      templateId: string;
      matchId: string;
      resetCasualRun: true;
      replayEpoch: number;
    }
  | { ok: false; error: string };

async function deleteScoreTierPendingForMatchGame(
  ctx: MutationCtx,
  uid: string,
  matchGameId: string
): Promise<void> {
  const pending = await ctx.db
    .query("casual_score_tier_pending")
    .withIndex("by_uid", (q) => q.eq("uid", uid))
    .collect();
  for (const row of pending) {
    if (row.matchGameId === matchGameId) {
      await ctx.db.delete(row._id);
    }
  }
}

async function revertPeriodInstanceAfterReplay(
  ctx: MutationCtx,
  args: {
    instanceId: Id<"casual_tournament_instances">;
    uid: string;
    def: NonNullable<ReturnType<typeof getTournamentDefinition>>;
    priorScore: number;
    now: number;
  }
): Promise<void> {
  const row = await ctx.db
    .query("casual_instance_player_state")
    .withIndex("by_instance_uid", (q) =>
      q.eq("instanceId", args.instanceId).eq("uid", args.uid)
    )
    .first();
  if (!row) return;

  const agg = effectiveScoreAggregation(args.def);
  const nextCount = Math.max(0, (row.matchCount ?? 0) - 1);
  const patch: Record<string, number | undefined> = {
    matchCount: nextCount,
    updatedAt: args.now,
  };
  if (agg === "sum_scores") {
    patch.sumScore = Math.max(0, (row.sumScore ?? 0) - args.priorScore);
  } else if (nextCount === 0 || (row.bestScore ?? 0) <= args.priorScore) {
    patch.bestScore = undefined;
  }
  await ctx.db.patch(row._id, patch);
}

/**
 * 消耗再战令并将本人置为 `replaying`（不删 bot、不改同桌）。
 */
export async function authorizeCasualRunReplayCore(
  ctx: MutationCtx,
  args: {
    uid: string;
    matchGameId: string;
    replayTokenId?: Id<"casual_replay_tokens">;
  }
): Promise<AuthorizeCasualRunReplayResult> {
  const pg = await findPlayerGameByGameId(ctx, args.matchGameId);
  if (!pg) {
    return { ok: false, error: "unknown_match_game" };
  }
  if (pg.uid !== args.uid) {
    return { ok: false, error: "forbidden" };
  }

  const pm = await ctx.db.get(pg.playerMatchId);
  if (!pm) {
    return { ok: false, error: "unknown_match_game" };
  }

  const def = getTournamentDefinition(pm.templateId);
  if (!def) {
    return { ok: false, error: "unknown_tournament" };
  }
  if (!canUseReplayForTemplate(pm.templateId)) {
    return { ok: false, error: "replay_not_for_season_voucher" };
  }
  if (pm.status === "settled") {
    return { ok: false, error: "already_finalized" };
  }
  if (pm.status === "confirmed") {
    return { ok: false, error: "replay_window_closed" };
  }

  const now = Date.now();
  let freshPm = await promoteFinishedToConfirmedIfExpired(ctx, pm, now);
  if (freshPm.status === "confirmed") {
    return { ok: false, error: "replay_window_closed" };
  }
  if (freshPm.status !== "finished") {
    return { ok: false, error: "match_not_replayable" };
  }
  if (!isReplayableFinished(freshPm, pm.templateId, now)) {
    return { ok: false, error: "replay_window_closed" };
  }

  const matchDoc = await ctx.db.get(freshPm.matchId as Id<"casual_run_matches">);
  if (def.maxPlayers > 1 && !matchDoc?.botsSeeded) {
    return { ok: false, error: "bots_not_seeded" };
  }

  let tokenId = args.replayTokenId;
  if (!tokenId) {
    const picked = await findOldestUnusedReplayTokenId(ctx, args.uid);
    if (!picked) {
      return { ok: false, error: "no_replay_token" };
    }
    tokenId = picked;
  }

  const consumed = await consumeReplayToken(ctx, {
    uid: args.uid,
    tokenId,
    tournamentId: pm.templateId,
  });
  if (!consumed.ok) {
    return { ok: false, error: consumed.error };
  }

  const priorScore = freshPm.score ?? 0;
  const nextEpoch = (pg.replayEpoch ?? freshPm.replayEpoch ?? 0) + 1;

  const seatGames = await listPlayerGamesForSeat(ctx, freshPm._id);
  seatGames.sort((a, b) => a.gameIndex - b.gameIndex);
  const isTriathlonReplay = freshPm.sessionKind === "triathlon" && seatGames.length > 1;
  const firstLeg = seatGames[0];

  if (isTriathlonReplay) {
    if (!firstLeg) {
      return { ok: false, error: "missing_triathlon_legs" };
    }
    for (const leg of seatGames) {
      await deleteScoreTierPendingForMatchGame(ctx, args.uid, leg.gameId);
    }
    for (const leg of seatGames) {
      await ctx.db.patch(leg._id, {
        status: leg.gameIndex === 0 ? "replaying" : "locked",
        score: undefined,
        finishedAt: undefined,
        replayEpoch: nextEpoch,
        updatedAt: now,
      });
    }
    await ctx.db.patch(freshPm._id, {
      status: "replaying",
      score: undefined,
      rank: undefined,
      finishedAt: undefined,
      replayEpoch: nextEpoch,
      gameId: firstLeg.gameId,
      updatedAt: now,
    });
  } else {
    await deleteScoreTierPendingForMatchGame(ctx, args.uid, pg.gameId);

    await ctx.db.patch(pg._id, {
      status: "replaying",
      score: undefined,
      finishedAt: undefined,
      replayEpoch: nextEpoch,
      updatedAt: now,
    });

    await ctx.db.patch(freshPm._id, {
      status: "replaying",
      score: undefined,
      rank: undefined,
      finishedAt: undefined,
      replayEpoch: nextEpoch,
      gameId: pg.gameId,
      updatedAt: now,
    });
  }

  const runTid = pm.tournamentId as Id<"casual_run_tournaments">;
  const runRow = await ctx.db.get(runTid);
  if (runRow) {
    await ctx.db.patch(runTid, {
      status: RUN_TOURNAMENT_OPEN,
      updatedAt: now,
    });
  }

  const pt = await ctx.db
    .query("casual_run_player_tournaments")
    .withIndex("by_tournament_uid", (q) => q.eq("tournamentId", runTid).eq("uid", args.uid))
    .unique();
  if (pt) {
    await ctx.db.patch(pt._id, {
      score: undefined,
      status: RUN_PLAYER_TOURNAMENT_OPEN,
      pendingRunRewards: undefined,
      updatedAt: now,
    });
  }

  if (runRow?.instanceId && isPeriodScopedTournament(def) && priorScore > 0) {
    await revertPeriodInstanceAfterReplay(ctx, {
      instanceId: runRow.instanceId,
      uid: args.uid,
      def,
      priorScore,
      now,
    });
  }

  const restartGameId = isTriathlonReplay && firstLeg ? firstLeg.gameId : pg.gameId;

  return {
    ok: true,
    gameId: restartGameId,
    templateId: pm.templateId,
    matchId: pm.matchId,
    replayEpoch: nextEpoch,
  };
}

/** @deprecated 大厅直连；游戏侧请用 `authorizeCasualRunReplayCore` + HTTP */
export async function revertCasualRunForReplayCore(
  ctx: MutationCtx,
  args: { uid: string; matchGameId: string }
): Promise<StartCasualRunReplayResult | { ok: false; error: string }> {
  const r = await authorizeCasualRunReplayCore(ctx, args);
  if (!r.ok) return r;
  return {
    ok: true,
    gameId: r.gameId,
    templateId: r.templateId,
    matchId: r.matchId,
    resetCasualRun: true as const,
    replayEpoch: r.replayEpoch,
  };
}

export async function startCasualRunReplayWithToken(
  ctx: MutationCtx,
  args: {
    uid: string;
    matchGameId: string;
    replayTokenId: Id<"casual_replay_tokens">;
  }
): Promise<StartCasualRunReplayResult> {
  const r = await authorizeCasualRunReplayCore(ctx, {
    uid: args.uid,
    matchGameId: args.matchGameId,
    replayTokenId: args.replayTokenId,
  });
  if (!r.ok) return r;
  return {
    ok: true,
    gameId: r.gameId,
    templateId: r.templateId,
    matchId: r.matchId,
    resetCasualRun: true as const,
    replayEpoch: r.replayEpoch,
  };
}

export const authorizeCasualRunReplay = internalMutation({
  args: {
    uid: v.string(),
    matchGameId: v.string(),
    replayTokenId: v.optional(v.id("casual_replay_tokens")),
  },
  handler: async (ctx, args) => authorizeCasualRunReplayCore(ctx, args),
});
