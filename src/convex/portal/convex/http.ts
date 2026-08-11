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
import { isPortalSuccessQuantile } from "./data/portalSeedTierPolicy";
import {
  getPortalTournamentDefinition,
  resolveSoloSeedSuccessThreshold,
} from "./data/portalTournamentConfigs";

const http = httpRouter();

/**
 * ??????????:daily / solo / mixed(?? targetRank)?
 * mode=single_human ??? `soloRankPlanning`(profile / rankCounts / rankRates),???? HTTP?
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
    const bindingQuantile = match.seedBinding?.successQuantile;
    const successQuantile = isPortalSuccessQuantile(bindingQuantile)
      ? bindingQuantile
      : templateDef?.seedQuantileSuccess?.quantile;
    const gameTypeForThreshold =
      bridgeRow.gameType ?? templateDef?.gameType ?? "";
    // Prefer quantiles × multiplier (canonical). Bridge threshold is already multiplied when present.
    let seedScoreThreshold = resolveSoloSeedSuccessThreshold({
      gameType: gameTypeForThreshold,
      ritualOneLineClear: match.seedBinding?.ritualOneLineClear,
      quantiles: match.seedBinding?.scoreQuantiles,
      successQuantile,
      seedQuantileSuccess: templateDef?.seedQuantileSuccess,
    });
    if (
      seedScoreThreshold == null &&
      typeof match.seedScoreThreshold === "number" &&
      Number.isFinite(match.seedScoreThreshold)
    ) {
      seedScoreThreshold = Math.floor(match.seedScoreThreshold);
    }
    if (
      seedScoreThreshold == null &&
      isPortalSuccessQuantile(successQuantile) &&
      match.seedBinding &&
      bridgeRow.gameType
    ) {
      try {
        const threshold = await resolvePlatformSeedScoreThreshold(ctx, {
          successThresholdQuantile: successQuantile,
          seedBinding: match.seedBinding,
          gameType: bridgeRow.gameType,
          ritualOneLineClear: match.seedBinding.ritualOneLineClear,
          seedQuantileSuccess: templateDef?.seedQuantileSuccess,
          templateId: match.templateId,
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

/** Platform Admin → Portal: Partner-global shop switches and assortment. */
http.route({
  path: "/internal/partner-shop-settings",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (request.headers.get("X-Portal-Bridge-Secret") !== portalGameBridgeSecret()) {
      return jsonResponse({ ok: false, error: "unauthorized" }, 401);
    }
    const parsed = await readJsonBody(request);
    if (!parsed.ok) return parsed.response;
    const partnerId = partnerIdFromBody(parsed.body);
    const operation = parsed.body.operation;
    if (
      partnerId === null ||
      (operation !== "get" &&
        operation !== "upsert" &&
        operation !== "clear_lobby")
    ) {
      return jsonResponse({ ok: false, error: "invalid_fields" }, 400);
    }
    const lobbyId =
      typeof parsed.body.lobbyId === "string" && parsed.body.lobbyId.trim()
        ? (parsed.body.lobbyId as any)
        : undefined;
    if (operation === "get") {
      const settings = await ctx.runQuery(
        internal.service.shop.partnerShopSettings.getPartnerShopSettingsInternal,
        { partnerId, ...(lobbyId ? { lobbyId } : {}) }
      );
      return jsonResponse({ ok: true, settings });
    }
    if (operation === "clear_lobby") {
      if (!lobbyId) {
        return jsonResponse({ ok: false, error: "invalid_fields" }, 400);
      }
      try {
        return jsonResponse(
          await ctx.runMutation(
            internal.service.shop.partnerShopSettings.clearPartnerLobbyShopOverlayInternal,
            { partnerId, lobbyId }
          )
        );
      } catch (error) {
        return jsonResponse(
          { ok: false, error: error instanceof Error ? error.message : "operation_failed" },
          400
        );
      }
    }
    const b = parsed.body;
    if (
      typeof b.enabled !== "boolean" ||
      typeof b.giftCardsEnabled !== "boolean" ||
      typeof b.virtualEnabled !== "boolean" ||
      typeof b.vouchersEnabled !== "boolean" ||
      typeof b.adCoinEnabled !== "boolean" ||
      (b.assortmentMode !== "all_shared" && b.assortmentMode !== "allowlist") ||
      !Array.isArray(b.skuIds) ||
      !Array.isArray(b.excludeSkuIds) ||
      !b.overrides ||
      typeof b.overrides !== "object"
    ) {
      return jsonResponse({ ok: false, error: "invalid_fields" }, 400);
    }
    const iapEnabled = typeof b.iapEnabled === "boolean" ? b.iapEnabled : true;
    const checkinEnabled =
      typeof b.checkinEnabled === "boolean" ? b.checkinEnabled : true;
    const checkinRewardKind =
      b.checkinRewardKind === "coins" ||
      b.checkinRewardKind === "both" ||
      b.checkinRewardKind === "tickets"
        ? (b.checkinRewardKind as "tickets" | "coins" | "both")
        : ("tickets" as const);
    const checkinRewardsRaw =
      b.checkinRewards && typeof b.checkinRewards === "object"
        ? (b.checkinRewards as Record<string, unknown>)
        : {};
    const asNonNegInt = (n: unknown): number | undefined => {
      if (typeof n !== "number" || !Number.isInteger(n) || n < 0) return undefined;
      return n;
    };
    const asNonNegIntArr = (n: unknown): number[] | undefined => {
      if (!Array.isArray(n)) return undefined;
      const out: number[] = [];
      for (const x of n) {
        if (typeof x !== "number" || !Number.isInteger(x) || x < 0) return undefined;
        out.push(x);
      }
      return out;
    };
    const checkinRewards = {
      ...(asNonNegInt(checkinRewardsRaw.baseTickets) != null
        ? { baseTickets: asNonNegInt(checkinRewardsRaw.baseTickets) }
        : {}),
      ...(asNonNegIntArr(checkinRewardsRaw.streakBonusTickets)
        ? { streakBonusTickets: asNonNegIntArr(checkinRewardsRaw.streakBonusTickets) }
        : {}),
      ...(asNonNegInt(checkinRewardsRaw.baseCoins) != null
        ? { baseCoins: asNonNegInt(checkinRewardsRaw.baseCoins) }
        : {}),
      ...(asNonNegIntArr(checkinRewardsRaw.streakBonusCoins)
        ? { streakBonusCoins: asNonNegIntArr(checkinRewardsRaw.streakBonusCoins) }
        : {}),
    };
    try {
      return jsonResponse(
        await ctx.runMutation(
          internal.service.shop.partnerShopSettings.upsertPartnerShopSettingsInternal,
          {
            partnerId,
            ...(lobbyId ? { lobbyId } : {}),
            enabled: b.enabled,
            giftCardsEnabled: b.giftCardsEnabled,
            virtualEnabled: b.virtualEnabled,
            vouchersEnabled: b.vouchersEnabled,
            adCoinEnabled: b.adCoinEnabled,
            iapEnabled,
            checkinEnabled,
            checkinRewardKind,
            checkinRewards,
            assortmentMode: b.assortmentMode,
            skuIds: b.skuIds.filter((id): id is string => typeof id === "string"),
            excludeSkuIds: b.excludeSkuIds.filter((id): id is string => typeof id === "string"),
            overrides: b.overrides as Record<string, any>,
          }
        )
      );
    } catch (error) {
      return jsonResponse(
        { ok: false, error: error instanceof Error ? error.message : "operation_failed" },
        400
      );
    }
  }),
});

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

