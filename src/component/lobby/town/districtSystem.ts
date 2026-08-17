/** Shared district catalog + expansion checklist for Hall cards and Mayor's Office. */

export type DistrictId = "D0" | "D1";

export type DistrictCatalogEntry = {
  id: DistrictId;
  label: string;
  developableSlots: number;
};

export const DISTRICT_CATALOG: DistrictCatalogEntry[] = [
  { id: "D0", label: "Old Square", developableSlots: 4 },
  { id: "D1", label: "Market Street", developableSlots: 5 },
];

export type DistrictExpansionView = {
  minMayorLevel: number;
  minDevelopedZones: number;
  questId: string;
  feeCoins: number;
  questComplete?: boolean;
  unlocked?: boolean;
  canExpand: boolean;
};

/** Local SSOT so Hall can paint D1 gates before / without getProgress. */
export const DEFAULT_D1_EXPANSION: DistrictExpansionView = {
  minMayorLevel: 3,
  minDevelopedZones: 3,
  questId: "quest_d1_market",
  feeCoins: 800,
  questComplete: false,
  unlocked: false,
  canExpand: false,
};

export type DistrictCheck = {
  have: number;
  need: number;
  ok: boolean;
  label: string;
};

export type DistrictExpansionChecklist = {
  mayor: DistrictCheck;
  zones: DistrictCheck;
  quest: DistrictCheck;
  coins: DistrictCheck;
  gatesReady: boolean;
  canPay: boolean;
  canExpand: boolean;
  summary: string;
};

const QUEST_LABELS: Record<string, string> = {
  quest_d1_market: "Showdown quest",
};

export function districtCatalogEntry(id: string): DistrictCatalogEntry | undefined {
  return DISTRICT_CATALOG.find((d) => d.id === id);
}

export function districtLockCopy(districtId: string): string {
  const row = districtCatalogEntry(districtId);
  return row ? `${row.label} · Locked` : "District locked";
}

export function expansionChecklist(
  expansion: DistrictExpansionView,
  mayorLevel: number,
  developedZones: number,
  coins: number
): DistrictExpansionChecklist {
  const mayorOk = mayorLevel >= expansion.minMayorLevel;
  const zonesOk = developedZones >= expansion.minDevelopedZones;
  const questOk = Boolean(expansion.questComplete) || expansion.canExpand;
  const coinsOk = coins >= expansion.feeCoins;
  const questName = QUEST_LABELS[expansion.questId] ?? "Quest";
  const mayor: DistrictCheck = {
    have: mayorLevel,
    need: expansion.minMayorLevel,
    ok: mayorOk,
    label: `Mayor ${mayorLevel}/${expansion.minMayorLevel}`,
  };
  const zones: DistrictCheck = {
    have: developedZones,
    need: expansion.minDevelopedZones,
    ok: zonesOk,
    label: `Zones ${developedZones}/${expansion.minDevelopedZones}`,
  };
  const quest: DistrictCheck = {
    have: questOk ? 1 : 0,
    need: 1,
    ok: questOk,
    label: questOk ? `${questName} 1/1` : `${questName} 0/1`,
  };
  const coinCheck: DistrictCheck = {
    have: coins,
    need: expansion.feeCoins,
    ok: coinsOk,
    label: `${Math.min(coins, expansion.feeCoins)}/${expansion.feeCoins}c`,
  };
  const gatesReady = mayorOk && zonesOk && questOk;
  return {
    mayor,
    zones,
    quest,
    coins: coinCheck,
    gatesReady,
    canPay: coinsOk,
    canExpand: gatesReady && coinsOk && !expansion.unlocked,
    summary: [mayor.label, zones.label, coinCheck.label, quest.label].join(" · "),
  };
}

export function checklistGates(list: DistrictExpansionChecklist): DistrictCheck[] {
  return [list.mayor, list.zones, list.coins, list.quest];
}

export function nextExpansionBlocker(list: DistrictExpansionChecklist): string | null {
  if (!list.mayor.ok) return `Need Mayor Lv.${list.mayor.need}`;
  if (!list.zones.ok) return `Develop ${list.zones.need - list.zones.have} more D0 zones`;
  if (!list.quest.ok) return "Finish the Market quest (play a Showdown)";
  if (!list.canPay) return `Need ${list.coins.need} coins`;
  return null;
}

const DISTRICT_ERRORS: Record<string, string> = {
  DISTRICT_LOCKED: "Unlock this district first",
  MAYOR_LEVEL_TOO_LOW: "Need a higher Mayor level",
  NEED_MORE_ZONES: "Develop more zones in Old Square",
  QUEST_REQUIRED: "Finish the Market quest first",
  INSUFFICIENT_FUNDS: "Not enough coins",
  ALREADY_UNLOCKED: "This district is already open",
  NOT_EXPANDABLE: "This district cannot be expanded",
  INVALID_DISTRICT: "Unknown district",
};

export function districtErrorMessage(error: string | undefined): string {
  if (!error) return "Something went wrong";
  return DISTRICT_ERRORS[error] ?? error;
}
