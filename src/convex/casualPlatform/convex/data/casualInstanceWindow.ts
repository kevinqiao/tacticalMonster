/**
 * 周期型锦标时间窗：`instanceKey` + `startsAt` / `endsAt`（与 `casual_tournament_instances` 对齐）。
 */
import type { CasualTournamentDefinition } from "./casualTournamentConfigs";
import { effectiveInstanceScope } from "./casualTournamentConfigs";
import {
  CASUAL_TASK_OPS_TIME_ZONE,
  dailyWindowMsShanghai,
  weeklyWindowMsShanghai,
} from "../utils/casualTaskPeriod";

const MS_DAY = 86400000;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function utcYmdParts(ms: number): { y: number; m: number; d: number } {
  const d = new Date(ms);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() };
}

function startOfUtcDay(ms: number): number {
  const { y, m, d } = utcYmdParts(ms);
  return Date.UTC(y, m - 1, d, 0, 0, 0, 0);
}

/** ISO 周（周一为周首，UTC） */
function isoWeekMondayBoundsUTC(ms: number): { weekYear: number; week: number; mondayStart: number } {
  const d = new Date(ms);
  const day = d.getUTCDay();
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diffToMonday));
  const thursday = new Date(monday.getTime() + 3 * MS_DAY);
  const weekYear = thursday.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(weekYear, 0, 4));
  const firstMonday = new Date(firstThursday.getTime() - ((firstThursday.getUTCDay() + 6) % 7) * MS_DAY);
  const week = Math.floor((monday.getTime() - firstMonday.getTime()) / (7 * MS_DAY)) + 1;
  return { weekYear, week, mondayStart: monday.getTime() };
}

export type ActiveSeasonWindow = { seasonId: string; startsAt: number; endsAt: number };

/**
 * 解析当前 `now` 所在周期窗；`single_match` 返回 null。
 * - `daily` / `weekly`：`instanceTimezone` 缺省为 UTC；`Asia/Shanghai` 与任务周期（05:00 切日/周）一致。
 * - `season`：使用当前激活赛季起止；无激活赛季时返回 null。
 */
export function resolveInstanceWindow(
  def: CasualTournamentDefinition,
  now: number,
  activeSeason: ActiveSeasonWindow | null
): { instanceKey: string; startsAt: number; endsAt: number } | null {
  const scope = effectiveInstanceScope(def);
  if (scope === "single_match") return null;

  if (scope === "season") {
    if (!activeSeason) return null;
    return {
      instanceKey: `s:${activeSeason.seasonId}`,
      startsAt: activeSeason.startsAt,
      endsAt: activeSeason.endsAt,
    };
  }

  const tz = def.instanceTimezone ?? "UTC";
  const useOps = tz === CASUAL_TASK_OPS_TIME_ZONE;

  if (scope === "daily") {
    if (useOps) {
      const w = dailyWindowMsShanghai(now);
      return { instanceKey: w.instanceKey, startsAt: w.startsAt, endsAt: w.endsAt };
    }
    const { y, m, d } = utcYmdParts(now);
    const startsAt = startOfUtcDay(now);
    const instanceKey = `d:${y}-${pad2(m)}-${pad2(d)}`;
    return { instanceKey, startsAt, endsAt: startsAt + MS_DAY - 1 };
  }

  if (scope === "weekly") {
    if (useOps) {
      const w = weeklyWindowMsShanghai(now);
      return { instanceKey: w.instanceKey, startsAt: w.startsAt, endsAt: w.endsAt };
    }
    const { weekYear, week, mondayStart } = isoWeekMondayBoundsUTC(now);
    const instanceKey = `w:${weekYear}-W${pad2(week)}`;
    return { instanceKey, startsAt: mondayStart, endsAt: mondayStart + 7 * MS_DAY - 1 };
  }

  return null;
}
