import { httpRouter } from "convex/server";

import { api, internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { portalGameBridgeSecret } from "./service/bridge/casualGameBridgeSecret";
import {
  MERCHANT_BRIDGE_HEADER,
  merchantCampaignBridgeSecret,
} from "./service/bridge/merchantCampaignBridgeEnv";
import { bridgeRecordSeed } from "./service/botFill/seedRolloutBridge";
import { resolvePlatformSeedScoreThreshold } from "./service/botFill/computeBotFillsCore";
import { resolveIngestPlatformBotFillPlan } from "./service/tournament/submit/casualIngestPlatformBotFill";
import { createIngestTiming } from "./service/tournament/submit/casualIngestTiming";
import { bridgeOkBody } from "./service/bridge/casualGameBridgeContract";
import { getPartnerGameRegistration } from "./data/partnerGameRegistry";
import { getPortalTournamentDefinition } from "./data/portalTournamentConfigs";

const http = httpRouter();

/**
 * ??????????:daily / solo / mixed(?? targetRank)?
 * mode=solo ??? `soloRankPlanning`(profile / rankCounts / rankRates),???? HTTP?
 * Header `X-Portal-Bridge-Secret` ? ingest ???
 */
http.route({
  path: "/internal/resolve-match-submit-context",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const expected = portalGameBridgeSecret();
    const headerSecret = request.headers.get("X-Portal-Bridge-Secret");
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
    return new Response(JSON.stringify(bridgeOkBody(result)), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

/**
 * solitaire solo bot ??????????:???? + ?????? + rankRates?
 */
http.route({
  path: "/internal/solo-rank-planning-inputs",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const expected = portalGameBridgeSecret();
    const headerSecret = request.headers.get("X-Portal-Bridge-Secret");
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
    return new Response(JSON.stringify(bridgeOkBody(result)), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

/**
 * ???? Convex(???)?????:??????? casual run?
 * Header `X-Portal-Bridge-Secret` ??? `CASUAL_GAME_BRIDGE_SECRET`(????? `portalGameBridgeSecret` ?????)?
 */
http.route({
  path: "/internal/casual-run-ingest",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const expected = portalGameBridgeSecret();
    const headerSecret = request.headers.get("X-Portal-Bridge-Secret");
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

    const timing = createIngestTiming("http", matchGameId);
    timing.mark("start", { uid, score: Math.floor(score) });

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
    const seedScoreThreshold =
      typeof b.seedScoreThreshold === "number" && Number.isFinite(b.seedScoreThreshold)
        ? b.seedScoreThreshold
        : undefined;

    let watchReplay: { seedId: string; steps: unknown[] } | undefined;
    const watchReplayRaw = b.watchReplay;
    if (watchReplayRaw && typeof watchReplayRaw === "object") {
      const wr = watchReplayRaw as Record<string, unknown>;
      const wrSeed = typeof wr.seedId === "string" ? wr.seedId : "";
      const wrSteps = Array.isArray(wr.steps) ? wr.steps : [];
      if (wrSeed && wrSteps.length > 0) {
        watchReplay = { seedId: wrSeed, steps: wrSteps };
      }
    }

    const gameType = await ctx.runQuery(
      internal.service.tournament.submit.casualRunIngestMutations.getCasualRunMatchGameType,
      { matchGameId }
    );
    timing.mark("runQuery.getCasualRunMatchGameType", { gameType: gameType ?? null });
    if (!gameType || !getPartnerGameRegistration(gameType)) {
      timing.finish("abort.unregistered_game_type");
      return new Response(JSON.stringify({ ok: false, error: "unregistered_game_type" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const botPlan = await resolveIngestPlatformBotFillPlan(ctx, {
      uid,
      matchGameId,
      score: Math.floor(score),
      ...(botFills && botFills.length > 0 ? { presetBotFills: botFills } : {}),
      ...(replaceAllVirtual ? { presetReplaceAllVirtual: true } : {}),
      ...(seedScoreThreshold != null ? { presetSeedScoreThreshold: seedScoreThreshold } : {}),
    });
    timing.mark("resolveIngestPlatformBotFillPlan", {
      botFillCount: botPlan.botFills?.length ?? 0,
      seedScoreThreshold: botPlan.seedScoreThreshold ?? null,
    });

    const mergedBotFills = botPlan.botFills ?? botFills;
    const mergedReplaceAllVirtual = botPlan.replaceAllVirtual ?? replaceAllVirtual;
    const mergedSeedScoreThreshold = botPlan.seedScoreThreshold ?? seedScoreThreshold;

    timing.mark("before.runMutation.submitCasualRunScoreCore", {
      botFillCount: mergedBotFills?.length ?? 0,
    });
    const result = await ctx.runMutation(
      internal.service.tournament.submit.casualRunIngestMutations.submitCasualRunScoreCore,
      {
        uid,
        matchGameId,
        score: Math.floor(score),
        ...(mergedBotFills && mergedBotFills.length > 0 ? { botFills: mergedBotFills } : {}),
        ...(mergedReplaceAllVirtual ? { replaceAllVirtual: true } : {}),
        ...(mergedSeedScoreThreshold != null ? { seedScoreThreshold: mergedSeedScoreThreshold } : {}),
        ...(watchReplay ? { watchReplay } : {}),
      }
    );
    timing.mark("runMutation.submitCasualRunScoreCore", {
      ok: result.ok,
      ...("error" in result && result.error ? { error: result.error } : {}),
      ...("deduped" in result && result.deduped ? { deduped: true } : {}),
      ...("finalized" in result && result.finalized ? { finalized: true } : {}),
      ...("pendingOthers" in result && result.pendingOthers ? { pendingOthers: true } : {}),
      ...("deferredFinalize" in result && result.deferredFinalize
        ? { deferredFinalize: true }
        : {}),
      ...("tableSummary" in result && result.tableSummary ? { hasTableSummary: true } : {}),
    });

    if (!result.ok) {
      timing.finish("response.error");
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
    if (r.weeklyLeagueSettle != null) {
      okBody.weeklyLeagueSettle = r.weeklyLeagueSettle;
    }
    const responseThreshold =
      mergedSeedScoreThreshold ??
      (typeof r.seedScoreThreshold === "number" && Number.isFinite(r.seedScoreThreshold)
        ? r.seedScoreThreshold
        : undefined);
    if (responseThreshold != null) {
      okBody.seedScoreThreshold = responseThreshold;
      okBody.success = Math.floor(score) >= responseThreshold;
    }
    timing.finish("response.ok");
    return new Response(JSON.stringify(bridgeOkBody(okBody)), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

/**
 * solitaireArena / blockBlast `loadGame`:? `gameId` ?? `portal_run_player_matches`,????? `seed` ??
 * Header `X-Portal-Bridge-Secret` ? `CASUAL_GAME_BRIDGE_SECRET` ??(? casual-run-ingest ??)?
 */
http.route({
  path: "/internal/find-match-by-game",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const expected = portalGameBridgeSecret();
    const headerSecret = request.headers.get("X-Portal-Bridge-Secret");
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
    const gameId = typeof b.gameId === "string" ? b.gameId : "";
    const skipRecordSeed = b.skipRecordSeed === true;
    if (!gameId) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const row = await ctx.runQuery(
      internal.service.tournament.submit.casualRunBridgeQueries.findMatchByGameForBridge,
      { gameId }
    );

    if (!row.ok) {
      return new Response(JSON.stringify({ ok: false, error: row.error }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const bridgeRow = row as {
      ok: true;
      gameType?: string;
      match: {
        gameId?: string;
        seed?: string;
        seedId?: string;
        poolVersion?: string;
        seedBinding?: import("./service/botFill/seedRolloutBridge").SlimSeedBinding;
        uid?: string;
        matchId?: string;
        templateId?: string;
        replayEpoch?: number;
        seedScoreThreshold?: number;
      };
    };
    const match = bridgeRow.match;

    const templateDef = match.templateId ? getPortalTournamentDefinition(match.templateId) : undefined;
    const successQuantile = templateDef?.seedQuantileSuccess?.quantile;
    let seedScoreThreshold: number | undefined =
      typeof match.seedScoreThreshold === "number" && Number.isFinite(match.seedScoreThreshold)
        ? match.seedScoreThreshold
        : undefined;
    if (seedScoreThreshold == null && successQuantile === "p75" && match.seedBinding) {
      const inline = match.seedBinding.scoreQuantiles?.p75;
      if (typeof inline === "number" && Number.isFinite(inline)) {
        seedScoreThreshold = Math.floor(inline);
      }
    }
    if (
      seedScoreThreshold == null &&
      successQuantile === "p75" &&
      match.seedBinding &&
      bridgeRow.gameType
    ) {
      try {
        const threshold = await resolvePlatformSeedScoreThreshold(ctx, {
          successThresholdQuantile: "p75",
          seedBinding: match.seedBinding,
          gameType: bridgeRow.gameType,
        });
        if (threshold != null) {
          seedScoreThreshold = threshold;
        }
      } catch (e) {
        console.warn("[casual] resolvePlatformSeedScoreThreshold failed", bridgeRow.gameType, e);
      }
    }

    if (
      !skipRecordSeed &&
      match.uid &&
      match.matchId &&
      match.seedId &&
      match.poolVersion &&
      bridgeRow.gameType
    ) {
      const record = await bridgeRecordSeed(ctx, {
        gameType: bridgeRow.gameType,
        matchId: match.matchId,
        uid: match.uid,
        seedId: match.seedId,
        poolVersion: match.poolVersion,
      });
      if (!record.ok) {
        return new Response(JSON.stringify({ ok: false, error: record.error }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    return new Response(
      JSON.stringify(
        bridgeOkBody({
          ok: true,
          match: {
            gameId: match.gameId,
            seed: match.seed,
            seedId: match.seedId,
            templateId: match.templateId,
            replayEpoch: match.replayEpoch,
            ...(seedScoreThreshold != null ? { seedScoreThreshold } : {}),
          },
        })
      ),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }),
});

/**
 * ???????:?????,?? ? `replaying`(?? bot / ??)?
 */
http.route({
  path: "/internal/casual-replay-authorize",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const expected = portalGameBridgeSecret();
    const headerSecret = request.headers.get("X-Portal-Bridge-Secret");
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
      adReplayClaimId?: import("./_generated/dataModel").Id<"portal_ad_replay_claims">;
    } = { uid, matchGameId };
    if (typeof b.adReplayClaimId === "string" && b.adReplayClaimId.length > 0) {
      mutationArgs.adReplayClaimId =
        b.adReplayClaimId as import("./_generated/dataModel").Id<"portal_ad_replay_claims">;
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
      JSON.stringify(
        bridgeOkBody({
          ok: true,
          gameId: result.gameId,
          templateId: result.templateId,
          matchId: result.matchId,
          replayEpoch: result.replayEpoch,
        })
      ),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }),
});

/**
 * merchantCampaign → Portal: campaign competitive leaderboard (inbound).
 * Header `X-Merchant-Bridge-Secret` must match merchantCampaignBridgeSecret().
 */
function merchantBridgeUnauthorized() {
  return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

function assertMerchantBridgeSecret(request: Request): boolean {
  const expected = merchantCampaignBridgeSecret();
  const headerSecret = request.headers.get(MERCHANT_BRIDGE_HEADER);
  return headerSecret === expected;
}

async function readJsonBody(
  request: Request
): Promise<{ ok: true; body: Record<string, unknown> } | { ok: false; response: Response }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return {
      ok: false,
      response: new Response(JSON.stringify({ ok: false, error: "bad_json" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }
  if (!body || typeof body !== "object") {
    return {
      ok: false,
      response: new Response(JSON.stringify({ ok: false, error: "bad_body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }
  return { ok: true, body: body as Record<string, unknown> };
}

function partnerIdFromBody(body: Record<string, unknown>): number | null {
  const raw = body.partnerId;
  const partnerId =
    typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
  return Number.isFinite(partnerId) && partnerId >= 0 ? Math.floor(partnerId) : null;
}

function partnerVoucherItemId(body: Record<string, unknown>) {
  return typeof body.itemId === "string" && body.itemId.length > 0
    ? body.itemId as import("./_generated/dataModel").Id<"portal_backpack_items">
    : null;
}

/** SSO → Portal: Partner redemption inbox and fulfillment operations. */
http.route({
  path: "/internal/partner-vouchers",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (request.headers.get("X-Portal-Bridge-Secret") !== portalGameBridgeSecret()) {
      return jsonResponse({ ok: false, error: "unauthorized" }, 401);
    }
    const parsed = await readJsonBody(request);
    if (!parsed.ok) return parsed.response;
    const partnerId = partnerIdFromBody(parsed.body);
    const operation = parsed.body.operation;
    if (partnerId === null || typeof operation !== "string") {
      return jsonResponse({ ok: false, error: "invalid_fields" }, 400);
    }

    if (operation === "list") {
      const result = await ctx.runMutation(
        internal.service.backpack.portalBackpackService.listPartnerVouchers,
        { partnerId }
      );
      return jsonResponse({ ok: true, items: result });
    }

    const itemId = partnerVoucherItemId(parsed.body);
    let result:
      | { ok: boolean; error?: string }
      | { ok: boolean; error?: string; itemId?: string; title?: string };
    if (operation === "confirm" && itemId) {
      result = await ctx.runMutation(
        internal.service.backpack.portalBackpackService.confirmPartnerVoucherUse,
        { partnerId, itemId }
      );
    } else if (operation === "reject" && itemId) {
      result = await ctx.runMutation(
        internal.service.backpack.portalBackpackService.rejectPartnerVoucherUse,
        { partnerId, itemId }
      );
    } else if (operation === "void" && itemId) {
      result = await ctx.runMutation(
        internal.service.backpack.portalBackpackService.voidPartnerVoucher,
        { partnerId, itemId }
      );
    } else if (operation === "redeem") {
      const code = typeof parsed.body.code === "string" ? parsed.body.code : "";
      result = await ctx.runMutation(
        internal.service.backpack.portalBackpackService.redeemPartnerVoucherByCode,
        { partnerId, code }
      );
    } else {
      return jsonResponse({ ok: false, error: "invalid_fields" }, 400);
    }
    return jsonResponse(result, result.ok ? 200 : 400);
  }),
});

http.route({
  path: "/internal/campaign-league/leaderboard",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!assertMerchantBridgeSecret(request)) return merchantBridgeUnauthorized();
    const parsed = await readJsonBody(request);
    if (!parsed.ok) return parsed.response;
    const b = parsed.body;
    const campaignId = typeof b.campaignId === "string" ? b.campaignId : "";
    if (!campaignId) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const limit =
      typeof b.limit === "number" && Number.isFinite(b.limit)
        ? Math.floor(b.limit)
        : 20;
    const mode =
      b.mode === "solo" || b.mode === "multi" ? (b.mode as "solo" | "multi") : undefined;
    const result = await ctx.runQuery(
      internal.service.campaignLeague.campaignLeagueQueries.getCampaignLeagueLeaderboardInternal,
      {
        campaignId,
        limit,
        ...(mode ? { mode } : {}),
      }
    );
    return new Response(JSON.stringify({ ok: true, ...result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/internal/campaign-league/humans-ranked",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!assertMerchantBridgeSecret(request)) return merchantBridgeUnauthorized();
    const parsed = await readJsonBody(request);
    if (!parsed.ok) return parsed.response;
    const b = parsed.body;
    const campaignId = typeof b.campaignId === "string" ? b.campaignId : "";
    if (!campaignId) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const limit =
      typeof b.limit === "number" && Number.isFinite(b.limit)
        ? Math.floor(b.limit)
        : 100;
    const mode =
      b.mode === "solo" || b.mode === "multi" ? (b.mode as "solo" | "multi") : undefined;
    const result = await ctx.runQuery(
      internal.service.campaignLeague.campaignLeagueQueries
        .listCampaignLeagueHumansRankedInternal,
      {
        campaignId,
        limit,
        ...(mode ? { mode } : {}),
      }
    );
    return new Response(JSON.stringify({ ok: true, ...result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/internal/campaign-league/ensure-bots",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!assertMerchantBridgeSecret(request)) return merchantBridgeUnauthorized();
    const parsed = await readJsonBody(request);
    if (!parsed.ok) return parsed.response;
    const b = parsed.body;
    const campaignId = typeof b.campaignId === "string" ? b.campaignId : "";
    const partnerId = typeof b.partnerId === "number" ? b.partnerId : NaN;
    const mode = b.mode === "solo" || b.mode === "multi" ? b.mode : null;
    const dueTime = typeof b.dueTime === "number" ? b.dueTime : NaN;
    if (!campaignId || !Number.isFinite(partnerId) || !mode || !Number.isFinite(dueTime)) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const startsAt = typeof b.startsAt === "number" ? b.startsAt : undefined;
    const result = await ctx.runMutation(
      internal.service.campaignLeague.campaignLeagueQueries.ensureCampaignLeagueBotsInternal,
      {
        campaignId,
        partnerId,
        mode,
        dueTime,
        ...(startsAt != null ? { startsAt } : {}),
      }
    );
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

/**
 * SSO → Portal: upsert per-partner ad-replay daily cap cache.
 * Header `X-Portal-Bridge-Secret` must match `portalGameBridgeSecret()`.
 */
http.route({
  path: "/internal/upsert-partner-ad-replay-cap",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const expected = portalGameBridgeSecret();
    const headerSecret = request.headers.get("X-Portal-Bridge-Secret");
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
    const partnerIdRaw = (body as { partnerId?: unknown }).partnerId;
    const capRaw = (body as { adReplayDailyCap?: unknown }).adReplayDailyCap;
    const partnerId =
      typeof partnerIdRaw === "number" && Number.isFinite(partnerIdRaw)
        ? Math.floor(partnerIdRaw)
        : typeof partnerIdRaw === "string"
          ? Number(partnerIdRaw)
          : NaN;
    const adReplayDailyCap =
      typeof capRaw === "number" && Number.isFinite(capRaw)
        ? Math.floor(capRaw)
        : NaN;
    if (!Number.isFinite(partnerId) || partnerId < 0 || !Number.isFinite(adReplayDailyCap)) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const result = await ctx.runMutation(
      internal.service.ads.partnerAdReplayConfig.upsertPartnerAdReplayCapInternal,
      { partnerId, adReplayDailyCap }
    );
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

/** SSO → Portal: partner free-play and ticket-entry ladder overrides. */
http.route({
  path: "/internal/upsert-partner-play-entry-settings",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (request.headers.get("X-Portal-Bridge-Secret") !== portalGameBridgeSecret()) {
      return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), { status: 401 });
    }
    const body = await readMcpJsonBody(request);
    const partnerId = typeof body?.partnerId === "number" ? Math.floor(body.partnerId) : NaN;
    const keys = [
      "freePlaySoloDailyCap", "freePlayMultiDailyCap",
      "ticketEntrySoloPriceTickets", "ticketEntrySoloDailyCap",
      "ticketEntryMultiPriceTickets", "ticketEntryMultiDailyCap",
    ] as const;
    if (!Number.isFinite(partnerId) || partnerId < 0 ||
      keys.some((key) => body?.[key] != null && (typeof body[key] !== "number" || !Number.isFinite(body[key] as number)))) {
      return jsonResponse({ ok: false, error: "invalid_fields" }, 400);
    }
    const result = await ctx.runMutation(
      internal.service.ads.portalTicketEntryService.upsertPartnerPlayEntrySettingsInternal,
      { partnerId, ...Object.fromEntries(keys.filter((key) => body?.[key] != null).map((key) => [key, Math.floor(body![key] as number)])) }
    );
    return jsonResponse(result);
  }),
});

/**
 * SSO → Portal: Partner-owned virtual and voucher SKU configuration.
 * SKU IDs are partner scoped and are never allowed to overwrite shared catalog rows.
 */
http.route({
  path: "/internal/partner-shop-skus",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (request.headers.get("X-Portal-Bridge-Secret") !== portalGameBridgeSecret()) {
      return jsonResponse({ ok: false, error: "unauthorized" }, 401);
    }
    const body = await readMcpJsonBody(request);
    const partnerId = typeof body?.partnerId === "number" ? Math.floor(body.partnerId) : NaN;
    const operation = body?.operation;
    if (!Number.isFinite(partnerId) || partnerId < 0 || typeof operation !== "string") {
      return jsonResponse({ ok: false, error: "invalid_fields" }, 400);
    }
    try {
      if (operation === "list") {
        const kind = body?.kind === "virtual" || body?.kind === "voucher" ? body.kind : undefined;
        const skus = await ctx.runQuery(
          internal.service.shop.partnerShopSkuAdmin.listPartnerShopSkusInternal,
          { partnerId, ...(kind ? { kind } : {}) }
        );
        return jsonResponse({ ok: true, skus });
      }
      const skuId = typeof body?.skuId === "string" ? body.skuId : "";
      if (operation === "setActive") {
        if (typeof body?.active !== "boolean") return jsonResponse({ ok: false, error: "invalid_fields" }, 400);
        return jsonResponse(await ctx.runMutation(
          internal.service.shop.partnerShopSkuAdmin.setPartnerShopSkuActiveInternal,
          { partnerId, skuId, active: body.active }
        ));
      }
      if (operation === "delete") {
        return jsonResponse(await ctx.runMutation(
          internal.service.shop.partnerShopSkuAdmin.deletePartnerShopSkuInternal,
          { partnerId, skuId }
        ));
      }
      if (operation === "upsert" && (body?.kind === "virtual" || body?.kind === "voucher")) {
        const numberOrUndefined = (value: unknown) =>
          typeof value === "number" && Number.isFinite(value) ? Math.floor(value) : undefined;
        const nullableNumber = (value: unknown) =>
          value === null ? null : numberOrUndefined(value);
        const result = await ctx.runMutation(
          internal.service.shop.partnerShopSkuAdmin.upsertPartnerShopSkuInternal,
          {
            partnerId,
            kind: body.kind,
            skuId,
            title: typeof body.title === "string" ? body.title : "",
            ...(typeof body.description === "string" ? { description: body.description } : {}),
            priceCoins: numberOrUndefined(body.priceCoins) ?? -1,
            ...(numberOrUndefined(body.grantReplayTokenCount) != null
              ? { grantReplayTokenCount: numberOrUndefined(body.grantReplayTokenCount) }
              : {}),
            ...(nullableNumber(body.weeklyPurchaseLimit) !== undefined
              ? { weeklyPurchaseLimit: nullableNumber(body.weeklyPurchaseLimit) }
              : {}),
            ...(numberOrUndefined(body.sortOrder) != null ? { sortOrder: numberOrUndefined(body.sortOrder) } : {}),
            ...(typeof body.active === "boolean" ? { active: body.active } : {}),
            ...(typeof body.voucherRewardText === "string" ? { voucherRewardText: body.voucherRewardText } : {}),
            ...(nullableNumber(body.voucherValidityDays) !== undefined
              ? { voucherValidityDays: nullableNumber(body.voucherValidityDays) }
              : {}),
            ...(typeof body.listInShop === "boolean" ? { listInShop: body.listInShop } : {}),
          }
        );
        return jsonResponse(result);
      }
      return jsonResponse({ ok: false, error: "invalid_fields" }, 400);
    } catch (error) {
      return jsonResponse(
        { ok: false, error: error instanceof Error ? error.message : "operation_failed" },
        400
      );
    }
  }),
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function readMcpJsonBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object") return null;
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}

function bridgeSecretFrom(request: Request, body: Record<string, unknown>): string {
  return (
    request.headers.get("X-Portal-Bridge-Secret") ??
    (typeof body.bridgeSecret === "string" ? body.bridgeSecret : "")
  );
}

/** Agent/MCP: list joinable portal casual templates. */
http.route({
  path: "/mcp/list-games",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await readMcpJsonBody(request);
    if (!body) return jsonResponse({ ok: false, error: "bad_json" }, 400);
    try {
      const result = await ctx.runMutation(
        api.service.launch.portalLaunchMutations.listLaunchGames,
        {
          bridgeSecret: bridgeSecretFrom(request, body),
          ...(typeof body.gameType === "string" ? { gameType: body.gameType } : {}),
          ...(typeof body.maxPlayers === "number" ? { maxPlayers: body.maxPlayers } : {}),
        }
      );
      return jsonResponse(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "list_games_failed";
      return jsonResponse(
        { ok: false, error: message },
        message === "unauthorized" ? 401 : 400
      );
    }
  }),
});

/** Agent/MCP: create launch token (+ optional solo auto-join). */
http.route({
  path: "/mcp/launch-game",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await readMcpJsonBody(request);
    if (!body) return jsonResponse({ ok: false, error: "bad_json" }, 400);
    const uid = typeof body.uid === "string" ? body.uid : "";
    const templateId = typeof body.templateId === "string" ? body.templateId : "";
    if (!uid || !templateId) {
      return jsonResponse({ ok: false, error: "invalid_fields" }, 400);
    }
    try {
      const result = await ctx.runAction(
        internal.service.launch.portalLaunchActions.launchGameForAgent,
        {
          bridgeSecret: bridgeSecretFrom(request, body),
          uid,
          templateId,
          ...(typeof body.surface === "string" ? { surface: body.surface } : {}),
          ...(typeof body.partnerId === "number" ? { partnerId: body.partnerId } : {}),
          ...(typeof body.webOrigin === "string" ? { webOrigin: body.webOrigin } : {}),
          ...(typeof body.autoJoin === "boolean" ? { autoJoin: body.autoJoin } : {}),
        }
      );
      return jsonResponse(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "launch_failed";
      return jsonResponse(
        { ok: false, error: message },
        message === "unauthorized" ? 401 : 400
      );
    }
  }),
});

/** Agent/MCP: read play result for a launch token. */
http.route({
  path: "/mcp/get-play-result",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await readMcpJsonBody(request);
    if (!body) return jsonResponse({ ok: false, error: "bad_json" }, 400);
    const token = typeof body.token === "string" ? body.token : "";
    if (!token) return jsonResponse({ ok: false, error: "invalid_fields" }, 400);
    try {
      const result = await ctx.runMutation(
        api.service.launch.portalLaunchMutations.getPlayResult,
        {
          bridgeSecret: bridgeSecretFrom(request, body),
          token,
        }
      );
      return jsonResponse(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "get_play_result_failed";
      return jsonResponse(
        { ok: false, error: message },
        message === "unauthorized" ? 401 : 400
      );
    }
  }),
});

/** Agent/MCP: report play result. */
http.route({
  path: "/mcp/report-play-result",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await readMcpJsonBody(request);
    if (!body) return jsonResponse({ ok: false, error: "bad_json" }, 400);
    const token = typeof body.token === "string" ? body.token : "";
    if (!token) return jsonResponse({ ok: false, error: "invalid_fields" }, 400);
    try {
      const result = await ctx.runMutation(
        api.service.launch.portalLaunchMutations.reportPlayResult,
        {
          bridgeSecret: bridgeSecretFrom(request, body),
          token,
          ...(typeof body.score === "number" ? { score: body.score } : {}),
          ...(typeof body.result === "string" ? { result: body.result } : {}),
          ...(typeof body.durationSec === "number"
            ? { durationSec: body.durationSec }
            : {}),
          ...(body.payload !== undefined ? { payload: body.payload } : {}),
        }
      );
      return jsonResponse(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "report_play_result_failed";
      return jsonResponse(
        { ok: false, error: message },
        message === "unauthorized" ? 401 : 400
      );
    }
  }),
});

export default http;
