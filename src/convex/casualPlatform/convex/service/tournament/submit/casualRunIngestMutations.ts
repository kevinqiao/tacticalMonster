import { v } from "convex/values";
import {
  effectiveGameSequence,
  getTournamentDefinition,
} from "../../../data/casualTournamentConfigs";
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
  maybeGrantDevReplayTokensOnSubmit,
} from "./casualRunIngestHelpers";
import {
  finalizeSeatScoreFromGames,
  resolvePlayerGameIngestContext,
  unlockNextPlayerGame,
} from "./casualPlayerGameIngest";
import {
  applyAsyncBotFillPlanToMatch,
  buildCasualAsyncTableSummary,
  isCasualAsyncVirtualOpponentUid,
  type AsyncBotFill,
} from "../settle/casualRunSettlementFill";
import { assertRegisteredMatchGameType } from "../settle/async/casualAsyncTypes";
import { canonicalCasualRunSessionExternalId } from "../shared/casualRunSession";
import type { Id } from "../../../_generated/dataModel";
import { findPlayerGameByGameId } from "../shared/casualPlayerGameTypes";
import { cancelOpenRunSettleCheckForGameId } from "../settle/casualOpenRunSettleCheck";
import { serializeWatchReplaySnapshot } from "../shared/casualWatchReplaySnapshot";
import {
  runConfirmCasualRunWithoutReplay,
  settleSoloMaxPlayersOneCasualRun,
  tryFinalizeCasualAsyncMatch,
} from "./casualRunIngestCore";

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
    const def = getTournamentDefinition(pm.templateId);
    if (!def || def.maxPlayers <= 1) {
      return null;
    }
    const matchRows = await ctx.db
      .query("casual_run_player_matches")
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
    const now = Date.now();
    const replay = await buildCasualReplayOfferForPlayer(ctx, {
      def,
      pm,
      uid,
      now,
      tableSummary,
    });
    return {
      ...tableSummary,
      replayOffered: replay.replayOffered,
      replayTokenCount: replay.replayTokenCount,
      canReplay: replay.canReplay,
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
    const resolved = await resolvePlayerGameIngestContext(ctx, uid, matchGameId);
    if (!resolved.ok) {
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

    if (pm.status === "settled") {
      return { ok: true as const, deduped: true as const };
    }
    if (pm.status === "confirmed") {
      return { ok: true as const, deduped: true as const };
    }

    if (pm.status === "finished") {
      const humanPmsDedupe = (
        await ctx.db
          .query("casual_run_player_matches")
          .withIndex("by_match_uid", (q) => q.eq("matchId", pm.matchId))
          .collect()
      ).filter((p) => !isCasualAsyncVirtualOpponentUid(p.uid));
      const partial = await buildPartialIngestResponse(ctx, { humanPms: humanPmsDedupe });
      return {
        ok: true as const,
        deduped: true as const,
        ...(partial.pendingOthers ? { pendingOthers: true as const } : {}),
      };
    }

    if (pg.status !== "open" && pg.status !== "replaying") {
      return { ok: false as const, error: "match_not_submittable" };
    }
    if (pm.status !== "open" && pm.status !== "replaying") {
      return { ok: false as const, error: "match_not_submittable" };
    }

    await cancelOpenRunSettleCheckForGameId(ctx, matchGameId);

    const matchDoc = await ctx.db.get(pm.matchId as Id<"casual_run_matches">);
    if (!matchDoc) {
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

    if (!isLastGame) {
      const next = await unlockNextPlayerGame(ctx, { pm, pg, now });
      if (!next) {
        return { ok: false as const, error: "missing_next_game" };
      }
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
      !matchDoc.botsSeeded
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
    }

    await promoteExpiredFinishedInMatch(ctx, pm.matchId, now);

    const refreshed = await ctx.db
      .query("casual_run_player_matches")
      .withIndex("by_match_uid", (q) => q.eq("matchId", pm.matchId))
      .collect();

    const humanPms = refreshed.filter((p) => !isCasualAsyncVirtualOpponentUid(p.uid));
    const humanCountPlanned = Math.max(1, matchDoc.humanPlayerCount ?? 1);

    const anyHumanInReplayWindow =
      def.maxPlayers > 1 &&
      humanPms.some(
        (p) => p.status === "finished" && isReplayableFinished(p, p.templateId, now)
      );

    if (!allHumansSubmitted(humanPms) || anyHumanInReplayWindow) {
      const partial = await buildPartialIngestResponse(ctx, { humanPms });
      return {
        ok: true as const,
        ...(partial.pendingOthers ? { pendingOthers: true as const } : {}),
      };
    }

    if (def.maxPlayers <= 1) {
      return await settleSoloMaxPlayersOneCasualRun(ctx, {
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
    }

    const finAttempt = await tryFinalizeCasualAsyncMatch(ctx, pm.matchId, now, {
      viewerUid: uid,
      skipPromote: true,
    });

    if (finAttempt.finalized && finAttempt.fin) {
      return finAttempt.fin;
    }

    return {
      ok: true as const,
      finalized: false as const,
      deferredFinalize: true as const,
      ...(finAttempt.scheduled ? { scheduledFinalize: true as const } : {}),
    };
  },
});

export const confirmCasualRunWithoutReplay = authedMutation({
  args: { matchGameId: v.string() },
  handler: async (ctx, { matchGameId }) =>
    runConfirmCasualRunWithoutReplay(ctx, { uid: ctx.uid, matchGameId }),
});
