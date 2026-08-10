"use node";

import { v } from "convex/values";

import { internal } from "../_generated/api";
import { action } from "../_generated/server";
import { authedAction } from "../custom/session";
import {
  casualBridgeRequestHeaders,
  resolveCasualBridgeEnv,
  resolvePlatformBridgeForCasualGameId,
  type PlatformBridge,
} from "../service/casualBridgeEnv";
import { postCasualRunIngest } from "../service/casualBridgeIngest";
import { buildCasualV2IngestPayload } from "../service/casualBotFill/computeBotFills";
import { buildBlockBlastWatchReplayPayload } from "../service/blockBlastWatchReplayPayload";
import {
  parseCasualRunGameId,
  resolveCasualIngestScoreFromRow,
} from "../service/casualGameLifecycle";
import { BlockBlastGameStatus } from "../types/BlockBlastTypes";
import { casualTableSummaryFromParsed } from "../../../shared/casualIngestTableSummaryClient";

const tournament_url = "https://beloved-mouse-699.convex.site";

/** 未显式指定 bridge 时按 gameId 探测（对齐 solitaireArena） */
async function resolveBridgeForCasualGameId(
  gameId: string,
  platformBridge?: PlatformBridge
): Promise<PlatformBridge> {
  if (platformBridge) return platformBridge;
  if (gameId.startsWith("game_")) {
    return resolvePlatformBridgeForCasualGameId(gameId);
  }
  return "casual";
}

function isTerminalBlockBlast(status: number): boolean {
  return (
    status === BlockBlastGameStatus.WON ||
    status === BlockBlastGameStatus.LOST ||
    status === BlockBlastGameStatus.COMPLETED ||
    status === BlockBlastGameStatus.CANCELLED
  );
}

type CasualIngestParsed = {
  ok?: boolean;
  error?: string;
  tableSummary?: unknown;
  pendingOthers?: boolean;
  deduped?: boolean;
  finalized?: boolean;
  gameComplete?: boolean;
  weeklyLeagueSettle?: unknown;
  nextGame?: { gameIndex: number; gameId: string; gameType: string };
  seedScoreThreshold?: number;
  success?: boolean;
};

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
    ...(parsed.weeklyLeagueSettle ? { weeklyLeagueSettle: parsed.weeklyLeagueSettle } : {}),
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
    gridSize?: number;
    seedScoreThreshold?: number;
    seedScoreThresholdP75?: number;
    seedScoreThresholdP90?: number;
    replayEpoch?: number;
  };
  error?: string;
};

function attachHudScoreThresholds(
  res: {
    seedScoreThreshold?: number;
    seedScoreThresholdP75?: number;
    seedScoreThresholdP90?: number;
  },
  match:
    | {
        seedScoreThreshold?: number;
        seedScoreThresholdP75?: number;
        seedScoreThresholdP90?: number;
      }
    | undefined
): number | undefined {
  let clear: number | undefined;
  if (typeof match?.seedScoreThreshold === "number" && Number.isFinite(match.seedScoreThreshold)) {
    clear = match.seedScoreThreshold;
    res.seedScoreThreshold = clear;
  }
  if (
    typeof match?.seedScoreThresholdP75 === "number" &&
    Number.isFinite(match.seedScoreThresholdP75)
  ) {
    res.seedScoreThresholdP75 = match.seedScoreThresholdP75;
  }
  if (
    typeof match?.seedScoreThresholdP90 === "number" &&
    Number.isFinite(match.seedScoreThresholdP90)
  ) {
    res.seedScoreThresholdP90 = match.seedScoreThresholdP90;
  }
  return clear;
}

function shouldRebuildCasualArenaGame(
  existing: { status: number; replayEpoch?: number },
  match: { replayEpoch?: number } | undefined
): boolean {
  if (!match) return false;
  const platformEpoch = match.replayEpoch ?? 0;
  const storedEpoch = existing.replayEpoch ?? 0;
  if (platformEpoch !== storedEpoch) return true;
  return isTerminalBlockBlast(Number(existing.status));
}

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
    console.error("[blockBlast] find-match-by-game fetch failed", e);
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

