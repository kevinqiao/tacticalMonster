import { describe, expect, it } from "vitest";
import {
  WEEKLY_LEAGUE_BOT_POOL_SIZE,
  WEEKLY_LEAGUE_COHORT_SIZE,
  WEEKLY_LEAGUE_MAX_HUMANS_PER_COHORT,
} from "../../../data/casualWeeklyLeagueConfig";
import {
  isWeeklyLeagueBotRevealed,
  planWeeklyLeagueBotRevealSchedule,
  weeklyLeagueMatchingSlotCounts,
} from "../casualWeeklyLeagueBotReveal";
import {
  weeklyLeagueBotXpTarget,
  weeklyLeagueWeekProgress,
} from "../casualWeeklyLeagueBotXp";

describe("weekly league cohort sizing", () => {
  it("max humans + bot pool = cohort size", () => {
    expect(WEEKLY_LEAGUE_MAX_HUMANS_PER_COHORT).toBe(15);
    expect(WEEKLY_LEAGUE_BOT_POOL_SIZE).toBe(15);
    expect(WEEKLY_LEAGUE_COHORT_SIZE).toBe(30);
    expect(WEEKLY_LEAGUE_MAX_HUMANS_PER_COHORT + WEEKLY_LEAGUE_BOT_POOL_SIZE).toBe(30);
  });

  it("first human reserves matching slots for future humans", () => {
    const matching = weeklyLeagueMatchingSlotCounts({
      humanCount: 1,
      botRows: Array.from({ length: 15 }, () => ({ revealAt: Date.now() + 9999 })),
      now: Date.now(),
    });
    expect(matching.matchingHumans).toBe(14);
    expect(matching.matchingBots).toBe(15);
    expect(matching.total).toBe(29);
  });
});

describe("weekly league bot reveal schedule", () => {
  it("plans 15 bots with mixed early and late reveal", () => {
    const startsAt = 1_000_000;
    const humanAnchorAt = startsAt + 3 * 3600_000;
    const plans = planWeeklyLeagueBotRevealSchedule({
      cohortId: "cohort_test_a",
      startsAt,
      humanAnchorAt,
    });
    expect(plans).toHaveLength(WEEKLY_LEAGUE_BOT_POOL_SIZE);
    const now = humanAnchorAt;
    const revealedEarly = plans.filter((p) => p.revealAt <= now).length;
    expect(revealedEarly).toBeGreaterThanOrEqual(5);
    expect(revealedEarly).toBeLessThanOrEqual(10);
    const revealedLate = plans.filter((p) => p.revealAt > now).length;
    expect(revealedEarly + revealedLate).toBe(15);
  });

  it("is deterministic for same cohort", () => {
    const args = {
      cohortId: "cohort_stable",
      startsAt: 0,
      humanAnchorAt: 100_000,
    };
    const a = planWeeklyLeagueBotRevealSchedule(args);
    const b = planWeeklyLeagueBotRevealSchedule(args);
    expect(a).toEqual(b);
  });

  it("isWeeklyLeagueBotRevealed respects revealAt", () => {
    expect(isWeeklyLeagueBotRevealed(1000, 999)).toBe(false);
    expect(isWeeklyLeagueBotRevealed(1000, 1000)).toBe(true);
  });
});

describe("weekly league bot xp curve", () => {
  it("xp rises with week progress and differs by slot", () => {
    const startsAt = 0;
    const endsAt = 7 * 24 * 60 * 60 * 1000;
    const mid = weeklyLeagueWeekProgress(endsAt / 2, startsAt, endsAt);
    const late = weeklyLeagueWeekProgress(endsAt * 0.9, startsAt, endsAt);
    const earlyXp = weeklyLeagueBotXpTarget({
      tierId: "bronze",
      cohortId: "cohort_a",
      slot: 0,
      weekProgress: mid,
    });
    const lateXp = weeklyLeagueBotXpTarget({
      tierId: "bronze",
      cohortId: "cohort_a",
      slot: 0,
      weekProgress: late,
    });
    const otherSlot = weeklyLeagueBotXpTarget({
      tierId: "bronze",
      cohortId: "cohort_a",
      slot: 7,
      weekProgress: late,
    });
    expect(lateXp).toBeGreaterThan(earlyXp);
    expect(otherSlot).not.toBe(lateXp);
  });
});
