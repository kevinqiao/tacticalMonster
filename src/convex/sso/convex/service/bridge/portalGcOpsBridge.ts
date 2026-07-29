"use node";

/**
 * SSO → Portal GC ops SoT (replay / play-entry / lobbyOps).
 * Single HTTP surface: POST /internal/partner-gc-ops-settings
 */

import { v } from "convex/values";

import { internalAction } from "../../_generated/server";

const DEV_PORTAL_SITE_URL = "https://loyal-starfish-697.convex.site";
/** Must match Portal `portalGameBridgeSecret()` default when env unset. */
const DEV_PORTAL_BRIDGE_SECRET = "dev-local-portal-bridge";

export function portalSiteUrl(): string {
  const raw =
    process.env.PORTAL_SITE_URL ??
    process.env.PORTAL_CONVEX_URL ??
    process.env.VITE_CONVEX_URL_PORTAL;
  if (typeof raw === "string" && raw.trim().length > 0) {
    const t = raw.trim().replace(/\/+$/, "");
    if (t.includes(".convex.cloud")) {
      return t.replace(".convex.cloud", ".convex.site");
    }
    return t;
  }
  return DEV_PORTAL_SITE_URL;
}

export function portalBridgeSecret(): string {
  const s =
    process.env.PORTAL_GAME_BRIDGE_SECRET ??
    process.env.CASUAL_GAME_BRIDGE_SECRET ??
    process.env.PORTAL_BRIDGE_SECRET;
  if (typeof s === "string" && s.trim().length > 0) {
    return s.trim();
  }
  return DEV_PORTAL_BRIDGE_SECRET;
}

export async function requestPortalGcOps(
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const response = await fetch(`${portalSiteUrl()}/internal/partner-gc-ops-settings`, {
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

const nullableNumber = v.optional(v.union(v.number(), v.null()));
const nullableQuotaScope = v.optional(
  v.union(
    v.literal("mode"),
    v.literal("lobby"),
    v.literal("tournament"),
    v.null()
  )
);
const nullableLobbyOps = v.optional(
  v.union(v.literal("isolated"), v.literal("shared"), v.null())
);

/** Seed / upsert Portal GC ops SoT (bootstrap + partner create). */
export const upsertPartnerGcOpsToPortal = internalAction({
  args: {
    partnerId: v.number(),
    adReplayDailyCap: nullableNumber,
    maxReplaysPerMatch: nullableNumber,
    adReplayEnabled: v.optional(v.boolean()),
    ticketReplayEnabled: v.optional(v.boolean()),
    ticketReplayPriceTickets: nullableNumber,
    freePlaySoloDailyCap: nullableNumber,
    freePlayMultiDailyCap: nullableNumber,
    quotaScope: nullableQuotaScope,
    adEntryEnabled: v.optional(v.union(v.boolean(), v.null())),
    adEntrySoloDailyCap: nullableNumber,
    adEntryMultiDailyCap: nullableNumber,
    ticketEntryEnabled: v.optional(v.union(v.boolean(), v.null())),
    ticketEntrySoloPriceTickets: nullableNumber,
    ticketEntrySoloDailyCap: nullableNumber,
    ticketEntryMultiPriceTickets: nullableNumber,
    ticketEntryMultiDailyCap: nullableNumber,
    lobbyOpsMode: nullableLobbyOps,
  },
  handler: async (_ctx, args) => {
    try {
      await requestPortalGcOps({
        operation: "upsert",
        ...args,
      });
      return { ok: true as const };
    } catch (e) {
      console.warn("[SSO] upsertPartnerGcOpsToPortal failed", e);
      return {
        ok: false as const,
        error: e instanceof Error ? e.message : "portal_unreachable",
      };
    }
  },
});
