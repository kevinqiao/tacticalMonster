/**
 * Run ingest ??:solo ?????? finalize???????(? Convex ??)?
 */
import { internal } from "../../../_generated/api";
import {
  getPortalTournamentDefinition,
  isPeriodScopedTournament,
  effectiveGameSequence,
  type CasualReferenceScoreQuantiles,
  type PortalTournamentDefinition,
} from "../../../data/portalTournamentConfigs";
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
import { assertRegisteredMatchGameType } from "../settle/async/casualAsyncTypes";
import { asyncMatchFinalizeDelayMs } from "../settle/async/casualAsyncBotDueTime";
import {
  clearAsyncMatchFinalizeSchedule,
  scheduleAsyncMatchFinalizeIfNeeded,
} from "../settle/casualAsyncMatchFinalizeSchedule";
import {
  allHumansConfirmed,
  allHumansSubmitted,
  isReplayableFinished,
  promoteExpiredFinishedInMatch,
} from "../shared/casualPlayerMatchStatus";
import { buildPartialIngestResponse } from "./casualRunIngestHelpers";
import { resolvePlayerGameIngestContext } from "./casualPlayerGameIngest";
import { playerGameId, loadSeedScoreQuantilesForSeat } from "../shared/casualPlayerGameTypes";
import { incrementRankCountsForSettledHumans } from "../shared/casualPlayerTournamentRankStats";
import { canonicalCasualRunSessionExternalId } from "../shared/casualRunSession";
import { getOrRepairPortalRunMatchDoc } from "../shared/portalRunMatchShell";
import {
  applyCasualTemplateScoreEffects,
  persistPendingRunRewards,
} from "../settle/casualRunScoreEffects";
import { applyWeeklyLeagueOnMatchSettle } from "../../weeklyLeague/casualWeeklyLeagueSettle";
import { CASUAL_WEEKLY_LEAGUE_ENABLED } from "../../../data/casualWeeklyLeagueConfig";
export async function settleSoloMaxPlayersOneCasualRun(
  ctx: MutationCtx,
  args: {
    def: PortalTournamentDefinition;
    pm: Doc<"portal_run_player_matches">;
    matchDoc: Doc<"portal_run_matches">;
    uid: string;
    score: number;
    now: number;
    gameType: string;
    seedScoreThreshold?: number;
    seedScoreQuantiles?: CasualReferenceScoreQuantiles;
  }
) {
  const { def, pm, matchDoc, uid, score, now, gameType } = args;
  const runTid = pm.tournamentId as Id<"portal_run_tournaments">;
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
    .query("portal_run_player_tournaments")
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
      matchGameId: playerGameId(pm.matchId, uid, 0),
      gameType: def.gameType,
    });
    let weeklyLeagueSettlePeriod: Awaited<ReturnType<typeof applyWeeklyLeagueOnMatchSettle>> = null;
    if (CASUAL_WEEKLY_LEAGUE_ENABLED) {
      weeklyLeagueSettlePeriod = await applyWeeklyLeagueOnMatchSettle(ctx, {
        uid,
        def,
        seasonXpOnSettle: def.seasonXpOnSettle,
        multiplayerFinalRank: 1,
        sessionKind: pm.sessionKind,
        now,
      });
    }
    await ctx.runMutation(internal.service.task.casualTaskService.notifyScoreSubmitted, {
      uid,
      matchType: def.matchType,
      platformGameType: def.gameType,
      multiplayerFinalRank: 1,
    });
    const tableSummaryPeriodSolo = casualTableSummarySolo(def.maxPlayers, score);
    return {
      ok: true as const,
      periodSettled: true as const,
      tableSummary: tableSummaryPeriodSolo,
      ...(weeklyLeagueSettlePeriod ? { weeklyLeagueSettle: weeklyLeagueSettlePeriod } : {}),
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
    sessionKind: pm.sessionKind,
    ...(typeof args.seedScoreThreshold === "number"
      ? { seedScoreThreshold: args.seedScoreThreshold }
      : {}),
    ...(args.seedScoreQuantiles ? { seedScoreQuantiles: args.seedScoreQuantiles } : {}),
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
    ...(typeof args.seedScoreThreshold === "number"
      ? {
          seedScoreThreshold: args.seedScoreThreshold,
          success: score >= args.seedScoreThreshold,
        }
      : {}),
  };
}

