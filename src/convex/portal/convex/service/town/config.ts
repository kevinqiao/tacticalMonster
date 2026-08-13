export const STARTING_COINS = 5000;

export type BuildingId = "saloon" | "parlor" | "town_hall" | "telegraph";

export interface TierConfig {
  id: string;
  label: string;
  buyIn: number;
  unlockTierId?: string;
}

export interface BuildingConfig {
  id: BuildingId;
  name: string;
  districtId: "D0" | "D1";
  ssaKey?: string;
  modes: { id: string; label: string }[];
  tiers: TierConfig[];
  position: { x: number; y: number };
}

export const BUILDINGS: BuildingConfig[] = [
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

export function getBuilding(buildingId: string): BuildingConfig | undefined {
  return BUILDINGS.find((b) => b.id === buildingId);
}

export function getTier(buildingId: string, tierId: string): TierConfig | undefined {
  return getBuilding(buildingId)?.tiers.find((t) => t.id === tierId);
}
