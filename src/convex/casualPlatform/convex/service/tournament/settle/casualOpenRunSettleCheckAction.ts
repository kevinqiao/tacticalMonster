"use node";

import { v } from "convex/values";
import jwt from "jsonwebtoken";

import { internal } from "../../../_generated/api";
import { internalAction } from "../../../_generated/server";
import {
  isRegisteredCasualGameType,
  type RegisteredCasualGameType,
} from "../../../data/casualGameRegistry";
import { jwtAccessSecret } from "../../auth/jwtAccessSecret";

const DEV_ARENA_CONVEX_URL: Record<RegisteredCasualGameType, string> = {
  solitaire: "https://artful-chipmunk-59.convex.cloud",
  block_blast: "https://spotted-marten-367.convex.cloud",
  tower_arena: "https://tower-arena-dev.convex.cloud",
  match_3: "https://strong-condor-681.convex.cloud",
  yatz: "https://precious-retriever-7.convex.cloud",
};

const ARENA_CONVEX_ENV: Record<RegisteredCasualGameType, string> = {
  solitaire: "SOLITAIRE_CONVEX_URL",
  block_blast: "BLOCK_BLAST_CONVEX_URL",
  tower_arena: "TOWER_CONVEX_URL",
  match_3: "MATCH3_CONVEX_URL",
  yatz: "YATZ_CONVEX_URL",
};

function resolveArenaConvexCloudUrl(gameType: string): string | null {
  if (!isRegisteredCasualGameType(gameType)) return null;
  const envKey = ARENA_CONVEX_ENV[gameType];
  const fromEnv = process.env[envKey]?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return DEV_ARENA_CONVEX_URL[gameType] ?? null;
}

async function forceEndCasualRunOnArena(args: {
  uid: string;
  gameId: string;
  gameType: string;
}): Promise<{ ok: true; ingested?: boolean } | { ok: false; error: string }> {
  const secret = jwtAccessSecret();
  if (!secret) return { ok: false, error: "no_jwt_secret" };
  const baseUrl = resolveArenaConvexCloudUrl(args.gameType);
  if (!baseUrl) return { ok: false, error: "no_arena_url" };

  const token = jwt.sign({ uid: args.uid }, secret, { expiresIn: "1h" });
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "proxy/controller:forceEndCasualPlatformRun",
        args: { token, gameId: args.gameId, platformBridge: "casual" },
        format: "json",
      }),
    });
  } catch (e) {
    console.warn("[casual] forceEndCasualRunOnArena fetch failed", args.gameId, e);
    return { ok: false, error: "arena_unreachable" };
  }

  let payload: { status?: string; value?: { ok?: boolean; error?: string; deduped?: boolean } } =
    {};
  try {
    payload = (await response.json()) as typeof payload;
  } catch {
    return { ok: false, error: "bad_arena_response" };
  }

  if (payload.status === "success" && payload.value?.ok) {
    return { ok: true, ingested: true };
  }
  const err = payload.value?.error ?? `arena_${response.status}`;
  return { ok: false, error: err };
}

export const runOpenRunSettleCheck = internalAction({
  args: {
    playerGameId: v.id("casual_run_player_games"),
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
      console.log("[casual] openRunSettleCheck arena forceEnd ok", state.gameId);
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
      console.warn("[casual] openRunSettleCheck platform ingest failed", state.gameId, ingest.error);
      return { ok: false as const, error: ingest.error, arenaError: arena.error };
    }

    console.log("[casual] openRunSettleCheck platform ingest ok", state.gameId, arena.error);
    return { ok: true as const, via: "platform_score_zero" as const, arenaError: arena.error };
  },
});
