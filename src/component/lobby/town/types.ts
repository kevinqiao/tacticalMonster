export type HallKind = "trial" | "showdown";

/** URL slug for the partner default town (Strategy B). */
export const DEFAULT_TOWN_SLUG = "mayfield";

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
  venueLevel: number
): boolean {
  if (tier.requiredDistrict && !unlockedDistricts.includes(tier.requiredDistrict)) {
    return false;
  }
  const need = tier.requiredVenueLevel ?? 1;
  return venueLevel >= need;
}

export function tableLockReason(
  tier: HallTierView,
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
};

function listVenueTournamentOptions(
  buildings: TownBuildingView[],
  hallKind: HallKind,
  unlockedDistricts: string[],
  venueLevel: number
): VenueTournamentOption[] {
  const out: VenueTournamentOption[] = [];
  for (const venue of buildings) {
    if (venue.hallKind !== hallKind || venue.portalReady === false) continue;
    for (const tier of venue.tiers) {
      const open = isTableOpen(tier, hallKind, unlockedDistricts, venueLevel);
      out.push({
        venue,
        tier,
        gameType: gameTypeFromTournamentId(tier.tournamentId),
        buyIn: tier.buyIn ?? 0,
        open,
        lockReason: open ? null : tableLockReason(tier, unlockedDistricts, venueLevel),
      });
    }
  }
  return out;
}

export function listTrialTournamentOptions(
  buildings: TownBuildingView[],
  unlockedDistricts: string[],
  venueLevel: number
): VenueTournamentOption[] {
  return listVenueTournamentOptions(buildings, "trial", unlockedDistricts, venueLevel);
}

export function listShowdownTournamentOptions(
  buildings: TownBuildingView[],
  unlockedDistricts: string[],
  venueLevel: number
): VenueTournamentOption[] {
  return listVenueTournamentOptions(buildings, "showdown", unlockedDistricts, venueLevel);
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

export const FALLBACK_BUILDINGS: TownBuildingView[] = [
  {
    id: "parlor",
    name: HALL_KIND_META.trial.venueName,
    districtId: "D0",
    hallKind: "trial",
    portalReady: true,
    tiers: SOLO_TABLES.filter((t) => t.requiredDistrict === "D0"),
    position: { x: 62, y: 38 },
  },
  {
    id: "saloon",
    name: HALL_KIND_META.showdown.venueName,
    districtId: "D0",
    hallKind: "showdown",
    portalReady: true,
    tiers: MULTI_TABLES.filter((t) => t.requiredDistrict === "D0"),
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
