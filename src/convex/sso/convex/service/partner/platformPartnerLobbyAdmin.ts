"use node";

import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { authedAction } from "../../custom/session";

const DEV_PORTAL_SITE_URL = "https://loyal-starfish-697.convex.site";
const DEV_PORTAL_BRIDGE_SECRET = "dev-local-portal-bridge";

function portalSiteUrl() {
  const raw =
    process.env.PORTAL_SITE_URL ??
    process.env.PORTAL_CONVEX_URL ??
    process.env.VITE_CONVEX_URL_PORTAL;
  const url =
    typeof raw === "string" && raw.trim()
      ? raw.trim().replace(/\/+$/, "")
      : DEV_PORTAL_SITE_URL;
  return url.replace(".convex.cloud", ".convex.site");
}

function portalBridgeSecret() {
  const raw =
    process.env.PORTAL_GAME_BRIDGE_SECRET ??
    process.env.CASUAL_GAME_BRIDGE_SECRET ??
    process.env.PORTAL_BRIDGE_SECRET;
  return typeof raw === "string" && raw.trim() ? raw.trim() : DEV_PORTAL_BRIDGE_SECRET;
}

async function request(body: Record<string, unknown>) {
  const response = await fetch(`${portalSiteUrl()}/internal/partner-lobbies`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Portal-Bridge-Secret": portalBridgeSecret(),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await response.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    throw new Error(`portal_${response.status}`);
  }
  const row = payload as Record<string, unknown>;
  if (row.ok === false) {
    throw new Error(typeof row.error === "string" ? row.error : `portal_${response.status}`);
  }
  return row;
}

async function authorizePlatformOperator(ctx: {
  runQuery: (
    ref: typeof internal.service.partner.platformAdmin.assertPlatformOperatorInternal,
    args: { uid: string }
  ) => Promise<{ ok: boolean; error?: string }>;
  identity: { subject: string };
}) {
  const result = await ctx.runQuery(
    internal.service.partner.platformAdmin.assertPlatformOperatorInternal,
    { uid: ctx.identity.subject }
  );
  if (!result.ok) throw new Error(result.error ?? "forbidden");
}

const offeringValidator = v.object({
  tournamentId: v.string(),
  sortOrder: v.number(),
  titleOverride: v.optional(v.string()),
  rewardsOverride: v.optional(v.any()),
  enabled: v.optional(v.boolean()),
});

const brandingValidator = v.object({
  logoUrl: v.optional(v.string()),
  backgroundLandscapeUrl: v.optional(v.string()),
  backgroundPortraitUrl: v.optional(v.string()),
});

/** List lobbies for a partner (Portal SoT via bridge). */
export const listPlatformPartnerLobbies = authedAction({
  args: { partnerId: v.number() },
  handler: async (ctx, { partnerId }) => {
    await authorizePlatformOperator(ctx);
    return await request({ operation: "list", partnerId });
  },
});

/** Create/update a lobby (Portal SoT). */
export const upsertPlatformPartnerLobby = authedAction({
  args: {
    partnerId: v.number(),
    lobbyId: v.optional(v.string()),
    slug: v.string(),
    title: v.string(),
    isDefault: v.optional(v.boolean()),
    enabled: v.optional(v.boolean()),
    branding: v.optional(brandingValidator),
    offerings: v.array(offeringValidator),
    /** null clears lobby override (inherit partner base). */
    quotaScope: v.optional(
      v.union(
        v.literal("mode"),
        v.literal("lobby"),
        v.literal("tournament"),
        v.null()
      )
    ),
    seasonHonorMode: v.optional(
      v.union(v.literal("join_now"), v.literal("next_season"), v.null())
    ),
  },
  handler: async (ctx, args) => {
    await authorizePlatformOperator(ctx);
    return await request({ operation: "upsert", ...args });
  },
});

/** Delete a non-default lobby. */
export const deletePlatformPartnerLobby = authedAction({
  args: {
    partnerId: v.number(),
    lobbyId: v.string(),
  },
  handler: async (ctx, { partnerId, lobbyId }) => {
    await authorizePlatformOperator(ctx);
    return await request({ operation: "delete", partnerId, lobbyId });
  },
});