/** 与 solitaireArena `proxy/controller:loadGame` 对齐：休闲 run 走 casual `/internal/find-match-by-game` + bridge secret */
export const loadGame = action({
  args: {
    gameId: v.string(),
    resetCasualRun: v.optional(v.literal(true)),
    platformBridge: v.optional(v.union(v.literal("portal"), v.literal("casual"))),
  },
  handler: async (ctx, { gameId, resetCasualRun, platformBridge }): Promise<any> => {
    const bridge = platformBridge ?? "casual";
    const res: {
      ok: boolean;
      game?: any;
      events?: any;
      error?: string;
      seedScoreThreshold?: number;
      seedScoreThresholdP75?: number;
      seedScoreThresholdP90?: number;
    } = { ok: false };

    let recreate = resetCasualRun === true;
    if (!recreate && gameId.startsWith("game_")) {
      let existing = await ctx.runMutation(internal.service.gameManager.loadGameRowAfterHeal, {
        gameId,
      });
      if (existing) {
        const meta = await fetchCasualMatchByGame(gameId, {
          skipRecordSeed: true,
          platformBridge: bridge,
        });
        if (!meta.ok) {
          return { ok: false, error: meta.error ?? "casual_find_failed" };
        }
        if (shouldRebuildCasualArenaGame(existing, meta.match)) {
          recreate = true;
        } else {
          if (existing.dueTime == null) {
            await ctx.runMutation(internal.service.gameManager.ensureCasualTimeoutScheduled, {
              gameId,
            });
            const healed = await ctx.runMutation(internal.service.gameManager.loadGameRowAfterHeal, {
              gameId,
            });
            if (healed) {
              existing = healed;
            }
          }
          res.ok = true;
          res.game = existing;
          const threshold = attachHudScoreThresholds(res, meta.match);
          if (threshold != null && existing.targetScore == null) {
            const patched = await ctx.runMutation(internal.service.gameManager.ensureTargetScore, {
              gameId,
              targetScore: threshold,
            });
            if (patched.ok) {
              res.game = { ...existing, targetScore: patched.targetScore };
            }
          }
          return res;
        }
      }
    } else if (!recreate) {
      const existing = await ctx.runMutation(internal.service.gameManager.loadGameRowAfterHeal, {
        gameId,
      });
      if (existing) {
        res.ok = true;
        res.game = existing;
        if (gameId.startsWith("game_")) {
          const meta = await fetchCasualMatchByGame(gameId, {
            skipRecordSeed: true,
            platformBridge: bridge,
          });
          const threshold = attachHudScoreThresholds(res, meta.match);
          if (threshold != null && existing.targetScore == null) {
            const patched = await ctx.runMutation(internal.service.gameManager.ensureTargetScore, {
              gameId,
              targetScore: threshold,
            });
            if (patched.ok) {
              res.game = { ...existing, targetScore: patched.targetScore };
            }
          }
        }
        return res;
      }
    }

    if (recreate && gameId.startsWith("game_")) {
      await ctx.runMutation(internal.service.gameManager.deleteCasualGameForReplay, { gameId });
    }

    const createArgs: {
      seed?: string;
      gameId: string;
      gridSize?: number;
      replayEpoch?: number;
      targetScore?: number;
    } = { gameId };
    let seedScoreThreshold: number | undefined;
    let seedScoreThresholdP75: number | undefined;
    let seedScoreThresholdP90: number | undefined;

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
      const gs = data?.gridSize;
      if (typeof gs === "number") {
        createArgs.gridSize = gs;
      }
      if (typeof data?.seedScoreThreshold === "number" && Number.isFinite(data.seedScoreThreshold)) {
        seedScoreThreshold = data.seedScoreThreshold;
        createArgs.targetScore = Math.floor(data.seedScoreThreshold);
      }
      if (
        typeof data?.seedScoreThresholdP75 === "number" &&
        Number.isFinite(data.seedScoreThresholdP75)
      ) {
        seedScoreThresholdP75 = data.seedScoreThresholdP75;
      }
      if (
        typeof data?.seedScoreThresholdP90 === "number" &&
        Number.isFinite(data.seedScoreThresholdP90)
      ) {
        seedScoreThresholdP90 = data.seedScoreThresholdP90;
      }
      if (typeof data?.replayEpoch === "number" && Number.isFinite(data.replayEpoch)) {
        createArgs.replayEpoch = data.replayEpoch;
      }
    } else {
      const matchURL = `${tournament_url}/findMatchGame`;
      const response = await fetch(matchURL, {
        method: "POST",
        body: JSON.stringify({ gameId }),
      });
      const matchGameResult = await response.json();
      if (!matchGameResult?.ok || !matchGameResult.match) {
        return { ok: false, error: "match_lookup_failed" };
      }
      const data = matchGameResult.match;
      const rawSeed = data?.seed ?? data?.gameId;
      if (typeof rawSeed === "string") {
        createArgs.seed = rawSeed;
      }
      const gs = data?.gridSize;
      if (typeof gs === "number") {
        createArgs.gridSize = gs;
      }
    }

    const gameResult = await ctx.runMutation(internal.service.gameManager.createGame, createArgs);
    if (gameResult && gameResult.ok) {
      res.ok = true;
      res.game = gameResult.data;
      if (seedScoreThreshold != null) {
        res.seedScoreThreshold = seedScoreThreshold;
      }
      if (seedScoreThresholdP75 != null) {
        res.seedScoreThresholdP75 = seedScoreThresholdP75;
      }
      if (seedScoreThresholdP90 != null) {
        res.seedScoreThresholdP90 = seedScoreThresholdP90;
      }
    } else {
      res.ok = false;
      res.error = "create_failed";
    }
    return res;
  },
});

