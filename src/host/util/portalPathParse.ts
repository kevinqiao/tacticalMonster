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
  /** Lobby slug when path is `/gc/{partnerSlug}/{lobbySlug}`. */
  lobbySlug: string | null;
  isFirstPartyPortal: boolean;
  /** True for `/gc` and any `/gc/{partner}/…` lobby path. */
  isLobbyPath: boolean;
};

/** Former first-party `/gc/{game}` segments — used only for bookmark fallback. */
const LEGACY_FIRST_PARTY_GAME_SEGMENTS = new Set<string>([
  ...PARTNER_GAME_TYPES,
  "blockblast",
  "block-blast",
  "match3",
  "match-3",
  "towerarena",
  "tower-arena",
]);

/** True when `/gc/{seg}` looks like an old game deep link (no partner with that slug). */
export function isLegacyFirstPartyGameSegment(segment: string | null | undefined): boolean {
  if (!segment) return false;
  return LEGACY_FIRST_PARTY_GAME_SEGMENTS.has(segment.trim().toLowerCase());
}

/**
 * Parse portal URLs (lobby-only; no game deep links):
 * - /gc                              → first-party default lobby
 * - /gc/{partnerSlug}                → partner default lobby
 * - /gc/{partnerSlug}/{lobbySlug}    → named lobby
 *
 * Legacy `/gc/{gameType}` bookmarks resolve as partnerSlug candidates; PartnerManager
 * falls back to first-party `/gc` when no partner exists for that slug.
 */
export function parsePortalPathFromPathname(pathname: string): ParsedPortalPath {
  const empty: ParsedPortalPath = {
    partnerSlug: null,
    partnerKey: null,
    lobbySlug: null,
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
      isFirstPartyPortal: true,
      isLobbyPath: true,
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
      isFirstPartyPortal: false,
      isLobbyPath: true,
    };
  }

  // /gc/{partnerSlug}/{lobbySlug} → named lobby
  return {
    partnerSlug,
    partnerKey: partnerSlug,
    lobbySlug: seg3.toLowerCase(),
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

/** Lobby entry URL (game is chosen inside the lobby). */
export function portalLaunchPath(
  partnerSlug: string | null,
  _gameType?: RegisteredPartnerGameType
): string {
  if (partnerSlug) return `${PORTAL_URL_PREFIX}/${partnerSlug}`;
  return PORTAL_URL_PREFIX;
}

export { PORTAL_URL_PREFIX, PORTAL_URL_SEGMENT };