/** Campaign → Portal: idempotently grant a configured voucher SKU to a backpack. */
http.route({
  path: "/internal/grant-partner-voucher-from-campaign",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!assertMerchantBridgeSecret(request)) return merchantBridgeUnauthorized();
    const parsed = await readJsonBody(request);
    if (!parsed.ok) return parsed.response;
    const b = parsed.body;
    const uid = typeof b.uid === "string" ? b.uid : "";
    const partnerId = partnerIdFromBody(b);
    const campaignId = typeof b.campaignId === "string" ? b.campaignId : "";
    const portalSkuId = typeof b.portalSkuId === "string" ? b.portalSkuId : "";
    const grantKey = typeof b.grantKey === "string" ? b.grantKey : "";
    const preferredCode = typeof b.preferredCode === "string" ? b.preferredCode : undefined;
    const maxCouponsPerPlayer =
      typeof b.maxCouponsPerPlayer === "number" ? b.maxCouponsPerPlayer : undefined;
    if (!uid || partnerId === null || !campaignId || !portalSkuId || !grantKey) {
      return jsonResponse({ ok: false, error: "invalid_fields" }, 400);
    }
    const result = await ctx.runMutation(
      internal.service.backpack.grantCampaignVoucher.grantCampaignVoucher,
      {
        uid,
        partnerId,
        campaignId,
        portalSkuId,
        grantKey,
        ...(preferredCode ? { preferredCode } : {}),
        ...(maxCouponsPerPlayer != null ? { maxCouponsPerPlayer } : {}),
      }
    );
    return jsonResponse(result, result.ok ? 200 : 400);
  }),
});

