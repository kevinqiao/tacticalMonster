import { describe, expect, it } from "vitest";

import { weeklyPeriodKey } from "../../../utils/casualTaskPeriod";
import {
  COIN_TABLE_BONUS_MIN_GAMES,
  coinTableBonusActive,
  coinTableBonusView,
  resolveCoinGamesThisWeek,
} from "../coinWeekProgress";

describe("coinWeekProgress", () => {
  it("resolveCoinGamesThisWeek returns 0 when week key mismatches", () => {
    const now = Date.parse("2026-08-14T12:00:00Z");
    expect(
      resolveCoinGamesThisWeek({ coinWeekKey: "w:2020-01-01", coinGamesThisWeek: 7 }, now)
    ).toBe(0);
  });

  it("resolveCoinGamesThisWeek returns stored count for matching week", () => {
    const now = Date.parse("2026-08-14T12:00:00Z");
    const weekKey = weeklyPeriodKey(now);
    expect(resolveCoinGamesThisWeek({ coinWeekKey: weekKey, coinGamesThisWeek: 2 }, now)).toBe(2);
  });

  it("coinTableBonusActive crosses at min games", () => {
    expect(coinTableBonusActive(COIN_TABLE_BONUS_MIN_GAMES - 1)).toBe(false);
    expect(coinTableBonusActive(COIN_TABLE_BONUS_MIN_GAMES)).toBe(true);
  });

  it("coinTableBonusView exposes progress fields", () => {
    const view = coinTableBonusView(1);
    expect(view.gamesThisWeek).toBe(1);
    expect(view.remaining).toBe(2);
    expect(view.active).toBe(false);
    expect(view.passiveMultiplier).toBe(1.2);
  });
});