/** 异步桌：全员可终局时写入 `settled`、发奖并返回最终 `tableSummary`。 */
export async function finalizeCasualAsyncMatchIngest(
  ctx: MutationCtx,
  args: {
    def: PortalTournamentDefinition;
    pm: Doc<"portal_run_player_matches">;
    uid: string;
    now: number;
    gameType: string;
    humanPms: Doc<"portal_run_player_matches">[];
    matchDoc: Doc<"portal_run_matches">;
    humanCountPlanned: number;
  }
) {
  const { def, pm, uid, now, gameType, humanPms, matchDoc, humanCountPlanned } = args;
  const sessionExternalId = canonicalCasualRunSessionExternalId(pm.matchId);
  const runTid = pm.tournamentId as Id<"portal_run_tournaments">;
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
    await clearAsyncMatchFinalizeSchedule(ctx, matchDoc._id, now);
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
      .query("portal_run_player_tournaments")
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
    let lastWeeklyLeague: Awaited<ReturnType<typeof applyWeeklyLeagueOnMatchSettle>> = null;
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
        matchGameId: playerGameId(hp.matchId, hp.uid, 0),
        gameType: def.gameType,
      });
      const freshPm = await ctx.db.get(hp._id);
      const finalRank = freshPm?.rank;
      if (CASUAL_WEEKLY_LEAGUE_ENABLED) {
        lastWeeklyLeague = await applyWeeklyLeagueOnMatchSettle(ctx, {
          uid: hp.uid,
          def,
          seasonXpOnSettle: def.seasonXpOnSettle,
          multiplayerFinalRank: finalRank ?? undefined,
          sessionKind: hp.sessionKind,
          now,
        });
      }
      await ctx.runMutation(internal.service.task.casualTaskService.notifyScoreSubmitted, {
        uid: hp.uid,
        matchType: def.matchType,
        platformGameType: def.gameType,
        ...(typeof finalRank === "number" && finalRank >= 1
          ? { multiplayerFinalRank: finalRank }
          : {}),
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
      ...(lastWeeklyLeague ? { weeklyLeagueSettle: lastWeeklyLeague } : {}),
    };
  }

  let lastExtra: Awaited<ReturnType<typeof applyCasualTemplateScoreEffects>> = {
    xpDecayMultiplier: 1,
  };
  let lastWeeklyLeague: Awaited<ReturnType<typeof applyWeeklyLeagueOnMatchSettle>> = null;
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
      skipWeeklyLeagueXp: def.maxPlayers > 1,
      sessionKind: hp.sessionKind,
      seedScoreQuantiles: await loadSeedScoreQuantilesForSeat(ctx, hp._id),
      ...(typeof finalRank === "number" && finalRank >= 1
        ? { multiplayerFinalRank: finalRank }
        : {}),
    });
    await persistPendingRunRewards(ctx, runTid, hp.uid, extra.pendingWalletRewards);
    lastExtra = extra;
    if (CASUAL_WEEKLY_LEAGUE_ENABLED && def.maxPlayers > 1) {
      lastWeeklyLeague = await applyWeeklyLeagueOnMatchSettle(ctx, {
        uid: hp.uid,
        def,
        seasonXpOnSettle: def.seasonXpOnSettle,
        multiplayerFinalRank: finalRank ?? undefined,
        sessionKind: hp.sessionKind,
        now,
        xpDecayMultiplier: extra.xpDecayMultiplier,
      });
    } else if (extra.weeklyLeagueSettle) {
      lastWeeklyLeague = extra.weeklyLeagueSettle;
    }
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
    ...(lastWeeklyLeague ? { weeklyLeagueSettle: lastWeeklyLeague } : {}),
  };
}

export type TryFinalizeCasualAsyncMatchResult = {
  finalized: boolean;
  promotedOnly: boolean;
  scheduled?: boolean;
  scheduleSkippedDuplicate?: boolean;
  fin?: Awaited<ReturnType<typeof finalizeCasualAsyncMatchIngest>>;
};

