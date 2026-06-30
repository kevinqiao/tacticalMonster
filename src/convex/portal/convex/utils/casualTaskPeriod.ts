/** 日/周/赛季 periodKey；用于 `portal_tasks` / `portal_task_claims` 分区（统一运营时区） */

export const CASUAL_TASK_OPS_TIME_ZONE = "Asia/Shanghai";
export const CASUAL_TASK_DAILY_RESET_HOUR = 5;
const MS_PER_HOUR = 3600 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

const weekdayToMonBased: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

function opsDateParts(
  nowMs: number,
  timeZone: string = CASUAL_TASK_OPS_TIME_ZONE
): { y: string; m: string; d: string; weekday: string } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
  const parts = fmt.formatToParts(new Date(nowMs));
  const read = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    y: read("year"),
    m: read("month"),
    d: read("day"),
    weekday: read("weekday"),
  };
}

/** 校验 IANA 时区；无效则回退平台默认运营时区。 */
export function normalizeOpsTimeZone(timeZone?: string | null): string {
  const raw = (timeZone ?? CASUAL_TASK_OPS_TIME_ZONE).trim();
  if (!raw) return CASUAL_TASK_OPS_TIME_ZONE;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: raw });
    return raw;
  } catch {
    return CASUAL_TASK_OPS_TIME_ZONE;
  }
}

/**
 * 运营时区周期基准：将“每日 05:00 切日”折算为“前移 5 小时后按运营时区自然日切日”。
 * 这样 daily / weekly 都以同一运营切换点为基准。
 */
function opsPeriodBaseMs(nowMs: number): number {
  return nowMs - CASUAL_TASK_DAILY_RESET_HOUR * MS_PER_HOUR;
}

export function dailyPeriodKeyForOpsZone(
  nowMs: number,
  timeZone: string = CASUAL_TASK_OPS_TIME_ZONE
): string {
  const tz = normalizeOpsTimeZone(timeZone);
  const b = opsDateParts(opsPeriodBaseMs(nowMs), tz);
  return `d:${tz}:${b.y}-${b.m}-${b.d}`;
}

export function dailyPeriodKey(nowMs: number): string {
  const b = opsDateParts(opsPeriodBaseMs(nowMs), CASUAL_TASK_OPS_TIME_ZONE);
  return `d:${b.y}-${b.m}-${b.d}`;
}

/** 取运营时区“当周周一”作为周标识（切周时间同每日：周一 05:00）。 */
export function weeklyPeriodKey(nowMs: number): string {
  const base = opsPeriodBaseMs(nowMs);
  const b = opsDateParts(base);
  const diffToMonday = weekdayToMonBased[b.weekday] ?? 0;
  const mondayBaseMs = base - diffToMonday * MS_PER_DAY;
  const monday = opsDateParts(mondayBaseMs);
  return `w:${monday.y}-${monday.m}-${monday.d}`;
}

export function seasonPeriodKey(seasonId: string): string {
  return `s:${seasonId}`;
}

const HOUR_MS = 3600000;

/** 当前运营日周期 `[startsAt, endsAt]`（05:00 切日，可指定 IANA 时区）。 */
export function dailyWindowMsForOpsZone(
  nowMs: number,
  timeZone: string = CASUAL_TASK_OPS_TIME_ZONE
): {
  instanceKey: string;
  startsAt: number;
  endsAt: number;
  timeZone: string;
} {
  const tz = normalizeOpsTimeZone(timeZone);
  const periodKey = (ms: number) => dailyPeriodKeyForOpsZone(ms, tz);
  const key = periodKey(nowMs);
  let lo = nowMs - 48 * HOUR_MS;
  while (periodKey(lo) !== key) {
    lo += HOUR_MS;
    if (lo > nowMs + 48 * HOUR_MS) {
      return {
        instanceKey: key,
        startsAt: nowMs - 24 * HOUR_MS,
        endsAt: nowMs + 24 * HOUR_MS,
        timeZone: tz,
      };
    }
  }
  while (lo > nowMs - 72 * HOUR_MS && periodKey(lo - HOUR_MS) === key) {
    lo -= HOUR_MS;
  }
  let hi = lo + HOUR_MS;
  while (periodKey(hi) === key) {
    hi += HOUR_MS;
    if (hi > lo + 72 * HOUR_MS) break;
  }
  return { instanceKey: key, startsAt: lo, endsAt: hi - 1, timeZone: tz };
}

/** 当前运营日周期 `[startsAt, endsAt]`（与 `dailyPeriodKey` 一致），用于周期锦标日桶。 */
export function dailyWindowMsShanghai(nowMs: number): {
  instanceKey: string;
  startsAt: number;
  endsAt: number;
} {
  const { instanceKey, startsAt, endsAt } = dailyWindowMsForOpsZone(
    nowMs,
    CASUAL_TASK_OPS_TIME_ZONE
  );
  return { instanceKey, startsAt, endsAt };
}

/** 当前运营周周期 `[startsAt, endsAt]`（与 `weeklyPeriodKey` 一致）。 */
export function weeklyWindowMsShanghai(nowMs: number): {
  instanceKey: string;
  startsAt: number;
  endsAt: number;
} {
  const key = weeklyPeriodKey(nowMs);
  let lo = nowMs - 14 * 24 * HOUR_MS;
  while (weeklyPeriodKey(lo) !== key) {
    lo += HOUR_MS;
    if (lo > nowMs + 14 * 24 * HOUR_MS) {
      return { instanceKey: key, startsAt: nowMs - 7 * 24 * HOUR_MS, endsAt: nowMs + 7 * 24 * HOUR_MS };
    }
  }
  while (lo > nowMs - 21 * 24 * HOUR_MS && weeklyPeriodKey(lo - HOUR_MS) === key) {
    lo -= HOUR_MS;
  }
  let hi = lo + HOUR_MS;
  while (weeklyPeriodKey(hi) === key) {
    hi += HOUR_MS;
    if (hi > lo + 21 * 24 * HOUR_MS) break;
  }
  return { instanceKey: key, startsAt: lo, endsAt: hi - 1 };
}
