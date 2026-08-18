/** Shared district catalog + expansion checklist for Hall cards and Mayor's Office. */

export type DistrictId = "D0" | "D1";

export type DistrictCatalogEntry = {
  id: DistrictId;
  label: string;
};

export type DistrictOpView = {
  districtId: string;
  label: string;
  unlocked: boolean;
  type: string | null;
  typeLabel: string | null;
  level: number;
  rebranded: boolean;
  choices: string[];
  developCost: number | null;
  upgradeCost: number | null;
  rebrandCost: number | null;
  maxLevel: number;
  passivePerHour: number;
  entertainmentBonusActive?: boolean;
  coinTableBonusActive?: boolean;
  gameType: string | null;
};

export function districtOpFor(
  ops: DistrictOpView[] | undefined,
  districtId: string
): DistrictOpView | undefined {
  return ops?.find((row) => row.districtId === districtId);
}

export const LEVY_CYCLE_HOURS = 8;

export function districtStatusLine(op: DistrictOpView | undefined, unlocked: boolean): string {
  if (!unlocked) return "Locked";
  if (!op || op.level < 1 || !op.type) return "Undeveloped";
  const rate = op.passivePerHour > 0 ? ` · ${op.passivePerHour}/h` : "";
  return `${op.typeLabel ?? "District"} · Lv.${op.level}${rate}`;
}

export function districtRateTotal(ops: DistrictOpView[] | undefined): number {
  return (ops ?? []).reduce((sum, row) => sum + (row.level > 0 ? row.passivePerHour : 0), 0);
}

export function districtDevelopedLevel(op: DistrictOpView | undefined): number {
  return op && op.level > 0 && op.type ? op.level : 0;
}

export const DISTRICT_CATALOG: DistrictCatalogEntry[] = [
  { id: "D0", label: "Old Square" },
  { id: "D1", label: "Market Street" },
];

export type DistrictExpansionView = {
  minMayorLevel: number;
  minPriorDistrictLevel: number;
  minDevelopedZones?: number;
  questId: string;
  feeCoins: number;
  questComplete?: boolean;
  unlocked?: boolean;
  canExpand: boolean;
};

/** Local SSOT so Hall can paint D1 gates before / without getProgress. */
export const DEFAULT_D1_EXPANSION: DistrictExpansionView = {
  minMayorLevel: 3,
  minPriorDistrictLevel: 3,
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
  prior: DistrictCheck;
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
  return row ? `Develop ${row.label}` : "District locked";
}

export function expansionChecklist(
  expansion: DistrictExpansionView,
  mayorLevel: number,
  priorDistrictLevel: number,
  coins: number
): DistrictExpansionChecklist {
  const needLevel = expansion.minPriorDistrictLevel ?? expansion.minDevelopedZones ?? 3;
  const mayorOk = mayorLevel >= expansion.minMayorLevel;
  const priorOk = priorDistrictLevel >= needLevel;
  const questOk = Boolean(expansion.questComplete) || expansion.canExpand;
  const coinsOk = coins >= expansion.feeCoins;
  const questName = QUEST_LABELS[expansion.questId] ?? "Quest";
  const mayor: DistrictCheck = {
    have: mayorLevel,
    need: expansion.minMayorLevel,
    ok: mayorOk,
    label: `Mayor ${mayorLevel}/${expansion.minMayorLevel}`,
  };
  const prior: DistrictCheck = {
    have: priorDistrictLevel,
    need: needLevel,
    ok: priorOk,
    label: `Old Square Lv.${priorDistrictLevel}/${needLevel}`,
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
  const gatesReady = mayorOk && priorOk && questOk;
  return {
    mayor,
    prior,
    quest,
    coins: coinCheck,
    gatesReady,
    canPay: coinsOk,
    canExpand: gatesReady && coinsOk && !expansion.unlocked,
    summary: [mayor.label, prior.label, coinCheck.label, quest.label].join(" · "),
  };
}

export function checklistGates(list: DistrictExpansionChecklist): DistrictCheck[] {
  return [list.mayor, list.prior, list.coins, list.quest];
}

export function nextExpansionBlocker(list: DistrictExpansionChecklist): string | null {
  if (!list.mayor.ok) return `Need Mayor Lv.${list.mayor.need}`;
  if (!list.prior.ok) return `Raise Old Square to Lv.${list.prior.need}`;
  if (!list.quest.ok) return "Finish the Market quest (play a Showdown)";
  if (!list.canPay) return `Need ${list.coins.need} coins`;
  return null;
}

const DISTRICT_ERRORS: Record<string, string> = {
  DISTRICT_LOCKED: "Unlock this district first",
  MAYOR_LEVEL_TOO_LOW: "Need a higher Mayor level",
  NEED_MORE_ZONES: "Raise Old Square first",
  NEED_HIGHER_DISTRICT_LEVEL: "Raise Old Square to a higher level",
  QUEST_REQUIRED: "Finish the Market quest first",
  INSUFFICIENT_FUNDS: "Not enough coins",
  ALREADY_UNLOCKED: "This district is already open",
  ALREADY_DEVELOPED: "This district is already developed",
  ALREADY_REBRANDED: "This district already rebranded",
  NOT_DEVELOPED: "Develop this district first",
  MAX_LEVEL: "This district is already max level",
  SAME_TYPE: "Pick a different type",
  NOT_EXPANDABLE: "This district cannot be expanded",
  INVALID_DISTRICT: "Unknown district",
};

export function districtErrorMessage(error: string | undefined): string {
  if (!error) return "Something went wrong";
  return DISTRICT_ERRORS[error] ?? error;
}

export type TownLevyView = {
  active: boolean;
  ready: boolean;
  payout: number;
  collectable: number;
  remainingMs: number;
  readyAt: number;
  cappedByWeekly: boolean;
  ratePerHour: number;
  dripping?: boolean;
};

export function formatLevyRemaining(ms: number): string {
  const totalMin = Math.max(0, Math.ceil(ms / 60_000));
  if (totalMin <= 0) return "0m";
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  if (hours <= 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export type DistrictCollectView = {
  collectable: number;
  cap: number;
  progress: number;
  dripping: boolean;
  bankLine: string;
  collectLabel: string;
  canCollect: boolean;
};

export function liveDistrictCollect(
  levy: TownLevyView | null | undefined,
  ops: DistrictOpView[] | undefined,
  nowMs: number
): DistrictCollectView | null {
  const rate = levy?.ratePerHour || districtRateTotal(ops);
  const cap = levy?.payout || Math.floor(rate * LEVY_CYCLE_HOURS);
  if (rate <= 0 || cap <= 0) return null;
  const cycleMs = LEVY_CYCLE_HOURS * 3_600_000;
  const startedAt = levy != null ? levy.readyAt - cycleMs : null;
  const elapsedMs = startedAt == null ? 0 : Math.min(cycleMs, Math.max(0, nowMs - startedAt));
  const remainingMs = Math.max(0, cycleMs - elapsedMs);
  const collectable = Math.min(cap, Math.floor(rate * (elapsedMs / 3_600_000)));
  const dripping = remainingMs > 0;
  const status = dripping ? `dripping · full in ${formatLevyRemaining(remainingMs)}` : "full · not dripping";
  return {
    collectable,
    cap,
    progress: elapsedMs / cycleMs,
    dripping,
    bankLine: `${collectable} / ${cap} · ${status}`,
    collectLabel: collectable > 0 ? `Collect +${collectable}` : "Collect",
    canCollect: collectable > 0,
  };
}
