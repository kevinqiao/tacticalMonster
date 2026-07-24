import {
  PARTNER_GAME_TYPES,
  type RegisteredPartnerGameType,
} from "@/convex/portal/convex/data/partnerGameRegistry";

import { PORTAL_URL_PREFIX, PORTAL_URL_SEGMENT } from "./appUrlSegments";

export type ParsedPortalPath = {
  partnerKey: string | null;
  gameType: RegisteredPartnerGameType | null;
  isFirstPartyPortal: boolean;
};

function isGameType(segment: string | undefined): segment is RegisteredPartnerGameType {
  if (!segment) return false;
  return (PARTNER_GAME_TYPES as readonly string[]).includes(segment);
}

export function parsePortalPathFromPathname(pathname: string): ParsedPortalPath {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== PORTAL_URL_SEGMENT) {
    return { partnerKey: null, gameType: null, isFirstPartyPortal: false };
  }
  const seg2 = parts[1]?.trim();
  const seg3 = parts[2]?.trim();
  if (seg2 && isGameType(seg2) && !seg3) {
    return { partnerKey: null, gameType: seg2, isFirstPartyPortal: true };
  }
  if (seg2 && seg3 && isGameType(seg3)) {
    return { partnerKey: seg2.toLowerCase(), gameType: seg3, isFirstPartyPortal: false };
  }
  return { partnerKey: seg2?.toLowerCase() ?? null, gameType: null, isFirstPartyPortal: false };
}

export function portalLaunchPath(partnerKey: string | null, gameType: RegisteredPartnerGameType): string {
  if (partnerKey) return `${PORTAL_URL_PREFIX}/${partnerKey}/${gameType}`;
  return `${PORTAL_URL_PREFIX}/${gameType}`;
}

export { PORTAL_URL_PREFIX, PORTAL_URL_SEGMENT };
