"use node";

import { v } from "convex/values";
import jwt from "jsonwebtoken";

import { internal } from "../_generated/api";
import { action } from "../_generated/server";
import { postCasualRunIngest, type CasualIngestParsed } from "../service/casualBridgeIngest";
import { buildCasualV2IngestPayload } from "../service/casualBotFill/computeBotFills";
import { buildYatzWatchReplayPayload } from "../service/yatzWatchReplayPayload";
import {
  isTerminalYatzStatus,
  parseCasualRunGameId,
} from "../service/casualGameLifecycle";
import { resolveCasualBridgeEnv } from "../service/casualBridgeEnv";
import { resolveCasualIngestScoreFromRow } from "../service/yatzScoring";
import type { YatzGameState } from "../types/YatzTypes";

const tournament_url = "https://beloved-mouse-699.convex.site";

function jwtAccessSecret(): string {
  return process.env.JWT_ACCESS_SECRET ?? "12222222";
}

function verifyCasualRunToken(token: string): { ok: true; uid: string } | { ok: false; error: string } {
  try {
    const payload = jwt.verify(token, jwtAccessSecret());
    if (!payload || typeof payload !== "object" || !("uid" in payload)) {
      return { ok: false, error: "invalid_token" };
    }
    return { ok: true, uid: String((payload as { uid: unknown }).uid) };
  } catch {
    return { ok: false, error: "verify_failed" };
  }
}

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

function casualTableSummaryFromParsed(v: unknown):
  | {
      maxPlayers: number;
      rows: Array<{
        rank: number;
        score?: number;
        rowState?: "scored" | "playing" | "matching";
        displayLabel: string;
        isYou: boolean;
        isBot?: boolean;
      }>;
      isBoardStable?: boolean;
    }
  | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  if (typeof o.maxPlayers !== "number" || !Array.isArray(o.rows)) return undefined;
  const rows: Array<{
    rank: number;
    score?: number;
    rowState?: "scored" | "playing" | "matching";
    displayLabel: string;
    isYou: boolean;
    isBot?: boolean;
  }> = [];
  for (const item of o.rows) {
    if (!item || typeof item !== "object") return undefined;
    const r = item as Record<string, unknown>;
    if (typeof r.rank !== "number" || typeof r.displayLabel !== "string" || typeof r.isYou !== "boolean") {
      return undefined;
    }
    if (r.rowState === "matching") {
      rows.push({
        rank: r.rank,
        rowState: "matching",
        displayLabel: r.displayLabel,
        isYou: r.isYou,
        ...(r.isBot === true ? { isBot: true as const } : {}),
      });
      continue;
    }
    const rowState = r.rowState === "playing" || r.rowState === "scored" ? r.rowState : undefined;
    if (rowState === "playing") {
      rows.push({
        rank: r.rank,
        rowState: "playing",
        displayLabel: r.displayLabel,
        isYou: r.isYou,
        ...(r.isBot === true ? { isBot: true as const } : {}),
      });
      continue;
    }
    if (typeof r.score !== "number") return undefined;
    rows.push({
      rank: r.rank,
      score: r.score,
      rowState: rowState ?? "scored",
      displayLabel: r.displayLabel,
      isYou: r.isYou,
      ...(r.isBot === true ? { isBot: true as const } : {}),
    });
  }
  if (rows.length === 0) return undefined;
  return {
    maxPlayers: o.maxPlayers,
    rows,
    ...(typeof o.isBoardStable === "boolean" ? { isBoardStable: o.isBoardStable } : {}),
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
  options?: { skipRecordSeed?: boolean }
): Promise<CasualFindMatchResult> {
  const { origin: casualOrigin, secret: bridge } = resolveCasualBridgeEnv();
  const matchURL = `${casualOrigin}/internal/find-match-by-game`;
  let response: Response;
  try {
    response = await fetch(matchURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Casual-Bridge-Secret": bridge,
      },
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
  },
  handler: async (ctx, { gameId, resetCasualRun }): Promise<any> => {
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
          const meta = await fetchCasualMatchByGame(gameId, { skipRecordSeed: true });
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
      const matchGameResult = await fetchCasualMatchByGame(gameId);
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

export const submitCasualPlatformRun = action({
  args: { token: v.string(), gameId: v.string() },
  handler: async (ctx, { token, gameId }) => {
    if (!gameId.startsWith("game_")) {
      return { ok: false as const, error: "not_casual_run_game_id" };
    }

    const auth = verifyCasualRunToken(token);
    if (!auth.ok) {
      return { ok: false as const, error: auth.error };
    }
    const uid = auth.uid;
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

    const built = await buildCasualV2IngestPayload({ ctx, uid, matchGameId: gameId, score });
    if (!built.ok) {
      return { ok: false as const, error: built.error };
    }

    const ingest = await postCasualRunIngest({
      ...built.payload,
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

export const forceEndCasualPlatformRun = action({
  args: { token: v.string(), gameId: v.string() },
  handler: async (ctx, { token, gameId }) => {
    if (!gameId.startsWith("game_")) {
      return { ok: false as const, error: "not_casual_run_game_id" };
    }

    const auth = verifyCasualRunToken(token);
    if (!auth.ok) {
      return { ok: false as const, error: auth.error };
    }
    const uid = auth.uid;
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

    const built = await buildCasualV2IngestPayload({
      ctx,
      uid: settled.uid,
      matchGameId: settled.gameId,
      score: settled.score,
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

export const replayCasualRun = action({
  args: { token: v.string(), gameId: v.string() },
  handler: async (_ctx, { token, gameId }) => {
    const { origin: casualOrigin, secret: bridge } = resolveCasualBridgeEnv();

    if (!gameId.startsWith("game_")) {
      return { ok: false as const, error: "not_casual_run_game_id" };
    }

    let uid: string;
    try {
      const payload = jwt.verify(token, jwtAccessSecret());
      if (!payload || typeof payload !== "object" || !("uid" in payload)) {
        return { ok: false as const, error: "invalid_token" };
      }
      uid = String((payload as { uid: unknown }).uid);
    } catch {
      return { ok: false as const, error: "verify_failed" };
    }

    const url = `${casualOrigin}/internal/casual-replay-authorize`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Casual-Bridge-Secret": bridge,
        },
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