/** Campaign store ops: coupon-limit check before issuing a new campaign voucher. */
http.route({
  path: "/internal/count-campaign-vouchers",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!assertMerchantBridgeSecret(request)) return merchantBridgeUnauthorized();
    const parsed = await readJsonBody(request);
    if (!parsed.ok) return parsed.response;
    const b = parsed.body;
    const campaignId = typeof b.campaignId === "string" ? b.campaignId : "";
    const uid = typeof b.uid === "string" ? b.uid : "";
    if (!campaignId || !uid) {
      return jsonResponse({ ok: false, error: "invalid_fields" }, 400);
    }
    const result = await ctx.runQuery(
      internal.service.backpack.portalBackpackService.countCampaignVouchersForUid,
      { campaignId, uid }
    );
    return jsonResponse({ ok: true, ...result });
  }),
});

/** Campaign store ops: validate a scanned/entered campaign voucher code before redemption. */
http.route({
  path: "/internal/validate-campaign-voucher",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!assertMerchantBridgeSecret(request)) return merchantBridgeUnauthorized();
    const parsed = await readJsonBody(request);
    if (!parsed.ok) return parsed.response;
    const b = parsed.body;
    const partnerId = partnerIdFromBody(b);
    const code = typeof b.code === "string" ? b.code : "";
    if (partnerId === null || !code) {
      return jsonResponse({ ok: false, error: "invalid_fields" }, 400);
    }
    const result = await ctx.runQuery(
      internal.service.backpack.portalBackpackService.validateCampaignVoucherByCode,
      { partnerId, code }
    );
    return jsonResponse(result, result.ok ? 200 : 400);
  }),
});

/** Campaign store ops: redeem a campaign voucher at a physical store, recording staff/store audit fields. */
http.route({
  path: "/internal/redeem-campaign-voucher-store",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!assertMerchantBridgeSecret(request)) return merchantBridgeUnauthorized();
    const parsed = await readJsonBody(request);
    if (!parsed.ok) return parsed.response;
    const b = parsed.body;
    const partnerId = partnerIdFromBody(b);
    const code = typeof b.code === "string" ? b.code : "";
    const storeId = typeof b.storeId === "string" ? b.storeId : "";
    const staffUid = typeof b.staffUid === "string" ? b.staffUid : "";
    const staffNote = typeof b.staffNote === "string" ? b.staffNote : undefined;
    if (partnerId === null || !code || !storeId || !staffUid) {
      return jsonResponse({ ok: false, error: "invalid_fields" }, 400);
    }
    const result = await ctx.runMutation(
      internal.service.backpack.portalBackpackService.redeemCampaignVoucherByCodeForStore,
      { partnerId, code, storeId, staffUid, ...(staffNote ? { staffNote } : {}) }
    );
    return jsonResponse(result, result.ok ? 200 : 400);
  }),
});

