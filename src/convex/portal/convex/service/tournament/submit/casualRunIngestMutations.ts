import { v } from "convex/values";
import {
  effectiveGameSequence,
  getPortalTournamentDefinition,
  type PortalTournamentDefinition,
} from "../../../data/portalTournamentConfigs";
import { internalMutation, internalQuery } from "../../../_generated/server";
import { authedMutation, authedQuery } from "../../../custom/session";
import {
  allHumansSubmitted,
  isReplayableFinished,
  promoteExpiredFinishedInMatch,
} from "../shared/casualPlayerMatchStatus";
import {
  buildCasualReplayOfferForPlayer,
  buildPartialIngestResponse,
  buildIngestTableSummaryForPlayer,
  buildDeferredSoloPortalIngestResponse,
  shouldDeferSoloSettleForPortalAdReplay,
  enrichIngestTableSummaryWithReplay,
  attachIngestSyncResponse,
  maybeGrantDevReplayTokensOnSubmit,
} from "./casualRunIngestHelpers";
import {
  finalizeSeatScoreFromGames,
  resolvePlayerGameIngestContext,
  unlockNextPlayerGame,
} from "./casualPlayerGameIngest";
import { createIngestTiming } from "./casualIngestTiming";
import {
  applyAsyncBotFillPlanToMatch,
  buildCasualAsyncTableSummary,
  isCasualAsyncVirtualOpponentUid,
  type AsyncBotFill,
  type CasualAsyncTableSummary,
} from "../settle/casualRunSettlementFill";
import { casualTableSummarySolo } from "../settle/async/casualAsyncTableSummary";
import { resolvePortalSoloChallengeSuccessForPlayerGame } from "../../ads/portalAdReplayEligibility";
import { assertRegisteredMatchGameType } from "../settle/async/casualAsyncTypes";
import { canonicalCasualRunSessionExternalId } from "../shared/casualRunSession";
import type { Id, Doc } from "../../../_generated/dataModel";
import { isPortalAdReplayTemplate } from "../../../data/portalAdReplayConfig";
import { findPlayerGameByGameId } from "../shared/casualPlayerGameTypes";
import { cancelOpenRunSettleCheckForGameId } from "../settle/casualOpenRunSettleCheck";
import { serializeWatchReplaySnapshot } from "../shared/casualWatchReplaySnapshot";
import { getOrRepairPortalRunMatchDoc, inferPortalRunMatchShell } from "../shared/portalRunMatchShell";
import {
  runConfirmCasualRunWithoutReplay,
  settleSoloMaxPlayersOneCasualRun,
  tryFinalizeCasualAsyncMatch,
} from "./casualRunIngestCore";

function attachIngestSeedScoreThreshold<T extends Record<string, unknown>>(
  body: T,
  threshold?: number
): T & { seedScoreThreshold?: number } {
  if (threshold == null) return body;
  return { ...body, seedScoreThreshold: threshold };
}

