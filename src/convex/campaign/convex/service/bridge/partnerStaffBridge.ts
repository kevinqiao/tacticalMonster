"use node";

const DEV_SSO_SITE_URL = "https://cool-salamander-393.convex.site";
/** Must match SSO `ssoBridgeSecret()` default when env unset. */
const DEV_SSO_BRIDGE_SECRET = "dev-local-sso-bridge";

/** Match SSO `SSO_BRIDGE_HEADER`. */
export const SSO_BRIDGE_HEADER = "X-Sso-Bridge-Secret";

function ssoSiteUrl(): string {
  const raw =
    process.env.SSO_SITE_URL ??
    process.env.SSO_CONVEX_URL ??
    process.env.VITE_CONVEX_URL;
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
    process.env.SSO_BRIDGE_SECRET ??
    process.env.CAMPAIGN_BRIDGE_SECRET;
  if (typeof s === "string" && s.trim().length > 0) {
    return s.trim();
  }
  return DEV_SSO_BRIDGE_SECRET;
}

export type AssertPartnerStaffResult =
  | { ok: true; partnerId: number; role: string; slug: string; hasCampaignOps?: boolean }
  | { ok: false; error: string; hasCampaignOps?: boolean };

/** merchantCampaign → SSO: partner_staff + campaignOps before campaign admin APIs. */
export async function assertPartnerStaffViaHttp(args: {
  partnerId: number;
  uid: string;
  minRole?: "viewer" | "developer" | "admin" | "owner";
}): Promise<AssertPartnerStaffResult> {
  const base = ssoSiteUrl();
  const url = `${base}/internal/assert-partner-staff`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [SSO_BRIDGE_HEADER]: ssoBridgeSecret(),
      },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (e) {
    console.error("[merchantCampaign] assert-partner-staff fetch failed", e);
    return { ok: false, error: "sso_unreachable" };
  }
  try {
    const parsed = (await response.json()) as AssertPartnerStaffResult;
    if (parsed && typeof parsed === "object" && parsed.ok === true) {
      return { ...parsed, hasCampaignOps: true };
    }
    return parsed;
  } catch {
    return { ok: false, error: "bad_response" };
  }
}

export async function requirePartnerCampaignOpsViaHttp(args: {
  partnerId: number;
  uid: string;
  minRole?: "viewer" | "developer" | "admin" | "owner";
}): Promise<void> {
  const result = await assertPartnerStaffViaHttp(args);
  if (!result.ok) {
    throw new Error(result.error || "forbidden");
  }
}
