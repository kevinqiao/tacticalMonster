import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import {
  MERCHANT_BRIDGE_HEADER,
  merchantBridgeSecret,
} from "./service/bridge/merchantBridgeSecret";

const http = httpRouter();

/**
 * Portal-only: campaign join authorization (uid from Portal authed ingest).
 * partnerId comes from the caller's platform session — no SSO slug resolve.
 */
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
    const partnerIdRaw =
      typeof b.partnerId === "number" ? b.partnerId : Number(b.partnerId);
    const campaignSlug = typeof b.campaignSlug === "string" ? b.campaignSlug : "";
    if (
      !uid ||
      !campaignSlug ||
      !Number.isFinite(partnerIdRaw) ||
      partnerIdRaw < 0
    ) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const result = await ctx.runQuery(
      internal.service.merchant.campaignJoinAuthorize.authorizeCampaignJoinInternal,
      { uid, partnerId: Math.floor(partnerIdRaw), campaignSlug }
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

// Brand is SSO-only (FE via PartnerManager). Campaign resolves partnerId only.

function applePassAuthToken(request: Request): string | null {
  const h = request.headers.get("Authorization") ?? "";
  const m = /^ApplePass\s+(.+)$/i.exec(h.trim());
  return m?.[1]?.trim() || null;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Path after `/passkit/v1/` (Convex has no `{param}` routes — use pathPrefix). */
function passkitV1Suffix(pathname: string): string {
  const marker = "/passkit/v1/";
  const i = pathname.indexOf(marker);
  if (i < 0) return "";
  return pathname.slice(i + marker.length);
}

/**
 * Apple Wallet PassKit web service.
 * webServiceURL = `{CONVEX_SITE_URL}/passkit`
 */
http.route({
  pathPrefix: "/passkit/v1/",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const suffix = passkitV1Suffix(new URL(request.url).pathname);
    if (suffix === "log") {
      try {
        const body = await request.text();
        console.info("[passkit] device log", body.slice(0, 2000));
      } catch {
        /* ignore */
      }
      return new Response(null, { status: 200 });
    }

    // devices/:device/registrations/:passType/:serial
    const reg = /^devices\/([^/]+)\/registrations\/([^/]+)\/([^/]+)\/?$/.exec(suffix);
    if (!reg) return new Response(null, { status: 404 });

    const authToken = applePassAuthToken(request);
    if (!authToken) return new Response(null, { status: 401 });

    const deviceLibraryIdentifier = decodeURIComponent(reg[1]!);
    const passTypeIdentifier = decodeURIComponent(reg[2]!);
    const serialNumber = decodeURIComponent(reg[3]!);

    const coupon = await ctx.runQuery(
      internal.service.wallet.applePassMutations.getCouponBySerialForPass,
      { serialNumber, passTypeIdentifier, authToken }
    );
    if (!coupon) return new Response(null, { status: 401 });

    let pushToken = "";
    try {
      const body = (await request.json()) as { pushToken?: string };
      pushToken = typeof body.pushToken === "string" ? body.pushToken : "";
    } catch {
      return new Response(null, { status: 400 });
    }
    if (!pushToken) return new Response(null, { status: 400 });

    const result = await ctx.runMutation(internal.service.wallet.applePassMutations.registerDevice, {
      deviceLibraryIdentifier,
      pushToken,
      passTypeIdentifier,
      serialNumber,
    });
    return new Response(null, { status: result.created ? 201 : 200 });
  }),
});

http.route({
  pathPrefix: "/passkit/v1/",
  method: "DELETE",
  handler: httpAction(async (ctx, request) => {
    const suffix = passkitV1Suffix(new URL(request.url).pathname);
    const reg = /^devices\/([^/]+)\/registrations\/([^/]+)\/([^/]+)\/?$/.exec(suffix);
    if (!reg) return new Response(null, { status: 404 });

    const authToken = applePassAuthToken(request);
    if (!authToken) return new Response(null, { status: 401 });

    const deviceLibraryIdentifier = decodeURIComponent(reg[1]!);
    const passTypeIdentifier = decodeURIComponent(reg[2]!);
    const serialNumber = decodeURIComponent(reg[3]!);

    const coupon = await ctx.runQuery(
      internal.service.wallet.applePassMutations.getCouponBySerialForPass,
      { serialNumber, passTypeIdentifier, authToken }
    );
    if (!coupon) return new Response(null, { status: 401 });

    await ctx.runMutation(internal.service.wallet.applePassMutations.unregisterDevice, {
      deviceLibraryIdentifier,
      passTypeIdentifier,
      serialNumber,
    });
    return new Response(null, { status: 200 });
  }),
});

http.route({
  pathPrefix: "/passkit/v1/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const suffix = passkitV1Suffix(url.pathname);

    // devices/:device/registrations/:passType
    const list = /^devices\/([^/]+)\/registrations\/([^/]+)\/?$/.exec(suffix);
    if (list) {
      const deviceLibraryIdentifier = decodeURIComponent(list[1]!);
      const passTypeIdentifier = decodeURIComponent(list[2]!);
      const passesUpdatedSince = url.searchParams.get("passesUpdatedSince") ?? undefined;
      const result = await ctx.runQuery(
        internal.service.wallet.applePassMutations.listUpdatedSerialsForDevice,
        { deviceLibraryIdentifier, passTypeIdentifier, passesUpdatedSince }
      );
      if (!result.serialNumbers.length) {
        return new Response(null, { status: 204 });
      }
      return jsonResponse({
        serialNumbers: result.serialNumbers,
        lastUpdated: result.lastUpdated,
      });
    }

    // passes/:passType/:serial
    const pass = /^passes\/([^/]+)\/([^/]+)\/?$/.exec(suffix);
    if (pass) {
      const authToken = applePassAuthToken(request);
      if (!authToken) return new Response(null, { status: 401 });
      const passTypeIdentifier = decodeURIComponent(pass[1]!);
      const serialNumber = decodeURIComponent(pass[2]!);
      const built = await ctx.runAction(
        internal.service.wallet.applePassActions.buildPassBase64ForWebService,
        { serialNumber, passTypeIdentifier, authToken }
      );
      if (!built.ok) {
        return new Response(null, { status: built.error === "unauthorized" ? 401 : 500 });
      }
      const bytes = Uint8Array.from(atob(built.base64), (c) => c.charCodeAt(0));
      return new Response(bytes, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.apple.pkpass",
          "Last-Modified": built.lastModified,
        },
      });
    }

    return new Response(null, { status: 404 });
  }),
});

/** SSO → Campaign: replicate global platform maintenance status. */
http.route({
  path: "/internal/platform-status",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (request.headers.get(MERCHANT_BRIDGE_HEADER) !== merchantBridgeSecret()) {
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

export default http;
