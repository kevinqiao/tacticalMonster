import { httpRouter } from "convex/server";

import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { casualGameBridgeSecret } from "./service/bridge/casualGameBridgeSecret";

const http = httpRouter();

/**
 * 仅供其它 Convex（solitaire/blockBlast）服务端调用：带权威分数写入 casual run。
 * Header `X-Casual-Bridge-Secret` 须等于 `CASUAL_GAME_BRIDGE_SECRET`（未配置时用 `casualGameBridgeSecret` 开发默认值）。
 */
http.route({
  path: "/internal/casual-run-ingest",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const expected = casualGameBridgeSecret();
    const headerSecret = request.headers.get("X-Casual-Bridge-Secret");
    if (headerSecret !== expected) {
      return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ ok: false, error: "bad_json" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!body || typeof body !== "object") {
      return new Response(JSON.stringify({ ok: false, error: "bad_body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const b = body as Record<string, unknown>;
    const uid = typeof b.uid === "string" ? b.uid : "";
    const matchGameId = typeof b.matchGameId === "string" ? b.matchGameId : "";
    const score =
      typeof b.score === "number" && Number.isFinite(b.score)
        ? b.score
        : typeof b.score === "string"
          ? Number(b.score)
          : NaN;
    const gameKind = b.gameKind === "solitaire" || b.gameKind === "block_blast" ? b.gameKind : "";
    if (!uid || !matchGameId || !gameKind || !Number.isFinite(score) || score < 0) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const gameIdConvex = gameKind === "solitaire" ? "solitaire" : "block_blast";

    const result = await ctx.runMutation(internal.service.tournament.casualTournamentService.submitCasualRunScoreCore, {
      uid,
      matchGameId,
      score: Math.floor(score),
      gameId: gameIdConvex,
    });

    if (!result.ok) {
      return new Response(JSON.stringify({ ok: false, error: (result as { error?: string }).error }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const okBody: Record<string, unknown> = { ok: true };
    const r = result as Record<string, unknown>;
    if (r.tableSummary != null) {
      okBody.tableSummary = r.tableSummary;
    }
    if (r.pendingOthers === true) {
      okBody.pendingOthers = true;
    }
    if (r.deduped === true) {
      okBody.deduped = true;
    }
    if (r.periodSettled === true) {
      okBody.periodSettled = true;
    }
    return new Response(JSON.stringify(okBody), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

/**
 * solitaireArena / blockBlast `loadGame`：按 `gameId` 查询 `casual_run_player_matches`，返回建局用 `seed` 等。
 * Header `X-Casual-Bridge-Secret` 与 `CASUAL_GAME_BRIDGE_SECRET` 一致（与 casual-run-ingest 共用）。
 */
http.route({
  path: "/internal/find-match-by-game",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const expected = casualGameBridgeSecret();
    const headerSecret = request.headers.get("X-Casual-Bridge-Secret");
    if (headerSecret !== expected) {
      return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ ok: false, error: "bad_json" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!body || typeof body !== "object") {
      return new Response(JSON.stringify({ ok: false, error: "bad_body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const gameId = typeof (body as Record<string, unknown>).gameId === "string" ? (body as Record<string, unknown>).gameId as string : "";
    if (!gameId) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const row = await ctx.runQuery(internal.service.tournament.casualTournamentService.findMatchByGameForBridge, {
      gameId,
    });
    if (!row.ok) {
      return new Response(JSON.stringify({ ok: false, error: row.error }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ ok: true, match: row.match }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
