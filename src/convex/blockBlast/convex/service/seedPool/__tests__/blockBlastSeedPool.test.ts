import { describe, expect, it } from "vitest";
import { applyOp, buildInitialState, openingMoveCount } from "../blockBlastOpCodec";
import {
  assignTiers,
  buildTierIndex,
  computeDistributionMetrics,
  computePlayerEaseScore,
  computeScoreHistogram,
  isCollapsedDistribution,
  layoutFingerprint,
  PERFORMANCE_BAND_HIGH_CUMULATIVE_FRACTION,
  PERFORMANCE_BAND_LOW_FRACTION,
  percentileForBand,
  selectTopCandidatesByExperienceScore,
  selectTopCandidatesByPlayerEase,
} from "../blockBlastSeedDifficulty";
import {
  DEFAULT_PLAYER_FRIENDLY_OPTIONS,
  processOneSeed,
} from "../blockBlastSeedPoolRunner";
import { quickScreenSeed, rejectPlayerFriendlyMetrics } from "../blockBlastSeedQuickScreen";
import { verifyRollout } from "../blockBlastSeedPoolReplayVerify";
import {
  computePercentileOnSeed,
  findNearestRollout,
  resolvePlayerSeedScore,
  resolvePlayerSeedScoreFromSummaries,
  resolveScoreBandFromPercentile,
  resolveScoreBandFromThresholds,
} from "../blockBlastSeedScoreLookup";
import { simulateRolloutsForSeedEntry } from "../blockBlastSeedPoolLazy";
import { simulateRollout, simulateSeedRollouts } from "../blockBlastSeedSimulator";
import { computeBlockBlastTotalScore } from "../blockBlastScoring";
import type { RolloutSummary } from "../blockBlastRecordedOpTypes";

function mockMetrics(
  overrides: Partial<ReturnType<typeof computeDistributionMetrics>> = {}
): ReturnType<typeof computeDistributionMetrics> {
  return {
    rolloutCount: 8,
    scoreMin: 0,
    scoreP50: 100,
    scoreP90: 100,
    scoreMax: 100,
    scoreQuantiles: {
      p10: 0,
      p25: 0,
      p30: 0,
      p33: 0,
      p50: 100,
      p66: 100,
      p70: 100,
      p75: 100,
      p90: 100,
    },
    scoreHistogram: { "<0": 0, "0-49": 0, "50-149": 8, "150-349": 0, "350-699": 0, "700+": 0 },
    bandThresholds: { lowMax: 0, midMax: 100 },
    completedRate: 0,
    stuckRate: 1,
    exitedRate: 0,
    timeUpRate: 0,
    completedCount: 0,
    hasAnyCompleted: false,
    layoutOutcome: "mixed",
    openingMoveCount: 5,
    scoreSpread: 100,
    playerEaseScore: 80,
    layoutFingerprint: "fp:test",
    policyVersion: "block-blast-stochastic-v6",
    matchTimeLimitSec: 300,
    mediumBurstRate: 0.4,
    jackpotRate: 0.1,
    lateGameReachRate: 0.5,
    nearDeathRecoverRate: 0.15,
    lateBurstRate: 0.25,
    earlyClearRate: 0.7,
    scoreAt60P50: 15,
    scoreAt150P50: 40,
    scoreAt240P50: 70,
    softPPassCount: 4,
    experienceScore: 0.45,
    ...overrides,
  };
}