async function finishIngestWithSyncTableSummary(
  ctx: Parameters<typeof buildIngestTableSummaryForPlayer>[0],
  timing: ReturnType<typeof createIngestTiming>,
  finishLabel: string,
  body: Record<string, unknown>,
  args: {
    def: PortalTournamentDefinition;
    templateId: string;
    uid: string;
    matchId: string;
    matchGameId: string;
    pm: Doc<"portal_run_player_matches">;
    now: number;
    seedScoreThreshold?: number;
  },
  finishExtra?: Record<string, unknown>
) {
  if (args.def.maxPlayers <= 1 && shouldDeferSoloSettleForPortalAdReplay(args.templateId)) {
    const freshPm = (await ctx.db.get(args.pm._id)) ?? args.pm;
    const deferBody = await buildDeferredSoloPortalIngestResponse(ctx, {
      def: args.def,
      pm: freshPm,
      uid: args.uid,
      now: args.now,
      matchGameId: args.matchGameId,
      totalScore: freshPm.score ?? 0,
      ...(typeof args.seedScoreThreshold === "number"
        ? { seedScoreThreshold: args.seedScoreThreshold }
        : {}),
    });
    /** 无再战窗口时不得挂起结算（否则历史一直「等待结算」） */
    if (
      deferBody.tableSummary.replayOffered &&
      freshPm.status !== "settled"
    ) {
      timing.finish(finishLabel, {
        hasTableSummary: Boolean(deferBody.tableSummary),
        deferredSoloSettle: true,
        ...finishExtra,
      });
      return attachIngestSyncResponse(body, {
        tableSummary: deferBody.tableSummary,
        seedScoreThreshold: deferBody.seedScoreThreshold ?? args.seedScoreThreshold,
        ...(typeof deferBody.success === "boolean" ? { success: deferBody.success } : {}),
      });
    }
    if (
      freshPm.status !== "settled" &&
      freshPm.score != null &&
      Number.isFinite(freshPm.score)
    ) {
      const matchDoc = await ctx.db.get(args.matchId as Id<"portal_run_matches">);
      if (matchDoc) {
        const gameTypeCheck = assertRegisteredMatchGameType(args.def.gameType);
        if (gameTypeCheck.ok) {
          const soloResult = await settleSoloMaxPlayersOneCasualRun(ctx, {
            def: args.def,
            pm: freshPm,
            matchDoc,
            uid: args.uid,
            score: freshPm.score as number,
            now: args.now,
            gameType: args.def.gameType,
            ...(typeof args.seedScoreThreshold === "number"
              ? { seedScoreThreshold: args.seedScoreThreshold }
              : {}),
          });
          timing.finish(finishLabel, {
            hasTableSummary: Boolean(soloResult.tableSummary ?? deferBody.tableSummary),
            settledDeferredSolo: true,
            ...finishExtra,
          });
          return attachIngestSyncResponse(
            { ...body, ...soloResult },
            {
              tableSummary: soloResult.tableSummary ?? deferBody.tableSummary,
              seedScoreThreshold:
                deferBody.seedScoreThreshold ?? args.seedScoreThreshold,
              ...(typeof deferBody.success === "boolean"
                ? { success: deferBody.success }
                : {}),
            }
          );
        }
      }
    }
    timing.finish(finishLabel, {
      hasTableSummary: Boolean(deferBody.tableSummary),
      ...finishExtra,
    });
    return attachIngestSyncResponse(body, {
      tableSummary: deferBody.tableSummary,
      seedScoreThreshold: deferBody.seedScoreThreshold ?? args.seedScoreThreshold,
      ...(typeof deferBody.success === "boolean" ? { success: deferBody.success } : {}),
    });
  }

  let tableSummary = await buildIngestTableSummaryForPlayer(ctx, args);
  tableSummary = await enrichIngestTableSummaryWithReplay(ctx, {
    def: args.def,
    pm: args.pm,
    uid: args.uid,
    now: args.now,
    matchGameId: args.matchGameId,
    tableSummary,
  });
  timing.finish(finishLabel, {
    hasTableSummary: Boolean(tableSummary),
    ...finishExtra,
  });
  return attachIngestSyncResponse(body, {
    tableSummary,
    seedScoreThreshold: args.seedScoreThreshold,
  });
}

export const getCasualAsyncTableSummaryForGame = authedQuery({
  args: {
    matchGameId: v.string(),
  },
  handler: async (ctx, { matchGameId }) => {
    const uid = ctx.uid;
    const pg = await findPlayerGameByGameId(ctx, matchGameId);
    if (!pg || pg.uid !== uid) {
      return null;
    }
    const pm = await ctx.db.get(pg.playerMatchId);
    if (!pm) {
      return null;
    }
    const def = getPortalTournamentDefinition(pm.templateId);
    if (!def) {
      return null;
    }
    const now = Date.now();
    if (def.maxPlayers <= 1) {
      if (!isPortalAdReplayTemplate(pm.templateId)) {
        return null;
      }
      const tableSummary = casualTableSummarySolo(def.maxPlayers, pm.score ?? 0);
      const challengeSuccess = await resolvePortalSoloChallengeSuccessForPlayerGame(ctx, {
        def,
        pg,
        score: pm.score ?? 0,
      });
      const replay = await buildCasualReplayOfferForPlayer(ctx, {
        def,
        pm,
        uid,
        now,
        matchGameId,
        tableSummary,
        challengeSuccess,
      });
      return {
        ...tableSummary,
        replayOffered: replay.replayOffered,
        replayMode: replay.replayMode,
        replayTokenCount: replay.replayTokenCount,
        canReplay: replay.canReplay,
        adReplayDailyRemaining: replay.adReplayDailyRemaining,
        adReplayDailyCap: replay.adReplayDailyCap,
        ...(replay.replayWindowEndsAt != null ? { replayWindowEndsAt: replay.replayWindowEndsAt } : {}),
      };
    }
    const matchRows = await ctx.db
      .query("portal_run_player_matches")
      .withIndex("by_match_uid", (q) => q.eq("matchId", pm.matchId))
      .collect();
    const humanRows = matchRows.filter((r) => !isCasualAsyncVirtualOpponentUid(r.uid));
    const allHumansSettled =
      humanRows.length > 0 && humanRows.every((r) => r.status === "settled");
    const tableSummary = await buildCasualAsyncTableSummary(ctx, {
      templateId: pm.templateId,
      uid,
      maxPlayers: def.maxPlayers,
      matchId: pm.matchId,
      allHumansSettled,
    });
    if (!tableSummary) return null;
    const replay = await buildCasualReplayOfferForPlayer(ctx, {
      def,
      pm,
      uid,
      now,
      matchGameId,
      tableSummary,
    });
    return {
      ...tableSummary,
      replayOffered: replay.replayOffered,
      replayMode: replay.replayMode,
      replayTokenCount: replay.replayTokenCount,
      canReplay: replay.canReplay,
      adReplayDailyRemaining: replay.adReplayDailyRemaining,
      adReplayDailyCap: replay.adReplayDailyCap,
      ...(replay.replayWindowEndsAt != null ? { replayWindowEndsAt: replay.replayWindowEndsAt } : {}),
    };
  },
});

