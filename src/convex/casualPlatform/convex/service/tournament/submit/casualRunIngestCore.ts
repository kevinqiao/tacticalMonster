/**
 * Run ingest 核心：solo 简路、异步桌 finalize、放弃再战确认（无 Convex 端点）。
 */
import { internal } from "../../../_generated/api";
import {
  getTournamentDefinition,
  isPeriodScopedTournament,
  type CasualTournamentDefinition,
} from "../../../data/casualTournamentConfigs";
import type { Doc, Id } from "../../../_generated/dataModel";
import type { MutationCtx } from "../../../_generated/server";
import {
  applyPeriodMatchScoreToInstanceState,
  ensureInstancePlayerStateRow,
  grantCasualScoreTierRewardsOnEachRunSettled,
} from "../list/casualInstanceService";
import {
  RUN_PLAYER_TOURNAMENT_COMPLETED,
  RUN_TOURNAMENT_COMPLETED,
} from "../join/casualTournamentJoinCore";
import {
  buildCasualAsyncTableSummary,
  casualTableSummarySolo,
  assignMatchRanksByScoreDesc,
  finalizeCasualAsyncTableSummaryForPlayer,
  isCasualAsyncVirtualOpponentUid,
} from "../settle/casualRunSettlementFill";
import {
  allHumansSubmitted,
  isReplayableFinished,
  promoteExpiredFinishedInMatch,
} from "../shared/casualPlayerMatchStatus";
import { buildPartialIngestResponse } from "./casualRunIngestHelpers";
import { incrementRankCountsForSettledHumans } from "../shared/casualPlayerTournamentRankStats";
import { canonicalCasualRunSessionExternalId } from "../shared/casualRunSession";
import { applyCasualTemplateLadderDelta } from "../../season/casualSeasonLadder";
import {
  activeSeasonId,
  applyCasualTemplateScoreEffects,
  persistPendingRunRewards,
} from "../settle/casualRunScoreEffects";
export async function settleSoloMaxPlayersOneCasualRun(
  ctx: MutationCtx,
  args: {
    def: CasualTournamentDefinition;
    pm: Doc<"casual_run_player_matches">;
    matchDoc: Doc<"casual_run_matches">;
    uid: string;
    score: number;
    now: number;
    gameType: string;
  }
) {
  const { def, pm, matchDoc, uid, score, now, gameType } = args;
  const runTid = pm.tournamentId as Id<"casual_run_tournaments">;
  const runRow = await ctx.db.get(runTid);
  const skipPeriodWallet = Boolean(isPeriodScopedTournament(def) && runRow?.instanceId);

  await ctx.db.patch(pm._id, {
    status: "settled",
    rank: 1,
    updatedAt: now,
  });

  await ctx.db.patch(matchDoc._id, {
    completed: true,
    updatedAt: now,
  });

  const pt = await ctx.db
    .query("casual_run_player_tournaments")
    .withIndex("by_tournament_uid", (q) => q.eq("tournamentId", runTid).eq("uid", uid))
    .unique();
  if (pt) {
    await ctx.db.patch(pt._id, {
      score,
      status: RUN_PLAYER_TOURNAMENT_COMPLETED,
      updatedAt: now,
    });
  }
  await ctx.db.patch(runTid, {
    status: RUN_TOURNAMENT_COMPLETED,
    updatedAt: now,
  });

  if (skipPeriodWallet && runRow?.instanceId) {
    await ensureInstancePlayerStateRow(ctx, {
      instanceId: runRow.instanceId,
      uid,
      now,
    });
    await applyPeriodMatchScoreToInstanceState(ctx, {
      instanceId: runRow.instanceId,
      uid,
      matchScore: score,
      now,
      def,
    });
    await grantCasualScoreTierRewardsOnEachRunSettled(ctx, {
      instanceId: runRow.instanceId,
      runTournamentId: runTid,
      uid,
      def,
      now,
      matchGameId: pm.gameId,
      gameType: def.gameType,
    });
    const seasonIdPeriod = await activeSeasonId(ctx);
    let periodLadderDelta = 0;
    if (seasonIdPeriod) {
      periodLadderDelta = await applyCasualTemplateLadderDelta(ctx, seasonIdPeriod, def, {
        uid,
        score,
        multiplayerFinalRank: 1,
      });
    }
    await ctx.runMutation(internal.service.task.casualTaskService.notifyScoreSubmitted, {
      uid,
      matchType: def.matchType,
      platformGameType: def.gameType,
      spotlightSeasonBoardGain:
        def.matchType === "season_challenge" ? periodLadderDelta : 0,
      multiplayerFinalRank: 1,
    });
    const tableSummaryPeriodSolo = casualTableSummarySolo(def.maxPlayers, score);
    return {
      ok: true as const,
      periodSettled: true as const,
      tableSummary: tableSummaryPeriodSolo,
    };
  }

  const extra = await applyCasualTemplateScoreEffects(ctx, def, {
    uid,
    tournamentId: pm.templateId,
    gameType,
    score,
    matchId: pm.matchId,
    runTournamentId: pm.tournamentId,
    multiplayerFinalRank: 1,
  });
  await persistPendingRunRewards(ctx, runTid, uid, extra.pendingWalletRewards);

  const tableBuilt = await buildCasualAsyncTableSummary(ctx, {
    templateId: pm.templateId,
    uid,
    maxPlayers: def.maxPlayers,
    matchId: pm.matchId,
  });
  const tableSummary = tableBuilt ?? casualTableSummarySolo(def.maxPlayers, score);

  return {
    ok: true as const,
    tableSummary,
    ...extra,
  };
}

