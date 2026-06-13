import { httpRouter } from "convex/server";

import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { casualGameBridgeSecret } from "./service/casualBridgeEnv";
import type { Match3SeedTier } from "./service/seedPool/match3RecordedOpTypes";

const http = httpRouter();

function unauthorized(): Response {
  return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function checkBridgeSecret(request: Request): boolean {
  const expected = casualGameBridgeSecret();
  const headerSecret = request.headers.get("X-Casual-Bridge-Secret");
  return headerSecret === expected;
}

function parseTier(raw: unknown): Match3SeedTier {
  if (raw === "easy" || raw === "medium" || raw === "hard") {
    return raw;
  }
  return "easy";
}

function parseScoreBands(
  raw: unknown
): Array<{ min: number; max?: number; count: number }> | { error: "invalid_count" } {
  if (!Array.isArray(raw)) return [];
  const bands: Array<{ min: number; max?: number; count: number }> = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const min = row.min;
    const max = row.max;
    const countRaw = row.count;
    if (typeof min !== "number" || !Number.isFinite(min)) continue;
    if (max !== undefined && (typeof max !== "number" || !Number.isFinite(max))) continue;
    let count = 1;
    if (countRaw !== undefined) {
      if (typeof countRaw !== "number" || !Number.isFinite(countRaw)) {
        return { error: "invalid_count" };
      }
      count = Math.floor(countRaw);
      if (count < 1 || count > 200) return { error: "invalid_count" };
    }
    bands.push({
      min,
      count,
      ...(max !== undefined ? { max } : {}),
    });
  }
  return bands;
}

function parseUids(body: Record<string, unknown>): string[] {
  const raw = body.uids;
  if (!Array.isArray(raw)) return [];
  return [
    ...new Set(
      raw
        .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
        .map((s) => s.trim())
    ),
  ];
}

http.route({
  path: "/internal/casual-match-pick-seed",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!checkBridgeSecret(request)) return unauthorized();
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return jsonResponse({ ok: false, error: "bad_json" }, 400);
    }

    const matchId = typeof body.matchId === "string" ? body.matchId.trim() : "";
    const sessionKey = typeof body.sessionKey === "string" ? body.sessionKey : "";
    const uids = parseUids(body);
    if (!matchId || !sessionKey || uids.length === 0) {
      return jsonResponse({ ok: false, error: "invalid_fields" }, 400);
    }

    const tier = parseTier(body.tier);
    const result = await ctx.runMutation(
      internal.service.seedPool.casualMatchSeedHttp.pickCasualMatchSeed,
      {
        matchId,
        tier,
        poolVersion: typeof body.poolVersion === "string" ? body.poolVersion : undefined,
        sessionKey,
        uids,
      }
    );
    if (!result.ok) {
      return jsonResponse(result, 404);
    }
    return jsonResponse(result);
  }),
});

http.route({
  path: "/internal/casual-match-record-seed",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!checkBridgeSecret(request)) return unauthorized();
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return jsonResponse({ ok: false, error: "bad_json" }, 400);
    }

    const matchId = typeof body.matchId === "string" ? body.matchId.trim() : "";
    const uid = typeof body.uid === "string" ? body.uid.trim() : "";
    const seedId = typeof body.seedId === "string" ? body.seedId : "";
    const poolVersion = typeof body.poolVersion === "string" ? body.poolVersion : "";
    if (!matchId || !uid || !seedId || !poolVersion) {
      return jsonResponse({ ok: false, error: "invalid_fields" }, 400);
    }

    const result = await ctx.runMutation(
      internal.service.seedPool.casualMatchSeedHttp.recordCasualMatchSeedForPlayer,
      { matchId, uid, seedId, poolVersion }
    );
    if (!result.ok) {
      return jsonResponse(result, 404);
    }
    return jsonResponse(result);
  }),
});

http.route({
  path: "/internal/casual-match-rollouts",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!checkBridgeSecret(request)) return unauthorized();
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return jsonResponse({ ok: false, error: "bad_json" }, 400);
    }
    const seedId = typeof body.seedId === "string" ? body.seedId : "";
    if (!seedId) {
      return jsonResponse({ ok: false, error: "invalid_fields" }, 400);
    }
    const parsed = parseScoreBands(body.scores);
    if (!Array.isArray(parsed)) {
      return jsonResponse({ ok: false, error: parsed.error }, 400);
    }
    if (parsed.length === 0) {
      return jsonResponse({ ok: false, error: "invalid_scores" }, 400);
    }

    const result = await ctx.runQuery(internal.service.seedPool.casualMatchSeedHttp.rolloutsForCasualMatchSeed, {
      seedId,
      poolVersion: typeof body.poolVersion === "string" ? body.poolVersion : undefined,
      scores: parsed,
    });
    if (!result.ok) {
      return jsonResponse(result, 404);
    }
    return jsonResponse(result);
  }),
});

export default http;
