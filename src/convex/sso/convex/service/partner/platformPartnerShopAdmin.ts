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

const settingsArgs = {
  partnerId: v.number(),
  /** When set, upsert/get lobby overlay (isolated mode). Omit = partner base. */
  lobbyId: v.optional(v.string()),
  enabled: v.boolean(),
  giftCardsEnabled: v.boolean(),
  virtualEnabled: v.boolean(),
  vouchersEnabled: v.boolean(),
  adCoinEnabled: v.boolean(),
  iapEnabled: v.boolean(),
  assortmentMode: v.union(v.literal("all_shared"), v.literal("allowlist")),
  skuIds: v.array(v.string()),
  excludeSkuIds: v.array(v.string()),
  overrides: v.record(
    v.string(),
    v.object({
      priceCoins: v.optional(v.number()),
      title: v.optional(v.string()),
      weeklyPurchaseLimit: v.optional(v.union(v.number(), v.null())),
      sortOrder: v.optional(v.number()),
      active: v.optional(v.boolean()),
      tangoUtid: v.optional(v.string()),
    })
  ),
};

async function request(body: Record<string, unknown>) {
  const response = await fetch(`${portalSiteUrl()}/internal/partner-shop-settings`, {
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

export const getPlatformPartnerShopSettings = authedAction({
  args: {
    partnerId: v.number(),
    lobbyId: v.optional(v.string()),
  },
  handler: async (ctx, { partnerId, lobbyId }) => {
    await authorizePlatformOperator(ctx);
    return await request({
      operation: "get",
      partnerId,
      ...(lobbyId ? { lobbyId } : {}),
    });
  },
});

export const savePlatformPartnerShopSettings = authedAction({
  args: settingsArgs,
  handler: async (ctx, args) => {
    await authorizePlatformOperator(ctx);
    return await request({
      operation: "upsert",
      ...args,
      ...(args.lobbyId ? { lobbyId: args.lobbyId } : {}),
    });
  },
});

/** Delete lobby shop overlay so the lobby inherits Partner base again. */
export const clearPlatformPartnerLobbyShopOverlay = authedAction({
  args: {
    partnerId: v.number(),
    lobbyId: v.string(),
  },
  handler: async (ctx, { partnerId, lobbyId }) => {
    await authorizePlatformOperator(ctx);
    return await request({
      operation: "clear_lobby",
      partnerId,
      lobbyId,
    });
  },
});
