/** 日/周/赛季 periodKey；用于 `casual_tasks` / `casual_task_claims` 分区（统一运营时区） */

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

function opsDateParts(nowMs: number): { y: string; m: string; d: string; weekday: string } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: CASUAL_TASK_OPS_TIME_ZONE,
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

/**
 * 运营时区周期基准：将“每日 05:00 切日”折算为“前移 5 小时后按运营时区自然日切日”。
 * 这样 daily / weekly 都以同一运营切换点为基准。
 */
function opsPeriodBaseMs(nowMs: number): number {
  return nowMs - CASUAL_TASK_DAILY_RESET_HOUR * MS_PER_HOUR;
}

export function dailyPeriodKey(nowMs: number): string {
  const b = opsDateParts(opsPeriodBaseMs(nowMs));
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

/** 二分查找：区间内第一个使 `pred` 为 true 的时刻（假定 [lo,hi] 上 false→true 单次跳变）。 */
function firstTrueMs(
  lo: number,
  hi: number,
  pred: (ms: number) => boolean
): number {
  let left = lo;
  let right = hi;
  while (right - left > 1) {
    const mid = Math.floor((left + right) / 2);
    if (pred(mid)) right = mid;
    else left = mid;
  }
  return right;
}

/** 当前运营日周期 `[startsAt, endsAt]`（与 `dailyPeriodKey` 一致），用于周期锦标日桶。 */
export function dailyWindowMsShanghai(nowMs: number): {
  instanceKey: string;
  startsAt: number;
  endsAt: number;
} {
  const key = dailyPeriodKey(nowMs);
  const inPeriod = (ms: number) => dailyPeriodKey(ms) === key;

  let probe = nowMs - 36 * HOUR_MS;
  while (inPeriod(probe)) {
    probe -= 24 * HOUR_MS;
    if (probe < nowMs - 96 * HOUR_MS) {
      return {
        instanceKey: key,
        startsAt: nowMs - 24 * HOUR_MS,
        endsAt: nowMs + 24 * HOUR_MS,
      };
    }
  }
  const startsAt = firstTrueMs(probe, nowMs, inPeriod);

  let after = startsAt + 20 * HOUR_MS;
  while (inPeriod(after)) {
    after += HOUR_MS;
    if (after > startsAt + 48 * HOUR_MS) break;
  }
  const nextStart = firstTrueMs(startsAt, after, (ms) => !inPeriod(ms));
  return { instanceKey: key, startsAt, endsAt: nextStart - 1 };
}

/** 当前运营周周期 `[startsAt, endsAt]`（与 `weeklyPeriodKey` 一致）。 */
export function weeklyWindowMsShanghai(nowMs: number): {
  instanceKey: string;
  startsAt: number;
  endsAt: number;
} {
  const key = weeklyPeriodKey(nowMs);
  const inPeriod = (ms: number) => weeklyPeriodKey(ms) === key;

  let probe = nowMs - 10 * 24 * HOUR_MS;
  while (inPeriod(probe)) {
    probe -= 7 * 24 * HOUR_MS;
    if (probe < nowMs - 40 * 24 * HOUR_MS) {
      return {
        instanceKey: key,
        startsAt: nowMs - 7 * 24 * HOUR_MS,
        endsAt: nowMs + 7 * 24 * HOUR_MS,
      };
    }
  }
  const startsAt = firstTrueMs(probe, nowMs, inPeriod);

  let after = startsAt + 5 * 24 * HOUR_MS;
  while (inPeriod(after)) {
    after += HOUR_MS;
    if (after > startsAt + 10 * 24 * HOUR_MS) break;
  }
  const nextStart = firstTrueMs(startsAt, after, (ms) => !inPeriod(ms));
  return { instanceKey: key, startsAt, endsAt: nextStart - 1 };
}
