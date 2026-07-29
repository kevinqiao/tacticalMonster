/**
 * Campaign → SSO slug resolve bridge.
 * Intentionally NOT "use node" — called directly from `http.ts` (default
 * runtime) as well as from "use node" action files; fetch/AbortSignal are
 * available in both Convex runtimes.
 *
 * Returns partnerId (+ slug/name) only — brand stays on SSO for the FE.
 */
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

export type ResolvePartnerBySlugResult =
  | {
      ok: true;
      partnerId: number;
      partnerSlug: string;
      name?: string;
    }
  | { ok: false; error: string };

/** Campaign → SSO: resolve partnerId for a public partner slug. */
export async function resolvePartnerBySlugViaHttp(
  partnerSlug: string
): Promise<ResolvePartnerBySlugResult> {
  const slug = partnerSlug.trim().toLowerCase();
  if (!slug) return { ok: false, error: "invalid_fields" };
  const base = ssoSiteUrl();
  const url = `${base}/internal/resolve-partner-by-slug`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [SSO_BRIDGE_HEADER]: ssoBridgeSecret(),
      },
      body: JSON.stringify({ partnerSlug: slug }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (e) {
    console.error("[campaign] resolve-partner-by-slug fetch failed", e);
    return { ok: false, error: "sso_unreachable" };
  }
  try {
    return (await response.json()) as ResolvePartnerBySlugResult;
  } catch {
    return { ok: false, error: "bad_response" };
  }
}
