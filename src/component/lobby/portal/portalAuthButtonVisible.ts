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
 * - First-party: always (logged-out trigger = Sign In)
 * - Embed / partner: only when already authed (Account + Backpack; no Sign In/Out)
 */
export function shouldShowPortalAccountChrome(
  authed: boolean,
  pathname = typeof window !== "undefined" ? window.location.pathname : "",
  search = typeof window !== "undefined" ? window.location.search : ""
): boolean {
  const { embed, isFirstPartyPortal, partnerKey } = portalPathFlags(pathname, search);
  const partnerOrEmbed = embed || Boolean(partnerKey) || !isFirstPartyPortal;
  if (partnerOrEmbed) return authed;
  return true;
}

/**
 * Sign In / Sign Out menu actions — first-party standalone only.
 * Hidden for embed iframes and partner paths (e.g. /portal/crazygames/…).
 */
export function shouldShowPortalAuthMenuActions(
  pathname = typeof window !== "undefined" ? window.location.pathname : "",
  search = typeof window !== "undefined" ? window.location.search : ""
): boolean {
  const { embed, isFirstPartyPortal, partnerKey } = portalPathFlags(pathname, search);
  if (embed || partnerKey || !isFirstPartyPortal) return false;
  return true;
}

/** @deprecated Prefer shouldShowPortalAccountChrome / shouldShowPortalAuthMenuActions */
export function shouldShowPortalAuthButton(
  pathname = typeof window !== "undefined" ? window.location.pathname : "",
  search = typeof window !== "undefined" ? window.location.search : ""
): boolean {
  return shouldShowPortalAuthMenuActions(pathname, search);
}
