"use node";

import { v } from "convex/values";

import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { buildCasualV2IngestPayload } from "./casualBotFill/computeBotFills";
import { resolvePlatformBridgeForCasualGameId } from "./casualBridgeEnv";
import { postCasualRunIngest } from "./casualBridgeIngest";
export const checkCasualGameTimeoutAndIngest = internalAction({
  args: {
    gameRowId: v.id("blockBlast_game"),
    gameId: v.string(),
    uid: v.string(),
  },
  handler: async (ctx, { gameRowId, gameId, uid }) => {
    const settled = await ctx.runMutation(
      internal.service.casualGameLifecycle.settleCasualGameFromTable,
      { gameId, uid, gameRowId }
    );
    if (!settled.ok || !settled.shouldIngest) {
      console.log("[blockBlast] timeout job skip", gameId, settled);
      return { ok: true as const, skipped: true as const };
    }

    const platformBridge = await resolvePlatformBridgeForCasualGameId(settled.gameId);

    const built = await buildCasualV2IngestPayload({
      ctx,
      uid: settled.uid,
      matchGameId: settled.gameId,
      score: settled.score,
      platformBridge,
    });
    if (!built.ok) {
      console.warn("[blockBlast] timeout build payload failed", gameId, built.error);
      return { ok: false as const, error: built.error };
    }

    const ingest = await postCasualRunIngest({
      ...built.payload,
      platformBridge,
    });
    if (!ingest.ok) {
      console.warn("[blockBlast] timeout ingest failed", gameId, ingest.error, platformBridge);
      return { ok: false as const, error: ingest.error };
    }

    await ctx.runMutation(internal.service.casualGameLifecycle.cancelCasualTimeoutJob, { gameId });

    console.log("[blockBlast] timeout ingest ok", gameId, platformBridge, ingest.parsed.deduped);
    return { ok: true as const, ingested: true as const, platformBridge };
  },
});
