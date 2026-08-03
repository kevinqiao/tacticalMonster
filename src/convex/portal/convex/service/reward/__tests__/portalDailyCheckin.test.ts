import { describe, expect, it } from "vitest";

import {
  checkinCycleRewardTickets,
  checkinDayInCycle,
  checkinTicketsForStreak,
  PORTAL_DAILY_CHECKIN_BASE_TICKETS,
  PORTAL_DAILY_CHECKIN_STREAK_BONUS_TICKETS,
  PORTAL_DAILY_CHECKIN_STREAK_CYCLE_DAYS,
} from "../../../data/portalDailyCheckinConfig";
import { nextCheckinStreakCount } from "../portalDailyCheckinService";

describe("portalDailyCheckinConfig", () => {
  it("keeps a 7-day cycle with base ticket > 0", () => {
    expect(PORTAL_DAILY_CHECKIN_BASE_TICKETS).toBe(1);
    expect(PORTAL_DAILY_CHECKIN_STREAK_CYCLE_DAYS).toBe(7);
    expect(PORTAL_DAILY_CHECKIN_STREAK_BONUS_TICKETS).toHaveLength(7);
  });

  it("maps streak days into the cycle", () => {
    expect(checkinDayInCycle(1)).toBe(1);
    expect(checkinDayInCycle(7)).toBe(7);
    expect(checkinDayInCycle(8)).toBe(1);
    expect(checkinDayInCycle(14)).toBe(7);
  });

  it("adds streak bonus on configured days", () => {
    expect(checkinTicketsForStreak(1)).toBe(1);
    expect(checkinTicketsForStreak(2)).toBe(1);
    expect(checkinTicketsForStreak(3)).toBe(2);
    expect(checkinTicketsForStreak(6)).toBe(2);
    expect(checkinTicketsForStreak(7)).toBe(3);
    expect(checkinTicketsForStreak(8)).toBe(1);
  });

  it("exposes cycle reward preview for UI", () => {
    expect(checkinCycleRewardTickets()).toEqual([1, 1, 2, 1, 1, 2, 3]);
  });
});

describe("nextCheckinStreakCount", () => {
  it("starts at 1 with no prior claim", () => {
    expect(
      nextCheckinStreakCount({
        previousStreakCount: 0,
        lastClaimPeriodKey: null,
        dayKey: "d:2026-08-02",
        yesterdayKey: "d:2026-08-01",
      })
    ).toBe(1);
  });

  it("continues after claiming yesterday", () => {
    expect(
      nextCheckinStreakCount({
        previousStreakCount: 3,
        lastClaimPeriodKey: "d:2026-08-01",
        dayKey: "d:2026-08-02",
        yesterdayKey: "d:2026-08-01",
      })
    ).toBe(4);
  });

  it("resets after a missed day", () => {
    expect(
      nextCheckinStreakCount({
        previousStreakCount: 5,
        lastClaimPeriodKey: "d:2026-07-30",
        dayKey: "d:2026-08-02",
        yesterdayKey: "d:2026-08-01",
      })
    ).toBe(1);
  });

  it("keeps streak when already claimed today", () => {
    expect(
      nextCheckinStreakCount({
        previousStreakCount: 4,
        lastClaimPeriodKey: "d:2026-08-02",
        dayKey: "d:2026-08-02",
        yesterdayKey: "d:2026-08-01",
      })
    ).toBe(4);
  });
});
