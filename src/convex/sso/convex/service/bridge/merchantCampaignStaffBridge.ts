"use node";

const DEV_MERCHANT_SITE_URL = "https://curious-goldfish-112.convex.site";
const DEV_MERCHANT_BRIDGE_SECRET = "dev-local-merchant-campaign-bridge";

export const MERCHANT_BRIDGE_HEADER = "X-Merchant-Bridge-Secret";

function merchantCampaignSiteUrl(): string {
  const raw =
    process.env.MERCHANT_CAMPAIGN_SITE_URL ??
    process.env.MERCHANT_CAMPAIGN_CONVEX_SITE ??
    process.env.VITE_CONVEX_URL_MERCHANT;
  if (typeof raw === "string" && raw.trim().length > 0) {
    const t = raw.trim().replace(/\/+$/, "");
    if (t.includes(".convex.cloud")) {
      return t.replace(".convex.cloud", ".convex.site");
    }
    return t;
  }
  return DEV_MERCHANT_SITE_URL;
}

function merchantCampaignBridgeSecret(): string {
  const s =
    process.env.MERCHANT_CAMPAIGN_BRIDGE_SECRET ??
    process.env.PORTAL_MERCHANT_BRIDGE_SECRET;
  if (typeof s === "string" && s.trim().length > 0) {
    return s.trim();
  }
  return DEV_MERCHANT_BRIDGE_SECRET;
}

export type AssertMerchantOwnerResult =
  | { ok: true; partnerId: number }
  | { ok: false; error: string };

export type AssertMerchantStaffResult = { ok: true } | { ok: false; error: string };

/** SSO → merchantCampaign: verify uid is merchant_staff before Web sign-in. */
export async function assertMerchantStaffViaHttp(args: {
  uid: string;
}): Promise<AssertMerchantStaffResult> {
  const base = merchantCampaignSiteUrl();
  const url = `${base}/internal/assert-merchant-staff`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [MERCHANT_BRIDGE_HEADER]: merchantCampaignBridgeSecret(),
      },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (e) {
    console.error("[sso] assert-merchant-staff fetch failed", e);
    return { ok: false, error: "merchant_unreachable" };
  }
  try {
    return (await response.json()) as AssertMerchantStaffResult;
  } catch {
    return { ok: false, error: "bad_response" };
  }
}

/** SSO → merchantCampaign: verify uid is merchant owner before staff Web provisioning. */
export async function assertMerchantOwnerViaHttp(args: {
  merchantId: string;
  uid: string;
}): Promise<AssertMerchantOwnerResult> {
  const base = merchantCampaignSiteUrl();
  const url = `${base}/internal/assert-merchant-owner`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [MERCHANT_BRIDGE_HEADER]: merchantCampaignBridgeSecret(),
      },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (e) {
    console.error("[sso] assert-merchant-owner fetch failed", e);
    return { ok: false, error: "merchant_unreachable" };
  }
  try {
    return (await response.json()) as AssertMerchantOwnerResult;
  } catch {
    return { ok: false, error: "bad_response" };
  }
}
