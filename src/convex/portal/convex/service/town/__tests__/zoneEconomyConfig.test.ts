import { describe, expect, it } from "vitest";

import {
  collectablePassiveCoins,
  developCostForSlotIndex,
  passivePerHour,
  prosperityScoreFromSlots,
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
  });

  it("collectablePassiveCoins caps offline hours", () => {
    const twelveHours = collectablePassiveCoins({
      passivePerHourTotal: 10,
      elapsedMs: 12 * 3_600_000,
    });
    const twentyFourHours = collectablePassiveCoins({
      passivePerHourTotal: 10,
      elapsedMs: 24 * 3_600_000,
    });
    expect(twelveHours).toBe(120);
    expect(twentyFourHours).toBe(120);
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