/** å¼‚æ­¥æ¡Œï¼šå…¨å‘˜å¯ç»ˆå±€æ—¶å†™å…¥ `settled`ã€å‘å¥–å¹¶è¿”å›žæœ€ç»ˆ `tableSummary`ã€‚ */
export async function finalizeCasualAsyncMatchIngest(
  ctx: MutationCtx,
  args: {
    def: CasualTournamentDefinition;
    pm: Doc<"casual_run_player_matches">;
    uid: string;
    now: number;
    gameType: string;
    humanPms: Doc<"casual_run_player_matches">[];
    matchDoc: Doc<"casual_run_matches">;
    humanCountPlanned: number;
  }
) {
  const { def, pm, uid, now, gameType, humanPms, matchDoc, humanCountPlanned } = args;
  const sessionExternalId = canonicalCasualRunSessionExternalId(pm.matchId);
  const runTid = pm.tournamentId as Id<"casual_run_tournaments">;
  const runRow = await ctx.db.get(runTid);
  const skipPeriodWallet = Boolean(isPeriodScopedTournament(def) && runRow?.instanceId);

  const sortedHumans = [...humanPms].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  for (const hp of sortedHumans) {
    if (hp.status === "settled") continue;
    await ctx.db.patch(hp._id, {
      status: "settled",
      updatedAt: now,
    });
  }

  const matchBeforeFill = await ctx.db.get(matchDoc._id);
  if (matchBeforeFill && !matchBeforeFill.completed) {
    await assignMatchRanksByScoreDesc(ctx, {
      matchId: pm.matchId,
      updatedAt: now,
    });
    await ctx.db.patch(matchDoc._id, {
      completed: true,
      updatedAt: now,
    });
  } else {
    await assignMatchRanksByScoreDesc(ctx, {
      matchId: pm.matchId,
      updatedAt: now,
    });
  }

  await ctx.db.patch(runTid, {
    status: RUN_TOURNAMENT_COMPLETED,
    updatedAt: now,
  });

  const humanRankRows: Array<{ uid: string; rank?: number | null }> = [];
  for (const hp of sortedHumans) {
    const freshPm = await ctx.db.get(hp._id);
    humanRankRows.push({ uid: hp.uid, rank: freshPm?.rank });
  }
  await incrementRankCountsForSettledHumans(ctx, {
    templateId: pm.templateId,
    humanRows: humanRankRows,
    now,
  });

  for (const hp of sortedHumans) {
    const ptRow = await ctx.db
      .query("casual_run_player_tournaments")
      .withIndex("by_tournament_uid", (q) =>
        q.eq("tournamentId", runTid).eq("uid", hp.uid)
      )
      .unique();
    if (ptRow && hp.score != null) {
      await ctx.db.patch(ptRow._id, {
        score: hp.score,
        status: RUN_PLAYER_TOURNAMENT_COMPLETED,
        updatedAt: now,
      });
    }
  }

  if (skipPeriodWallet && runRow?.instanceId) {
    for (const hp of sortedHumans) {
      if (hp.score == null) continue;
      await ensureInstancePlayerStateRow(ctx, {
        instanceId: runRow.instanceId,
        uid: hp.uid,
        now,
      });
      await applyPeriodMatchScoreToInstanceState(ctx, {
        instanceId: runRow.instanceId,
        uid: hp.uid,
        matchScore: hp.score,
        now,
        def,
      });
      await grantCasualScoreTierRewardsOnEachRunSettled(ctx, {
        instanceId: runRow.instanceId,
        runTournamentId: runTid,
        uid: hp.uid,
        def,
        now,
        matchGameId: hp.gameId,
        gameType: def.gameType,
      });
      await ctx.runMutation(internal.service.task.casualTaskService.notifyScoreSubmitted, {
        uid: hp.uid,
        matchType: def.matchType,
        platformGameType: def.gameType,
        spotlightSeasonBoardGain: 0,
      });
    }
    const tableSummaryPeriodMulti = await finalizeCasualAsyncTableSummaryForPlayer(ctx, {
      def,
      templateId: pm.templateId,
      matchId: pm.matchId,
      runTournamentId: pm.tournamentId,
      sessionExternalId,
      uid,
      updatedAt: now,
    });
    return {
      ok: true as const,
      finalized: true as const,
      periodSettled: true as const,
      ...(tableSummaryPeriodMulti ? { tableSummary: tableSummaryPeriodMulti } : {}),
    };
  }

  let lastExtra: Awaited<ReturnType<typeof applyCasualTemplateScoreEffects>> = {};
  for (const hp of sortedHumans) {
    if (hp.score == null) continue;
    const freshPm = await ctx.db.get(hp._id);
    const finalRank = freshPm?.rank;
    const extra = await applyCasualTemplateScoreEffects(ctx, def, {
      uid: hp.uid,
      tournamentId: pm.templateId,
      gameType,
      score: hp.score,
      matchId: pm.matchId,
      runTournamentId: pm.tournamentId,
      skipCasualAsyncBotSeed: true,
      ...(typeof finalRank === "number" && finalRank >= 1
        ? { multiplayerFinalRank: finalRank }
        : {}),
    });
    await persistPendingRunRewards(ctx, runTid, hp.uid, extra.pendingWalletRewards);
    lastExtra = extra;
  }

  const tableSummaryReturn = await finalizeCasualAsyncTableSummaryForPlayer(ctx, {
    def,
    templateId: pm.templateId,
    matchId: pm.matchId,
    runTournamentId: pm.tournamentId,
    sessionExternalId,
    uid,
    updatedAt: now,
  });

  return {
    ok: true as const,
    finalized: true as const,
    ...(tableSummaryReturn ? { tableSummary: tableSummaryReturn } : {}),
    ...lastExtra,
  };
}