describe("blockBlastSeedPool", () => {
  it("layoutFingerprint is stable for same seed", () => {
    expect(layoutFingerprint("blockblast-pool:v1:fp-a")).toBe(
      layoutFingerprint("blockblast-pool:v1:fp-a")
    );
  });

  it("layoutFingerprint differs for different seeds", () => {
    expect(layoutFingerprint("blockblast-pool:v1:fp-b")).not.toBe(
      layoutFingerprint("blockblast-pool:v1:fp-c")
    );
  });

  it("assignTiers splits 10 candidates 3/4/3", () => {
    const candidates = Array.from({ length: 10 }, (_, i) => ({
      seedId: `blockblast-pool:v1:${i}`,
      poolVersion: "v1",
      difficultyScore: 100 - i,
      metrics: mockMetrics({ scoreP50: 100 - i, layoutFingerprint: `fp:${i}` }),
      rolloutSummaries: [],
    }));
    const tiered = assignTiers(candidates, { easy: 0.3, medium: 0.4 });
    expect(tiered.filter((e) => e.tier === "easy")).toHaveLength(3);
    expect(tiered.filter((e) => e.tier === "medium")).toHaveLength(4);
    expect(tiered.filter((e) => e.tier === "hard")).toHaveLength(3);
  });

  it("simulateSeedRollouts replays all rollouts and verifies", () => {
    const seedId = "blockblast-pool:v1:replay-0";
    const { rollouts } = simulateSeedRollouts(seedId, 8, { keepDuplicateRollouts: true });
    expect(rollouts).toHaveLength(8);
    for (const rollout of rollouts) {
      const verify = verifyRollout(seedId, rollout);
      expect(verify.ok, verify.ok ? "" : (verify as { reason: string }).reason).toBe(true);
    }
  });

  it("bot reaches positive score with a valid terminal reason", () => {
    const r = simulateRollout("blockblast-pool:v1:21", 0);
    expect(r.policyVersion).toBe("block-blast-stochastic-v6");
    expect(r.finalScore).toBeGreaterThan(0);
    expect(["stuck", "time_up", "exited", "completed"]).toContain(r.terminalReason);
    expect(r.replayPacingMs?.length).toBe(r.ops.length);
    expect(r.experience).toBeDefined();
    expect(typeof r.experience?.maxStepClearedCells).toBe("number");
  });

  it("rollouts vary across seeds (distribution spreads out)", () => {
    let sawSpread = false;
    for (let s = 0; s < 12 && !sawSpread; s++) {
      const { metrics } = simulateSeedRollouts(`blockblast-pool:v1:${s}`, 8, {
        keepDuplicateRollouts: true,
      });
      if (metrics.scoreSpread > 0) sawSpread = true;
    }
    expect(sawSpread).toBe(true);
  });

  it("simulateRollout is deterministic for same seedId and rolloutIndex", () => {
    const a = simulateRollout("blockblast-pool:v1:99", 3);
    const b = simulateRollout("blockblast-pool:v1:99", 3);
    expect(a.finalScore).toBe(b.finalScore);
    expect(a.ops).toEqual(b.ops);
    expect(a.replayPacingMs).toEqual(b.replayPacingMs);
  });

  it("every rollout verifies for a sample of seeds", () => {
    for (let i = 0; i < 6; i++) {
      const seedId = `blockblast-pool:v1:verify-${i}`;
      const { allRollouts } = simulateSeedRollouts(seedId, 4, { keepDuplicateRollouts: true });
      for (const rollout of allRollouts) {
        const verify = verifyRollout(seedId, rollout);
        expect(verify.ok, verify.ok ? "" : JSON.stringify(verify)).toBe(true);
      }
    }
  }, 30_000);

  it("computeDistributionMetrics p50 equals quantiles.p50", () => {
    const { metrics } = simulateSeedRollouts("blockblast-pool:v1:metrics-0", 8);
    expect(metrics.rolloutCount).toBe(8);
    expect(metrics.scoreP50).toBe(metrics.scoreQuantiles.p50);
  });

  it("computeScoreHistogram buckets sum to score count", () => {
    const hist = computeScoreHistogram([10, 60, 200, 400, 800]);
    expect(Object.values(hist).reduce((a, b) => a + b, 0)).toBe(5);
    expect(hist["0-49"]).toBe(1);
    expect(hist["50-149"]).toBe(1);
    expect(hist["150-349"]).toBe(1);
    expect(hist["350-699"]).toBe(1);
    expect(hist["700+"]).toBe(1);
  });

  it("computeDistributionMetrics includes bandThresholds and quantiles", () => {
    const { rollouts, metrics } = simulateSeedRollouts("blockblast-pool:v1:metrics-bands", 8, {
      keepDuplicateRollouts: true,
    });
    const sorted = rollouts.map((r) => r.finalScore).sort((a, b) => a - b);
    expect(metrics.bandThresholds.lowMax).toBe(
      percentileForBand(sorted, PERFORMANCE_BAND_LOW_FRACTION)
    );
    expect(metrics.bandThresholds.midMax).toBe(
      percentileForBand(sorted, PERFORMANCE_BAND_HIGH_CUMULATIVE_FRACTION)
    );
    expect(Object.values(metrics.scoreHistogram).reduce((a, b) => a + b, 0)).toBe(8);
    expect(metrics.scoreSpread).toBe(metrics.scoreMax - metrics.scoreMin);
    expect(typeof metrics.playerEaseScore).toBe("number");
    expect(typeof metrics.experienceScore).toBe("number");
    expect(typeof metrics.mediumBurstRate).toBe("number");
    expect(typeof metrics.lateGameReachRate).toBe("number");
  });

  it("buildTierIndex groups entries by layout tier", () => {
    const entries = assignTiers(
      Array.from({ length: 6 }, (_, i) => ({
        seedId: `blockblast-pool:v1:${i}`,
        poolVersion: "v1",
        difficultyScore: 100 - i,
        metrics: mockMetrics({ layoutFingerprint: `fp:${i}` }),
        rolloutSummaries: [],
      })),
      { easy: 0.33, medium: 0.34 }
    );
    const tierIndex = buildTierIndex(entries, "v1", 8, "2026-01-01T00:00:00.000Z");
    expect(
      tierIndex.tiers.easy.length + tierIndex.tiers.medium.length + tierIndex.tiers.hard.length
    ).toBe(6);
    for (const tier of ["easy", "medium", "hard"] as const) {
      for (const row of tierIndex.tiers[tier]) {
        expect(row.layoutTier).toBe(tier);
        expect(row.scoreDistribution.bandThresholds).toBeDefined();
        expect(row.playerEaseScore).toBeDefined();
      }
    }
  });

  it("openingMoveCount is positive on fresh seeds", () => {
    let withMoves = 0;
    for (let i = 0; i < 20; i++) {
      const state = buildInitialState(`blockblast-pool:v1:opening-${i}`);
      if (openingMoveCount(state) >= 1) withMoves += 1;
    }
    expect(withMoves).toBe(20);
  });

  it("isCollapsedDistribution detects single-bucket dominance", () => {
    const hist = { "<0": 0, "0-49": 0, "50-149": 190, "150-349": 10, "350-699": 0, "700+": 0 };
    expect(isCollapsedDistribution(hist, 200)).toBe(true);
    const spread = { "<0": 0, "0-49": 40, "50-149": 60, "150-349": 50, "350-699": 30, "700+": 20 };
    expect(isCollapsedDistribution(spread, 200)).toBe(false);
  });

  it("computePlayerEaseScore penalizes likely_dead", () => {
    const base = mockMetrics({ openingMoveCount: 2, scoreMin: 0, scoreMax: 20 });
    const dead = computePlayerEaseScore({ ...base, layoutOutcome: "likely_dead" });
    const mixed = computePlayerEaseScore({ ...base, layoutOutcome: "mixed" });
    expect(dead).toBeLessThan(mixed);
  });

  it("selectTopCandidatesByPlayerEase keeps highest ease scores", () => {
    const candidates = [
      {
        seedId: "a",
        poolVersion: "v1",
        difficultyScore: 80,
        metrics: mockMetrics({ playerEaseScore: 10 }),
        rolloutSummaries: [],
      },
      {
        seedId: "b",
        poolVersion: "v1",
        difficultyScore: 90,
        metrics: mockMetrics({ playerEaseScore: 50 }),
        rolloutSummaries: [],
      },
    ];
    const top = selectTopCandidatesByPlayerEase(candidates, 1);
    expect(top).toHaveLength(1);
    expect(top[0]!.seedId).toBe("b");
  });

  it("selectTopCandidatesByExperienceScore keeps highest experience scores", () => {
    const candidates = [
      {
        seedId: "low",
        poolVersion: "v4",
        difficultyScore: 80,
        metrics: mockMetrics({ experienceScore: 0.1 }),
        rolloutSummaries: [],
      },
      {
        seedId: "high",
        poolVersion: "v4",
        difficultyScore: 90,
        metrics: mockMetrics({ experienceScore: 0.8 }),
        rolloutSummaries: [],
      },
    ];
    const top = selectTopCandidatesByExperienceScore(candidates, 1);
    expect(top[0]!.seedId).toBe("high");
  });
});

