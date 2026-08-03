"use node";

import { v } from "convex/values";

import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { postCasualRunIngest } from "./casualBridgeIngest";
import { buildYatzWatchReplayPayload } from "./yatzWatchReplayPayload";
import type { YatzGameState } from "../types/YatzTypes";

export const checkCasualGameTimeoutAndIngest = internalAction({
  args: {
    gameRowId: v.id("yatz_game"),
    gameId: v.string(),
    uid: v.string(),
  },
  handler: async (ctx, { gameRowId, gameId, uid }) => {
    const settled = await ctx.runMutation(
      internal.service.casualGameLifecycle.settleCasualGameFromTable,
      { gameId, uid, gameRowId }
    );
    if (!settled.ok || !settled.shouldIngest) {
      console.log("[yatz] timeout job skip", gameId, settled);
      return { ok: true as const, skipped: true as const };
    }

    const gameRow = await ctx.runQuery(internal.service.gameManager.findGame, { gameId });
    const watchReplay = gameRow
      ? buildYatzWatchReplayPayload(gameRow as YatzGameState)
      : undefined;

    const ingest = await postCasualRunIngest({
      uid: settled.uid,
      matchGameId: settled.gameId,
      score: settled.score,
      ...(watchReplay ? { watchReplay } : {}),
    });
    if (!ingest.ok) {
      console.warn("[yatz] timeout ingest failed", gameId, ingest.error);
      return { ok: false as const, error: ingest.error };
    }
    console.log("[yatz] timeout ingest ok", gameId, ingest.parsed.deduped);
    return { ok: true as const, ingested: true as const };
  },
});
