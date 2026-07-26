import {
  PARTNER_GAME_TYPES,
  type RegisteredPartnerGameType,
} from "./partnerGameRegistry";
import {
  getPortalTournamentDefinition,
  PORTAL_TOURNAMENT_DEFINITIONS,
  type PortalTournamentDefinition,
} from "./portalTournamentConfigs";

const LOBBY_SLUG_RE = /^[a-z0-9][a-z0-9_-]{0,31}$/;

export const DEFAULT_LOBBY_SLUG = "default";

export type PortalLobbyBranding = {
  logoUrl?: string;
  backgroundLandscapeUrl?: string;
  backgroundPortraitUrl?: string;
};

export type PortalLobbyOffering = {
  tournamentId: string;
  sortOrder: number;
  titleOverride?: string;
  rewardsOverride?: {
    soloPoints?: { success: number; fail: number };
    rankPoints?: Record<string, number>;
    coins?: {
      soloSuccess?: number;
      soloFail?: number;
      rankCoins?: Record<string, number>;
    };
  };
  enabled?: boolean;
};

/** Shared defaults (aligned with portalGame3DTheme fallbacks). */
export const PORTAL_LOBBY_DEFAULT_BRANDING = {
  logoUrl: "/assets/portal/solitaire/hero/hero-title.webp",
  backgroundLandscapeUrl: "/assets/portal/solitaire/backgrounds/bg-16x9.webp",
  backgroundPortraitUrl: "/assets/portal/solitaire/backgrounds/bg-9x16.webp",
} as const;

export function normalizeLobbySlug(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateLobbySlug(raw: string): string {
  const slug = normalizeLobbySlug(raw);
  if (!slug) throw new Error("lobby_slug_required");
  if (!LOBBY_SLUG_RE.test(slug)) throw new Error("lobby_slug_invalid");
  if ((PARTNER_GAME_TYPES as readonly string[]).includes(slug)) {
    throw new Error("lobby_slug_conflicts_game_type");
  }
  if (slug === "preview") throw new Error("lobby_slug_reserved");
  return slug;
}

export function resolveLobbyBranding(
  branding: PortalLobbyBranding | null | undefined,
  gameType?: RegisteredPartnerGameType | null
): {
  logoUrl: string;
  backgroundLandscapeUrl: string;
  backgroundPortraitUrl: string;
} {
  const logoFallback =
    gameType === "block_blast"
      ? "/assets/portal/3d/logos/block_blast-hero.svg"
      : gameType === "match_3"
        ? "/assets/portal/3d/logos/match_3-hero.svg"
        : gameType === "tower_arena"
          ? "/assets/portal/3d/logos/tower_arena-hero.svg"
          : gameType === "yatz"
            ? "/assets/portal/3d/logos/yatz-hero.svg"
            : PORTAL_LOBBY_DEFAULT_BRANDING.logoUrl;

  return {
    logoUrl: branding?.logoUrl?.trim() || logoFallback,
    backgroundLandscapeUrl:
      branding?.backgroundLandscapeUrl?.trim() ||
      PORTAL_LOBBY_DEFAULT_BRANDING.backgroundLandscapeUrl,
    backgroundPortraitUrl:
      branding?.backgroundPortraitUrl?.trim() ||
      PORTAL_LOBBY_DEFAULT_BRANDING.backgroundPortraitUrl,
  };
}

/** Build default offerings: solo + multi for each enabled game type. */
export function defaultOfferingsForGames(games: string[]): PortalLobbyOffering[] {
  const offerings: PortalLobbyOffering[] = [];
  let order = 0;
  for (const gameType of games) {
    const defs = PORTAL_TOURNAMENT_DEFINITIONS.filter((d) => d.gameType === gameType);
    for (const def of defs) {
      // Coin tables are opt-in via Lobby admin (not auto-bundled with free tables).
      if (def.entry.kind === "coins" || def.entry.kind === "gems") continue;
      offerings.push({
        tournamentId: def.tournamentId,
        sortOrder: order++,
        enabled: true,
      });
    }
  }
  return offerings;
}

export function enabledOfferings(
  offerings: PortalLobbyOffering[]
): PortalLobbyOffering[] {
  return offerings
    .filter((o) => o.enabled !== false)
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function offeringsByMode(
  offerings: PortalLobbyOffering[],
  mode: "solo" | "multi"
): Array<PortalLobbyOffering & { def: PortalTournamentDefinition }> {
  const matchType = mode === "solo" ? "solo_p75" : "multi_ranked";
  const out: Array<PortalLobbyOffering & { def: PortalTournamentDefinition }> = [];
  for (const o of enabledOfferings(offerings)) {
    const def = getPortalTournamentDefinition(o.tournamentId);
    if (!def || def.matchType !== matchType) continue;
    out.push({ ...o, def });
  }
  return out;
}

export function deriveGamesFromOfferings(offerings: PortalLobbyOffering[]): string[] {
  const games: string[] = [];
  for (const o of enabledOfferings(offerings)) {
    const def = getPortalTournamentDefinition(o.tournamentId);
    if (!def) continue;
    if (!games.includes(def.gameType)) games.push(def.gameType);
  }
  return games;
}
