import { CASUAL_SEASON_CHALLENGE_BB_TOURNAMENT_ID } from "./casualTournamentConfigs";

/**
 * 明码时间 → epoch 毫秒，供配表阅读。
 * - 支持 `YYYY-MM-DD`（按当日 00:00:00）
 * - 支持 `YYYY-MM-DD HH:mm:ss`（空格分隔）
 * - 固定按 **Asia/Shanghai (UTC+8)** 解析；若需其它时区可再扩展参数。
 */
export function activityAt(ymdOrYmdHms: string): number {
  const trimmed = ymdOrYmdHms.trim();
  let datePart: string;
  let timePart = "00:00:00";
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    datePart = trimmed;
  } else if (/^\d{4}-\d{2}-\d{2}\s+\d/.test(trimmed)) {
    const sp = trimmed.indexOf(" ");
    datePart = trimmed.slice(0, sp);
    timePart = trimmed.slice(sp + 1).trim() || "00:00:00";
  } else {
    throw new Error(
      `activityAt: expected "YYYY-MM-DD" or "YYYY-MM-DD HH:mm:ss", got "${ymdOrYmdHms}"`
    );
  }
  const ms = Date.parse(`${datePart}T${timePart}+08:00`);
  if (!Number.isFinite(ms)) {
    throw new Error(`activityAt: invalid datetime "${ymdOrYmdHms}"`);
  }
  return ms;
}

/** 与 `casual_activities.target` 一致（判别联合） */
export type CasualActivityTarget =
  | { type: "global" }
  | { type: "tournament_match"; tournamentId?: string }
  | { type: "casual_shop_sku"; shopSkuId?: string };

export interface CasualActivitySeed {
  activityId: string;
  title: string;
  target: CasualActivityTarget;
  seasonId?: string;
  startsAt: number;
  endsAt: number;
  active: boolean;
  effects: {
    voucherCostMultiplier?: number;
    voucherCostDelta?: number;
    passXpMultiplier?: number;
    passXpDelta?: number;
    coinsCostMultiplier?: number;
    coinsCostDelta?: number;
    gemsCostMultiplier?: number;
    gemsCostDelta?: number;
    iapGrantGemsMultiplier?: number;
    iapGrantGemsDelta?: number;
  };
}

/** 与 `seedDemoTournaments` 默认赛季 `casual_s1` 对齐；运营按赛季改明码日期即可。 */
const ACTIVITY_WINDOW_START_MS = activityAt("2026-01-01 00:00:00");
const ACTIVITY_WINDOW_END_MS = activityAt("2027-12-31 23:59:59");

/**
 * 默认活动种子：`seedActivitiesIfEmpty` 仅在 `casual_activities` 为空时整批插入。
 * 若库中已有活动行，改此表后需用 Dashboard 更新或另写迁移，不会自动覆盖。
 */
export const DEFAULT_CASUAL_ACTIVITIES: CasualActivitySeed[] = [
  {
    activityId: "casual_s1_global_pass_xp_boost",
    title: "S1 · 全局 Pass XP +5%",
    target: { type: "global" },
    seasonId: "casual_s1",
    startsAt: ACTIVITY_WINDOW_START_MS,
    endsAt: ACTIVITY_WINDOW_END_MS,
    active: true,
    effects: { passXpMultiplier: 1.05 },
  },
  {
    activityId: "casual_s1_spotlight_voucher_discount",
    title: "S1 · 专场赛季券入场 9 折",
    target: { type: "tournament_match", tournamentId: CASUAL_SEASON_CHALLENGE_BB_TOURNAMENT_ID },
    seasonId: "casual_s1",
    startsAt: ACTIVITY_WINDOW_START_MS,
    endsAt: ACTIVITY_WINDOW_END_MS,
    active: true,
    effects: { voucherCostMultiplier: 0.9 },
  },
  {
    activityId: "casual_s1_async_a_coin_discount",
    title: "S1 · A 档金币入场 9 折",
    target: { type: "tournament_match", tournamentId: "casual_async_a_bb" },
    seasonId: "casual_s1",
    startsAt: ACTIVITY_WINDOW_START_MS,
    endsAt: ACTIVITY_WINDOW_END_MS,
    active: true,
    effects: { coinsCostMultiplier: 0.9 },
  },
];
