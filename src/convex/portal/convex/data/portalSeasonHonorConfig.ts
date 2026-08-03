/**
 * Portal 赛季荣誉轨：5 周一季（对齐青铜→钻石五段），Lv 1–30，纯展示 XP。
 * 日历 epoch 可由 partner ops 覆盖；缺省用全局上线周。
 * XP / epoch 常数 ← portalEconomyGenerated（SSOT: portal-economy.json）。
 */
import { weeklyPeriodKey } from "../utils/casualTaskPeriod";
import {
  PORTAL_SEASON_EPOCH_WEEK_KEY,
  PORTAL_SEASON_WEEKS,
  PORTAL_SEASON_MAX_LEVEL,
  PORTAL_SEASON_LEVEL_XP,
  PORTAL_SEASON_XP_WIN,
  PORTAL_SEASON_XP_PLAY,
  PORTAL_SEASON_XP_WEEK_SETTLE,
  PORTAL_SEASON_XP_WEEK_PROMOTE,
  PORTAL_SEASON_DAILY_WIN_XP_CAP,
  PORTAL_SEASON_DAILY_PLAY_XP_CAP,
} from "./portalEconomyGenerated";

export {
  PORTAL_SEASON_EPOCH_WEEK_KEY,
  PORTAL_SEASON_WEEKS,
  PORTAL_SEASON_MAX_LEVEL,
  PORTAL_SEASON_LEVEL_XP,
  PORTAL_SEASON_XP_WIN,
  PORTAL_SEASON_XP_PLAY,
  PORTAL_SEASON_XP_WEEK_SETTLE,
  PORTAL_SEASON_XP_WEEK_PROMOTE,
  PORTAL_SEASON_DAILY_WIN_XP_CAP,
  PORTAL_SEASON_DAILY_PLAY_XP_CAP,
};

export function isValidPortalWeekKey(weekKey: string): boolean {
  return /^w:\d{4}-\d{2}-\d{2}$/.test(weekKey);
}

/** `w:YYYY-MM-DD` → 日期选择器用的 `YYYY-MM-DD` */
export function calendarDateFromPortalWeekKey(weekKey: string): string {
  const m = /^w:(\d{4}-\d{2}-\d{2})$/.exec(weekKey);
  return m?.[1] ?? "";
}

/**
 * 日历日 → 运营周 weekKey（吸附该日所在周的周一）。
 * `ymd` 为 `YYYY-MM-DD`（HTML date input）。
 */
export function portalWeekKeyFromCalendarDate(ymd: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  // 上海正午，避开 05:00 切日边界
  const ms = new Date(`${ymd}T12:00:00+08:00`).getTime();
  if (!Number.isFinite(ms)) return null;
  return weeklyPeriodKey(ms);
}

