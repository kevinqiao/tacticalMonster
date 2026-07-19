import { httpRouter } from "convex/server";
// import jwt from "jsonwebtoken";
import { api, internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import {
  SSO_BRIDGE_HEADER,
  ssoBridgeSecret,
} from "./service/bridge/ssoBridgeSecret";


const http = httpRouter();

http.route({
  path: "/event/sync",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authorizaton = request.headers.get("Authorization");
    const token = authorizaton?.split(" ")[1];
    if (!token) return new Response("Unauthorized", { status: 401 });


    const events = await request.json();
    console.log("events", events);
    const result = await ctx.runAction(api.service.EventManager.save, { events });

    // console.log("result",result);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: new Headers({
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      })
    });
  }),
});
http.route({
  path: "/asset/debit",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    console.log("debit");
    const debit = await request.json();
    console.log("debit: ", debit);
    const user = await ctx.runQuery(internal.dao.authIdentityDao.findByUid, { uid: debit.uid });
    console.log("user: ", user);
    // if (!user) return new Response("Unauthorized", { status: 401 });
    // if (!user || user.token !== debit.token) return new Response("Unauthorized", { status: 401 });
    // console.log("result",result);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: new Headers({
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      })
    });
  }),
});
http.route({
  path: "/asset/credit",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const credit = await request.json();
    const platformAccessToken =
      typeof credit.platformAccessToken === "string"
        ? credit.platformAccessToken
        : typeof credit.token === "string"
          ? credit.token
          : null;
    if (!platformAccessToken || typeof credit.uid !== "string") {
      return new Response("Unauthorized", { status: 401 });
    }
    const ok = await ctx.runAction(api.service.auth.platformAuth.verifyPlatformTokenForUid, {
      uid: credit.uid,
      platformAccessToken,
    });
    if (!ok) return new Response("Unauthorized", { status: 401 });

    // console.log("result",result);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: new Headers({
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      })
    });
  }),
});

/**
 * merchantCampaign → SSO: assert uid is partner_staff and partner has campaignOps.
 * Header `X-Sso-Bridge-Secret` must match `SSO_BRIDGE_SECRET` (or CAMPAIGN_BRIDGE_SECRET).
 */
http.route({
  path: "/internal/assert-partner-staff",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const expected = ssoBridgeSecret();
    const headerSecret = request.headers.get(SSO_BRIDGE_HEADER);
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
    const uid = typeof b.uid === "string" ? b.uid : "";
    const minRole =
      typeof b.minRole === "string" &&
      ["owner", "admin", "developer", "viewer"].includes(b.minRole)
        ? (b.minRole as "owner" | "admin" | "developer" | "viewer")
        : undefined;
    if (!Number.isFinite(partnerId) || partnerId < 0 || !uid) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const result = await ctx.runQuery(
      internal.service.partner.partnerAdmin.assertPartnerStaffInternal,
      { partnerId, uid, minRole }
    );
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

/** merchantCampaign → SSO: any store_staff row for uid (Web sign-in / bridges). */
http.route({
  path: "/internal/assert-store-staff",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const expected = ssoBridgeSecret();
    const headerSecret = request.headers.get(SSO_BRIDGE_HEADER);
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
    const uid = typeof (body as { uid?: unknown }).uid === "string" ? (body as { uid: string }).uid : "";
    if (!uid) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const result = await ctx.runQuery(
      internal.service.partner.storeAdmin.assertStoreStaffInternal,
      { uid }
    );
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

/** merchantCampaign / SSO clients: store owner for staff provisioning. */
http.route({
  path: "/internal/assert-store-owner",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const expected = ssoBridgeSecret();
    const headerSecret = request.headers.get(SSO_BRIDGE_HEADER);
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
    const storeId = typeof b.storeId === "string" ? b.storeId : "";
    const uid = typeof b.uid === "string" ? b.uid : "";
    if (!storeId || !uid) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const result = await ctx.runQuery(
      internal.service.partner.storeAdmin.assertStoreOwnerInternal,
      { storeId, uid }
    );
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

/** merchantCampaign redeem: store staff for storeId (+ partnerId). */
http.route({
  path: "/internal/assert-store-staff-for-store",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const expected = ssoBridgeSecret();
    const headerSecret = request.headers.get(SSO_BRIDGE_HEADER);
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
    const storeId = typeof b.storeId === "string" ? b.storeId : "";
    const uid = typeof b.uid === "string" ? b.uid : "";
    if (!storeId || !uid) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const result = await ctx.runQuery(
      internal.service.partner.storeAdmin.assertStoreStaffForStoreInternal,
      { storeId, uid }
    );
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

/** merchantCampaign validateCoupon: resolve store partnerId by storeId. */
http.route({
  path: "/internal/resolve-store",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const expected = ssoBridgeSecret();
    const headerSecret = request.headers.get(SSO_BRIDGE_HEADER);
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
    const storeId =
      typeof (body as { storeId?: unknown }).storeId === "string"
        ? (body as { storeId: string }).storeId
        : "";
    if (!storeId) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const store = await ctx.runQuery(internal.service.partner.storeAdmin.resolveStoreInternal, {
      storeId,
    });
    if (!store) {
      return new Response(JSON.stringify({ ok: false, error: "not_found" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ ok: true, ...store }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

/**
 * Portal → SSO: resolve per-partner ad-replay daily cap.
 * Header `X-Sso-Bridge-Secret` must match `SSO_BRIDGE_SECRET`.
 */
http.route({
  path: "/internal/partner-ad-replay-config",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const expected = ssoBridgeSecret();
    const headerSecret = request.headers.get(SSO_BRIDGE_HEADER);
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
    const partnerId =
      typeof partnerIdRaw === "number" && Number.isFinite(partnerIdRaw)
        ? Math.floor(partnerIdRaw)
        : typeof partnerIdRaw === "string"
          ? Number(partnerIdRaw)
          : NaN;
    if (!Number.isFinite(partnerId) || partnerId < 0) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const result = await ctx.runQuery(
      internal.service.partner.partnerAdReplayConfigInternal.getPartnerAdReplayConfigInternal,
      { partnerId }
    );
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// Convex expects the router to be the default export of `convex/http.js`.
export default http;
