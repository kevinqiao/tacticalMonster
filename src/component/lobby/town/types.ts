export interface TownBuildingView {
  id: string;
  name: string;
  districtId: string;
  ssaKey?: string;
  modes: { id: string; label: string }[];
  tiers: { id: string; label: string; buyIn: number; unlockTierId?: string }[];
  position: { x: number; y: number };
}

export interface GateSelection {
  buildingId: string;
  buildingName: string;
  ssaKey: string;
  modeId: string;
  tierId: string;
  buyIn: number;
}

export const BUILDING_ICONS: Record<string, string> = {
  saloon: "🃏",
  parlor: "🎴",
  town_hall: "🏛",
  telegraph: "📨",
};

export const FALLBACK_BUILDINGS: TownBuildingView[] = [
  {
    id: "saloon",
    name: "Poker Saloon",
    districtId: "D0",
    ssaKey: "poker",
    modes: [
      { id: "cash", label: "Cash" },
      { id: "sng", label: "SNG" },
    ],
    tiers: [
      { id: "saloon_t1", label: "Tier 1", buyIn: 100 },
      { id: "saloon_t2", label: "Tier 2", buyIn: 500, unlockTierId: "saloon_t1" },
    ],
    position: { x: 28, y: 42 },
  },
  {
    id: "parlor",
    name: "Solitaire Parlor",
    districtId: "D0",
    ssaKey: "solitaire",
    modes: [{ id: "standard", label: "Standard" }],
    tiers: [
      { id: "parlor_t1", label: "Table 1", buyIn: 0 },
      { id: "parlor_t2", label: "Table 2", buyIn: 100, unlockTierId: "parlor_t1" },
    ],
    position: { x: 62, y: 38 },
  },
  {
    id: "town_hall",
    name: "Town Hall",
    districtId: "D0",
    modes: [],
    tiers: [],
    position: { x: 50, y: 22 },
  },
  {
    id: "telegraph",
    name: "Telegraph",
    districtId: "D0",
    modes: [],
    tiers: [],
    position: { x: 78, y: 52 },
  },
];
