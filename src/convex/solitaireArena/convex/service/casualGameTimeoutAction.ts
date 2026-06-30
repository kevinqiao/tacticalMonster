"use node";

import { v } from "convex/values";

import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { postCasualRunIngest } from "./casualBridgeIngest";
import { resolvePlatformBridgeForCasualGameId } from "./casualBridgeEnv";

export const checkCasualGameTimeoutAndIngest = internalAction({
  args: {
    gameRowId: v.id("game"),
    gameId: v.string(),
    uid: v.string(),
  },
  handler: async (ctx, { gameRowId, gameId, uid }) => {
    const settled = await ctx.runMutation(
      internal.service.casualGameLifecycle.settleCasualGameFromTable,
      { gameId, uid, gameRowId }
    );
    if (!settled.ok || !settled.shouldIngest) {
      console.log("[solitaire] timeout job skip", gameId, settled);
      return { ok: true as const, skipped: true as const };
    }

    const platformBridge = await resolvePlatformBridgeForCasualGameId(settled.gameId);
    const ingest = await postCasualRunIngest({
      uid: settled.uid,
      matchGameId: settled.gameId,
      score: settled.score,
      platformBridge,
    });
    if (!ingest.ok) {
      console.warn("[solitaire] timeout ingest failed", gameId, ingest.error);
      return { ok: false as const, error: ingest.error };
    }
    console.log("[solitaire] timeout ingest ok", gameId, ingest.parsed.deduped);
    return { ok: true as const, ingested: true as const };
  },
});
