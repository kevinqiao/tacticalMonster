"use node";

/**
 * Keep upsertPartnerBrandViaHttp only — store staff asserts live in SSO locally.
 */

const DEV_CAMPAIGN_SITE_URL = "https://curious-goldfish-112.convex.site";
const DEV_CAMPAIGN_BRIDGE_SECRET = "dev-local-merchant-campaign-bridge";

export const MERCHANT_BRIDGE_HEADER = "X-Merchant-Bridge-Secret";

function campaignSiteUrl(): string {
  const raw =
    process.env.CAMPAIGN_SITE_URL ??
    process.env.CAMPAIGN_CONVEX_SITE ??
    process.env.VITE_CONVEX_URL_CAMPAIGN;
  if (typeof raw === "string" && raw.trim().length > 0) {
    const t = raw.trim().replace(/\/+$/, "");
    if (t.includes(".convex.cloud")) {
      return t.replace(".convex.cloud", ".convex.site");
    }
    return t;
  }
  return DEV_CAMPAIGN_SITE_URL;
}

function campaignBridgeSecret(): string {
  const s = process.env.CAMPAIGN_BRIDGE_SECRET;
  if (typeof s === "string" && s.trim().length > 0) {
    return s.trim();
  }
  return DEV_CAMPAIGN_BRIDGE_SECRET;
}

export type UpsertPartnerBrandResult =
  | { ok: true; partnerId: number; slug: string }
  | { ok: false; error: string };

/** SSO → campaign: ensure partner_brands.slug matches SSO partner.slug for public URLs. */
export async function upsertPartnerBrandViaHttp(args: {
  partnerId: number;
  slug: string;
}): Promise<UpsertPartnerBrandResult> {
  const base = campaignSiteUrl();
  const url = `${base}/internal/upsert-partner-brand`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [MERCHANT_BRIDGE_HEADER]: campaignBridgeSecret(),
      },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (e) {
    console.error("[sso] upsert-partner-brand fetch failed", e);
    return { ok: false, error: "merchant_unreachable" };
  }
  try {
    const json = (await response.json()) as UpsertPartnerBrandResult | { partnerId: number; slug: string };
    if ("ok" in json) return json as UpsertPartnerBrandResult;
    if (response.ok && typeof (json as { partnerId?: number }).partnerId === "number") {
      return {
        ok: true,
        partnerId: (json as { partnerId: number }).partnerId,
        slug: (json as { slug: string }).slug,
      };
    }
    return { ok: false, error: "bad_response" };
  } catch {
    return { ok: false, error: "bad_response" };
  }
}
