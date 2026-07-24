import { parsePartnerIdFromPlatformUid } from "@/convex/shared/platformAuth/parsePlatformUid";
import {
  isStaffWebSignInContext,
  resolveWebSignInFromLocation,
} from "@/component/lobby/shared/resolveWebSignInFromLocation";
import { parseCampaignPartnerSlugFromPathname } from "@/host/util/PageUtils";
import { PORTAL_URL_PREFIX } from "@/host/util/appUrlSegments";

import type { User } from "../UserManager";

/** URL partnerPid is canonical; session must match (missing partner → 0). */
export function sessionPartnerMatchesUrlPartner(
  user: User | null | undefined,
  urlPartnerPid: number
): boolean {
  if (!user?.uid) return true;
  const fromUser = user.partner ?? parsePartnerIdFromPlatformUid(user.uid) ?? 0;
  return fromUser === urlPartnerPid;
}

export function resolveSessionPartnerId(user: User | null | undefined): number {
  if (!user?.uid) return 0;
  if (typeof user.partner === "number" && Number.isFinite(user.partner)) {
    return user.partner;
  }
  return parsePartnerIdFromPlatformUid(user.uid) ?? 0;
}

/** Consumer shells only — staff consoles (/partner/admin, /partner/operation, …) skip URL partner alignment. */
export function shouldEnforceUrlPartnerSession(
  pathname = typeof window !== "undefined" ? window.location.pathname : "",
  search = typeof window !== "undefined" ? window.location.search : ""
): boolean {
  if (isStaffWebSignInContext(resolveWebSignInFromLocation(pathname, search))) {
    return false;
  }
  if (pathname.startsWith(PORTAL_URL_PREFIX)) return true;
  return parseCampaignPartnerSlugFromPathname(pathname) != null;
}
