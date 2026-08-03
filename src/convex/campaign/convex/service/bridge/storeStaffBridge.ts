"use node";

/** merchantCampaign → SSO: store_staff asserts + resolve store for redeem. */

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

export type ResolveStoreResult =
  | {
      ok: true;
      storeId: string;
      partnerId: number;
      slug: string;
      name: string;
      status: "active" | "suspended";
    }
  | { ok: false; error: string };

export type AssertStoreStaffForStoreResult =
  | { ok: true; partnerId: number; role: string; status: string }
  | { ok: false; error: string };

export async function resolveStoreViaHttp(args: {
  storeId: string;
}): Promise<ResolveStoreResult> {
  const base = ssoSiteUrl();
  const url = `${base}/internal/resolve-store`;
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
    console.error("[merchantCampaign] resolve-store fetch failed", e);
    return { ok: false, error: "sso_unreachable" };
  }
  try {
    return (await response.json()) as ResolveStoreResult;
  } catch {
    return { ok: false, error: "bad_response" };
  }
}

export async function assertStoreStaffForStoreViaHttp(args: {
  storeId: string;
  uid: string;
}): Promise<AssertStoreStaffForStoreResult> {
  const base = ssoSiteUrl();
  const url = `${base}/internal/assert-store-staff-for-store`;
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
    console.error("[merchantCampaign] assert-store-staff-for-store fetch failed", e);
    return { ok: false, error: "sso_unreachable" };
  }
  try {
    return (await response.json()) as AssertStoreStaffForStoreResult;
  } catch {
    return { ok: false, error: "bad_response" };
  }
}
