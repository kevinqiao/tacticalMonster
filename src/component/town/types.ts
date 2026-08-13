import React from "react";

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

export const BUILDING_HERO: Record<string, string> = {
  saloon: "🃏",
  parlor: "🎴",
};
