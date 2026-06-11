import { httpRouter } from "convex/server";

import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { casualGameBridgeSecret } from "./service/bridge/casualGameBridgeSecret";

const http = httpRouter();

/**
 * 游戏服交分前解析桌型：daily / solo / mixed（不含 targetRank）。
 * mode=solo 时附带 `soloRankPlanning`（profile / rankCounts / rankRates），避免二次 HTTP。
 * Header `X-Casual-Bridge-Secret` 与 ingest 共用。
 */
http.route({
  path: "/internal/resolve-match-submit-context",
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
    const scoreRaw = b.score;
    const score =
      typeof scoreRaw === "number" && Number.isFinite(scoreRaw)
        ? scoreRaw
        : typeof scoreRaw === "string"
          ? Number(scoreRaw)
          : undefined;
    if (!uid || !matchGameId) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const result = await ctx.runQuery(
      internal.service.tournament.submit.casualMatchSubmitContext.resolveMatchSubmitContext,
      {
        matchGameId,
        uid,
        ...(score != null && Number.isFinite(score) ? { score: Math.floor(score) } : {}),
      }
    );

    if (!result.ok) {
      return new Response(JSON.stringify({ ok: false, error: result.error }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

/**
 * solitaire solo bot 目标名次规划只读输入：玩家画像 + 历史名次累计 + rankRates。
 */
http.route({
  path: "/internal/solo-rank-planning-inputs",
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
    const templateId = typeof b.templateId === "string" ? b.templateId : "";
    if (!uid || !templateId) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const result = await ctx.runQuery(
      internal.service.tournament.submit.casualMatchBotPlanningContext.getSoloRankPlanningInputs,
      { uid, templateId }
    );

    if (!result.ok) {
      return new Response(JSON.stringify({ ok: false, error: result.error }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

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
    if (!uid || !matchGameId || !Number.isFinite(score) || score < 0) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const botFillsRaw = Array.isArray(b.botFills) ? b.botFills : undefined;
    const botFills = botFillsRaw
      ?.map((item) => {
        if (!item || typeof item !== "object") return null;
        const o = item as Record<string, unknown>;
        const rank = typeof o.rank === "number" ? o.rank : NaN;
        const botScore = typeof o.score === "number" ? o.score : NaN;
        if (!Number.isFinite(rank) || !Number.isFinite(botScore)) return null;
        const fill: Record<string, unknown> = {
          rank: Math.floor(rank),
          score: Math.floor(botScore),
        };
        if (typeof o.duration === "number" && Number.isFinite(o.duration)) {
          fill.duration = Math.round(o.duration);
        }
        if (typeof o.rolloutIndex === "number" && Number.isFinite(o.rolloutIndex)) {
          fill.rolloutIndex = Math.floor(o.rolloutIndex);
        }
        if (typeof o.revealAt === "number" && Number.isFinite(o.revealAt)) {
          fill.revealAt = Math.round(o.revealAt);
        }
        return fill;
      })
      .filter((x): x is NonNullable<typeof x> => x != null);

    const replaceAllVirtual = b.replaceAllVirtual === true;

    const gameType = await ctx.runQuery(
      internal.service.tournament.submit.casualRunIngestMutations.getCasualRunMatchGameType,
      { matchGameId }
    );
    if (!gameType) {
      return new Response(JSON.stringify({ ok: false, error: "unknown_match_game" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const result = await ctx.runMutation(
      internal.service.tournament.submit.casualRunIngestMutations.submitCasualRunScoreCore,
      {
        uid,
        matchGameId,
        score: Math.floor(score),
        ...(botFills && botFills.length > 0 ? { botFills } : {}),
        ...(replaceAllVirtual ? { replaceAllVirtual: true } : {}),
      }
    );

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
    if (r.finalized === true) {
      okBody.finalized = true;
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

    const tryFindMatch = () =>
      ctx.runQuery(internal.service.tournament.submit.casualRunBridgeQueries.findMatchByGameForBridge, {
        gameId,
      });

    let row = await tryFindMatch();
    if (
      !row.ok &&
      (row.error === "seed_pending" || row.error === "seed_unavailable")
    ) {
      const bindCtx = await ctx.runQuery(
        internal.service.tournament.submit.casualRunBridgeQueries.getMatchBindContextForBridge,
        { gameId }
      );
      if (bindCtx.ok) {
        try {
          await ctx.runAction(internal.service.tournament.join.casualMatchSeedActions.bindCasualMatchSeed, {
            matchId: bindCtx.matchId,
            templateId: bindCtx.templateId,
            sessionKey: bindCtx.sessionKey,
          });
        } catch (e) {
          console.error("[casual] find-match bind retry failed", gameId, e);
        }
        row = await tryFindMatch();
      }
    }

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

/**
 * 游戏服再战授权：消耗再战令，本人 → `replaying`（保留 bot / 同桌）。
 */
http.route({
  path: "/internal/casual-replay-authorize",
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
    if (!uid || !matchGameId) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const mutationArgs: {
      uid: string;
      matchGameId: string;
      replayTokenId?: import("./_generated/dataModel").Id<"casual_replay_tokens">;
    } = { uid, matchGameId };
    if (typeof b.replayTokenId === "string" && b.replayTokenId.length > 0) {
      mutationArgs.replayTokenId =
        b.replayTokenId as import("./_generated/dataModel").Id<"casual_replay_tokens">;
    }

    const result = await ctx.runMutation(
      internal.service.tournament.replay.casualRunReplay.authorizeCasualRunReplay,
      mutationArgs
    );

    if (!result.ok) {
      return new Response(JSON.stringify({ ok: false, error: result.error }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(
      JSON.stringify({
        ok: true,
        gameId: result.gameId,
        templateId: result.templateId,
        matchId: result.matchId,
        replayEpoch: result.replayEpoch,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }),
});

export default http;
