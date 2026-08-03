"use node";

import { internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";

/** Portal prod is the CrazyGames SoT peer; safe default when PORTAL_SITE_URL unset. */
const DEFAULT_PORTAL_SITE_URL = "https://loyal-starfish-697.convex.site";
const DEV_PORTAL_BRIDGE_SECRET = "dev-local-portal-bridge";
const DEV_CASUAL_BRIDGE_SECRET = "dev-local-portal-bridge";
const DEV_CAMPAIGN_BRIDGE_SECRET = "dev-local-merchant-campaign-bridge";

function toSiteUrl(raw: string | undefined): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const t = raw.trim().replace(/\/+$/, "");
  return t.includes(".convex.cloud") ? t.replace(".convex.cloud", ".convex.site") : t;
}

function portalSiteUrl() {
  return (
    toSiteUrl(
      process.env.PORTAL_SITE_URL ??
        process.env.PORTAL_CONVEX_URL ??
        process.env.VITE_CONVEX_URL_PORTAL
    ) ?? DEFAULT_PORTAL_SITE_URL
  );
}

/** Only push when explicitly configured — never fall back to a hard-coded casual host. */
function casualSiteUrl() {
  return toSiteUrl(
    process.env.CASUAL_SITE_URL ??
      process.env.CASUAL_CONVEX_URL ??
      process.env.VITE_CONVEX_URL_CASUAL
  );
}

function campaignSiteUrl() {
  return toSiteUrl(
    process.env.CAMPAIGN_SITE_URL ??
      process.env.CAMPAIGN_CONVEX_URL ??
      process.env.VITE_CONVEX_URL_CAMPAIGN
  );
}

function portalBridgeSecret() {
  const raw =
    process.env.PORTAL_GAME_BRIDGE_SECRET ??
    process.env.CASUAL_GAME_BRIDGE_SECRET ??
    process.env.PORTAL_BRIDGE_SECRET;
  return typeof raw === "string" && raw.trim() ? raw.trim() : DEV_PORTAL_BRIDGE_SECRET;
}

function casualBridgeSecret() {
  const raw =
    process.env.CASUAL_GAME_BRIDGE_SECRET ??
    process.env.PORTAL_GAME_BRIDGE_SECRET;
  return typeof raw === "string" && raw.trim() ? raw.trim() : DEV_CASUAL_BRIDGE_SECRET;
}

function campaignBridgeSecret() {
  const raw = process.env.CAMPAIGN_BRIDGE_SECRET;
  return typeof raw === "string" && raw.trim() ? raw.trim() : DEV_CAMPAIGN_BRIDGE_SECRET;
}

async function pushStatus(
  url: string,
  headerName: string,
  secret: string,
  body: Record<string, unknown>
): Promise<{ ok: boolean; error?: string; skipped?: boolean }> {
  try {
    const response = await fetch(`${url}/internal/platform-status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [headerName]: secret,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    if (!payload || typeof payload !== "object") {
      return { ok: false, error: `http_${response.status}` };
    }
    if (payload.ok === false) {
      return {
        ok: false,
        error: typeof payload.error === "string" ? payload.error : `http_${response.status}`,
      };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "push_failed" };
  }
}

/** Best-effort replica push after SSO status write. Failures are logged, not fatal. */
export const syncPlatformStatusToPeers = internalAction({
  args: {},
  handler: async (ctx) => {
    const status = await ctx.runQuery(
      internal.service.partner.platformStatus.getPlatformStatusInternal,
      {}
    );
    const body = {
      mode: status.mode,
      title: status.title,
      message: status.message,
      plannedStartAt: status.plannedStartAt,
      plannedEndAt: status.plannedEndAt,
      updatedAt: status.updatedAt,
      updatedBy: status.updatedBy,
    };

    const portal = await pushStatus(
      portalSiteUrl(),
      "X-Portal-Bridge-Secret",
      portalBridgeSecret(),
      body
    );

    const casualUrl = casualSiteUrl();
    const casual = casualUrl
      ? await pushStatus(casualUrl, "X-Casual-Bridge-Secret", casualBridgeSecret(), body)
      : { ok: true as const, skipped: true as const };

    const campaignUrl = campaignSiteUrl();
    const campaign = campaignUrl
      ? await pushStatus(
          campaignUrl,
          "X-Merchant-Bridge-Secret",
          campaignBridgeSecret(),
          body
        )
      : { ok: true as const, skipped: true as const };

    for (const [label, r] of [
      ["portal", portal],
      ["casual", casual],
      ["campaign", campaign],
    ] as const) {
      if (!r.ok) {
        console.warn(`[platformStatusSync] ${label} push failed:`, r.error);
      } else if ("skipped" in r && r.skipped) {
        console.info(`[platformStatusSync] ${label} skipped (no site URL env)`);
      }
    }

    return {
      ok: true as const,
      peers: { portal, casual, campaign },
    };
  },
});
