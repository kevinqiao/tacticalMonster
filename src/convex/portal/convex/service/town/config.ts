import { getPortalTournamentDefinition } from "../../data/portalTournamentConfigs";

export const STARTING_COINS = 5000;

/** Map / gate venue ids — two competitive halls only. */
export type VenueBuildingId = "parlor" | "saloon";

export type BuildingId = VenueBuildingId | "town_hall" | "telegraph";

export type HallKind = "trial" | "showdown";
export type DistrictId = "D0" | "D1";

export const VENUE_SOLO_ID = "parlor" as const;
export const VENUE_MULTI_ID = "saloon" as const;

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

/** A table row in a venue — points at a portal tournament (gameType lives on tournament def). */
export interface VenueTableConfig {
  id: string;
  label: string;
  tournamentId: string;
  buyIn?: number;
  /** Tournament visible when this district is unlocked. */
  requiredDistrict?: DistrictId;
  /** Same-game table tier — requires venue level for this hallKind (default 1). */
  requiredVenueLevel?: number;
}

/** @deprecated alias */
export type HallTierConfig = VenueTableConfig;

export interface BuildingConfig {
  id: BuildingId;
  name: string;
  districtId: DistrictId;
  hallKind?: HallKind;
  portalReady?: boolean;
  tiers: VenueTableConfig[];
  position: { x: number; y: number };
}

const SOLO_VENUE_TABLES: VenueTableConfig[] = [
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

const MULTI_VENUE_TABLES: VenueTableConfig[] = [
  {
    id: "multi_solitaire_free",
    label: "Ranked · Free",
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
  },
  {
    id: "multi_yatz_free",
    label: "Ranked · Free",
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
  },
];

export const BUILDINGS: BuildingConfig[] = [
  {
    id: VENUE_SOLO_ID,
    name: HALL_KIND_META.trial.venueName,
    districtId: "D0",
    hallKind: "trial",
    portalReady: true,
    tiers: SOLO_VENUE_TABLES,
    position: { x: 62, y: 38 },
  },
  {
    id: VENUE_MULTI_ID,
    name: HALL_KIND_META.showdown.venueName,
    districtId: "D0",
    hallKind: "showdown",
    portalReady: true,
    tiers: MULTI_VENUE_TABLES,
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

export const DEFAULT_HALL_LEVELS: Record<string, number> = {
  parlor: 1,
  saloon: 1,
};

export const DEFAULT_UNLOCKED_TIER_IDS = ["solo_solitaire_free", "multi_solitaire_free"];

export function filterTablesForDistricts(
  tables: VenueTableConfig[],
  unlockedDistricts: string[]
): VenueTableConfig[] {
  const set = new Set(unlockedDistricts);
  return tables.filter((t) => !t.requiredDistrict || set.has(t.requiredDistrict));
}

/** All venue tables for unlocked districts (venue level gating at pick/gate time). */
export function buildingsForDistricts(unlockedDistricts: string[]): BuildingConfig[] {
  return BUILDINGS.map((b) => {
    if (!b.hallKind) return b;
    return { ...b, tiers: filterTablesForDistricts(b.tiers, unlockedDistricts) };
  });
}

export function getBuilding(buildingId: string): BuildingConfig | undefined {
  return BUILDINGS.find((b) => b.id === buildingId);
}

export function getTier(buildingId: string, tierId: string): VenueTableConfig | undefined {
  return getBuilding(buildingId)?.tiers.find((t) => t.id === tierId);
}

export function getVenueForHallKind(hallKind: HallKind): BuildingConfig | undefined {
  return BUILDINGS.find((b) => b.hallKind === hallKind);
}

export function resolveHallLevel(
  hallLevels: Record<string, number> | undefined,
  buildingId: string
): number {
  return hallLevels?.[buildingId] ?? DEFAULT_HALL_LEVELS[buildingId] ?? 1;
}

export function resolveTierBuyIn(tier: VenueTableConfig): number {
  if (tier.buyIn != null) return tier.buyIn;
  const def = getPortalTournamentDefinition(tier.tournamentId);
  if (def?.entry.kind === "coins") return def.entry.amount;
  return 0;
}

export function gameTypeForTournament(tournamentId: string): string | null {
  const def = getPortalTournamentDefinition(tournamentId);
  return def?.gameType ?? null;
}

export function hallKindForTournament(tournamentId: string): HallKind | null {
  const def = getPortalTournamentDefinition(tournamentId);
  if (!def) return null;
  if (def.matchType === "solo_p75") return "trial";
  if (def.matchType === "multi_ranked") return "showdown";
  return null;
}

export function isHallKindMatch(building: BuildingConfig, tier: VenueTableConfig): boolean {
  if (!building.hallKind) return false;
  const kind = hallKindForTournament(tier.tournamentId);
  return kind === building.hallKind;
}

export function isTableUnlocked(
  tier: VenueTableConfig,
  unlockedDistricts: string[],
  venueLevel: number
): boolean {
  if (tier.requiredDistrict && !unlockedDistricts.includes(tier.requiredDistrict)) {
    return false;
  }
  const need = tier.requiredVenueLevel ?? 1;
  return venueLevel >= need;
}

export function tableLockReason(
  tier: VenueTableConfig,
  unlockedDistricts: string[],
  venueLevel: number
): string | null {
  if (tier.requiredDistrict && !unlockedDistricts.includes(tier.requiredDistrict)) {
    return "Expand town to unlock";
  }
  const need = tier.requiredVenueLevel ?? 1;
  if (venueLevel < need) {
    return `Venue Lv.${need} required`;
  }
  return null;
}

/** @deprecated use isTableUnlocked */
export function isTableUnlockedByDistrict(
  tier: VenueTableConfig,
  unlockedDistricts: string[]
): boolean {
  if (!tier.requiredDistrict) return true;
  return unlockedDistricts.includes(tier.requiredDistrict);
}

export function isTierOpen(_tier: VenueTableConfig): boolean {
  return true;
}

export function tierLockReason(): string | null {
  return null;
}
