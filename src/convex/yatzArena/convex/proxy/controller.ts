"use node";

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";
import { authedAction } from "../custom/session";
import { postCasualRunIngest, type CasualIngestParsed } from "../service/casualBridgeIngest";
import { buildCasualV2IngestPayload } from "../service/casualBotFill/computeBotFills";
import { buildYatzWatchReplayPayload } from "../service/yatzWatchReplayPayload";
import {
  isTerminalYatzStatus,
  parseCasualRunGameId,
} from "../service/casualGameLifecycle";
import {
  casualBridgeRequestHeaders,
  resolveCasualBridgeEnv,
  type PlatformBridge,
} from "../service/casualBridgeEnv";
import { resolveCasualIngestScoreFromRow } from "../service/yatzScoring";
import { casualTableSummaryFromParsed } from "../../../shared/casualIngestTableSummaryClient";
import type { YatzGameState } from "../types/YatzTypes";

const tournament_url = "https://beloved-mouse-699.convex.site";

function mapCasualIngestClientResponse(
  parsed: CasualIngestParsed,
  extra?: { seedScoreThreshold?: number; score?: number }
) {
  const tableSummary = casualTableSummaryFromParsed(parsed.tableSummary);
  const pendingOthers = parsed.pendingOthers === true;
  const seedScoreThreshold =
    typeof parsed.seedScoreThreshold === "number" && Number.isFinite(parsed.seedScoreThreshold)
      ? parsed.seedScoreThreshold
      : typeof extra?.seedScoreThreshold === "number" && Number.isFinite(extra.seedScoreThreshold)
        ? extra.seedScoreThreshold
        : undefined;
  const success =
    typeof parsed.success === "boolean"
      ? parsed.success
      : seedScoreThreshold != null && typeof extra?.score === "number"
        ? extra.score >= seedScoreThreshold
        : undefined;
  return {
    ok: true as const,
    ...(tableSummary ? { tableSummary } : {}),
    ...(pendingOthers ? { pendingOthers: true as const } : {}),
    ...(parsed.deduped === true ? { deduped: true as const } : {}),
    ...(parsed.finalized === true ? { finalized: true as const } : {}),
    ...(parsed.gameComplete === true ? { gameComplete: true as const } : {}),
    ...(parsed.nextGame ? { nextGame: parsed.nextGame } : {}),
    ...(seedScoreThreshold != null ? { seedScoreThreshold } : {}),
    ...(success != null ? { success } : {}),
  };
}

type CasualFindMatchResult = {
  ok?: boolean;
  match?: {
    gameId?: string;
    seed?: string;
    seedScoreThreshold?: number;
  };
  error?: string;
};

async function fetchCasualMatchByGame(
  gameId: string,
  options?: { skipRecordSeed?: boolean; platformBridge?: PlatformBridge }
): Promise<CasualFindMatchResult> {
  const bridgeEnv = resolveCasualBridgeEnv(options?.platformBridge ?? "casual");
  const matchURL = `${bridgeEnv.origin}/internal/find-match-by-game`;
  let response: Response;
  try {
    response = await fetch(matchURL, {
      method: "POST",
      headers: casualBridgeRequestHeaders(bridgeEnv),
      body: JSON.stringify({
        gameId,
        ...(options?.skipRecordSeed ? { skipRecordSeed: true } : {}),
      }),
    });
  } catch (e) {
    console.error("[yatz] find-match-by-game fetch failed", e);
    return { ok: false, error: "casual_unreachable" };
  }
  try {
    const text = await response.text();
    if (!text) return { ok: false, error: `casual_find_${response.status}` };
    return JSON.parse(text) as CasualFindMatchResult;
  } catch {
    return { ok: false, error: `casual_find_${response.status}` };
  }
}

function withCasualTargetScore<T extends Record<string, unknown>>(
  game: T,
  seedScoreThreshold?: number
): T & { targetScore?: number } {
  if (seedScoreThreshold == null) return game;
  return { ...game, targetScore: seedScoreThreshold };
}