export { getCasualRunMatchGameType } from "./casualRunBridgeQueries";

export const submitCasualRunScoreCore = internalMutation({
  args: {
    uid: v.string(),
    matchGameId: v.string(),
    score: v.number(),
    botFills: v.optional(
      v.array(
        v.object({
          rank: v.number(),
          score: v.number(),
          duration: v.optional(v.number()),
          rolloutIndex: v.optional(v.number()),
          revealAt: v.optional(v.number()),
          legs: v.optional(
            v.array(
              v.object({
                gameIndex: v.number(),
                score: v.number(),
                rolloutIndex: v.optional(v.number()),
                duration: v.optional(v.number()),
              })
            )
          ),
        })
      )
    ),
    replaceAllVirtual: v.optional(v.boolean()),
    seedScoreThreshold: v.optional(v.number()),
    watchReplay: v.optional(
      v.object({
        seedId: v.string(),
        steps: v.array(v.any()),
      })
    ),
  },
  handler: async (
    ctx,
    { uid, matchGameId, score, botFills, replaceAllVirtual, seedScoreThreshold, watchReplay }
  ) => {
    const timing = createIngestTiming("submitCasualRunScoreCore", matchGameId);
    timing.mark("start", {
      uid,
      score,
      botFillCount: botFills?.length ?? 0,
    });

    const resolved = await resolvePlayerGameIngestContext(ctx, uid, matchGameId);
    timing.mark("resolvePlayerGameIngestContext", {
      ok: resolved.ok,
      ...(!resolved.ok ? { error: resolved.error } : {}),
    });
    if (!resolved.ok) {
      timing.finish("abort.resolve");
      return { ok: false as const, error: resolved.error };
    }
    const { pg, pm, def, gameType, isLastGame } = resolved.ctx;

    const regCheck = assertRegisteredMatchGameType(gameType);
    if (!regCheck.ok) {
      return regCheck;
    }
    const sessionExternalId = canonicalCasualRunSessionExternalId(pm.matchId);
    if (!Number.isFinite(score) || score < 0) {
      return { ok: false as const, error: "bad_score" };
    }

    const syncSummaryArgs = {
      def,
      templateId: pm.templateId,
      uid,
      matchId: pm.matchId,
      matchGameId,
      pm,
      now: Date.now(),
      seedScoreThreshold,
    };

    if (pm.status === "settled") {
      return finishIngestWithSyncTableSummary(
        ctx,
        timing,
        "deduped.settled",
        { ok: true as const, deduped: true as const },
        syncSummaryArgs
      );
    }
    if (pm.status === "confirmed") {
      return finishIngestWithSyncTableSummary(
        ctx,
        timing,
        "deduped.confirmed",
        { ok: true as const, deduped: true as const },
        syncSummaryArgs
      );
    }

    if (pm.status === "finished") {
      const humanPmsDedupe = (
        await ctx.db
          .query("portal_run_player_matches")
          .withIndex("by_match_uid", (q) => q.eq("matchId", pm.matchId))
          .collect()
      ).filter((p) => !isCasualAsyncVirtualOpponentUid(p.uid));
      const partial = await buildPartialIngestResponse(ctx, { humanPms: humanPmsDedupe });
      return finishIngestWithSyncTableSummary(
        ctx,
        timing,
        "deduped.finished",
        {
          ok: true as const,
          deduped: true as const,
          ...(partial.pendingOthers ? { pendingOthers: true as const } : {}),
        },
        syncSummaryArgs,
        { pendingOthers: partial.pendingOthers ?? false }
      );
    }

    if (pg.status !== "open" && pg.status !== "replaying") {
      return { ok: false as const, error: "match_not_submittable" };
    }
    if (pm.status !== "open" && pm.status !== "replaying") {
      return { ok: false as const, error: "match_not_submittable" };
    }

    await cancelOpenRunSettleCheckForGameId(ctx, matchGameId);
    timing.mark("cancelOpenRunSettleCheckForGameId");

    let matchDoc = await ctx.db.get(pm.matchId as Id<"portal_run_matches">);
    if (!matchDoc) {
      matchDoc = await getOrRepairPortalRunMatchDoc(
        ctx,
        pm.matchId,
        def,
        pm.tournamentId as Id<"portal_run_tournaments">
      );
      timing.mark("getOrRepairPortalRunMatchShell", { repaired: Boolean(matchDoc) });
    } else {
      timing.mark("loadMatchDoc", { hasMatchDoc: true });
    }
    const inferredShell =
      matchDoc == null
        ? await inferPortalRunMatchShell(
            ctx,
            pm.matchId,
            def,
            pm.tournamentId as Id<"portal_run_tournaments">
          )
        : null;
    if (matchDoc == null) {
      timing.mark("inferPortalRunMatchShell", { inferred: Boolean(inferredShell) });
    }
    if (!matchDoc && !inferredShell) {
      timing.finish("abort.match_not_found");
      return { ok: false as const, error: "match_not_found" };
    }

    const now = Date.now();
    const replayPatch =
      watchReplay != null
        ? serializeWatchReplaySnapshot({
            seedId: watchReplay.seedId,
            steps: watchReplay.steps,
          })
        : undefined;
    await ctx.db.patch(pg._id, {
      score,
      status: "finished",
      finishedAt: now,
      updatedAt: now,
      ...(replayPatch ?? {}),
    });
    timing.mark("patchHumanPlayerGame", { hasWatchReplay: watchReplay != null });

    if (!isLastGame) {
      const next = await unlockNextPlayerGame(ctx, { pm, pg, now });
      if (!next) {
        timing.finish("abort.missing_next_game");
        return { ok: false as const, error: "missing_next_game" };
      }
      timing.finish("unlockNextPlayerGame");
      return {
        ok: true as const,
        gameComplete: true as const,
        nextGame: {
          gameIndex: next.gameIndex,
          gameId: next.gameId,
          gameType: next.gameType,
        },
      };
    }

    const totalScore = await finalizeSeatScoreFromGames(ctx, pm._id, now);
    const pmAfterFinish = (await ctx.db.get(pm._id)) ?? pm;
    timing.mark("finalizeSeatScoreFromGames", { totalScore });

    await maybeGrantDevReplayTokensOnSubmit(ctx, {
      def,
      pm: pmAfterFinish,
      uid,
      now,
    });

    if (
      def.maxPlayers > 1 &&
      botFills &&
      botFills.length > 0 &&
      !(matchDoc?.botsSeeded ?? inferredShell?.botsSeeded)
    ) {
      const botGameType = effectiveGameSequence(def)[0] ?? gameType;
      await applyAsyncBotFillPlanToMatch(ctx, {
        def,
        templateId: pm.templateId,
        matchId: pm.matchId,
        runTournamentId: pm.tournamentId,
        sessionExternalId,
        matchGameType: botGameType,
        botFills: botFills as AsyncBotFill[],
        updatedAt: now,
        replaceAllVirtual: replaceAllVirtual ?? true,
      });
      timing.mark("applyAsyncBotFillPlanToMatch", { botFillCount: botFills.length });
    } else {
      timing.mark("skip.applyAsyncBotFillPlanToMatch", {
        maxPlayers: def.maxPlayers,
        botFillCount: botFills?.length ?? 0,
        botsSeeded: Boolean(matchDoc?.botsSeeded ?? inferredShell?.botsSeeded),
      });
    }

    await promoteExpiredFinishedInMatch(ctx, pm.matchId, now);
    timing.mark("promoteExpiredFinishedInMatch");

    const refreshed = await ctx.db
      .query("portal_run_player_matches")
      .withIndex("by_match_uid", (q) => q.eq("matchId", pm.matchId))
      .collect();

    const humanPms = refreshed.filter((p) => !isCasualAsyncVirtualOpponentUid(p.uid));
    const humanCountPlanned = Math.max(
      1,
      matchDoc?.humanPlayerCount ?? inferredShell?.humanPlayerCount ?? 1
    );

    const anyHumanInReplayWindow =
      def.maxPlayers > 1 &&
      humanPms.some(
        (p) => p.status === "finished" && isReplayableFinished(p, p.templateId, now)
      );

    if (!allHumansSubmitted(humanPms) || anyHumanInReplayWindow) {
      const partial = await buildPartialIngestResponse(ctx, { humanPms });
      return finishIngestWithSyncTableSummary(
        ctx,
        timing,
        "partial.pendingOthers",
        {
          ok: true as const,
          ...(partial.pendingOthers ? { pendingOthers: true as const } : {}),
        },
        syncSummaryArgs,
        { pendingOthers: partial.pendingOthers ?? false }
      );
    }

    if (def.maxPlayers <= 1) {
      if (!matchDoc) {
        timing.finish("abort.match_not_found.solo");
        return { ok: false as const, error: "match_not_found" };
      }
      if (shouldDeferSoloSettleForPortalAdReplay(pm.templateId)) {
        timing.mark("solo.deferredSettleForAdReplay.start");
        const deferBody = await buildDeferredSoloPortalIngestResponse(ctx, {
          def,
          pm: pmAfterFinish,
          uid,
          now,
          matchGameId,
          totalScore,
          ...(typeof seedScoreThreshold === "number" ? { seedScoreThreshold } : {}),
        });
        if (deferBody.tableSummary.replayOffered) {
          timing.finish("solo.deferredSettleForAdReplay", {
            replayOffered: true,
          });
          return attachIngestSeedScoreThreshold(deferBody, seedScoreThreshold);
        }
        timing.mark("solo.deferredSettleSkippedNoReplayOffer");
      }
      timing.mark("settleSoloMaxPlayersOneCasualRun.start");
      const soloResult = await settleSoloMaxPlayersOneCasualRun(ctx, {
        def,
        pm: pmAfterFinish,
        matchDoc,
        uid,
        score: totalScore,
        now,
        gameType,
        ...(typeof seedScoreThreshold === "number" ? { seedScoreThreshold } : {}),
        ...(pg.seedBinding?.scoreQuantiles
          ? { seedScoreQuantiles: pg.seedBinding.scoreQuantiles }
          : {}),
      });
      timing.finish("settleSoloMaxPlayersOneCasualRun", { ok: soloResult.ok });
      return attachIngestSeedScoreThreshold(soloResult, seedScoreThreshold);
    }

    const finAttempt = await tryFinalizeCasualAsyncMatch(ctx, pm.matchId, now, {
      viewerUid: uid,
      skipPromote: true,
    });
    timing.mark("tryFinalizeCasualAsyncMatch", {
      finalized: finAttempt.finalized,
      scheduled: finAttempt.scheduled ?? false,
    });

    if (finAttempt.finalized && finAttempt.fin) {
      timing.finish("finalized");
      const finWithSummary = finAttempt.fin as Record<string, unknown> & {
        tableSummary?: CasualAsyncTableSummary;
      };
      const tableSummary = await enrichIngestTableSummaryWithReplay(ctx, {
        def,
        pm,
        uid,
        now,
        matchGameId,
        tableSummary:
          finWithSummary.tableSummary ??
          (await buildIngestTableSummaryForPlayer(ctx, syncSummaryArgs)),
      });
      return attachIngestSyncResponse(finWithSummary, {
        tableSummary,
        seedScoreThreshold,
      });
    }

    return finishIngestWithSyncTableSummary(
      ctx,
      timing,
      "deferredFinalize",
      {
        ok: true as const,
        finalized: false as const,
        deferredFinalize: true as const,
        ...(finAttempt.scheduled ? { scheduledFinalize: true as const } : {}),
      },
      syncSummaryArgs,
      { scheduledFinalize: finAttempt.scheduled ?? false }
    );
  },
});

export const confirmCasualRunWithoutReplay = authedMutation({
  args: { matchGameId: v.string() },
  handler: async (ctx, { matchGameId }) =>
    runConfirmCasualRunWithoutReplay(ctx, { uid: ctx.uid, matchGameId }),
});