export type TryFinalizeCasualAsyncMatchResult = {
  finalized: boolean;
  promotedOnly: boolean;
  fin?: Awaited<ReturnType<typeof finalizeCasualAsyncMatchIngest>>;
};

/** 将 match 上过期的 `finished` 升为 `confirmed`，若全桌可终局则 `settled` 发奖（cron / confirm 共用）。 */
export async function tryFinalizeCasualAsyncMatch(
  ctx: MutationCtx,
  matchId: string,
  now: number,
  opts?: { viewerUid?: string; skipPromote?: boolean }
): Promise<TryFinalizeCasualAsyncMatchResult> {
  const matchDoc = await ctx.db.get(matchId as Id<"casual_run_matches">);
  if (!matchDoc || matchDoc.completed) {
    return { finalized: false, promotedOnly: false };
  }

  const def = getTournamentDefinition(matchDoc.templateId);
  if (!def || def.maxPlayers <= 1) {
    return { finalized: false, promotedOnly: false };
  }

  if (!opts?.skipPromote) {
    await promoteExpiredFinishedInMatch(ctx, matchId, now);
  }

  const refreshed = await ctx.db
    .query("casual_run_player_matches")
    .withIndex("by_match_uid", (q) => q.eq("matchId", matchId))
    .collect();
  const humanPms = refreshed.filter((p) => !isCasualAsyncVirtualOpponentUid(p.uid));
  if (humanPms.length === 0) {
    return { finalized: false, promotedOnly: false };
  }

  const anyHumanInReplayWindow = humanPms.some(
    (p) => p.status === "finished" && isReplayableFinished(p, p.templateId, now)
  );
  if (!allHumansSubmitted(humanPms) || anyHumanInReplayWindow) {
    return { finalized: false, promotedOnly: true };
  }

  const anchor =
    humanPms.find((p) => p.score != null && (p.status === "confirmed" || p.status === "settled")) ??
    humanPms.find((p) => p.score != null) ??
    humanPms[0]!;
  const pmFresh = (await ctx.db.get(anchor._id)) ?? anchor;
  const humanCountPlanned = Math.max(1, matchDoc.humanPlayerCount ?? 1);
  const gameType = pmFresh.gameType === "block_blast" ? "block_blast" : "solitaire";
  const tableSummaryUid = opts?.viewerUid ?? anchor.uid;

  const fin = await finalizeCasualAsyncMatchIngest(ctx, {
    def,
    pm: pmFresh,
    uid: tableSummaryUid,
    now,
    gameType,
    humanPms,
    matchDoc,
    humanCountPlanned,
  });
  return { finalized: true, promotedOnly: false, fin };
}

