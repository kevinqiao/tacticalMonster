import { describe, expect, it } from "vitest";

import {
  portalWeeklyLeagueDisplayCohortNo,
  portalWeeklyLeagueProjectedCoins,
  portalWeeklyLeagueZoneForRank,
  PORTAL_COHORT_DISPLAY_CODE_LENGTH,
} from "../portalWeeklyLeagueConfig";

describe("portalWeeklyLeagueConfig", () => {
  it("zone bands for 50-player cohort", () => {
    expect(portalWeeklyLeagueZoneForRank("bronze", 10)).toBe("promote");
    expect(portalWeeklyLeagueZoneForRank("bronze", 11)).toBe("safe");
    expect(portalWeeklyLeagueZoneForRank("bronze", 41)).toBe("demote");
  });

  it("projected coins scale by tier", () => {
    expect(portalWeeklyLeagueProjectedCoins("bronze", 1)).toBe(200);
    expect(portalWeeklyLeagueProjectedCoins("diamond", 1)).toBe(1200);
    expect(portalWeeklyLeagueProjectedCoins("bronze", 45)).toBeNull();
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
