import { describe, expect, it } from "vitest";

import {
  clampTargetRankToBand,
  rankBandFromScore,
  resolveEffectiveRank,
  scaleRankForMaxPlayers,
} from "../singleHumanRankBand";

const BB_QUANTILES = {
  p10: 32,
  p25: 64,
  p30: 96,
  p33: 96,
  p50: 152,
  p66: 240,
  p70: 264,
  p75: 267,
  p90: 280,
};

describe("singleHumanRankBand", () => {
  it("scales reference ranks for maxPlayers=3", () => {
    expect(scaleRankForMaxPlayers(1, 3)).toBe(1);
    expect(scaleRankForMaxPlayers(3, 3)).toBe(2);
    expect(scaleRankForMaxPlayers(5, 3)).toBe(3);
  });

  it("maps score tiers for maxPlayers=5", () => {
    expect(rankBandFromScore(300, BB_QUANTILES, 5)).toEqual({
      ceilRank: 1,
      floorRank: 1,
    });
    expect(rankBandFromScore(200, BB_QUANTILES, 5)).toEqual({
      ceilRank: 2,
      floorRank: 4,
    });
    expect(rankBandFromScore(120, BB_QUANTILES, 5)).toEqual({
      ceilRank: 3,
      floorRank: 5,
    });
  });

  it("scales bands for maxPlayers=3", () => {
    expect(rankBandFromScore(200, BB_QUANTILES, 3)).toEqual({
      ceilRank: 2,
      floorRank: 3,
    });
    expect(rankBandFromScore(120, BB_QUANTILES, 3)).toEqual({
      ceilRank: 2,
      floorRank: 3,
    });
  });

  it("resolveEffectiveRank only clamps target into rankBand (v3)", () => {
    const band = rankBandFromScore(200, BB_QUANTILES, 5);
    expect(
      resolveEffectiveRank({
        targetRank: 1,
        band,
        maxPlayers: 5,
      })
    ).toBe(2);
    expect(
      clampTargetRankToBand(1, rankBandFromScore(300, BB_QUANTILES, 5), 5)
    ).toBe(1);
  });
});
