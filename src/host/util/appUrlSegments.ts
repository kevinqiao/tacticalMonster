/** Player-facing URL path segments (SoT). Module folders stay portal/campaign. */

export const PORTAL_URL_SEGMENT = "gc";
export const CAMPAIGN_URL_SEGMENT = "cc";

export const PORTAL_URL_PREFIX = `/${PORTAL_URL_SEGMENT}`;
export const CAMPAIGN_URL_PREFIX = `/${CAMPAIGN_URL_SEGMENT}`;

/** Old prefixes — rewrite only; do not use for new links. */
export const LEGACY_PORTAL_URL_SEGMENT = "portal";
export const LEGACY_CAMPAIGN_URL_SEGMENT = "campaign";

/** Frozen Casual shell → Mayfield. See docs/CASUAL-FROZEN.md */
export const FROZEN_CASUAL_URL_SEGMENT = "casual";
export const CASUAL_FROZEN_REDIRECT_PREFIX = "/town";

/**
 * If pathname still uses /portal, /campaign, or frozen /casual, return the rewritten path.
 * Otherwise null.
 */
export function rewriteLegacyAppPathname(pathname: string): string | null {
  const parts = pathname.split("/");
  if (parts[1] === FROZEN_CASUAL_URL_SEGMENT) {
    return CASUAL_FROZEN_REDIRECT_PREFIX;
  }
  if (parts[1] === LEGACY_PORTAL_URL_SEGMENT) {
    parts[1] = PORTAL_URL_SEGMENT;
    return parts.join("/") || PORTAL_URL_PREFIX;
  }
  if (parts[1] === LEGACY_CAMPAIGN_URL_SEGMENT) {
    parts[1] = CAMPAIGN_URL_SEGMENT;
    return parts.join("/") || CAMPAIGN_URL_PREFIX;
  }
  return null;
}
