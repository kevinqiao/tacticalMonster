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
    const merchantSlug = typeof b.merchantSlug === "string" ? b.merchantSlug : "";
    const campaignSlug = typeof b.campaignSlug === "string" ? b.campaignSlug : "";
    const sessionPartnerId =
      typeof b.sessionPartnerId === "number" && Number.isFinite(b.sessionPartnerId)
        ? b.sessionPartnerId
        : undefined;
    if (!uid || !merchantSlug || !campaignSlug) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const result = await ctx.runQuery(
      internal.service.merchant.campaignJoinAuthorize.authorizeCampaignJoinInternal,
      { uid, merchantSlug, campaignSlug, sessionPartnerId }
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
    const merchantId = typeof b.merchantId === "string" ? b.merchantId : "";
    const uid = typeof b.uid === "string" ? b.uid : "";
    const matchId = typeof b.matchId === "string" ? b.matchId : "";
    const gameType = typeof b.gameType === "string" ? b.gameType : "";
    const mode = b.mode === "multi" ? "multi" : "solo";
    const score = typeof b.score === "number" ? b.score : 0;
    const rank = typeof b.rank === "number" ? b.rank : undefined;
    const p75Success = b.p75Success === true;

    if (!campaignId || !merchantId || !uid || !matchId) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const result = await ctx.runMutation(
      internal.service.merchant.campaignSettleHook.onRunSettledInternal,
      {
        campaignId,
        merchantId,
        uid,
        matchId,
        score,
        rank,
        p75Success,
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

/** SSO-only: verify merchant owner before provisioning Web login for merchant_staff. */
http.route({
  path: "/internal/assert-merchant-owner",
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
    const merchantId = typeof b.merchantId === "string" ? b.merchantId : "";
    const uid = typeof b.uid === "string" ? b.uid : "";
    if (!merchantId || !uid) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const result = await ctx.runQuery(
      internal.service.merchant.merchantStaffAdmin.assertMerchantOwnerInternal,
      { merchantId, uid }
    );
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

/** SSO-only: verify uid has any merchant_staff row before Web sign-in. */
http.route({
  path: "/internal/assert-merchant-staff",
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
    if (!uid) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const result = await ctx.runQuery(
      internal.service.merchant.merchantStaffAdmin.assertMerchantStaffInternal,
      { uid }
    );
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