/** Campaign admin ops: list issued campaign vouchers for a partner, optionally scoped to one campaign. */
http.route({
  path: "/internal/list-campaign-vouchers",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!assertMerchantBridgeSecret(request)) return merchantBridgeUnauthorized();
    const parsed = await readJsonBody(request);
    if (!parsed.ok) return parsed.response;
    const b = parsed.body;
    const partnerId = partnerIdFromBody(b);
    if (partnerId === null) return jsonResponse({ ok: false, error: "invalid_fields" }, 400);
    const campaignId = typeof b.campaignId === "string" ? b.campaignId : undefined;
    const limit = typeof b.limit === "number" ? b.limit : undefined;
    const items = await ctx.runQuery(
      internal.service.backpack.portalBackpackService.listCampaignVouchersForPartner,
      {
        partnerId,
        ...(campaignId ? { campaignId } : {}),
        ...(limit != null ? { limit } : {}),
      }
    );
    return jsonResponse({ ok: true, items });
  }),
});

/** Campaign store operations: mirror a Campaign coupon's redeemed/void status by code. */
http.route({
  path: "/internal/sync-campaign-voucher-status",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!assertMerchantBridgeSecret(request)) return merchantBridgeUnauthorized();
    const parsed = await readJsonBody(request);
    if (!parsed.ok) return parsed.response;
    const b = parsed.body;
    const partnerId = partnerIdFromBody(b);
    const campaignId = typeof b.campaignId === "string" ? b.campaignId : "";
    const code = typeof b.code === "string" ? b.code : "";
    const status = b.status === "redeemed" || b.status === "void" ? b.status : null;
    if (partnerId === null || !campaignId || !code || !status) {
      return jsonResponse({ ok: false, error: "invalid_fields" }, 400);
    }
    const result = await ctx.runMutation(
      internal.service.backpack.portalBackpackService.syncCampaignVoucherStatusByCode,
      {
        partnerId,
        campaignId,
        code,
        status,
        ...(typeof b.actorUid === "string" ? { actorUid: b.actorUid } : {}),
        ...(typeof b.storeId === "string" ? { storeId: b.storeId } : {}),
        ...(typeof b.staffNote === "string" ? { staffNote: b.staffNote } : {}),
      }
    );
    return jsonResponse(result, result.ok ? 200 : 400);
  }),
});

/** Campaign admin dropdown: only active partner-owned Portal voucher SKUs. */
http.route({
  path: "/internal/campaign-voucher-skus",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!assertMerchantBridgeSecret(request)) return merchantBridgeUnauthorized();
    const parsed = await readJsonBody(request);
    if (!parsed.ok) return parsed.response;
    const partnerId = partnerIdFromBody(parsed.body);
    if (partnerId === null) return jsonResponse({ ok: false, error: "invalid_fields" }, 400);
    const rows = await ctx.runQuery(
      internal.service.shop.partnerShopSkuAdmin.listPartnerShopSkusInternal,
      { partnerId, kind: "voucher" }
    );
    return jsonResponse({
      ok: true,
      skus: rows
        .filter((sku) => sku.active)
        .map((sku) => ({
          skuId: sku.skuId,
          title: sku.title,
          rewardText: sku.voucherRewardText,
          active: sku.active,
          validityDays: sku.voucherValidityDays,
        })),
    });
  }),
});

/** Campaign → Portal: player profile (portal_players is SoT; Campaign no longer stores players). */
http.route({
  path: "/internal/campaign-player-profile",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!assertMerchantBridgeSecret(request)) return merchantBridgeUnauthorized();
    const parsed = await readJsonBody(request);
    if (!parsed.ok) return parsed.response;
    const uid = typeof parsed.body.uid === "string" ? parsed.body.uid.trim() : "";
    if (!uid) return jsonResponse({ ok: false, error: "invalid_fields" }, 400);
    const profile = await ctx.runQuery(
      internal.service.player.portalPlayerProfile.getPortalPlayerProfileForUidInternal,
      { uid }
    );
    return jsonResponse({ ok: true, profile });
  }),
});

