"use node";

import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";
import { PORTAL_AD_REPLAY_DAILY_CAP } from "../../data/portalAdReplayConfig";

const DEV_SSO_SITE_URL = "https://cool-salamander-393.convex.site";
const DEV_SSO_BRIDGE_SECRET = "dev-local-sso-bridge";
const SSO_BRIDGE_HEADER = "X-Sso-Bridge-Secret";

function ssoSiteUrl(): string {
  const raw =
    process.env.SSO_SITE_URL ??
    process.env.SSO_CONVEX_URL ??
    process.env.VITE_CONVEX_URL_SSO;
  if (typeof raw === "string" && raw.trim().length > 0) {
    const t = raw.trim().replace(/\/+$/, "");
    if (t.includes(".convex.cloud")) {
      return t.replace(".convex.cloud", ".convex.site");
    }
    return t;
  }
  return DEV_SSO_SITE_URL;
}

function ssoBridgeSecret(): string {
  const s =
    process.env.SSO_BRIDGE_SECRET ?? process.env.CAMPAIGN_BRIDGE_SECRET;
  if (typeof s === "string" && s.trim().length > 0) {
    return s.trim();
  }
  return DEV_SSO_BRIDGE_SECRET;
}

/** Portal cache miss → pull cap from SSO internal HTTP. */
export const syncPartnerAdReplayCapFromSso = internalAction({
  args: { partnerId: v.number() },
  handler: async (ctx, { partnerId }) => {
    const url = `${ssoSiteUrl()}/internal/partner-ad-replay-config`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [SSO_BRIDGE_HEADER]: ssoBridgeSecret(),
        },
        body: JSON.stringify({ partnerId }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.warn(
          "[Portal] syncPartnerAdReplayCapFromSso failed",
          res.status,
          text.slice(0, 200)
        );
        return { ok: false as const, error: `sso_${res.status}` };
      }
      const body = (await res.json()) as {
        ok?: boolean;
        adReplayDailyCap?: number;
      };
      const cap =
        typeof body.adReplayDailyCap === "number" && Number.isFinite(body.adReplayDailyCap)
          ? Math.floor(body.adReplayDailyCap)
          : PORTAL_AD_REPLAY_DAILY_CAP;
      await ctx.runMutation(
        internal.service.ads.partnerAdReplayConfig.upsertPartnerAdReplayCapInternal,
        { partnerId, adReplayDailyCap: cap }
      );
      return { ok: true as const, partnerId, adReplayDailyCap: cap };
    } catch (e) {
      console.warn("[Portal] syncPartnerAdReplayCapFromSso unreachable", e);
      return { ok: false as const, error: "sso_unreachable" };
    }
  },
});
