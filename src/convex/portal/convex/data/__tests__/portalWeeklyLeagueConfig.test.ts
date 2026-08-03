import { describe, expect, it } from "vitest";

import {
  portalWeeklyLeagueDisplayCohortNo,
  portalWeeklyLeagueProjectedCoins,
  portalWeeklyLeagueZoneForRank,
  PORTAL_COHORT_DISPLAY_CODE_LENGTH,
  PORTAL_WEEKLY_LEAGUE_BOT_POOL_SIZE,
  PORTAL_WEEKLY_LEAGUE_MATCHING_DURATION_MS,
} from "../portalWeeklyLeagueConfig";
import {
  computePortalWeeklyLeagueBotStartPoints,
} from "../../service/weeklyLeague/portalWeeklyLeagueBotPoints";
import {
  PORTAL_WEEKLY_LEAGUE_BOT_REVEALED_NOW_MAX,
  PORTAL_WEEKLY_LEAGUE_BOT_REVEALED_NOW_MIN,
  planPortalWeeklyLeagueInitialBotRevealSchedule,
} from "../../service/weeklyLeague/portalWeeklyLeagueBotReveal";

describe("portalWeeklyLeagueConfig", () => {
  it("zone bands for 30-player cohort", () => {
    expect(portalWeeklyLeagueZoneForRank("bronze", 8)).toBe("promote");
    expect(portalWeeklyLeagueZoneForRank("bronze", 9)).toBe("safe");
    expect(portalWeeklyLeagueZoneForRank("bronze", 22)).toBe("safe");
    expect(portalWeeklyLeagueZoneForRank("bronze", 23)).toBe("demote");
  });

  it("matching window is 5 hours", () => {
    expect(PORTAL_WEEKLY_LEAGUE_MATCHING_DURATION_MS).toBe(5 * 60 * 60 * 1000);
  });

  it("initial bots: 3–10 immediate, rest within 5h", () => {
    expect(PORTAL_WEEKLY_LEAGUE_BOT_REVEALED_NOW_MIN).toBe(3);
    expect(PORTAL_WEEKLY_LEAGUE_BOT_REVEALED_NOW_MAX).toBe(10);
    expect(PORTAL_WEEKLY_LEAGUE_BOT_POOL_SIZE).toBe(15);

    const createdAt = 1_000_000;
    for (const key of ["w|a|bronze|c1", "w|b|silver|c2", "w|c|gold|c3", "w|d|plat|c4"]) {
      const plans = planPortalWeeklyLeagueInitialBotRevealSchedule({
        cohortKey: key,
        createdAt,
      });
      expect(plans).toHaveLength(15);
      const immediate = plans.filter((p) => p.revealAt === createdAt);
      const later = plans.filter((p) => p.revealAt > createdAt);
      expect(immediate.length).toBeGreaterThanOrEqual(3);
      expect(immediate.length).toBeLessThanOrEqual(10);
      expect(immediate.length + later.length).toBe(15);
      for (const p of later) {
        expect(p.revealAt).toBeGreaterThan(createdAt);
        expect(p.revealAt).toBeLessThanOrEqual(
          createdAt + PORTAL_WEEKLY_LEAGUE_MATCHING_DURATION_MS
        );
      }
    }
  });

  it("projected coins scale by tier", () => {
    expect(portalWeeklyLeagueProjectedCoins("bronze", 1)).toBe(200);
    expect(portalWeeklyLeagueProjectedCoins("diamond", 1)).toBe(1200);
    expect(portalWeeklyLeagueProjectedCoins("bronze", 8)).toBe(60);
    expect(portalWeeklyLeagueProjectedCoins("bronze", 22)).toBe(20);
    expect(portalWeeklyLeagueProjectedCoins("bronze", 23)).toBeNull();
  });

  it("bot start points are in 2–20", () => {
    for (let slot = 0; slot < 15; slot++) {
      const p = computePortalWeeklyLeagueBotStartPoints({
        cohortKey: "w|solitaire|bronze|c1",
        slot,
      });
      expect(p).toBeGreaterThanOrEqual(2);
      expect(p).toBeLessThanOrEqual(20);
    }
  });

  it("display cohort code is 8-char alphanumeric with letter and digit", () => {
    const code = portalWeeklyLeagueDisplayCohortNo({
      weekKey: "w:2026-07-01",
      gameType: "solitaire",
      leagueTierId: "bronze",
      cohortIndex: 0,
    });
    expect(code).toHaveLength(PORTAL_COHORT_DISPLAY_CODE_LENGTH);
    expect(code).toMatch(/^[A-Z0-9]+$/);
    expect(code).toMatch(/[A-Z]/);
    expect(code).toMatch(/[0-9]/);
  });
});