export async function runConfirmCasualRunWithoutReplay(
  ctx: MutationCtx,
  { uid, matchGameId }: { uid: string; matchGameId: string }
) {
    const pm = await ctx.db
      .query("casual_run_player_matches")
      .withIndex("by_gameId", (q) => q.eq("gameId", matchGameId))
      .unique();
    if (!pm) {
      return { ok: false as const, error: "unknown_match_game" };
    }
    if (pm.uid !== uid) {
      return { ok: false as const, error: "forbidden" };
    }
    const def = getTournamentDefinition(pm.templateId);
    if (!def) {
      return { ok: false as const, error: "bad_tournament" };
    }

    const now = Date.now();
    const sessionExternalId = canonicalCasualRunSessionExternalId(pm.matchId);

    if (pm.status === "settled") {
      const tableSummary = await finalizeCasualAsyncTableSummaryForPlayer(ctx, {
        def,
        templateId: pm.templateId,
        matchId: pm.matchId,
        runTournamentId: pm.tournamentId,
        sessionExternalId,
        uid,
        updatedAt: now,
      });
      return {
        ok: true as const,
        confirmed: true as const,
        finalized: true as const,
        deduped: true as const,
        ...(tableSummary ? { tableSummary } : {}),
      };
    }

    if (pm.status === "open" || pm.status === "replaying") {
      return { ok: false as const, error: "match_not_submitted" };
    }

    if (pm.status === "finished") {
      await ctx.db.patch(pm._id, {
        status: "confirmed",
        updatedAt: now,
      });
    }

    await promoteExpiredFinishedInMatch(ctx, pm.matchId, now);

    const matchDoc = await ctx.db.get(pm.matchId as Id<"casual_run_matches">);
    if (!matchDoc) {
      return { ok: false as const, error: "match_not_found" };
    }

    const pmFresh = (await ctx.db.get(pm._id)) ?? pm;
    const gameType = pm.gameType === "block_blast" ? "block_blast" : "solitaire";

    if (
      def.maxPlayers <= 1 &&
      pmFresh.status !== "settled" &&
      pmFresh.score != null &&
      Number.isFinite(pmFresh.score)
    ) {
      const solo = await settleSoloMaxPlayersOneCasualRun(ctx, {
        def,
        pm: pmFresh,
        matchDoc,
        uid,
        score: pmFresh.score as number,
        now,
        gameType,
      });
      return {
        ...solo,
        confirmed: true as const,
        finalized: true as const,
      };
    }

    const finAttempt = await tryFinalizeCasualAsyncMatch(ctx, pm.matchId, now, {
      viewerUid: uid,
      skipPromote: true,
    });

    if (finAttempt.finalized && finAttempt.fin) {
      return {
        ...finAttempt.fin,
        confirmed: true as const,
      };
    }

    const refreshed = await ctx.db
      .query("casual_run_player_matches")
      .withIndex("by_match_uid", (q) => q.eq("matchId", pm.matchId))
      .collect();
    const humanPms = refreshed.filter((p) => !isCasualAsyncVirtualOpponentUid(p.uid));
    const partial = await buildPartialIngestResponse(ctx, { humanPms });
    return {
      ok: true as const,
      confirmed: true as const,
      finalized: false as const,
      ...(def.maxPlayers > 1 ? { deferredFinalize: true as const } : {}),
      ...(partial.pendingOthers ? { pendingOthers: true as const } : {}),
    };
}
