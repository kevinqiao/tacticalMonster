import { v } from "convex/values";
import {
  getTournamentDefinition,
} from "../../../data/casualTournamentConfigs";
import { internalMutation, internalQuery, mutation, query } from "../../../_generated/server";
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
  applyAsyncBotFillPlanToMatch,
  buildCasualAsyncTableSummary,
  isCasualAsyncVirtualOpponentUid,
  type AsyncBotFill,
} from "../settle/casualRunSettlementFill";
import { canonicalCasualRunSessionExternalId } from "../shared/casualRunSession";
import type { Id } from "../../../_generated/dataModel";
import {
  finalizeCasualAsyncMatchIngest,
  runConfirmCasualRunWithoutReplay,
  settleSoloMaxPlayersOneCasualRun,
} from "./casualRunIngestCore";
export const getCasualAsyncTableSummaryForGame = query({
  args: {
    uid: v.string(),
    matchGameId: v.string(),
  },
  handler: async (ctx, { uid, matchGameId }) => {
    const pm = await ctx.db
      .query("casual_run_player_matches")
      .withIndex("by_gameId", (q) => q.eq("gameId", matchGameId))
      .unique();
    if (!pm || pm.uid !== uid) {
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
export const getCasualRunMatchGameType = internalQuery({
  args: { matchGameId: v.string() },
  handler: async (ctx, { matchGameId }) => {
    const pm = await ctx.db
      .query("casual_run_player_matches")
      .withIndex("by_gameId", (q) => q.eq("gameId", matchGameId))
      .unique();
    return pm?.gameType ?? null;
  },
});
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
        })
      )
    ),
    replaceAllVirtual: v.optional(v.boolean()),
  },
  handler: async (ctx, { uid, matchGameId, score, botFills, replaceAllVirtual }) => {
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
    if (!def || def.gameType !== pm.gameType) {
      return { ok: false as const, error: "bad_tournament" };
    }
    const gameType = pm.gameType;
    const sessionExternalId = canonicalCasualRunSessionExternalId(pm.matchId);
    if (!Number.isFinite(score) || score < 0) {
      return { ok: false as const, error: "bad_score" };
    }

    if (pm.status === "settled") {
      return { ok: true as const, deduped: true as const };
    }

    const now = Date.now();
    const defEarly = getTournamentDefinition(pm.templateId);
    if (!defEarly) {
      return { ok: false as const, error: "bad_tournament" };
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

    if (pm.status !== "open" && pm.status !== "replaying") {
      return { ok: false as const, error: "match_not_submittable" };
    }
    const matchDoc = await ctx.db.get(pm.matchId as Id<"casual_run_matches">);
    if (!matchDoc) {
      return { ok: false as const, error: "match_not_found" };
    }

    await ctx.db.patch(pm._id, {
      score,
      status: "finished",
      finishedAt: now,
      updatedAt: now,
    });

    const pmAfterFinish = (await ctx.db.get(pm._id)) ?? pm;
    await maybeGrantDevReplayTokensOnSubmit(ctx, {
      def,
      pm: pmAfterFinish,
      uid,
      now,
    });

    /** 虚拟对手一经 seed（botsSeeded）即不可替换；再战等重交分仅更新真人成绩 */
    if (
      def.maxPlayers > 1 &&
      botFills &&
      botFills.length > 0 &&
      !matchDoc.botsSeeded
    ) {
      const gt =
        gameType === "block_blast" || gameType === "solitaire" ? gameType : "solitaire";
      await applyAsyncBotFillPlanToMatch(ctx, {
        def,
        templateId: pm.templateId,
        matchId: pm.matchId,
        runTournamentId: pm.tournamentId,
        sessionExternalId,
        matchGameType: gt,
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

    /** 异步桌：任一真人仍在 `finished` 再战窗口内 → 不立刻全员 settled（再战由 query 拉取） */
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

    /** 仅真正单人桌（`maxPlayers === 1`，如日榜）走简路；A/B/C 即使仅 1 真人也需虚拟对手 + 名次赛季分 */
    if (def.maxPlayers <= 1) {
      return await settleSoloMaxPlayersOneCasualRun(ctx, {
        def,
        pm,
        matchDoc,
        uid,
        score,
        now,
        gameType,
      });
    }

    return await finalizeCasualAsyncMatchIngest(ctx, {
      def,
      pm,
      uid,
      now,
      gameType,
      humanPms,
      matchDoc,
      humanCountPlanned,
    });
  },
});
export const confirmCasualRunWithoutReplay = mutation({
  args: { uid: v.string(), matchGameId: v.string() },
  handler: runConfirmCasualRunWithoutReplay,
});

