"use node";

import { v } from "convex/values";
import jwt from "jsonwebtoken";

import { internal } from "../_generated/api";
import { action } from "../_generated/server";
import { resolveCasualBridgeEnv } from "../service/casualBridgeEnv";
import { BlockBlastGameStatus } from "../types/BlockBlastTypes";

const tournament_url = "https://beloved-mouse-699.convex.site";

function jwtAccessSecret(): string {
  return process.env.JWT_ACCESS_SECRET ?? "12222222";
}

function isTerminalBlockBlast(status: number): boolean {
  return (
    status === BlockBlastGameStatus.WON ||
    status === BlockBlastGameStatus.LOST ||
    status === BlockBlastGameStatus.COMPLETED ||
    status === BlockBlastGameStatus.CANCELLED
  );
}

function casualTableSummaryFromParsed(v: unknown):
  | {
      maxPlayers: number;
      rows: Array<{
        rank: number;
        score: number;
        displayLabel: string;
        isYou: boolean;
      }>;
    }
  | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  if (typeof o.maxPlayers !== "number" || !Array.isArray(o.rows)) return undefined;
  const rows: Array<{ rank: number; score: number; displayLabel: string; isYou: boolean }> = [];
  for (const item of o.rows) {
    if (!item || typeof item !== "object") return undefined;
    const r = item as Record<string, unknown>;
    if (
      typeof r.rank !== "number" ||
      typeof r.score !== "number" ||
      typeof r.displayLabel !== "string" ||
      typeof r.isYou !== "boolean"
    ) {
      return undefined;
    }
    rows.push({
      rank: r.rank,
      score: r.score,
      displayLabel: r.displayLabel,
      isYou: r.isYou,
    });
  }
  if (rows.length === 0) return undefined;
  return { maxPlayers: o.maxPlayers, rows };
}

/** 与 solitaireArena `proxy/controller:loadGame` 对齐：休闲 run 走 casual `/internal/find-match-by-game` + bridge secret */
export const loadGame = action({
  args: { gameId: v.string() },
  handler: async (ctx, { gameId }): Promise<any> => {
    const res: { ok: boolean; game?: any; events?: any; error?: string } = { ok: false };
    const existing = await ctx.runMutation(internal.service.gameManager.loadGameRowAfterHeal, {
      gameId,
    });
    if (existing) {
      res.ok = true;
      res.game = existing;
      return res;
    }

    const createArgs: { seed?: string; gameId: string; gridSize?: number } = { gameId };

    if (gameId.startsWith("game_")) {
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
          body: JSON.stringify({ gameId }),
        });
      } catch (e) {
        console.error("[blockBlast] find-match-by-game fetch failed", e);
        return { ok: false, error: "casual_unreachable" };
      }
      let matchGameResult: {
        ok?: boolean;
        match?: { gameId?: string; seed?: string; gridSize?: number };
        error?: string;
      } = {};
      try {
        const text = await response.text();
        if (text) matchGameResult = JSON.parse(text) as typeof matchGameResult;
      } catch {
        matchGameResult = {};
      }
      if (!response.ok || !matchGameResult.ok || !matchGameResult.match) {
        return {
          ok: false,
          error: matchGameResult.error ?? `casual_find_${response.status}`,
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

export const submitCasualPlatformRun = action({
  args: { token: v.string(), gameId: v.string() },
  handler: async (ctx, { token, gameId }) => {
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

    const score = Math.max(0, Math.floor(Number((game as { score?: number }).score ?? 0)));

    const url = `${casualOrigin}/internal/casual-run-ingest`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Casual-Bridge-Secret": bridge,
        },
        body: JSON.stringify({
          uid,
          matchGameId: gameId,
          score,
          gameKind: "block_blast",
        }),
      });
    } catch (e) {
      console.error("[blockBlast] casual ingest fetch failed", e);
      return { ok: false as const, error: "casual_unreachable" };
    }

    let parsed: { ok?: boolean; error?: string; tableSummary?: unknown; pendingOthers?: boolean } = {};
    try {
      const text = await res.text();
      if (text) {
        parsed = JSON.parse(text) as {
          ok?: boolean;
          error?: string;
          tableSummary?: unknown;
          pendingOthers?: boolean;
        };
      }
    } catch {
      parsed = {};
    }

    if (!res.ok || !parsed.ok) {
      return {
        ok: false as const,
        error: parsed.error ?? `casual_${res.status}`,
      };
    }

    const tableSummary = casualTableSummaryFromParsed(parsed.tableSummary);
    const pendingOthers = parsed.pendingOthers === true;
    return {
      ok: true as const,
      ...(tableSummary ? { tableSummary } : {}),
      ...(pendingOthers ? { pendingOthers: true as const } : {}),
    };
  },
});
