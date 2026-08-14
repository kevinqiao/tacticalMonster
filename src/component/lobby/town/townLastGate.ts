import { GateSelection } from "./types";

const STORAGE_KEY = "town.lastGate";

export function readLastGateSelection(): GateSelection | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GateSelection;
    if (!parsed?.buildingId || !parsed?.gameType) return null;
    return {
      ...parsed,
      tierLabel: parsed.tierLabel ?? parsed.tierId,
    };
  } catch {
    return null;
  }
}

export function writeLastGateSelection(selection: GateSelection) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
  } catch {
    /* ignore */
  }
}
