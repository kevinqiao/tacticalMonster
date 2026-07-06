import { isEmbedLikelyContext } from "@/host/service/platformAuth/embedSources/embedContextDetect";
import { parsePortalPathFromPathname } from "@/host/util/portalPathParse";

/** SignIn/SignOut chrome: first-party `/portal/{game}` only; hidden on Partner portal and embed shells. */
export function shouldShowPortalAuthButton(
  pathname = typeof window !== "undefined" ? window.location.pathname : "",
  search = typeof window !== "undefined" ? window.location.search : ""
): boolean {
  if (isEmbedLikelyContext(search)) return false;
  return parsePortalPathFromPathname(pathname).isFirstPartyPortal;
}
