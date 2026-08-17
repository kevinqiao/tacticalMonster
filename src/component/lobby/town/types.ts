import { districtCatalogEntry, districtLockCopy } from "./districtSystem";

export type HallKind = "trial" | "showdown";

/** URL slug for the partner default town (Strategy B). */
export const DEFAULT_TOWN_SLUG = "mayfield";

/** Competitive partition for Town Week Score / Term / Season — not wallet `shared`. */
export function townLeagueScopeKey(townId: string): string {
  return `town:${townId}`;
}

export const HALL_KIND_META: Record<
  HallKind,
  { label: string; shortLabel: string; description: string; venueName: string }
> = {
  trial: {
    label: "Trial Hall",
    shortLabel: "Trial",
    description: "Solo benchmark challenge",
    venueName: "Solo Challenge",
  },
  showdown: {
    label: "Showdown Arena",
    shortLabel: "Showdown",
    description: "Async ranked multiplayer",
    venueName: "Showdown Arena",
  },
};

export interface HallTierView {
  id: string;
  label: string;
  tournamentId: string;
  buyIn?: number;
  requiredDistrict?: string;
  requiredVenueLevel?: number;
  requiredZoneType?: string;
}

export interface TownBuildingView {
  id: string;
  name: string;
  districtId: string;
  hallKind?: HallKind;
  portalReady?: boolean;
  tiers: HallTierView[];
  position: { x: number; y: number };
}

export type VenueLevelMap = Record<HallKind, number>;

export interface GateSelection {
  buildingId: string;
  buildingName: string;
  hallKind: HallKind;
  ssaKey: string;
  gameType: string;
  tournamentId: string;
  tierId: string;
  tierLabel: string;
  buyIn: number;
  matchType: "solo_p75" | "multi_ranked";
}

export const BUILDING_ICONS: Record<string, string> = {
  saloon: "⚔️",
  parlor: "🎴",
  town_hall: "🏛",
  telegraph: "📨",
};

export const GAME_ICONS: Record<string, string> = {
  solitaire: "🎴",
  yatz: "🎲",
};

export function gameTypeFromTournamentId(tournamentId: string): string {
  const coin = tournamentId.match(/^portal_multi_coin_(.+)$/);
  if (coin?.[1]) return coin[1];
  const solo = tournamentId.match(/^portal_solo_p75_(.+)$/);
  if (solo?.[1]) return solo[1];
  const multi = tournamentId.match(/^portal_multi_(.+)$/);
  if (multi?.[1]) return multi[1];
  return "";
}

export function gameLabelFromGameType(gameType: string): string {
  if (gameType === "solitaire") return "Solitaire";
  if (gameType === "yatz") return "Yatz";
  if (!gameType) return "Game";
  return gameType.charAt(0).toUpperCase() + gameType.slice(1);
}

export function resolveTierBuyIn(tier: HallTierView): number {
  return tier.buyIn ?? 0;
}

export function matchTypeForTournamentId(tournamentId: string): "solo_p75" | "multi_ranked" {
  return tournamentId.includes("_solo_") ? "solo_p75" : "multi_ranked";
}

export function isTableOpen(
  tier: HallTierView,
  hallKind: HallKind,
  unlockedDistricts: string[],
  venueLevel: number,
  developedByZoneType: Record<string, number> = {}
): boolean {
  if (tier.requiredDistrict && !unlockedDistricts.includes(tier.requiredDistrict)) {
    return false;
  }
  const need = tier.requiredVenueLevel ?? 1;
  if (venueLevel < need) return false;
  if (tier.requiredZoneType && (developedByZoneType[tier.requiredZoneType] ?? 0) < 1) {
    return false;
  }
  return true;
}

export type TableLockCondition = {
  id: "district" | "venue" | "zone";
  label: string;
  ok: boolean;
  districtId?: string;
};

export function tableLockConditions(
  tier: HallTierView,
  unlockedDistricts: string[],
  venueLevel: number,
  developedByZoneType: Record<string, number> = {}
): TableLockCondition[] {
  const out: TableLockCondition[] = [];
  if (tier.requiredDistrict) {
    const row = districtCatalogEntry(tier.requiredDistrict);
    out.push({
      id: "district",
      label: row ? `Open ${row.label}` : "Open district",
      ok: unlockedDistricts.includes(tier.requiredDistrict),
      districtId: tier.requiredDistrict,
    });
  }
  const need = tier.requiredVenueLevel ?? 1;
  if (need > 1) {
    out.push({
      id: "venue",
      label: `Venue Lv.${need}`,
      ok: venueLevel >= need,
    });
  }
  if (tier.requiredZoneType) {
    out.push({
      id: "zone",
      label: "Develop a Finance zone",
      ok: (developedByZoneType[tier.requiredZoneType] ?? 0) >= 1,
    });
  }
  return out;
}

export function tableLockReason(
  tier: HallTierView,
  unlockedDistricts: string[],
  venueLevel: number,
  developedByZoneType: Record<string, number> = {}
): string | null {
  const blocked = tableLockConditions(
    tier,
    unlockedDistricts,
    venueLevel,
    developedByZoneType
  ).find((row) => !row.ok);
  if (!blocked) return null;
  if (blocked.id === "district" && blocked.districtId) {
    return districtLockCopy(blocked.districtId);
  }
  if (blocked.id === "venue") return `${blocked.label} required`;
  return blocked.label;
}

export function buildGateSelection(building: TownBuildingView, tier: HallTierView): GateSelection {
  const gameType = gameTypeFromTournamentId(tier.tournamentId);
  return {
    buildingId: building.id,
    buildingName: building.name,
    hallKind: building.hallKind!,
    ssaKey: gameType,
    gameType,
    tournamentId: tier.tournamentId,
    tierId: tier.id,
    tierLabel: tier.label,
    buyIn: tier.buyIn ?? 0,
    matchType: matchTypeForTournamentId(tier.tournamentId),
  };
}