http.route({
  path: "/internal/campaign-player-display-name",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!assertMerchantBridgeSecret(request)) return merchantBridgeUnauthorized();
    const parsed = await readJsonBody(request);
    if (!parsed.ok) return parsed.response;
    const uid = typeof parsed.body.uid === "string" ? parsed.body.uid.trim() : "";
    const displayName =
      typeof parsed.body.displayName === "string" ? parsed.body.displayName : "";
    if (!uid || !displayName) {
      return jsonResponse({ ok: false, error: "invalid_fields" }, 400);
    }
    const result = await ctx.runMutation(
      internal.service.player.portalPlayerProfile.updatePortalDisplayNameForUidInternal,
      { uid, displayName }
    );
    return jsonResponse(result, result.ok ? 200 : 400);
  }),
});

http.route({
  path: "/internal/campaign-player-contact",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!assertMerchantBridgeSecret(request)) return merchantBridgeUnauthorized();
    const parsed = await readJsonBody(request);
    if (!parsed.ok) return parsed.response;
    const uid = typeof parsed.body.uid === "string" ? parsed.body.uid.trim() : "";
    if (!uid) return jsonResponse({ ok: false, error: "invalid_fields" }, 400);
    const verifiedEmail =
      typeof parsed.body.verifiedEmail === "string" ? parsed.body.verifiedEmail : undefined;
    const verifiedPhone =
      typeof parsed.body.verifiedPhone === "string" ? parsed.body.verifiedPhone : undefined;
    const result = await ctx.runMutation(
      internal.service.player.portalPlayerProfile.syncPortalContactForUidInternal,
      {
        uid,
        ...(verifiedEmail ? { verifiedEmail } : {}),
        ...(verifiedPhone ? { verifiedPhone } : {}),
      }
    );
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
 * SSO platform admin / bootstrap ↔ Portal GC ops SoT (replay / play-entry / lobbyOps).
 * Body: `{ operation: "get"|"upsert", partnerId, ...fields }`.
 */
http.route({
  path: "/internal/partner-gc-ops-settings",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (request.headers.get("X-Portal-Bridge-Secret") !== portalGameBridgeSecret()) {
      return jsonResponse({ ok: false, error: "unauthorized" }, 401);
    }
    const body = await readMcpJsonBody(request);
    const partnerId =
      typeof body?.partnerId === "number" && Number.isFinite(body.partnerId)
        ? Math.floor(body.partnerId)
        : NaN;
    if (!Number.isFinite(partnerId) || partnerId < 0) {
      return jsonResponse({ ok: false, error: "invalid_fields" }, 400);
    }
    const operation = body?.operation;
    if (operation === "get") {
      const result = await ctx.runQuery(
        internal.service.partner.portalPartnerGcOpsAdmin.getPartnerGcOpsInternal,
        { partnerId }
      );
      return jsonResponse(result);
    }
    if (operation === "upsert") {
      const result = await ctx.runMutation(
        internal.service.partner.portalPartnerGcOpsAdmin.upsertPartnerGcOpsInternal,
        {
          partnerId,
          ...(body?.adReplayDailyCap !== undefined
            ? {
                adReplayDailyCap:
                  body.adReplayDailyCap === null
                    ? null
                    : typeof body.adReplayDailyCap === "number"
                      ? body.adReplayDailyCap
                      : undefined,
              }
            : {}),
          ...(body?.maxReplaysPerMatch !== undefined
            ? {
                maxReplaysPerMatch:
                  body.maxReplaysPerMatch === null
                    ? null
                    : typeof body.maxReplaysPerMatch === "number"
                      ? body.maxReplaysPerMatch
                      : undefined,
              }
            : {}),
          ...(typeof body?.adReplayEnabled === "boolean"
            ? { adReplayEnabled: body.adReplayEnabled }
            : {}),
          ...(typeof body?.ticketReplayEnabled === "boolean"
            ? { ticketReplayEnabled: body.ticketReplayEnabled }
            : {}),
          ...(body?.ticketReplayPriceTickets !== undefined
            ? {
                ticketReplayPriceTickets:
                  body.ticketReplayPriceTickets === null
                    ? null
                    : typeof body.ticketReplayPriceTickets === "number"
                      ? body.ticketReplayPriceTickets
                      : undefined,
              }
            : {}),
          ...(body?.freePlaySoloDailyCap !== undefined
            ? { freePlaySoloDailyCap: body.freePlaySoloDailyCap as number | null }
            : {}),
          ...(body?.freePlayMultiDailyCap !== undefined
            ? { freePlayMultiDailyCap: body.freePlayMultiDailyCap as number | null }
            : {}),
          ...(body?.quotaScope !== undefined
            ? {
                quotaScope:
                  body.quotaScope === null ||
                  body.quotaScope === "mode" ||
                  body.quotaScope === "lobby" ||
                  body.quotaScope === "tournament"
                    ? body.quotaScope
                    : undefined,
              }
            : {}),
          ...(body?.adEntryEnabled !== undefined
            ? { adEntryEnabled: body.adEntryEnabled as boolean | null }
            : {}),
          ...(body?.adEntrySoloDailyCap !== undefined
            ? { adEntrySoloDailyCap: body.adEntrySoloDailyCap as number | null }
            : {}),
          ...(body?.adEntryMultiDailyCap !== undefined
            ? { adEntryMultiDailyCap: body.adEntryMultiDailyCap as number | null }
            : {}),
          ...(body?.ticketEntryEnabled !== undefined
            ? { ticketEntryEnabled: body.ticketEntryEnabled as boolean | null }
            : {}),
          ...(body?.ticketEntrySoloPriceTickets !== undefined
            ? {
                ticketEntrySoloPriceTickets: body.ticketEntrySoloPriceTickets as
                  | number
                  | null,
              }
            : {}),
          ...(body?.ticketEntrySoloDailyCap !== undefined
            ? { ticketEntrySoloDailyCap: body.ticketEntrySoloDailyCap as number | null }
            : {}),
          ...(body?.ticketEntryMultiPriceTickets !== undefined
            ? {
                ticketEntryMultiPriceTickets: body.ticketEntryMultiPriceTickets as
                  | number
                  | null,
              }
            : {}),
          ...(body?.ticketEntryMultiDailyCap !== undefined
            ? {
                ticketEntryMultiDailyCap: body.ticketEntryMultiDailyCap as number | null,
              }
            : {}),
          ...(body?.soloSuccessDailyEnabled !== undefined
            ? { soloSuccessDailyEnabled: body.soloSuccessDailyEnabled as boolean | null }
            : {}),
          ...(body?.soloSuccessDailyCap !== undefined
            ? { soloSuccessDailyCap: body.soloSuccessDailyCap as number | null }
            : {}),
          ...(body?.soloSuccessAfterCapMode !== undefined
            ? {
                soloSuccessAfterCapMode:
                  body.soloSuccessAfterCapMode === null ||
                  body.soloSuccessAfterCapMode === "zero_all"
                    ? body.soloSuccessAfterCapMode
                    : undefined,
              }
            : {}),
          ...(body?.soloSuccessAllowPlayAfterCap !== undefined
            ? {
                soloSuccessAllowPlayAfterCap: body.soloSuccessAllowPlayAfterCap as
                  | boolean
                  | null,
              }
            : {}),
          ...(body?.lobbyOpsMode !== undefined
            ? {
                lobbyOpsMode:
                  body.lobbyOpsMode === null ||
                  body.lobbyOpsMode === "isolated" ||
                  body.lobbyOpsMode === "shared"
                    ? body.lobbyOpsMode
                    : undefined,
              }
            : {}),
          ...(body?.seasonEpochWeekKey !== undefined
            ? {
                seasonEpochWeekKey:
                  body.seasonEpochWeekKey === null ||
                  typeof body.seasonEpochWeekKey === "string"
                    ? body.seasonEpochWeekKey
                    : undefined,
              }
            : {}),
        }
      );
      return jsonResponse(result);
    }
    return jsonResponse({ ok: false, error: "invalid_operation" }, 400);
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
            ...(numberOrUndefined(body.grantTicketCount) != null
              ? { grantTicketCount: numberOrUndefined(body.grantTicketCount) }
              : numberOrUndefined(body.grantReplayTokenCount) != null
                ? { grantTicketCount: numberOrUndefined(body.grantReplayTokenCount) }
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

/** Platform Admin → Portal: list / upsert / delete partner lobbies. */
http.route({
  path: "/internal/partner-lobbies",
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
    try {
      if (operation === "list") {
        const lobbies = await ctx.runQuery(
          internal.service.lobby.portalLobbyMutations.listPortalLobbiesInternal,
          { partnerId }
        );
        return jsonResponse({ ok: true, lobbies });
      }
      if (operation === "upsert") {
        const b = parsed.body;
        if (typeof b.slug !== "string" || typeof b.title !== "string" || !Array.isArray(b.offerings)) {
          return jsonResponse({ ok: false, error: "invalid_fields" }, 400);
        }
        const result = await ctx.runMutation(
          internal.service.lobby.portalLobbyMutations.upsertPortalLobbyInternal,
          {
            partnerId,
            ...(typeof b.lobbyId === "string" ? { lobbyId: b.lobbyId as any } : {}),
            slug: b.slug,
            title: b.title,
            ...(typeof b.isDefault === "boolean" ? { isDefault: b.isDefault } : {}),
            ...(typeof b.enabled === "boolean" ? { enabled: b.enabled } : {}),
            ...(b.branding && typeof b.branding === "object"
              ? { branding: b.branding as any }
              : {}),
            offerings: b.offerings as any,
            ...(b.quotaScope === null
              ? { quotaScope: null }
              : b.quotaScope === "mode" ||
                  b.quotaScope === "lobby" ||
                  b.quotaScope === "tournament"
                ? { quotaScope: b.quotaScope }
                : {}),
            ...(b.soloSuccessDailyEnabled === null ||
            typeof b.soloSuccessDailyEnabled === "boolean"
              ? { soloSuccessDailyEnabled: b.soloSuccessDailyEnabled }
              : {}),
            ...(b.soloSuccessDailyCap === null ||
            typeof b.soloSuccessDailyCap === "number"
              ? { soloSuccessDailyCap: b.soloSuccessDailyCap }
              : {}),
            ...(b.soloSuccessAfterCapMode === null ||
            b.soloSuccessAfterCapMode === "zero_all"
              ? { soloSuccessAfterCapMode: b.soloSuccessAfterCapMode }
              : {}),
            ...(b.soloSuccessAllowPlayAfterCap === null ||
            typeof b.soloSuccessAllowPlayAfterCap === "boolean"
              ? { soloSuccessAllowPlayAfterCap: b.soloSuccessAllowPlayAfterCap }
              : {}),
            ...(b.seasonHonorMode === null ||
            b.seasonHonorMode === "join_now" ||
            b.seasonHonorMode === "next_season"
              ? { seasonHonorMode: b.seasonHonorMode }
              : {}),
          }
        );
        return jsonResponse({ ok: true, ...result });
      }
      if (operation === "delete") {
        if (typeof parsed.body.lobbyId !== "string") {
          return jsonResponse({ ok: false, error: "invalid_fields" }, 400);
        }
        const result = await ctx.runMutation(
          internal.service.lobby.portalLobbyMutations.deletePortalLobbyInternal,
          {
            partnerId,
            lobbyId: parsed.body.lobbyId as any,
          }
        );
        return jsonResponse(result);
      }
      return jsonResponse({ ok: false, error: "unknown_operation" }, 400);
    } catch (error) {
      const raw = error instanceof Error ? error.message : "operation_failed";
      const cleaned = raw.replace(/^Uncaught Error:\s*/i, "").trim().split(/\s|\n/)[0] || raw;
      return jsonResponse({ ok: false, error: cleaned }, 400);
    }
  }),
});

/**
 * Operation scripts → Portal: wipe partner-scoped config for clean relaunch.
 * Body: `{ partnerId }`. Does not touch seed pools or player runtime tables.
 */
http.route({
  path: "/internal/partner-wipe-config",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (request.headers.get("X-Portal-Bridge-Secret") !== portalGameBridgeSecret()) {
      return jsonResponse({ ok: false, error: "unauthorized" }, 401);
    }
    const parsed = await readJsonBody(request);
    if (!parsed.ok) return parsed.response;
    const partnerId = partnerIdFromBody(parsed.body);
    if (partnerId === null) {
      return jsonResponse({ ok: false, error: "invalid_fields" }, 400);
    }
    try {
      const result = await ctx.runMutation(
        internal.service.partner.portalPartnerWipe.wipePartnerConfigInternal,
        { partnerId }
      );
      return jsonResponse(result);
    } catch (error) {
      const raw = error instanceof Error ? error.message : "operation_failed";
      const cleaned =
        raw.replace(/^Uncaught Error:\s*/i, "").trim().split(/\s|\n/)[0] || raw;
      return jsonResponse(
        { ok: false, error: cleaned },
        cleaned === "default_partner_protected" ? 403 : 400
      );
    }
  }),
});

