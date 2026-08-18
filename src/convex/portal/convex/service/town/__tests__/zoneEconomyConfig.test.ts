import { describe, expect, it } from "vitest";

import {
  collectablePassiveCoins,
  developCostForSlotIndex,
  levyCycleMs,
  passivePerHour,
  prosperityScoreFromSlots,
  townLevyPayout,
  townLevyTick,
  upgradeCost,
  ZONE_GLOBAL,
} from "../zoneEconomyConfig";

describe("zoneEconomyConfig", () => {
  it("developCost escalates by slot index", () => {
    expect(developCostForSlotIndex(1)).toBe(150);
    expect(developCostForSlotIndex(2)).toBe(Math.round(150 * 1.45 ** 1));
    expect(developCostForSlotIndex(3)).toBe(Math.round(150 * 1.45 ** 2));
  });

  it("upgradeCost scales with level and zone type base", () => {
    expect(upgradeCost("commercial", 1)).toBe(Math.round(80 * ZONE_GLOBAL.upgradeExponent ** 1));
    expect(upgradeCost("civic", 1)).toBe(0);
  });

  it("passivePerHour applies district bonus and showdown multiplier", () => {
    const base = passivePerHour({
      zoneType: "commercial",
      level: 1,
      districtId: "D0",
    });
    expect(base).toBe(1.2);

    const d1 = passivePerHour({
      zoneType: "commercial",
      level: 2,
      districtId: "D1",
    });
    expect(d1).toBeGreaterThan(base);

    const boosted = passivePerHour({
      zoneType: "entertainment",
      level: 1,
      districtId: "D0",
      showdownGamesThisWeek: 5,
    });
    const plain = passivePerHour({
      zoneType: "entertainment",
      level: 1,
      districtId: "D0",
      showdownGamesThisWeek: 4,
    });
    expect(boosted).toBeGreaterThan(plain);

    const financeBoosted = passivePerHour({
      zoneType: "commercial",
      level: 1,
      districtId: "D0",
      coinGamesThisWeek: 3,
    });
    expect(financeBoosted).toBe(1.44);
  });

  it("collectablePassiveCoins drips until 8h then freezes", () => {
    const fourHours = collectablePassiveCoins({
      passivePerHourTotal: 10,
      elapsedMs: 4 * 3_600_000,
    });
    const eightHours = collectablePassiveCoins({
      passivePerHourTotal: 10,
      elapsedMs: 8 * 3_600_000,
    });
    const twentyFourHours = collectablePassiveCoins({
      passivePerHourTotal: 10,
      elapsedMs: 24 * 3_600_000,
    });
    expect(fourHours).toBe(40);
    expect(eightHours).toBe(80);
    expect(twentyFourHours).toBe(80);
    expect(townLevyPayout(1.2)).toBe(9);
    expect(ZONE_GLOBAL.levyCycleHours).toBe(8);
  });

  it("townLevyTick drips mid-cycle and stops when full", () => {
    const startedAt = 1_000_000;
    const filling = townLevyTick({
      passivePerHourTotal: 2,
      startedAt,
      nowMs: startedAt + 3 * 3_600_000,
    });
    expect(filling.collectable).toBe(6);
    expect(filling.payout).toBe(16);
    expect(filling.dripping).toBe(true);
    expect(filling.remainingMs).toBe(5 * 3_600_000);

    const full = townLevyTick({
      passivePerHourTotal: 2,
      startedAt,
      nowMs: startedAt + levyCycleMs() + 3_600_000,
    });
    expect(full.collectable).toBe(16);
    expect(full.dripping).toBe(false);
    expect(full.remainingMs).toBe(0);
    expect(full.payout).toBe(16);
  });

  it("prosperityScoreFromSlots caps at 100", () => {
    const score = prosperityScoreFromSlots(
      [
        { zoneType: "tourism", level: 5, districtId: "D0" },
        { zoneType: "tourism", level: 5, districtId: "D0" },
        { zoneType: "tourism", level: 5, districtId: "D0" },
        { zoneType: "tourism", level: 5, districtId: "D0" },
      ],
      "D0"
    );
    expect(score).toBeLessThanOrEqual(100);
    expect(score).toBeGreaterThan(0);
  });
});