export const submitScore = action({
  args: { gameId: v.string(), score: v.number() },
  handler: async (_ctx, { gameId, score }): Promise<any> => {
    if (typeof gameId === "string" && gameId.startsWith("game_")) {
      return { ok: false as const, error: "casual_run_forbidden_client_submit" };
    }
    console.log("submitScore", gameId, score);
    const submitURL = `${tournament_url}/submitGameScore`;
    const response = await fetch(submitURL, {
      method: "POST",
      body: JSON.stringify({ gameId, score }),
    });
    const res = await response.json();
    console.log("submitScore res", res);
    return { ok: res.ok ? true : false, res };
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
      console.warn("[blockBlast] submitCasualPlatformRun forbidden", {
        gameId,
        tokenUid: uid,
        parsedUid: parsedId?.uid ?? null,
      });
      return { ok: false as const, error: "forbidden" };
    }

    const game = await ctx.runMutation(internal.service.gameManager.loadGameRowAfterHeal, {
      gameId,
    });
    if (!game) {
      return { ok: false as const, error: "no_game" };
    }

    const status = Number((game as { status?: number }).status);
    if (!isTerminalBlockBlast(status)) {
      return { ok: false as const, error: "not_terminal" };
    }

    const score = resolveCasualIngestScoreFromRow(
      game as { score?: number; lines?: number; moves?: number }
    );

    const bridge = await resolveBridgeForCasualGameId(gameId, platformBridge);

    const built = await buildCasualV2IngestPayload({
      ctx,
      uid,
      matchGameId: gameId,
      score,
      platformBridge: bridge,
    });
    if (!built.ok) {
      return { ok: false as const, error: built.error };
    }

    const watchReplay = buildBlockBlastWatchReplayPayload(
      game as { seed?: string; gameId: string; recordedOps?: unknown[] }
    );

    const ingest = await postCasualRunIngest({
      ...built.payload,
      platformBridge: bridge,
      ...(watchReplay ? { watchReplay } : {}),
    });
    if (!ingest.ok) {
      return { ok: false as const, error: ingest.error };
    }

    await ctx.runMutation(internal.service.casualGameLifecycle.cancelCasualTimeoutJob, { gameId });

    console.log("[blockBlast] casual-run-ingest v2", {
      gameId,
      deduped: ingest.parsed.deduped,
      pendingOthers: ingest.parsed.pendingOthers,
    });
    return mapCasualIngestClientResponse(ingest.parsed, {
      seedScoreThreshold: built.payload.seedScoreThreshold,
      score: built.payload.score,
    });
  },
});

/**
 * 玩家强行结束或客户端超时：取消 scheduler、终局写 game 表、ingest casual。
 */
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
      console.warn("[blockBlast] forceEndCasualPlatformRun forbidden", {
        gameId,
        tokenUid: uid,
        parsedUid: parsedId?.uid ?? null,
      });
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

    const bridge = await resolveBridgeForCasualGameId(gameId, platformBridge);

    // Portal ingest resolves submit context itself; skip resolve HTTP to cut forceEnd latency.
    const ingest = await postCasualRunIngest({
      uid: settled.uid,
      matchGameId: settled.gameId,
      score: settled.score,
      platformBridge: bridge,
    });
    if (!ingest.ok) {
      console.warn("[blockBlast] forceEndCasualPlatformRun ingest failed", gameId, ingest.error);
      return { ok: false as const, error: ingest.error };
    }

    console.log("[blockBlast] forceEndCasualPlatformRun", { gameId, deduped: ingest.parsed.deduped });
    return mapCasualIngestClientResponse(ingest.parsed, { score: settled.score });
  },
});

export const replayCasualRun = authedAction({
  args: {
    gameId: v.string(),
    platformBridge: v.optional(v.union(v.literal("portal"), v.literal("casual"))),
  },
  handler: async (ctx, { gameId, platformBridge }) => {
    const bridgeEnv = resolveCasualBridgeEnv(
      await resolveBridgeForCasualGameId(gameId, platformBridge)
    );
    const uid = ctx.uid;

    if (!gameId.startsWith("game_")) {
      return { ok: false as const, error: "not_casual_run_game_id" };
    }

    const url = `${bridgeEnv.origin}/internal/casual-replay-authorize`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: casualBridgeRequestHeaders(bridgeEnv),
        body: JSON.stringify({ uid, matchGameId: gameId }),
      });
    } catch (e) {
      console.error("[blockBlast] casual replay authorize failed", e);
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
