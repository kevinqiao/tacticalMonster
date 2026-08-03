import type { PlayerAuth } from "@/convex/sso/convex/service/auth/partnerAuth";
import { playerAuthAllowsClerk } from "@/convex/sso/convex/service/auth/partnerAuth";
import { isEmbedLikelyContext } from "@/host/service/platformAuth/embedSources/embedContextDetect";
import { parsePortalPathFromPathname } from "@/host/util/portalPathParse";

function portalPathFlags(
  pathname = typeof window !== "undefined" ? window.location.pathname : "",
  search = typeof window !== "undefined" ? window.location.search : ""
) {
  const embed = isEmbedLikelyContext(search);
  const { isFirstPartyPortal, partnerKey } = parsePortalPathFromPathname(pathname);
  return { embed, isFirstPartyPortal, partnerKey };
}

/**
 * Account chrome (menu trigger):
 * - First-party / clerk-capable partner: always (logged-out = Sign In)
 * - Embed-only partner / embed iframe: only when already authed
 */
export function shouldShowPortalAccountChrome(
  authed: boolean,
  pathname = typeof window !== "undefined" ? window.location.pathname : "",
  search = typeof window !== "undefined" ? window.location.search : "",
  playerAuth?: PlayerAuth | null
): boolean {
  const { embed, isFirstPartyPortal } = portalPathFlags(pathname, search);
  if (embed) return authed;
  if (isFirstPartyPortal) return true;
  if (playerAuth && playerAuthAllowsClerk(playerAuth)) return true;
  return authed;
}

/**
 * Sign In / Sign Out menu actions — when platform Clerk login is available.
 * Hidden in embed iframes and embed-only partners.
 */
export function shouldShowPortalAuthMenuActions(
  pathname = typeof window !== "undefined" ? window.location.pathname : "",
  search = typeof window !== "undefined" ? window.location.search : "",
  playerAuth?: PlayerAuth | null
): boolean {
  const { embed, isFirstPartyPortal } = portalPathFlags(pathname, search);
  if (embed) return false;
  if (isFirstPartyPortal) return true;
  if (playerAuth) return playerAuthAllowsClerk(playerAuth);
  return false;
}

/** @deprecated Prefer shouldShowPortalAccountChrome / shouldShowPortalAuthMenuActions */
export function shouldShowPortalAuthButton(
  pathname = typeof window !== "undefined" ? window.location.pathname : "",
  search = typeof window !== "undefined" ? window.location.search : ""
): boolean {
  return shouldShowPortalAuthMenuActions(pathname, search);
}
