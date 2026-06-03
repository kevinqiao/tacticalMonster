import { httpRouter } from "convex/server";

import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { casualGameBridgeSecret } from "./service/casualBridgeEnv";
import type { SolitaireSeedTier } from "./service/seedPool/solitaireRecordedOpTypes";

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

function parseTier(raw: unknown): SolitaireSeedTier {
  if (raw === "easy" || raw === "medium" || raw === "hard") {
    return raw;
  }
  return "easy";
}

/** 本场真人 uid 列表；单人亦用 `uids: ["one"]` */
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
  path: "/internal/casual-match-resolve-seed",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!checkBridgeSecret(request)) return unauthorized();
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return jsonResponse({ ok: false, error: "bad_json" }, 400);
    }

    const uids = parseUids(body);
    if (uids.length === 0) {
      return jsonResponse({ ok: false, error: "missing_uids" }, 400);
    }

    const tier = parseTier(body.tier);
    const result = await ctx.runMutation(
      internal.service.seedPool.casualMatchSeedHttp.resolveCasualMatchSeed,
      {
        tier,
        poolVersion: typeof body.poolVersion === "string" ? body.poolVersion : undefined,
        sessionKey: typeof body.sessionKey === "string" ? body.sessionKey : undefined,
        matchId: typeof body.matchId === "string" ? body.matchId : undefined,
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
    const quantileKeys = ["p10", "p25", "p30", "p33", "p50", "p66", "p70", "p75", "p90"] as const;
    const scoreQuantileMin =
      typeof body.scoreQuantileMin === "string" &&
      (quantileKeys as readonly string[]).includes(body.scoreQuantileMin)
        ? (body.scoreQuantileMin as (typeof quantileKeys)[number])
        : undefined;
    const scoreQuantileMax =
      typeof body.scoreQuantileMax === "string" &&
      (quantileKeys as readonly string[]).includes(body.scoreQuantileMax)
        ? (body.scoreQuantileMax as (typeof quantileKeys)[number])
        : undefined;

    const result = await ctx.runQuery(internal.service.seedPool.casualMatchSeedHttp.rolloutsForCasualMatchSeed, {
      seedId,
      poolVersion: typeof body.poolVersion === "string" ? body.poolVersion : undefined,
      scoreQuantileMin,
      scoreQuantileMax,
      minScore: typeof body.minScore === "number" ? body.minScore : undefined,
      maxScore: typeof body.maxScore === "number" ? body.maxScore : undefined,
      limit: typeof body.limit === "number" ? body.limit : undefined,
    });
    if (!result.ok) {
      return jsonResponse(result, 404);
    }
    return jsonResponse({ ok: true, rollouts: result.rollouts });
  }),
});

export default http;
