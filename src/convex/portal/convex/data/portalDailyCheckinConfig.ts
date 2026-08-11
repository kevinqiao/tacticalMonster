/** Portal 每日签到（门票 / 金币 / 混合）；数字 ← portalEconomyGenerated。 */

import {
  PORTAL_DAILY_CHECKIN_BASE_COINS,
  PORTAL_DAILY_CHECKIN_BASE_TICKETS,
  PORTAL_DAILY_CHECKIN_ENABLED,
  PORTAL_DAILY_CHECKIN_STREAK_BONUS_COINS,
  PORTAL_DAILY_CHECKIN_STREAK_BONUS_TICKETS,
  PORTAL_DAILY_CHECKIN_STREAK_CYCLE_DAYS,
} from "./portalEconomyGenerated";
import type {
  PortalCheckinRewardKind,
  PortalCheckinRewardsOverride,
} from "./portalPartnerShopSettings";

export type { PortalCheckinRewardKind, PortalCheckinRewardsOverride };

export {
  PORTAL_DAILY_CHECKIN_BASE_COINS,
  PORTAL_DAILY_CHECKIN_BASE_TICKETS,
  PORTAL_DAILY_CHECKIN_ENABLED,
  PORTAL_DAILY_CHECKIN_STREAK_BONUS_COINS,
  PORTAL_DAILY_CHECKIN_STREAK_BONUS_TICKETS,
  PORTAL_DAILY_CHECKIN_STREAK_CYCLE_DAYS,
};

export type CheckinAmountOpts = {
  baseTickets?: number;
  streakBonusTickets?: readonly number[];
  baseCoins?: number;
  streakBonusCoins?: readonly number[];
  streakCycleDays?: number;
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

function checkinAmountForStreak(
  streakCount: number,
  base: number,
  bonuses: readonly number[],
  cycleDays: number = PORTAL_DAILY_CHECKIN_STREAK_CYCLE_DAYS
): number {
  const day = checkinDayInCycle(streakCount, cycleDays);
  const bonus = Math.max(0, Math.floor(bonuses[day - 1] ?? 0));
  return Math.max(0, Math.floor(base)) + bonus;
}

/** 某 streak 档位应发放的门票数（base + 周期 bonus）。 */
export function checkinTicketsForStreak(
  streakCount: number,
  opts?: CheckinAmountOpts
): number {
  return checkinAmountForStreak(
    streakCount,
    opts?.baseTickets ?? PORTAL_DAILY_CHECKIN_BASE_TICKETS,
    opts?.streakBonusTickets ?? PORTAL_DAILY_CHECKIN_STREAK_BONUS_TICKETS,
    opts?.streakCycleDays ?? PORTAL_DAILY_CHECKIN_STREAK_CYCLE_DAYS
  );
}

/** 某 streak 档位应发放的金币数（base + 周期 bonus）。 */
export function checkinCoinsForStreak(
  streakCount: number,
  opts?: CheckinAmountOpts
): number {
  return checkinAmountForStreak(
    streakCount,
    opts?.baseCoins ?? PORTAL_DAILY_CHECKIN_BASE_COINS,
    opts?.streakBonusCoins ?? PORTAL_DAILY_CHECKIN_STREAK_BONUS_COINS,
    opts?.streakCycleDays ?? PORTAL_DAILY_CHECKIN_STREAK_CYCLE_DAYS
  );
}

export function checkinAmountsForKind(
  kind: PortalCheckinRewardKind,
  streakCount: number,
  opts?: CheckinAmountOpts
): { tickets: number; coins: number } {
  const tickets =
    kind === "coins" ? 0 : checkinTicketsForStreak(streakCount, opts);
  const coins =
    kind === "tickets" ? 0 : checkinCoinsForStreak(streakCount, opts);
  return { tickets, coins };
}

/** @deprecated Prefer checkinAmountsForKind. */
export function checkinRewardForStreak(
  kind: PortalCheckinRewardKind,
  streakCount: number,
  opts?: CheckinAmountOpts
): number {
  const { tickets, coins } = checkinAmountsForKind(kind, streakCount, opts);
  if (kind === "both") return tickets + coins;
  return kind === "coins" ? coins : tickets;
}

/** 周期内每一天展示用奖励（day 1..N）。 */
export function checkinCycleRewardTickets(opts?: CheckinAmountOpts): number[] {
  const cycle = Math.max(
    1,
    Math.floor(opts?.streakCycleDays ?? PORTAL_DAILY_CHECKIN_STREAK_CYCLE_DAYS)
  );
  return Array.from({ length: cycle }, (_, i) =>
    checkinTicketsForStreak(i + 1, opts)
  );
}

export function checkinCycleRewardCoins(opts?: CheckinAmountOpts): number[] {
  const cycle = Math.max(
    1,
    Math.floor(opts?.streakCycleDays ?? PORTAL_DAILY_CHECKIN_STREAK_CYCLE_DAYS)
  );
  return Array.from({ length: cycle }, (_, i) =>
    checkinCoinsForStreak(i + 1, opts)
  );
}

export function checkinCycleRewards(
  kind: PortalCheckinRewardKind,
  opts?: CheckinAmountOpts
): number[] {
  if (kind === "coins") return checkinCycleRewardCoins(opts);
  if (kind === "both") {
    // Prefer coin amounts for single-array UI fallback; FE should use dual arrays.
    return checkinCycleRewardCoins(opts);
  }
  return checkinCycleRewardTickets(opts);
}

/** Map partner shop override → amount opts (missing = global defaults). */
export function checkinOptsFromRewards(
  rewards?: PortalCheckinRewardsOverride | null
): CheckinAmountOpts {
  if (!rewards) return {};
  const opts: CheckinAmountOpts = {};
  if (rewards.baseTickets != null) opts.baseTickets = rewards.baseTickets;
  if (rewards.streakBonusTickets != null) {
    opts.streakBonusTickets = rewards.streakBonusTickets;
  }
  if (rewards.baseCoins != null) opts.baseCoins = rewards.baseCoins;
  if (rewards.streakBonusCoins != null) {
    opts.streakBonusCoins = rewards.streakBonusCoins;
  }
  return opts;
}
