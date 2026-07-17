import { httpRouter } from "convex/server";

import { internal } from "./_generated/api";
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
      replayTokenId?: import("./_generated/dataModel").Id<"casual_replay_tokens">;
      adReplayClaimId?: import("./_generated/dataModel").Id<"portal_ad_replay_claims">;
    } = { uid, matchGameId };
    if (typeof b.replayTokenId === "string" && b.replayTokenId.length > 0) {
      mutationArgs.replayTokenId =
        b.replayTokenId as import("./_generated/dataModel").Id<"casual_replay_tokens">;
    }
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

export default http;