export const loadGame = action({
  args: {
    gameId: v.string(),
    resetCasualRun: v.optional(v.literal(true)),
    platformBridge: v.optional(v.union(v.literal("portal"), v.literal("casual"))),
  },
  handler: async (ctx, { gameId, resetCasualRun, platformBridge }): Promise<any> => {
    const bridge = platformBridge ?? "casual";
    const res: { ok: boolean; game?: any; events?: any; error?: string; seedScoreThreshold?: number } = {
      ok: false,
    };
    if (resetCasualRun === true && gameId.startsWith("game_")) {
      await ctx.runMutation(internal.service.gameManager.deleteCasualGameForReplay, { gameId });
    } else {
      const existing = await ctx.runQuery(internal.service.gameManager.findGame, { gameId });
      if (existing) {
        res.ok = true;
        let seedScoreThreshold: number | undefined;
        if (gameId.startsWith("game_")) {
          const meta = await fetchCasualMatchByGame(gameId, { skipRecordSeed: true, platformBridge: bridge });
          const threshold = meta.match?.seedScoreThreshold;
          if (typeof threshold === "number" && Number.isFinite(threshold)) {
            seedScoreThreshold = threshold;
          }
        }
        res.game = withCasualTargetScore(existing, seedScoreThreshold);
        if (seedScoreThreshold != null) {
          res.seedScoreThreshold = seedScoreThreshold;
        }
        return res;
      }
    }

    const createArgs: { seed?: string; gameId: string } = { gameId };
    let seedScoreThreshold: number | undefined;

    if (gameId.startsWith("game_")) {
      const matchGameResult = await fetchCasualMatchByGame(gameId, { platformBridge: bridge });
      if (!matchGameResult.ok || !matchGameResult.match) {
        return {
          ok: false,
          error: matchGameResult.error ?? "casual_find_failed",
        };
      }
      const data = matchGameResult.match;
      const rawSeed = data?.seed ?? data?.gameId;
      if (typeof rawSeed === "string") {
        createArgs.seed = rawSeed;
      }
      if (typeof data?.seedScoreThreshold === "number" && Number.isFinite(data.seedScoreThreshold)) {
        seedScoreThreshold = data.seedScoreThreshold;
      }
    }

    let gameResult: { ok: boolean; data?: unknown; events?: unknown; error?: string };
    try {
      gameResult = await ctx.runMutation(internal.service.gameManager.createGame, createArgs);
    } catch (err) {
      console.error("[yatz] loadGame createGame mutation threw", gameId, err);
      return { ok: false, error: "create_failed" };
    }
    if (gameResult?.ok) {
      const fresh = await ctx.runQuery(internal.service.gameManager.findGame, { gameId });
      const gameRow = fresh ?? gameResult.data;
      res.ok = true;
      res.game = withCasualTargetScore((gameRow ?? {}) as Record<string, unknown>, seedScoreThreshold);
      res.events = gameResult.events;
      if (seedScoreThreshold != null) {
        res.seedScoreThreshold = seedScoreThreshold;
      }
    } else {
      res.ok = false;
      res.error = gameResult?.error ?? "create_failed";
    }
    return res;
  },
});

export const submitCasualPlatformRun = authedAction({
  args: {
    gameId: v.string(),
    platformBridge: v.optional(v.union(v.literal("portal"), v.literal("casual"))),
  },
  handler: async (ctx, { gameId, platformBridge }) => {
    if (!gameId.startsWith("game_")) {
      return { ok: false as const, error: "not_casual_run_game_id" };
    }

    const uid = ctx.uid;
    const parsedId = parseCasualRunGameId(gameId);
    if (!parsedId || parsedId.uid !== uid) {
      return { ok: false as const, error: "forbidden" };
    }

    const game = await ctx.runQuery(internal.service.gameManager.findGame, { gameId });
    if (!game) {
      return { ok: false as const, error: "no_game" };
    }

    const status = Number((game as { status?: number }).status);
    if (!isTerminalYatzStatus(status)) {
      return { ok: false as const, error: "not_terminal" };
    }

    const score = resolveCasualIngestScoreFromRow(game as { score?: number });
    const watchReplay = buildYatzWatchReplayPayload(game as YatzGameState);

    const bridge = platformBridge ?? "casual";

    const built = await buildCasualV2IngestPayload({ ctx, uid, matchGameId: gameId, score, platformBridge: bridge });
    if (!built.ok) {
      return { ok: false as const, error: built.error };
    }

    const ingest = await postCasualRunIngest({
      ...built.payload,
      platformBridge: bridge,
      ...(watchReplay ? { watchReplay } : {}),
    });
    if (!ingest.ok) {
      return { ok: false as const, error: ingest.error };
    }

    await ctx.runMutation(internal.service.casualGameLifecycle.cancelCasualTimeoutJob, { gameId });

    return mapCasualIngestClientResponse(ingest.parsed, {
      score: built.payload.score,
    });
  },
});

