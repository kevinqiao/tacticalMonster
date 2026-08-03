/**
 * Shared secret for SSO internal HTTP routes called by campaign (and peers).
 *
 * Env (Dashboard → SSO deployment):
 *   SSO_BRIDGE_SECRET — preferred
 *   CAMPAIGN_BRIDGE_SECRET — fallback (same value as campaign bridge)
 *
 * Header: X-Sso-Bridge-Secret
 * Dev default when unset: dev-local-sso-bridge
 */
const DEV_SSO_BRIDGE_SECRET = "dev-local-sso-bridge";

export const SSO_BRIDGE_HEADER = "X-Sso-Bridge-Secret";

export function ssoBridgeSecret(): string {
  const s =
    process.env.SSO_BRIDGE_SECRET ??
    process.env.CAMPAIGN_BRIDGE_SECRET;
  if (typeof s === "string" && s.trim().length > 0) {
    return s.trim();
  }
  return DEV_SSO_BRIDGE_SECRET;
}