/** ? match ???? `finished` ?? `confirmed`;?? confirmed ? bot ??? finalize(cron / confirm ??)? */
export async function tryFinalizeCasualAsyncMatch(
  ctx: MutationCtx,
  matchId: string,
  now: number,
  opts?: { viewerUid?: string; skipPromote?: boolean; skipBotDueWait?: boolean }
): Promise<TryFinalizeCasualAsyncMatchResult> {
  let matchDoc = await ctx.db.get(matchId as Id<"portal_run_matches">);
  const anchorPm = (
    await ctx.db
      .query("portal_run_player_matches")
      .withIndex("by_matchId", (q) => q.eq("matchId", matchId))
      .collect()
  ).find((p) => !isCasualAsyncVirtualOpponentUid(p.uid));

  if (!matchDoc && anchorPm) {
    const defGuess = getPortalTournamentDefinition(anchorPm.templateId);
    if (defGuess) {
      matchDoc = await getOrRepairPortalRunMatchDoc(
        ctx,
        matchId,
        defGuess,
        anchorPm.tournamentId as Id<"portal_run_tournaments">
      );
    }
  }

  if (!matchDoc || matchDoc.completed) {
    return { finalized: false, promotedOnly: false };
  }

  const def = getPortalTournamentDefinition(matchDoc.templateId);
  if (!def || def.maxPlayers <= 1) {
    return { finalized: false, promotedOnly: false };
  }

  if (!opts?.skipPromote) {
    await promoteExpiredFinishedInMatch(ctx, matchId, now);
  }

  const refreshed = await ctx.db
    .query("portal_run_player_matches")
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

  if (!allHumansConfirmed(humanPms)) {
    return { finalized: false, promotedOnly: true };
  }

  if (!opts?.skipBotDueWait) {
    const botGames = await ctx.db
      .query("portal_run_player_games")
      .withIndex("by_matchId", (q) => q.eq("matchId", matchId))
      .collect();
    const interval = asyncMatchFinalizeDelayMs({
      humanRows: humanPms,
      botRows: botGames,
      now,
    });
    if (interval > 0) {
      const matchFresh = (await ctx.db.get(matchDoc._id)) ?? matchDoc;
      const scheduleResult = await scheduleAsyncMatchFinalizeIfNeeded(ctx, {
        matchDoc: matchFresh,
        matchId,
        humanRows: humanPms,
        botRows: botGames,
        now,
      });
      return {
        finalized: false,
        promotedOnly: false,
        scheduled: scheduleResult.scheduled,
        scheduleSkippedDuplicate: scheduleResult.skippedDuplicate,
      };
    }
  }

  const anchor =
    humanPms.find((p) => p.score != null && (p.status === "confirmed" || p.status === "settled")) ??
    humanPms.find((p) => p.score != null) ??
    humanPms[0]!;
  const pmFresh = (await ctx.db.get(anchor._id)) ?? anchor;
  const humanCountPlanned = Math.max(1, matchDoc.humanPlayerCount ?? 1);
  const sequence = effectiveGameSequence(def);
  const gameTypeCheck = assertRegisteredMatchGameType(sequence[0] ?? def.gameType);
  if (!gameTypeCheck.ok) {
    return { finalized: false, promotedOnly: false };
  }
  const gameType = gameTypeCheck.gameType;
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
    const resolved = await resolvePlayerGameIngestContext(ctx, uid, matchGameId);
    if (!resolved.ok) {
      return { ok: false as const, error: resolved.error };
    }
    const pm = resolved.ctx.pm;
    const def = resolved.ctx.def;
    const gameType = resolved.ctx.gameType;

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

    const matchDoc = await ctx.db.get(pm.matchId as Id<"portal_run_matches">);
    if (!matchDoc) {
      return { ok: false as const, error: "match_not_found" };
    }

    const pmFresh = (await ctx.db.get(pm._id)) ?? pm;
    const gameTypeCheck = assertRegisteredMatchGameType(gameType);
    if (!gameTypeCheck.ok) {
      return { ok: false as const, error: gameTypeCheck.error };
    }

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
      .query("portal_run_player_matches")
      .withIndex("by_match_uid", (q) => q.eq("matchId", pm.matchId))
      .collect();
    const humanPms = refreshed.filter((p) => !isCasualAsyncVirtualOpponentUid(p.uid));
    const partial = await buildPartialIngestResponse(ctx, { humanPms });
    return {
      ok: true as const,
      confirmed: true as const,
      finalized: false as const,
      ...(def.maxPlayers > 1 ? { deferredFinalize: true as const } : {}),
      ...(finAttempt.scheduled ? { scheduledFinalize: true as const } : {}),
      ...(partial.pendingOthers ? { pendingOthers: true as const } : {}),
    };
}
