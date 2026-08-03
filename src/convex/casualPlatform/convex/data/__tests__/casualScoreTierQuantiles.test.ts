import { describe, expect, it } from "vitest";
import {
  buildScoreTierRewardsFromQuantiles,
  findHighestScoreTierReward,
  getTournamentDefinition,
  resolveAsyncScoreTierRewards,
} from "../casualTournamentConfigs";

const REF = {
  p10: 1_000,
  p25: 2_000,
  p30: 2_500,
  p33: 3_000,
  p50: 5_000,
  p66: 7_000,
  p70: 8_000,
  p75: 9_000,
  p90: 11_000,
};

describe("resolveAsyncScoreTierRewards", () => {
  it("builds tiers from seed quantiles at p33/p66/p90", () => {
    const def = getTournamentDefinition("casual_async_a_bb");
    expect(def).toBeTruthy();
    const tiers = resolveAsyncScoreTierRewards(def!, REF);
    expect(tiers).toEqual(
      expect.arrayContaining([
        { minScore: 11_000, coins: 15 },
        { minScore: 7_000, coins: 8 },
        { minScore: 3_000, coins: 3 },
      ])
    );
    expect(findHighestScoreTierReward(tiers, 2_999)).toBeUndefined();
    expect(findHighestScoreTierReward(tiers, 3_000)?.coins).toBe(3);
    expect(findHighestScoreTierReward(tiers, 10_000)?.coins).toBe(8);
    expect(findHighestScoreTierReward(tiers, 11_000)?.coins).toBe(15);
  });

  it("solitaire async uses seed quantiles when static tiers absent", () => {
    const def = getTournamentDefinition("casual_async_a_solitaire");
    expect(def).toBeTruthy();
    expect(def!.rewards.scoreTierRewards).toBeUndefined();
    const tiers = resolveAsyncScoreTierRewards(def!, REF);
    expect(tiers?.map((t) => t.minScore).sort((a, b) => b - a)).toEqual([
      REF.p90,
      REF.p66,
      REF.p33,
    ]);
  });

  it("buildScoreTierRewardsFromQuantiles drops non-positive thresholds", () => {
    const tiers = buildScoreTierRewardsFromQuantiles(
      { ...REF, p33: 0 },
      [{ quantile: "p33", coins: 3 }]
    );
    expect(tiers).toEqual([]);
  });
});
