import { describe, expect, it } from "vitest";

import {
  BLOCK_BLAST_BURST_JACKPOT,
  blockBlastBurstBonus,
  computeBlockBlastStepScore,
  computeBlockBlastTotalScore,
  countBlockBlastClearedCells,
} from "../blockBlastScoreModel";

describe("blockBlastScoreModel", () => {
  it("counts cleared cells with row/col intersection deduped", () => {
    expect(countBlockBlastClearedCells([3], [5], 8)).toBe(15);
    expect(countBlockBlastClearedCells([0, 1], [], 8)).toBe(16);
  });

  it("applies aggressive burst tiers on 8×8", () => {
    expect(blockBlastBurstBonus(8, 8)).toBe(0);
    expect(blockBlastBurstBonus(10, 8)).toBe(4);
    expect(blockBlastBurstBonus(15, 8)).toBe(28);
    expect(blockBlastBurstBonus(16, 8)).toBe(32);
    expect(blockBlastBurstBonus(24, 8)).toBe(16 * 6 + BLOCK_BLAST_BURST_JACKPOT);
  });

  it("step score = cells + burst", () => {
    expect(computeBlockBlastStepScore(8, 8)).toBe(8);
    expect(computeBlockBlastStepScore(15, 8)).toBe(43);
    expect(computeBlockBlastStepScore(16, 8)).toBe(48);
    expect(computeBlockBlastStepScore(24, 8)).toBe(200);
  });

  it("total score is accumulated in-game score only", () => {
    expect(computeBlockBlastTotalScore(1234)).toBe(1234);
    expect(computeBlockBlastTotalScore(1234.9)).toBe(1234);
    expect(computeBlockBlastTotalScore(-5)).toBe(0);
  });
});
