import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  MERCHANT_BRIDGE_HEADER,
  merchantBridgeSecret,
} from "./service/bridge/merchantBridgeSecret";

const http = httpRouter();

/** Portal-only: campaign join authorization (uid from Portal authed ingest). */
http.route({
  path: "/internal/authorize-campaign-join",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const expected = merchantBridgeSecret();
    const headerSecret = request.headers.get(MERCHANT_BRIDGE_HEADER);
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
    const b = body as Record<string, unknown>;
    const uid = typeof b.uid === "string" ? b.uid : "";
    const partnerSlug = typeof b.partnerSlug === "string" ? b.partnerSlug : "";
    const campaignSlug = typeof b.campaignSlug === "string" ? b.campaignSlug : "";
    if (!uid || !partnerSlug || !campaignSlug) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const result = await ctx.runQuery(
      internal.service.merchant.campaignJoinAuthorize.authorizeCampaignJoinInternal,
      { uid, partnerSlug, campaignSlug }
    );
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

/** Portal-only: pass/run settle → issue coupons or update leaderboard (bridge, not JWT). */
http.route({
  path: "/internal/on-run-settled",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const expected = merchantBridgeSecret();
    const headerSecret = request.headers.get(MERCHANT_BRIDGE_HEADER);
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
    const b = body as Record<string, unknown>;
    const campaignId = typeof b.campaignId === "string" ? b.campaignId : "";
    const partnerId =
      typeof b.partnerId === "number" ? b.partnerId : Number(b.partnerId);
    const uid = typeof b.uid === "string" ? b.uid : "";
    const runTournamentId =
      typeof b.runTournamentId === "string" ? b.runTournamentId : "";
    const matchId = typeof b.matchId === "string" ? b.matchId : undefined;
    const gameType = typeof b.gameType === "string" ? b.gameType : "";
    const mode = b.mode === "multi" ? "multi" : "solo";
    const score = typeof b.score === "number" ? b.score : 0;
    const rank = typeof b.rank === "number" ? b.rank : undefined;
    const isPassed = b.isPassed === true;

    if (!campaignId || !Number.isFinite(partnerId) || !uid || !runTournamentId) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const result = await ctx.runMutation(
      internal.service.merchant.campaignSettleHook.onRunSettledInternal,
      {
        campaignId,
        partnerId,
        uid,
        runTournamentId,
        matchId,
        score,
        rank,
        isPassed,
        gameType,
        mode,
      }
    );
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

/** Deprecated: store owner assert moved to SSO `/internal/assert-store-owner`. */
http.route({
  path: "/internal/assert-merchant-owner",
  method: "POST",
  handler: httpAction(async (_ctx, _request) => {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "moved_to_sso",
        hint: "Use SSO /internal/assert-store-owner",
      }),
      { status: 410, headers: { "Content-Type": "application/json" } }
    );
  }),
});

/** Deprecated: store staff assert moved to SSO `/internal/assert-store-staff`. */
http.route({
  path: "/internal/assert-merchant-staff",
  method: "POST",
  handler: httpAction(async (_ctx, _request) => {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "moved_to_sso",
        hint: "Use SSO /internal/assert-store-staff",
      }),
      { status: 410, headers: { "Content-Type": "application/json" } }
    );
  }),
});

/** SSO → merchantCampaign: mirror partner.slug into partner_brands for public /campaign/{slug}. */
http.route({
  path: "/internal/upsert-partner-brand",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const expected = merchantBridgeSecret();
    const headerSecret = request.headers.get(MERCHANT_BRIDGE_HEADER);
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
    const b = body as Record<string, unknown>;
    const partnerId = typeof b.partnerId === "number" ? b.partnerId : Number(b.partnerId);
    const slug = typeof b.slug === "string" ? b.slug.trim().toLowerCase() : "";
    if (!Number.isFinite(partnerId) || partnerId < 0 || !slug) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    try {
      const result = await ctx.runMutation(
        internal.service.merchant.merchantCampaigns.upsertPartnerBrandCore,
        { partnerId, slug }
      );
      return new Response(JSON.stringify({ ok: true, ...result }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "upsert_failed";
      return new Response(JSON.stringify({ ok: false, error: message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

export default http;
