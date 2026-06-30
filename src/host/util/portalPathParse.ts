import {
  PORTAL_GAME_TYPES,
  type RegisteredPortalGameType,
} from "@/convex/portal/convex/data/portalGameRegistry";

export type ParsedPortalPath = {
  partnerKey: string | null;
  gameType: RegisteredPortalGameType | null;
  isFirstPartyPortal: boolean;
};

function isGameType(segment: string | undefined): segment is RegisteredPortalGameType {
  if (!segment) return false;
  return (PORTAL_GAME_TYPES as readonly string[]).includes(segment);
}

export function parsePortalPathFromPathname(pathname: string): ParsedPortalPath {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "portal") {
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

export function portalLaunchPath(partnerKey: string | null, gameType: RegisteredPortalGameType): string {
  if (partnerKey) return "/portal/" + partnerKey + "/" + gameType;
  return "/portal/" + gameType;
}
