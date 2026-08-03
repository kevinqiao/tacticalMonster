/** Portal 每日签到发门票；数字 ← portalEconomyGenerated。 */

import {
  PORTAL_DAILY_CHECKIN_BASE_TICKETS,
  PORTAL_DAILY_CHECKIN_ENABLED,
  PORTAL_DAILY_CHECKIN_STREAK_BONUS_TICKETS,
  PORTAL_DAILY_CHECKIN_STREAK_CYCLE_DAYS,
} from "./portalEconomyGenerated";

export {
  PORTAL_DAILY_CHECKIN_BASE_TICKETS,
  PORTAL_DAILY_CHECKIN_ENABLED,
  PORTAL_DAILY_CHECKIN_STREAK_BONUS_TICKETS,
  PORTAL_DAILY_CHECKIN_STREAK_CYCLE_DAYS,
};

/** 连续签到日在周期内的档位（1..cycleDays）。 */
export function checkinDayInCycle(
  streakCount: number,
  cycleDays: number = PORTAL_DAILY_CHECKIN_STREAK_CYCLE_DAYS
): number {
  const cycle = Math.max(1, Math.floor(cycleDays));
  if (streakCount <= 0) return 1;
  return ((streakCount - 1) % cycle) + 1;
}

/** 某 streak 档位应发放的门票数（base + 周期 bonus）。 */
export function checkinTicketsForStreak(
  streakCount: number,
  opts?: {
    baseTickets?: number;
    streakBonusTickets?: readonly number[];
    streakCycleDays?: number;
  }
): number {
  const base = Math.max(
    0,
    Math.floor(opts?.baseTickets ?? PORTAL_DAILY_CHECKIN_BASE_TICKETS)
  );
  const bonuses =
    opts?.streakBonusTickets ?? PORTAL_DAILY_CHECKIN_STREAK_BONUS_TICKETS;
  const day = checkinDayInCycle(
    streakCount,
    opts?.streakCycleDays ?? PORTAL_DAILY_CHECKIN_STREAK_CYCLE_DAYS
  );
  const bonus = Math.max(0, Math.floor(bonuses[day - 1] ?? 0));
  return base + bonus;
}

/** 周期内每一天展示用奖励（day 1..N）。 */
export function checkinCycleRewardTickets(
  opts?: {
    baseTickets?: number;
    streakBonusTickets?: readonly number[];
    streakCycleDays?: number;
  }
): number[] {
  const cycle = Math.max(
    1,
    Math.floor(opts?.streakCycleDays ?? PORTAL_DAILY_CHECKIN_STREAK_CYCLE_DAYS)
  );
  return Array.from({ length: cycle }, (_, i) =>
    checkinTicketsForStreak(i + 1, opts)
  );
}
