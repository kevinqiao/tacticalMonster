import { describe, expect, it } from "vitest";
import {
  computeExperienceScore,
  countSoftPPasses,
  evaluateExperienceGates,
  isJackpotBurst,
  isMediumBurst,
  KPI_THRESHOLDS_PROD,
} from "../blockBlastExperienceKpi";
import { computeBlockBlastOnboardingScore } from "../blockBlastSeedDifficulty";
import type { RolloutDistributionMetrics } from "../blockBlastRecordedOpTypes";

function baseMetrics(
  overrides: Partial<RolloutDistributionMetrics> = {}
): RolloutDistributionMetrics {
  return {
    rolloutCount: 24,
    scoreMin: 40,
    scoreP50: 120,
    scoreP90: 200,
    scoreMax: 220,
    scoreQuantiles: {
      p10: 40,
      p25: 50,
      p30: 60,
      p33: 70,
      p50: 120,
      p66: 150,
      p70: 160,
      p75: 180,
      p90: 200,
    },
    scoreHistogram: { "<0": 0, "0-49": 2, "50-149": 10, "150-349": 12, "350-699": 0, "700+": 0 },
    bandThresholds: { lowMax: 60, midMax: 160 },
    completedRate: 0,
    stuckRate: 0.7,
    exitedRate: 0,
    timeUpRate: 0.3,
    completedCount: 0,
    hasAnyCompleted: false,
    layoutOutcome: "mixed",
    openingMoveCount: 130,
    scoreSpread: 180,
    playerEaseScore: 100,
    layoutFingerprint: "fp:test",
    policyVersion: "block-blast-stochastic-v4",
    matchTimeLimitSec: 300,
    mediumBurstRate: 0.4,
    jackpotRate: 0.1,
    lateGameReachRate: 0.5,
    nearDeathRecoverRate: 0.2,
    lateBurstRate: 0.3,
    earlyClearRate: 0.8,
    scoreAt60P50: 20,
    scoreAt150P50: 50,
    scoreAt240P50: 90,
    survivalTimeP25: 80,
    survivalTimeP50: 120,
    survivalTimeP90: 200,
    survivalTimeSpread: 120,
    softPPassCount: 4,
    experienceScore: 0.5,
    onboardingScore: 150,
    ...overrides,
  };
}

describe("blockBlastExperienceKpi", () => {
  it("classifies medium and jackpot bursts on 8×8", () => {
    expect(isMediumBurst(8, 8)).toBe(false);
    expect(isMediumBurst(9, 8)).toBe(true);
    expect(isJackpotBurst(16, 8)).toBe(false);
    expect(isJackpotBurst(17, 8)).toBe(true);
  });

  it("prod hard-rejects low mediumBurstRate", () => {
    const { hardRejects } = evaluateExperienceGates(
      baseMetrics({ mediumBurstRate: 0.05 }),
      "prod"
    );
    expect(hardRejects.some((g) => g.id === "G7")).toBe(true);
  });

  it("prod G2 skipped when maxStuckRate override is 0", () => {
    const m = baseMetrics({
      stuckRate: 1,
      timeUpRate: 0.1,
      jackpotRate: 0.02,
      mediumBurstRate: 0.4,
      lateGameReachRate: 0.5,
    });
    const withG2 = evaluateExperienceGates(m, "prod");
    expect(withG2.hardRejects.some((g) => g.id === "G2")).toBe(true);

    const skipped = evaluateExperienceGates(m, "prod", { maxStuckRate: 0 });
    expect(skipped.hardRejects.some((g) => g.id === "G2")).toBe(false);
  });

  it("probe only warns on low mediumBurstRate", () => {
    const { hardRejects, warnings } = evaluateExperienceGates(
      baseMetrics({ mediumBurstRate: 0.05 }),
      "probe"
    );
    expect(hardRejects.some((g) => g.id === "G7")).toBe(false);
    expect(warnings.some((g) => g.id === "G7")).toBe(true);
  });

  it("probe hard-rejects extreme opening", () => {
    const { hardRejects } = evaluateExperienceGates(
      baseMetrics({ openingMoveCount: 40 }),
      "probe"
    );
    expect(hardRejects.some((g) => g.id === "G3hard")).toBe(true);
  });

  it("passes prod gates on healthy metrics", () => {
    const m = baseMetrics();
    const { hardRejects } = evaluateExperienceGates(m, "prod");
    expect(hardRejects).toHaveLength(0);
    expect(m.timeUpRate).toBeGreaterThanOrEqual(KPI_THRESHOLDS_PROD.minTimeUpRate);
  });

  it("computes experience score and soft P passes", () => {
    const m = baseMetrics();
    const soft = countSoftPPasses(m, "prod");
    expect(soft).toBeGreaterThan(0);
    const score = computeExperienceScore({ ...m, softPPassCount: soft }, "prod");
    expect(score).toBeGreaterThan(0);
    expect(computeExperienceScore(baseMetrics({ layoutOutcome: "likely_dead" }))).toBeLessThan(0);
  });

  it("onboardingScore prefers high survivalP25 over boom-bust high P50", () => {
    const base = {
      experienceScore: 1,
      earlyClearRate: 1,
      matchTimeLimitSec: 300,
      scoreMin: 48,
    };
    const stableEarly = computeBlockBlastOnboardingScore({
      ...base,
      survivalTimeP25: 48,
      survivalTimeP50: 82,
      survivalTimeSpread: 62,
    });
    const boomBust = computeBlockBlastOnboardingScore({
      ...base,
      survivalTimeP25: 38,
      survivalTimeP50: 103,
      survivalTimeSpread: 110,
      scoreMin: 8,
    });
    const earlyDeath = computeBlockBlastOnboardingScore({
      ...base,
      survivalTimeP25: 30,
      survivalTimeP50: 112,
      survivalTimeSpread: 123,
      scoreMin: 32,
    });
    expect(stableEarly).toBeGreaterThan(boomBust);
    expect(stableEarly).toBeGreaterThan(earlyDeath);
  });
});
