import { httpRouter } from "convex/server";

import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

const http = httpRouter();

function bridgeSecret(): string {
  return (
    process.env.CASUAL_GAME_BRIDGE_SECRET?.trim() ||
    process.env.CASUAL_SEED_CATALOG_BRIDGE_SECRET?.trim() ||
    "dev-casual-bridge-secret"
  );
}

function unauthorized() {
  return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

async function readJsonBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function checkAuth(request: Request): boolean {
  return request.headers.get("X-Casual-Bridge-Secret") === bridgeSecret();
}

http.route({
  path: "/internal/catalog/pick-seed",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!checkAuth(request)) return unauthorized();
    const b = await readJsonBody(request);
    if (!b) {
      return new Response(JSON.stringify({ ok: false, error: "bad_json" }), { status: 400 });
    }
    const gameType = typeof b.gameType === "string" ? b.gameType : "";
    const matchId = typeof b.matchId === "string" ? b.matchId : "";
    const sessionKey = typeof b.sessionKey === "string" ? b.sessionKey : "";
    const uids = Array.isArray(b.uids) ? b.uids.filter((u) => typeof u === "string") : [];
    const tier = typeof b.tier === "string" ? b.tier : undefined;
    const poolVersion = typeof b.poolVersion === "string" ? b.poolVersion : undefined;
    if (!gameType || !matchId || !sessionKey || uids.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_fields" }), { status: 400 });
    }

    const result = await ctx.runMutation(
      internal.service.seedPool.catalogSeedHttp.pickCasualMatchSeed,
      {
        gameType: gameType as "block_blast",
        matchId,
        sessionKey,
        uids,
        ...(tier === "easy" || tier === "medium" || tier === "hard" ? { tier } : {}),
        ...(poolVersion ? { poolVersion } : {}),
      }
    );
    return new Response(JSON.stringify(result), {
      status: result.ok ? 200 : 400,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/internal/catalog/record-seed",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!checkAuth(request)) return unauthorized();
    const b = await readJsonBody(request);
    if (!b) {
      return new Response(JSON.stringify({ ok: false, error: "bad_json" }), { status: 400 });
    }
    const gameType = typeof b.gameType === "string" ? b.gameType : "";
    const matchId = typeof b.matchId === "string" ? b.matchId : "";
    const uid = typeof b.uid === "string" ? b.uid : "";
    const seedId = typeof b.seedId === "string" ? b.seedId : "";
    const poolVersion = typeof b.poolVersion === "string" ? b.poolVersion : "";
    if (!gameType || !matchId || !uid || !seedId || !poolVersion) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_fields" }), { status: 400 });
    }
    const result = await ctx.runMutation(
      internal.service.seedPool.catalogSeedHttp.recordCasualMatchSeedForPlayer,
      { gameType: gameType as "block_blast", matchId, uid, seedId, poolVersion }
    );
    return new Response(JSON.stringify(result), {
      status: result.ok ? 200 : 400,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/internal/catalog/seed-entry",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!checkAuth(request)) return unauthorized();
    const b = await readJsonBody(request);
    if (!b) {
      return new Response(JSON.stringify({ ok: false, error: "bad_json" }), { status: 400 });
    }
    const gameType = typeof b.gameType === "string" ? b.gameType : "";
    const seedId = typeof b.seedId === "string" ? b.seedId : "";
    const poolVersion = typeof b.poolVersion === "string" ? b.poolVersion : undefined;
    if (!gameType || !seedId) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_fields" }), { status: 400 });
    }
    const entry = await ctx.runQuery(
      internal.service.seedPool.catalogSeedHttp.getSeedEntryBySeedId,
      {
        gameType: gameType as "block_blast",
        seedId,
        ...(poolVersion ? { poolVersion } : {}),
      }
    );
    if (!entry) {
      return new Response(JSON.stringify({ ok: false, error: "unknown_seed" }), { status: 404 });
    }
    return new Response(
      JSON.stringify({
        ok: true,
        metrics: { scoreQuantiles: entry.metrics.scoreQuantiles },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }),
});

http.route({
  path: "/internal/catalog/rollouts-for-seed",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!checkAuth(request)) return unauthorized();
    const b = await readJsonBody(request);
    if (!b) {
      return new Response(JSON.stringify({ ok: false, error: "bad_json" }), { status: 400 });
    }
    const gameType = typeof b.gameType === "string" ? b.gameType : "";
    const seedId = typeof b.seedId === "string" ? b.seedId : "";
    const poolVersion = typeof b.poolVersion === "string" ? b.poolVersion : undefined;
    const scores = Array.isArray(b.scores) ? b.scores : [];
    if (!gameType || !seedId || scores.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_fields" }), { status: 400 });
    }
    const result = await ctx.runQuery(
      internal.service.seedPool.catalogSeedHttp.rolloutsForCasualMatchSeed,
      {
        gameType: gameType as "block_blast",
        seedId,
        scores,
        ...(poolVersion ? { poolVersion } : {}),
      }
    );
    return new Response(JSON.stringify(result), {
      status: result.ok ? 200 : 400,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/internal/catalog/rollouts-for-triathlon",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!checkAuth(request)) return unauthorized();
    const b = await readJsonBody(request);
    if (!b) {
      return new Response(JSON.stringify({ ok: false, error: "bad_json" }), { status: 400 });
    }
    const legs = Array.isArray(b.legs) ? b.legs : [];
    const scores = Array.isArray(b.scores) ? b.scores : [];
    if (legs.length === 0 || scores.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_fields" }), { status: 400 });
    }
    const result = await ctx.runQuery(
      internal.service.seedPool.catalogSeedHttp.rolloutsForTriathlonSeed,
      { legs, scores }
    );
    return new Response(JSON.stringify(result), {
      status: result.ok ? 200 : 400,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
