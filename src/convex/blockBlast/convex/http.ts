import { httpRouter } from "convex/server";

import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { casualGameBridgeSecret } from "./service/casualBridgeEnv";

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
  return request.headers.get("X-Casual-Bridge-Secret") === casualGameBridgeSecret();
}

function parseTier(raw: unknown): "easy" | "medium" | "hard" {
  if (raw === "easy" || raw === "medium" || raw === "hard") return raw;
  return "easy";
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
    const templateId = typeof body.templateId === "string" ? body.templateId.trim() : "";
    const sessionKey = typeof body.sessionKey === "string" ? body.sessionKey : "";
    const uids = parseUids(body);
    if (!matchId || !templateId || !sessionKey || uids.length === 0) {
      return jsonResponse({ ok: false, error: "invalid_fields" }, 400);
    }

    const tier = parseTier(body.tier);
    const result = await ctx.runMutation(
      internal.service.casualPlatform.casualMatchSeedHttp.pickCasualMatchSeed,
      {
        matchId,
        templateId,
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
      internal.service.casualPlatform.casualMatchSeedHttp.recordCasualMatchSeedForPlayer,
      { matchId, uid, seedId, poolVersion }
    );
    if (!result.ok) {
      return jsonResponse(result, 404);
    }
    return jsonResponse(result);
  }),
});

export default http;
