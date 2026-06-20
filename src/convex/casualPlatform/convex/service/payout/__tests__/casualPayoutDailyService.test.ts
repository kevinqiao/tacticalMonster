import { describe, expect, it } from "vitest";
import { DAILY_P75_COINS_SOFT_CAP } from "../../../data/casualSeasonEconomyConstants";
import { capP75DailyCoins, buildDailyGrowthBucketRow } from "../casualPayoutDailyService";

describe("capP75DailyCoins", () => {
  it("grants full amount under cap", () => {
    expect(capP75DailyCoins(48, 0)).toBe(48);
    expect(capP75DailyCoins(8, 40)).toBe(8);
  });

  it("clips at daily soft cap", () => {
    expect(capP75DailyCoins(48, 160, DAILY_P75_COINS_SOFT_CAP)).toBe(40);
    expect(capP75DailyCoins(48, 200, DAILY_P75_COINS_SOFT_CAP)).toBe(0);
  });
});

describe("buildDailyGrowthBucketRow", () => {
  it("season spotlight skips ordinal decay", () => {
    const row = buildDailyGrowthBucketRow("season_challenge", 5);
    expect(row.xpOrdinalDecayEnabled).toBe(false);
    expect(row.nextXpDecayMultiplier).toBe(1);
    expect(row.fullXpSlotsUsed).toBe(0);
  });

  it("async decay after three full games", () => {
    expect(buildDailyGrowthBucketRow("async", 2).nextXpDecayMultiplier).toBe(1);
    expect(buildDailyGrowthBucketRow("async", 3).nextXpDecayMultiplier).toBe(0.75);
  });

  it("p75 includes coin cap fields", () => {
    const row = buildDailyGrowthBucketRow("solo_p75", 1, 120);
    expect(row.coinsGrantedToday).toBe(120);
    expect(row.coinsDailyCap).toBe(DAILY_P75_COINS_SOFT_CAP);
  });
});
