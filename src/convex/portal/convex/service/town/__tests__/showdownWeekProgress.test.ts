import { describe, expect, it } from "vitest";

import { weeklyPeriodKey } from "../../../utils/casualTaskPeriod";
import {
  entertainmentBonusActive,
  entertainmentBonusView,
  resolveShowdownGamesThisWeek,
  SHOWDOWN_BONUS_MIN_GAMES,
} from "../showdownWeekProgress";

describe("showdownWeekProgress", () => {
  it("resolveShowdownGamesThisWeek returns 0 when week key mismatches", () => {
    const now = Date.parse("2026-08-14T12:00:00Z");
    expect(
      resolveShowdownGamesThisWeek(
        { showdownWeekKey: "w:2020-01-01", showdownGamesThisWeek: 7 },
        now
      )
    ).toBe(0);
  });

  it("resolveShowdownGamesThisWeek returns stored count for matching week", () => {
    const now = Date.parse("2026-08-14T12:00:00Z");
    const weekKey = weeklyPeriodKey(now);
    expect(
      resolveShowdownGamesThisWeek({ showdownWeekKey: weekKey, showdownGamesThisWeek: 3 }, now)
    ).toBe(3);
  });

  it("entertainmentBonusActive crosses at min games", () => {
    expect(entertainmentBonusActive(SHOWDOWN_BONUS_MIN_GAMES - 1)).toBe(false);
    expect(entertainmentBonusActive(SHOWDOWN_BONUS_MIN_GAMES)).toBe(true);
  });

  it("entertainmentBonusView exposes progress fields", () => {
    const view = entertainmentBonusView(3);
    expect(view.gamesThisWeek).toBe(3);
    expect(view.remaining).toBe(2);
    expect(view.active).toBe(false);
    expect(view.passiveMultiplier).toBe(1.25);
  });
});