export type VenueTournamentOption = {
  venue: TownBuildingView;
  tier: HallTierView;
  gameType: string;
  buyIn: number;
  open: boolean;
  lockReason: string | null;
  lockConditions: TableLockCondition[];
};

function listVenueTournamentOptions(
  buildings: TownBuildingView[],
  hallKind: HallKind,
  unlockedDistricts: string[],
  venueLevel: number,
  developedByZoneType: Record<string, number> = {}
): VenueTournamentOption[] {
  const out: VenueTournamentOption[] = [];
  for (const venue of buildings) {
    if (venue.hallKind !== hallKind || venue.portalReady === false) continue;
    for (const tier of venue.tiers) {
      const open = isTableOpen(tier, hallKind, unlockedDistricts, venueLevel, developedByZoneType);
      const lockConditions = tableLockConditions(
        tier,
        unlockedDistricts,
        venueLevel,
        developedByZoneType
      );
      out.push({
        venue,
        tier,
        gameType: gameTypeFromTournamentId(tier.tournamentId),
        buyIn: tier.buyIn ?? 0,
        open,
        lockReason: open ? null : tableLockReason(tier, unlockedDistricts, venueLevel, developedByZoneType),
        lockConditions,
      });
    }
  }
  return out;
}

export function listTrialTournamentOptions(
  buildings: TownBuildingView[],
  unlockedDistricts: string[],
  venueLevel: number,
  developedByZoneType: Record<string, number> = {}
): VenueTournamentOption[] {
  return listVenueTournamentOptions(buildings, "trial", unlockedDistricts, venueLevel, developedByZoneType);
}

export function listShowdownTournamentOptions(
  buildings: TownBuildingView[],
  unlockedDistricts: string[],
  venueLevel: number,
  developedByZoneType: Record<string, number> = {}
): VenueTournamentOption[] {
  return listVenueTournamentOptions(buildings, "showdown", unlockedDistricts, venueLevel, developedByZoneType);
}

export function filterVenueOptionsByGame(
  options: VenueTournamentOption[],
  gameType?: string | null
): VenueTournamentOption[] {
  if (!gameType) return options;
  return options.filter((o) => o.gameType === gameType);
}

/** Prefer a free open table; otherwise the first open table. */
export function pickPreferredOpenTable(
  options: VenueTournamentOption[],
  gameType?: string | null
): VenueTournamentOption | null {
  const scoped = filterVenueOptionsByGame(options, gameType).filter((o) => o.open);
  if (scoped.length === 0) return null;
  return scoped.find((o) => o.buyIn === 0) ?? scoped[0];
}

const SOLO_TABLES: HallTierView[] = [
  {
    id: "solo_solitaire_free",
    label: "Benchmark · Free",
    tournamentId: "portal_solo_p75_solitaire",
    buyIn: 0,
    requiredDistrict: "D0",
  },
  {
    id: "solo_solitaire_coin",
    label: "Benchmark · Coin",
    tournamentId: "portal_solo_p75_solitaire",
    buyIn: 0,
    requiredDistrict: "D0",
    requiredVenueLevel: 2,
  },
  {
    id: "solo_yatz_free",
    label: "Benchmark · Free",
    tournamentId: "portal_solo_p75_yatz",
    buyIn: 0,
    requiredDistrict: "D1",
  },
  {
    id: "solo_yatz_ranked",
    label: "Benchmark · Ranked",
    tournamentId: "portal_solo_p75_yatz",
    buyIn: 0,
    requiredDistrict: "D1",
  },
];

const MULTI_TABLES: HallTierView[] = [
  {
    id: "multi_solitaire_free",
    label: "Ranked",
    tournamentId: "portal_multi_solitaire",
    buyIn: 0,
    requiredDistrict: "D0",
  },
  {
    id: "multi_solitaire_coin",
    label: "Coin Arena",
    tournamentId: "portal_multi_coin_solitaire",
    buyIn: 20,
    requiredDistrict: "D0",
    requiredVenueLevel: 2,
    requiredZoneType: "commercial",
  },
  {
    id: "multi_yatz_free",
    label: "Ranked",
    tournamentId: "portal_multi_yatz",
    buyIn: 0,
    requiredDistrict: "D1",
  },
  {
    id: "multi_yatz_coin",
    label: "Coin Arena",
    tournamentId: "portal_multi_coin_yatz",
    buyIn: 20,
    requiredDistrict: "D1",
    requiredVenueLevel: 2,
    requiredZoneType: "commercial",
  },
];

export const FALLBACK_BUILDINGS: TownBuildingView[] = [
  {
    id: "parlor",
    name: HALL_KIND_META.trial.venueName,
    districtId: "D0",
    hallKind: "trial",
    portalReady: true,
    tiers: SOLO_TABLES,
    position: { x: 62, y: 38 },
  },
  {
    id: "saloon",
    name: HALL_KIND_META.showdown.venueName,
    districtId: "D0",
    hallKind: "showdown",
    portalReady: true,
    tiers: MULTI_TABLES,
    position: { x: 28, y: 42 },
  },
  {
    id: "town_hall",
    name: "Town Hall",
    districtId: "D0",
    tiers: [],
    position: { x: 50, y: 22 },
  },
  {
    id: "telegraph",
    name: "Telegraph",
    districtId: "D0",
    tiers: [],
    position: { x: 78, y: 52 },
  },
];

export const DEFAULT_VENUE_LEVEL: VenueLevelMap = { trial: 1, showdown: 1 };