export const forceEndCasualPlatformRun = authedAction({
  args: {
    gameId: v.string(),
    platformBridge: v.optional(v.union(v.literal("portal"), v.literal("casual"))),
  },
  handler: async (ctx, { gameId, platformBridge }) => {
    if (!gameId.startsWith("game_")) {
      return { ok: false as const, error: "not_casual_run_game_id" };
    }

    const uid = ctx.uid;
    const parsedId = parseCasualRunGameId(gameId);
    if (!parsedId || parsedId.uid !== uid) {
      return { ok: false as const, error: "forbidden" };
    }

    await ctx.runMutation(internal.service.casualGameLifecycle.cancelCasualTimeoutJob, { gameId });

    const settled = await ctx.runMutation(
      internal.service.casualGameLifecycle.settleCasualGameFromTable,
      { gameId, uid }
    );
    if (!settled.ok || !settled.shouldIngest) {
      const err =
        settled.ok === false && "error" in settled
          ? settled.error
          : "reason" in settled && settled.reason === "gone"
            ? "no_game"
            : "settle_failed";
      return { ok: false as const, error: err };
    }

    const bridge = platformBridge ?? "casual";

    const built = await buildCasualV2IngestPayload({
      ctx,
      uid: settled.uid,
      matchGameId: settled.gameId,
      score: settled.score,
      platformBridge: bridge,
    });
    if (!built.ok) {
      return { ok: false as const, error: built.error };
    }

    const gameRow = await ctx.runQuery(internal.service.gameManager.findGame, { gameId });
    const watchReplay = gameRow
      ? buildYatzWatchReplayPayload(gameRow as YatzGameState)
      : undefined;

    const ingest = await postCasualRunIngest({
      ...built.payload,
      platformBridge: bridge,
      ...(watchReplay ? { watchReplay } : {}),
    });
    if (!ingest.ok) {
      return { ok: false as const, error: ingest.error };
    }

    return mapCasualIngestClientResponse(ingest.parsed, {
      score: built.payload.score,
    });
  },
});

export const replayCasualRun = authedAction({
  args: {
    gameId: v.string(),
    platformBridge: v.optional(v.union(v.literal("portal"), v.literal("casual"))),
  },
  handler: async (ctx, { gameId, platformBridge }) => {
    const bridgeEnv = resolveCasualBridgeEnv(platformBridge ?? "casual");

    if (!gameId.startsWith("game_")) {
      return { ok: false as const, error: "not_casual_run_game_id" };
    }

    const uid = ctx.uid;

    const url = `${bridgeEnv.origin}/internal/casual-replay-authorize`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: casualBridgeRequestHeaders(bridgeEnv),
        body: JSON.stringify({ uid, matchGameId: gameId }),
      });
    } catch (e) {
      console.error("[yatz] casual replay authorize failed", e);
      return { ok: false as const, error: "casual_unreachable" };
    }

    let parsed: { ok?: boolean; error?: string; replayEpoch?: number; gameId?: string } = {};
    try {
      const text = await res.text();
      if (text) parsed = JSON.parse(text) as typeof parsed;
    } catch {
      parsed = {};
    }

    if (!res.ok || !parsed.ok) {
      return { ok: false as const, error: parsed.error ?? `casual_${res.status}` };
    }

    return {
      ok: true as const,
      replayEpoch: parsed.replayEpoch,
      ...(typeof parsed.gameId === "string" ? { gameId: parsed.gameId } : {}),
    };
  },
});
