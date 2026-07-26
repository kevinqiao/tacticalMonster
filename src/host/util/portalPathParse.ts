import {
  PARTNER_GAME_TYPES,
  type RegisteredPartnerGameType,
} from "@/convex/portal/convex/data/partnerGameRegistry";

import { PORTAL_URL_PREFIX, PORTAL_URL_SEGMENT } from "./appUrlSegments";

export type ParsedPortalPath = {
  /** Public partnerSlug segment (`/gc/{partnerSlug}/...`). */
  partnerSlug: string | null;
  /** @deprecated Use partnerSlug */
  partnerKey: string | null;
  /** Lobby slug when path is `/gc/{partnerSlug}/{lobbySlug}` (not a gameType). */
  lobbySlug: string | null;
  gameType: RegisteredPartnerGameType | null;
  isFirstPartyPortal: boolean;
  /** True when path is partner lobby root or named lobby (no gameType deep link). */
  isLobbyPath: boolean;
};

function isGameType(segment: string | undefined): segment is RegisteredPartnerGameType {
  if (!segment) return false;
  return (PARTNER_GAME_TYPES as readonly string[]).includes(segment);
}

/**
 * Parse portal URLs:
 * - /gc/{gameType}                         → first-party game
 * - /gc                                    → first-party default lobby
 * - /gc/{partnerSlug}                      → partner default lobby
 * - /gc/{partnerSlug}/{lobbySlug}          → named lobby (lobbySlug ∉ gameTypes)
 * - /gc/{partnerSlug}/{gameType}           → game deep link
 */
export function parsePortalPathFromPathname(pathname: string): ParsedPortalPath {
  const empty: ParsedPortalPath = {
    partnerSlug: null,
    partnerKey: null,
    lobbySlug: null,
    gameType: null,
    isFirstPartyPortal: false,
    isLobbyPath: false,
  };
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== PORTAL_URL_SEGMENT) {
    return empty;
  }

  const seg2 = parts[1]?.trim();
  const seg3 = parts[2]?.trim();

  // /gc → first-party default lobby
  if (!seg2) {
    return {
      partnerSlug: null,
      partnerKey: null,
      lobbySlug: null,
      gameType: null,
      isFirstPartyPortal: true,
      isLobbyPath: true,
    };
  }

  // /gc/{gameType} → first-party game deep link
  if (isGameType(seg2) && !seg3) {
    return {
      partnerSlug: null,
      partnerKey: null,
      lobbySlug: null,
      gameType: seg2,
      isFirstPartyPortal: true,
      isLobbyPath: false,
    };
  }

  // /gc/preview is a separate shell — not a partner slug
  if (seg2.toLowerCase() === "preview") {
    return empty;
  }

  const partnerSlug = seg2.toLowerCase();

  // /gc/{partnerSlug} → default lobby
  if (!seg3) {
    return {
      partnerSlug,
      partnerKey: partnerSlug,
      lobbySlug: null,
      gameType: null,
      isFirstPartyPortal: false,
      isLobbyPath: true,
    };
  }

  const seg3Lower = seg3.toLowerCase();

  // /gc/{partnerSlug}/{gameType} → game deep link
  if (isGameType(seg3Lower)) {
    return {
      partnerSlug,
      partnerKey: partnerSlug,
      lobbySlug: null,
      gameType: seg3Lower,
      isFirstPartyPortal: false,
      isLobbyPath: false,
    };
  }

  // /gc/{partnerSlug}/{lobbySlug} → named lobby
  return {
    partnerSlug,
    partnerKey: partnerSlug,
    lobbySlug: seg3Lower,
    gameType: null,
    isFirstPartyPortal: false,
    isLobbyPath: true,
  };
}

export function portalLobbyPath(
  partnerSlug: string | null,
  lobbySlug?: string | null
): string {
  if (!partnerSlug) {
    if (lobbySlug) return `${PORTAL_URL_PREFIX}/${lobbySlug}`;
    return PORTAL_URL_PREFIX;
  }
  if (lobbySlug && lobbySlug !== "default") {
    return `${PORTAL_URL_PREFIX}/${partnerSlug}/${lobbySlug}`;
  }
  return `${PORTAL_URL_PREFIX}/${partnerSlug}`;
}

export function portalLaunchPath(
  partnerSlug: string | null,
  gameType: RegisteredPartnerGameType
): string {
  if (partnerSlug) return `${PORTAL_URL_PREFIX}/${partnerSlug}/${gameType}`;
  return `${PORTAL_URL_PREFIX}/${gameType}`;
}

export { PORTAL_URL_PREFIX, PORTAL_URL_SEGMENT };