function parseWeekKeyMondayUtcMs(weekKey: string): number | null {
  const m = /^w:(\d{4})-(\d{2})-(\d{2})$/.exec(weekKey);
  if (!m) return null;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function formatWeekKeyFromUtcMs(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `w:${y}-${m}-${day}`;
}

export function normalizeSeasonEpochWeekKey(
  weekKey: string | null | undefined
): string {
  if (weekKey && isValidPortalWeekKey(weekKey)) return weekKey;
  return PORTAL_SEASON_EPOCH_WEEK_KEY;
}

export function portalWeekIndex(
  weekKey: string,
  epochWeekKey: string = PORTAL_SEASON_EPOCH_WEEK_KEY
): number {
  const cur = parseWeekKeyMondayUtcMs(weekKey);
  const epoch = parseWeekKeyMondayUtcMs(normalizeSeasonEpochWeekKey(epochWeekKey));
  if (cur == null || epoch == null) return 0;
  return Math.max(0, Math.floor((cur - epoch) / (7 * 24 * 3600 * 1000)));
}

export function portalWeekKeyAddWeeks(weekKey: string, weeks: number): string {
  const ms = parseWeekKeyMondayUtcMs(weekKey);
  if (ms == null) return weekKey;
  return formatWeekKeyFromUtcMs(ms + weeks * 7 * 24 * 3600 * 1000);
}

export function portalSeasonIdFromWeekKey(
  weekKey: string,
  epochWeekKey: string = PORTAL_SEASON_EPOCH_WEEK_KEY
): string {
  // 1-based：epoch 当周起为 Season 1
  return `S${Math.floor(portalWeekIndex(weekKey, epochWeekKey) / PORTAL_SEASON_WEEKS) + 1}`;
}

/** 当前周在本季中的序号（1…PORTAL_SEASON_WEEKS） */
export function portalSeasonWeekOf(
  weekKey: string,
  epochWeekKey: string = PORTAL_SEASON_EPOCH_WEEK_KEY
): {
  weekOf: number;
  weeks: number;
} {
  const weekOf =
    (portalWeekIndex(weekKey, epochWeekKey) % PORTAL_SEASON_WEEKS) + 1;
  return { weekOf, weeks: PORTAL_SEASON_WEEKS };
}

/** season N（1-based）的起始 weekKey */
export function portalSeasonStartWeekKey(
  seasonN: number,
  epochWeekKey: string = PORTAL_SEASON_EPOCH_WEEK_KEY
): string {
  const n = Math.max(1, Math.floor(seasonN));
  const epoch = normalizeSeasonEpochWeekKey(epochWeekKey);
  return portalWeekKeyAddWeeks(epoch, (n - 1) * PORTAL_SEASON_WEEKS);
}

/** 当前周所在季结束后的下一季 W1 */
export function portalNextSeasonStartWeekKey(
  weekKey: string,
  epochWeekKey: string = PORTAL_SEASON_EPOCH_WEEK_KEY
): string {
  const epoch = normalizeSeasonEpochWeekKey(epochWeekKey);
  const curN = portalSeasonDisplayN(portalSeasonIdFromWeekKey(weekKey, epoch));
  return portalSeasonStartWeekKey(curN + 1, epoch);
}

export function portalSeasonDisplayN(seasonId: string): number {
  const n = Number(String(seasonId).replace(/^S/i, ""));
  return Number.isFinite(n) ? n : 0;
}

export function portalSeasonIdAt(
  nowMs: number = Date.now(),
  epochWeekKey: string = PORTAL_SEASON_EPOCH_WEEK_KEY
): string {
  return portalSeasonIdFromWeekKey(weeklyPeriodKey(nowMs), epochWeekKey);
}

export function portalWeekKeyAtOrAfter(
  currentWeekKey: string,
  startWeekKey: string
): boolean {
  const cur = parseWeekKeyMondayUtcMs(currentWeekKey);
  const start = parseWeekKeyMondayUtcMs(startWeekKey);
  if (cur == null || start == null) return true;
  return cur >= start;
}

export function portalSeasonLevelFromXp(seasonXp: number): number {
  let level = 1;
  for (let L = PORTAL_SEASON_MAX_LEVEL; L >= 1; L -= 1) {
    if (seasonXp >= (PORTAL_SEASON_LEVEL_XP[L] ?? 0)) {
      level = L;
      break;
    }
  }
  return level;
}

export function portalSeasonXpProgress(level: number, seasonXp: number): {
  xpIntoLevel: number;
  xpForLevel: number;
  xpToNext: number;
} {
  const curNeed = PORTAL_SEASON_LEVEL_XP[level] ?? 0;
  if (level >= PORTAL_SEASON_MAX_LEVEL) {
    return {
      xpIntoLevel: Math.max(0, seasonXp - curNeed),
      xpForLevel: 0,
      xpToNext: 0,
    };
  }
  const nextNeed = PORTAL_SEASON_LEVEL_XP[level + 1] ?? curNeed;
  const span = Math.max(1, nextNeed - curNeed);
  const into = Math.max(0, Math.min(span, seasonXp - curNeed));
  return {
    xpIntoLevel: into,
    xpForLevel: span,
    xpToNext: Math.max(0, nextNeed - seasonXp),
  };
}
