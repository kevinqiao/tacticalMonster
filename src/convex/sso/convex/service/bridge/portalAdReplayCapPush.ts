"use node";

import { v } from "convex/values";

import { internalAction } from "../../_generated/server";

const DEV_PORTAL_SITE_URL = "https://loyal-starfish-697.convex.site";
/** Must match Portal `portalGameBridgeSecret()` default when env unset. */
const DEV_PORTAL_BRIDGE_SECRET = "dev-local-portal-bridge";

function portalSiteUrl(): string {
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

function portalBridgeSecret(): string {
  const s =
    process.env.PORTAL_GAME_BRIDGE_SECRET ??
    process.env.CASUAL_GAME_BRIDGE_SECRET ??
    process.env.PORTAL_BRIDGE_SECRET;
  if (typeof s === "string" && s.trim().length > 0) {
    return s.trim();
  }
  return DEV_PORTAL_BRIDGE_SECRET;
}

/** Push partner ad-replay cap into Portal cache after SSO admin/bootstrap writes. */
export const pushPartnerAdReplayCapToPortal = internalAction({
  args: {
    partnerId: v.number(),
    adReplayDailyCap: v.number(),
  },
  handler: async (_ctx, args) => {
    const url = `${portalSiteUrl()}/internal/upsert-partner-ad-replay-cap`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Portal-Bridge-Secret": portalBridgeSecret(),
        },
        body: JSON.stringify({
          partnerId: args.partnerId,
          adReplayDailyCap: args.adReplayDailyCap,
        }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.warn("[SSO] pushPartnerAdReplayCapToPortal failed", res.status, text.slice(0, 200));
        return { ok: false as const, error: `portal_${res.status}` };
      }
      return { ok: true as const };
    } catch (e) {
      console.warn("[SSO] pushPartnerAdReplayCapToPortal unreachable", e);
      return { ok: false as const, error: "portal_unreachable" };
    }
  },
});

export const pushPartnerPlayEntrySettingsToPortal = internalAction({
  args: {
    partnerId: v.number(),
    freePlaySoloDailyCap: v.optional(v.number()),
    freePlayMultiDailyCap: v.optional(v.number()),
    ticketEntrySoloPriceTickets: v.optional(v.number()),
    ticketEntrySoloDailyCap: v.optional(v.number()),
    ticketEntryMultiPriceTickets: v.optional(v.number()),
    ticketEntryMultiDailyCap: v.optional(v.number()),
  },
  handler: async (_ctx, args) => {
    try {
      const res = await fetch(`${portalSiteUrl()}/internal/upsert-partner-play-entry-settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Portal-Bridge-Secret": portalBridgeSecret() },
        body: JSON.stringify(args),
        signal: AbortSignal.timeout(15_000),
      });
      return res.ok ? { ok: true as const } : { ok: false as const, error: `portal_${res.status}` };
    } catch {
      return { ok: false as const, error: "portal_unreachable" };
    }
  },
});
