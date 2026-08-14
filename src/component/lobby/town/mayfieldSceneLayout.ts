/** Mayfield scene layout — districts, hotspots, zone overlays */

export type MayfieldBuildingId =
  | "saloon"
  | "parlor"
  | "town_hall"
  | "telegraph";

export type MayfieldHotspot = {
  buildingId: MayfieldBuildingId;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type MayfieldZoneOverlay = {
  slotId: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export const MAYFIELD_D0_HOTSPOTS: MayfieldHotspot[] = [
  { buildingId: "town_hall", x: 0.38, y: 0.08, w: 0.22, h: 0.22 },
  { buildingId: "telegraph", x: 0.08, y: 0.2, w: 0.18, h: 0.22 },
  { buildingId: "saloon", x: 0.1, y: 0.5, w: 0.22, h: 0.32 },
  { buildingId: "parlor", x: 0.54, y: 0.48, w: 0.28, h: 0.34 },
];

export const MAYFIELD_D0_ZONE_OVERLAYS: MayfieldZoneOverlay[] = [
  { slotId: "d0_z1", x: 0.42, y: 0.34, w: 0.1, h: 0.08 },
  { slotId: "d0_z2", x: 0.54, y: 0.34, w: 0.1, h: 0.08 },
  { slotId: "d0_z3", x: 0.42, y: 0.44, w: 0.1, h: 0.08 },
  { slotId: "d0_z4", x: 0.54, y: 0.44, w: 0.1, h: 0.08 },
];

export type MayfieldBuildingLayout = {
  id: MayfieldBuildingId;
  x: number;
  y: number;
  zIndex: number;
};

export const MAYFIELD_D0_BUILDINGS: MayfieldBuildingLayout[] = [
  { id: "town_hall", x: 50, y: 28, zIndex: 3 },
  { id: "telegraph", x: 18, y: 36, zIndex: 2 },
  { id: "saloon", x: 24, y: 72, zIndex: 4 },
  { id: "parlor", x: 68, y: 70, zIndex: 4 },
];

export const MAYFIELD_PLAYER_SPAWN = { x: 48, y: 54 };

/** Competitive venues + town services — D1 unlock adds tables in picker, not map hotspots. */
export function hotspotsForDistricts(_unlockedDistricts: string[]): MayfieldHotspot[] {
  return [...MAYFIELD_D0_HOTSPOTS];
}

export function districtLabel(districtId: string): string {
  if (districtId === "D1") return "Market Street";
  return "Old Square";
}