/** SSO → Portal: replicate global platform maintenance status. */
http.route({
  path: "/internal/platform-status",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (request.headers.get("X-Portal-Bridge-Secret") !== portalGameBridgeSecret()) {
      return jsonResponse({ ok: false, error: "unauthorized" }, 401);
    }
    let body: Record<string, unknown>;
    try {
      const parsed = await request.json();
      if (!parsed || typeof parsed !== "object") {
        return jsonResponse({ ok: false, error: "bad_body" }, 400);
      }
      body = parsed as Record<string, unknown>;
    } catch {
      return jsonResponse({ ok: false, error: "bad_json" }, 400);
    }
    const mode = body.mode;
    if (mode !== "normal" && mode !== "pre_notice" && mode !== "maintenance") {
      return jsonResponse({ ok: false, error: "invalid_fields" }, 400);
    }
    const updatedAt =
      typeof body.updatedAt === "number" && Number.isFinite(body.updatedAt)
        ? body.updatedAt
        : Date.now();
    try {
      await ctx.runMutation(internal.service.platformStatus.upsertFromBridgeInternal, {
        mode,
        title: typeof body.title === "string" ? body.title : undefined,
        message: typeof body.message === "string" ? body.message : undefined,
        plannedStartAt:
          typeof body.plannedStartAt === "number"
            ? body.plannedStartAt
            : body.plannedStartAt === null
              ? null
              : undefined,
        plannedEndAt:
          typeof body.plannedEndAt === "number"
            ? body.plannedEndAt
            : body.plannedEndAt === null
              ? null
              : undefined,
        updatedAt,
        updatedBy: typeof body.updatedBy === "string" ? body.updatedBy : null,
      });
      return jsonResponse({ ok: true });
    } catch (error) {
      return jsonResponse(
        { ok: false, error: error instanceof Error ? error.message : "operation_failed" },
        400
      );
    }
  }),
});

/** Stripe Checkout → fulfill iap shop packs (tickets + coins). */
http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature") ?? "";
    const result = await ctx.runAction(
      internal.service.shop.stripeWebhookAction.handleStripeWebhook,
      { body, signature }
    );
    if (!result.ok) {
      return new Response(JSON.stringify({ ok: false, error: result.error }), {
        status: "status" in result && typeof result.status === "number" ? result.status : 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