describe("blockBlastSeedQuickScreen", () => {
  it("rejects when maxOpeningMoves exceeded", () => {
    const initial = buildInitialState("blockblast-pool:v3:quick-opening-cap");
    const opens = openingMoveCount(initial);
    const result = quickScreenSeed(
      "blockblast-pool:v3:quick-opening-cap",
      {
        ...DEFAULT_PLAYER_FRIENDLY_OPTIONS,
        maxOpeningMoves: Math.max(0, opens - 1),
        quickScreenRollouts: 0,
      },
      300
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.entry.reason).toBe("opening_too_easy");
    }
  });

  it("rejects when minOpeningMoves not met", () => {
    const result = quickScreenSeed(
      "blockblast-pool:v1:quick-reject-opening",
      { ...DEFAULT_PLAYER_FRIENDLY_OPTIONS, minOpeningMoves: 999, quickScreenRollouts: 4 },
      300
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.entry.reason).toBe("no_opening_moves");
    }
  });

  it("rejects when stuckRate exceeds maxStuckRate", () => {
    const reject = rejectPlayerFriendlyMetrics(
      "blockblast-pool:v4:stuck-cap",
      mockMetrics({ stuckRate: 0.95, rolloutCount: 24 }),
      { ...DEFAULT_PLAYER_FRIENDLY_OPTIONS, maxStuckRate: 0.85, kpiProfile: "off" }
    );
    expect(reject?.reason).toBe("stuck_rate_too_high");
  });

  it("passes when stuckRate within maxStuckRate", () => {
    const reject = rejectPlayerFriendlyMetrics(
      "blockblast-pool:v4:stuck-ok",
      mockMetrics({ stuckRate: 0.8, rolloutCount: 24 }),
      { ...DEFAULT_PLAYER_FRIENDLY_OPTIONS, maxStuckRate: 0.85, kpiProfile: "off" }
    );
    expect(reject).toBeNull();
  });

  it("prod kpi rejects low jackpotRate", () => {
    const reject = rejectPlayerFriendlyMetrics(
      "blockblast-pool:v4:jackpot-low",
      mockMetrics({
        jackpotRate: 0.005,
        mediumBurstRate: 0.5,
        lateGameReachRate: 0.5,
        timeUpRate: 0.25,
        stuckRate: 0.7,
        openingMoveCount: 130,
        scoreSpread: 100,
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
      }),
      { ...DEFAULT_PLAYER_FRIENDLY_OPTIONS, kpiProfile: "prod" }
    );
    expect(reject?.reason).toBe("jackpot_rate_too_low");
  });

  it("processOneSeed accepts a playable seed", () => {
    const seen = new Set<string>();
    const r = processOneSeed(
      0,
      {
        poolVersion: "v1",
        rejectDead: false,
        rolloutCount: 8,
        matchSeconds: 300,
        playerFriendly: DEFAULT_PLAYER_FRIENDLY_OPTIONS,
      },
      seen
    );
    expect(r.kind).toBe("accepted");
  });
});

