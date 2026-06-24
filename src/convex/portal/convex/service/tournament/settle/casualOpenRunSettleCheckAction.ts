"use node";

import { v } from "convex/values";

import { internal } from "../../../_generated/api";
import { internalAction } from "../../../_generated/server";
import { forceEndCasualRunOnArena } from "./casualArenaForceEnd";

export const runOpenRunSettleCheck = internalAction({
  args: {
    playerGameId: v.id("portal_run_player_games"),
    gameId: v.string(),
    uid: v.string(),
    gameType: v.string(),
    dueAt: v.number(),
  },
  handler: async (ctx, args) => {
    const state = await ctx.runQuery(
      internal.service.tournament.settle.casualOpenRunSettleCheck.getOpenRunSettleCheckState,
      { playerGameId: args.playerGameId, dueAt: args.dueAt }
    );

    if (!state.needsSettle) {
      if (state.reason === "not_due" && state.rescheduleMs != null && state.rescheduleMs > 0) {
        await ctx.scheduler.runAfter(
          state.rescheduleMs,
          internal.service.tournament.settle.casualOpenRunSettleCheckAction.runOpenRunSettleCheck,
          args
        );
      }
      return { ok: true as const, skipped: true as const, reason: state.reason };
    }

    const arena = await forceEndCasualRunOnArena({
      uid: state.uid,
      gameId: state.gameId,
      gameType: state.gameType,
    });

    if (arena.ok) {
      console.log("[portal] openRunSettleCheck arena forceEnd ok", state.gameId);
      return { ok: true as const, via: "arena" as const };
    }

    const afterArena = await ctx.runQuery(
      internal.service.tournament.settle.casualOpenRunSettleCheck.getOpenRunSettleCheckState,
      { playerGameId: args.playerGameId, dueAt: args.dueAt }
    );
    if (!afterArena.needsSettle) {
      return { ok: true as const, via: "arena_side_effect" as const };
    }

    const ingest = await ctx.runMutation(
      internal.service.tournament.submit.casualRunIngestMutations.submitCasualRunScoreCore,
      {
        uid: state.uid,
        matchGameId: state.gameId,
        score: 0,
      }
    );
    if (!ingest.ok) {
      console.warn("[portal] openRunSettleCheck platform ingest failed", state.gameId, ingest.error);
      return { ok: false as const, error: ingest.error, arenaError: arena.error };
    }

    console.log("[portal] openRunSettleCheck platform ingest ok", state.gameId, arena.error);
    return { ok: true as const, via: "platform_score_zero" as const, arenaError: arena.error };
  },
});