describe("blockBlastSeedScoreLookup", () => {
  function summaries(scores: number[]): RolloutSummary[] {
    return scores.map((finalScore, rolloutIndex) => ({
      rolloutIndex,
      finalScore,
      moves: 10,
      completed: false,
      terminalReason: "stuck" as const,
      elapsedSimSeconds: 100,
      opCount: 10,
    }));
  }

  it("identical scores → top band, percentile 1, nearest rolloutIndex 0", () => {
    const result = resolvePlayerSeedScoreFromSummaries(
      "seed",
      "medium",
      summaries(Array(200).fill(80)),
      80
    );
    expect(result.percentileOnSeed).toBe(1);
    expect(result.scoreBand).toBe("high");
    expect(result.nearestRollout.rolloutIndex).toBe(0);
  });

  it("rank-based bands split bottom 30% / middle 40% / top 30%", () => {
    expect(resolveScoreBandFromPercentile(0.3)).toBe("low");
    expect(resolveScoreBandFromPercentile(0.31)).toBe("mid");
    expect(resolveScoreBandFromPercentile(0.7)).toBe("mid");
    expect(resolveScoreBandFromPercentile(0.71)).toBe("high");
  });

  it("30/40/30 score cut points for bandThresholds reporting", () => {
    const sorted = Array.from({ length: 10 }, (_, i) => i * 10);
    const lowMax = percentileForBand(sorted, PERFORMANCE_BAND_LOW_FRACTION);
    const midMax = percentileForBand(sorted, PERFORMANCE_BAND_HIGH_CUMULATIVE_FRACTION);
    expect(lowMax).toBe(20);
    expect(midMax).toBe(60);
    expect(resolveScoreBandFromThresholds(lowMax, { lowMax, midMax })).toBe("low");
    expect(resolveScoreBandFromThresholds(midMax, { lowMax, midMax })).toBe("mid");
    expect(resolveScoreBandFromThresholds(midMax + 1, { lowMax, midMax })).toBe("high");
  });

  it("nearest rollout picks smaller index on tie", () => {
    const near = findNearestRollout(summaries([84, 86]), 85);
    expect(near.finalScore).toBe(84);
    expect(near.rolloutIndex).toBe(0);
  });

  it("index-only entry resolves player band from metrics without summaries", () => {
    const entry = {
      seedId: "blockblast-pool:v1:21",
      poolVersion: "v1",
      tier: "easy" as const,
      difficultyScore: 200,
      metrics: mockMetrics({
        scoreP50: 200,
        scoreMin: 200,
        scoreMax: 200,
        bandThresholds: { lowMax: 200, midMax: 200 },
      }),
    };
    const result = resolvePlayerSeedScore(entry, 250);
    expect(result.scoreBand).toBe("high");
    expect(result.nearestRollout.finalScore).toBe(200);
  });

  it("simulateRolloutsForSeedEntry regenerates from seedId", () => {
    const entry = {
      seedId: "blockblast-pool:v1:21",
      metrics: mockMetrics({ rolloutCount: 1, matchTimeLimitSec: 300 }),
    };
    const { rolloutSummaries } = simulateRolloutsForSeedEntry(entry, 1);
    expect(rolloutSummaries.length).toBeGreaterThan(0);
    expect(rolloutSummaries[0]!.finalScore).toBeGreaterThanOrEqual(0);
  });

  it("percentileOnSeed matches manual count", () => {
    expect(computePercentileOnSeed([10, 20, 30, 40, 50], 30)).toBe(3 / 5);
  });
});

describe("blockBlastScoring", () => {
  it("total score equals in-game accumulated score", () => {
    expect(computeBlockBlastTotalScore(340)).toBe(340);
    expect(computeBlockBlastTotalScore(0)).toBe(0);
    expect(computeBlockBlastTotalScore(200.7)).toBe(200);
  });
});
