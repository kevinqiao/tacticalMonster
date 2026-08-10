import { describe, expect, it } from "vitest";
import { personaForRollout } from "../solitaireHumanPersonas";
import { applyOp, buildDealtState, openingMoveCount } from "../solitaireOpCodec";
import {
  assignTiers,
  buildTierIndex,
  computeDistributionMetrics,
  computePlayerEaseScore,
  computeScoreHistogram,
  computeSolitaireOnboardingScore,
  isCollapsedDistribution,
  layoutFingerprint,
  PERFORMANCE_BAND_HIGH_CUMULATIVE_FRACTION,
  PERFORMANCE_BAND_LOW_FRACTION,
  percentileForBand,
  selectTopCandidatesByPlayerEase,
  withClearEaseScore,
} from "../solitaireSeedDifficulty";
import {
  DEFAULT_PLAYER_FRIENDLY_OPTIONS,
  processOneSeed,
} from "../solitaireSeedPoolRunner";
import {
  quickScreenSeed,
  rejectPlayerFriendlyMetrics,
} from "../solitaireSeedQuickScreen";
import { verifyRollout } from "../solitaireSeedPoolReplayVerify";
import {
  computePercentileOnSeed,
  findNearestRollout,
  resolveScoreBandFromPercentile,
  resolveScoreBandFromThresholds,
  resolvePlayerSeedScore,
  resolvePlayerSeedScore,
  resolvePlayerSeedScoreFromSummaries,
} from "../solitaireSeedScoreLookup";
import { simulateRolloutsForSeedEntry } from "../solitaireSeedPoolLazy";
import { simulateRollout, simulateSeedRollouts } from "../solitaireSeedSimulator";
import {
  buildSolitaireCashGameReport,
  computeSolitaireCashTimeBonus,
  computeSolitaireCashTotalScore,
  scoreDeltaForDraw,
  scoreDeltaForMove,
  scoreDeltaForRecycle,
  SOLITAIRE_CASH_FOUNDATION_TO_TABLEAU,
  SOLITAIRE_CASH_RECYCLE_SCORE,
  SOLITAIRE_CASH_TABLEAU_TO_FOUNDATION,
  SOLITAIRE_CASH_WASTE_TO_FOUNDATION,
  SOLITAIRE_CASH_WASTE_TO_TABLEAU,
} from "../solitaireScoring";
import {
  createSimTimeContext,
  DEFAULT_MATCH_TIME_LIMIT_SEC,
  replayOpsWithTimeLimit,
  simCostForOp,
} from "../solitaireSimTime";
import {
  createStochasticPolicyContext,
  maxConsecutiveFoundationOps,
  pickNextOp,
} from "../solitaireStochasticHumanPolicy";
import type { RolloutSummary } from "../solitaireRecordedOpTypes";

function mockMetrics(overrides: Partial<ReturnType<typeof computeDistributionMetrics>> = {}) {
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
    scoreHistogram: { "0-499": 0, "500-999": 0, "1000-1999": 0, "2000-3999": 0, "4000+": 8 },
    bandThresholds: { lowMax: 0, midMax: 100 },
    completedRate: 0,
    stuckRate: 1,
    exitedRate: 0,
    timeUpRate: 0,
    completedCount: 0,
    hasAnyCompleted: false,
    layoutOutcome: "mixed" as const,
    openingMoveCount: 5,
    scoreSpread: 100,
    playerEaseScore: 80,
    clearEaseScore: 0,
    onboardingScore: 0,
    foundationCardsP25: 4,
    foundationCardsP50: 8,
    foundationCardsP90: 16,
    timeToFirstFoundationP50: 40,
    foundationReachRate: 1,
    layoutFingerprint: "fp:test",
    policyVersion: "human-stochastic-v6" as const,
    matchTimeLimitSec: 300,
    ...overrides,
  };
}
describe("solitaireSeedPool v2", () => {
  it("layoutFingerprint is stable for same seed", () => {
    const a = buildDealtState("solitaire-pool:v2:test-fp-a");
    const b = buildDealtState("solitaire-pool:v2:test-fp-a");
    expect(layoutFingerprint(a.cards)).toBe(layoutFingerprint(b.cards));
  });

  it("layoutFingerprint differs for different seeds", () => {
    const a = buildDealtState("solitaire-pool:v2:test-fp-b");
    const b = buildDealtState("solitaire-pool:v2:test-fp-c");
    expect(layoutFingerprint(a.cards)).not.toBe(layoutFingerprint(b.cards));
  });

  it("assignTiers splits 10 candidates 3/4/3", () => {
    const candidates = Array.from({ length: 10 }, (_, i) => ({
      seedId: `solitaire-pool:v2:${i}`,
      poolVersion: "v2",
      difficultyScore: 100 - i,
      metrics: mockMetrics({
        scoreP50: 100 - i,
        scoreP90: 100 - i,
        scoreMax: 100 - i,
        layoutFingerprint: `fp:${i}`,
      }),
      rolloutSummaries: [],
    }));
    const tiered = assignTiers(candidates, { easy: 0.3, medium: 0.4 });
    expect(tiered.filter((e) => e.tier === "easy")).toHaveLength(3);
    expect(tiered.filter((e) => e.tier === "medium")).toHaveLength(4);
    expect(tiered.filter((e) => e.tier === "hard")).toHaveLength(3);
  });

  it("simulateSeedRollouts replays all rollouts with time fields", () => {
    const seedId = "solitaire-pool:v2:test-replay-0";
    const { rollouts } = simulateSeedRollouts(seedId, 8, {
      keepDuplicateRollouts: true,
    });
    expect(rollouts).toHaveLength(8);
    for (const rollout of rollouts) {
      const verify = verifyRollout(seedId, rollout);
      expect(verify.ok, verify.ok ? "" : (verify as { reason: string }).reason).toBe(true);
    }
  });

  it("human-stochastic v4 reaches Cash-scale positive totals on playable seeds", () => {
    const r = simulateRollout("solitaire-pool:v2:21", 0);
    expect(r.policyVersion).toBe("human-stochastic-v6");
    expect(r.finalScore).toBeGreaterThan(200);
    expect(["exited", "time_up", "completed"]).toContain(r.terminalReason);
    expect(r.replayPacingMs?.length).toBe(r.ops.length);
  });

  it("v4 rollouts vary by rolloutIndex (not fully collapsed on probe seed)", () => {
    const { rollouts, metrics, rolloutsCollapsed } = simulateSeedRollouts(
      "solitaire-pool:v2:21",
      8,
      { keepDuplicateRollouts: true }
    );
    expect(rollouts).toHaveLength(8);
    expect(rolloutsCollapsed).toBe(false);
    expect(metrics.scoreSpread).toBeGreaterThan(0);
  });

  it("v4 caps consecutive foundation ops per persona", () => {
    const { rollouts } = simulateSeedRollouts("solitaire-pool:v2:328", 12, {
      keepDuplicateRollouts: true,
    });
    for (const r of rollouts) {
      expect(maxConsecutiveFoundationOps(r.ops)).toBeLessThanOrEqual(3);
    }
  });

  it(
    "every rollout verifies for a sample of seeds",
    () => {
      for (let i = 0; i < 6; i++) {
        const seedId = `solitaire-pool:v2:regen-verify-${i}`;
        const { allRollouts } = simulateSeedRollouts(seedId, 4, {
          keepDuplicateRollouts: true,
        });
        for (const rollout of allRollouts) {
          const verify = verifyRollout(seedId, rollout);
          expect(verify.ok, verify.ok ? "" : JSON.stringify(verify)).toBe(true);
        }
      }
    },
    30_000
  );

  it("simulateRollout is deterministic for same seedId and rolloutIndex", () => {
    const a = simulateRollout("solitaire-pool:v2:99", 3);
    const b = simulateRollout("solitaire-pool:v2:99", 3);
    expect(a.finalScore).toBe(b.finalScore);
    expect(a.ops).toEqual(b.ops);
    expect(a.replayPacingMs).toEqual(b.replayPacingMs);
  });

  it("computeDistributionMetrics p50 is correct", () => {
    const seedId = "solitaire-pool:v2:test-metrics-0";
    const { metrics } = simulateSeedRollouts(seedId, 8);
    expect(metrics.rolloutCount).toBe(8);
    expect(metrics.scoreP50).toBe(metrics.scoreQuantiles.p50);
  });

  it("replayOpsWithTimeLimit stops at 300s boundary", () => {
    const seedId = "solitaire-pool:v2:test-time-0";
    const rollout = simulateRollout(seedId, 0, { matchSeconds: 300 });
    if (rollout.terminalReason !== "time_up") {
      return;
    }
    const state = buildDealtState(seedId);
    const ctx = createStochasticPolicyContext(seedId, 0);
    for (const op of rollout.ops) {
      applyOp(state, op);
    }
    const next = pickNextOp(state, ctx);
    expect(next).not.toBeNull();
    const elapsed = rollout.elapsedSimSeconds;
    const timeCtx = createSimTimeContext(seedId, rollout.rolloutIndex);
    for (const op of rollout.ops) {
      simCostForOp(op, timeCtx, rollout.rolloutIndex);
    }
    const nextCost = simCostForOp(next!, timeCtx, rollout.rolloutIndex);
    expect(elapsed + nextCost).toBeGreaterThan(DEFAULT_MATCH_TIME_LIMIT_SEC);

    const replayed = replayOpsWithTimeLimit(seedId, rollout.ops, 300, rollout.rolloutIndex, next);
    expect(replayed.terminalReason).toBe("time_up");
    expect(replayed.elapsedSimSeconds).toBe(rollout.elapsedSimSeconds);
  });

  it("computeScoreHistogram buckets sum to rollout count", () => {
    const hist = computeScoreHistogram([450, 650, 850, 950, 1100, 4500]);
    expect(Object.values(hist).reduce((a, b) => a + b, 0)).toBe(6);
    expect(hist["0-499"]).toBe(1);
    expect(hist["4000+"]).toBe(1);
  });

  it("computeDistributionMetrics includes bandThresholds and quantiles", () => {
    const seedId = "solitaire-pool:v2:test-metrics-bands";
    const { rollouts, metrics } = simulateSeedRollouts(seedId, 8, {
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
    expect(metrics.clearEaseScore).toBe(0);
    expect(typeof metrics.onboardingScore).toBe("number");
    expect(metrics.onboardingScore).toBeGreaterThanOrEqual(0);
    expect(metrics.foundationCardsP25).toBeGreaterThanOrEqual(0);
    expect(metrics.foundationCardsP50).toBeGreaterThanOrEqual(metrics.foundationCardsP25);
    expect(metrics.foundationCardsP90).toBeGreaterThanOrEqual(metrics.foundationCardsP50);
    expect(metrics.timeToFirstFoundationP50).toBeGreaterThan(0);
    expect(metrics.foundationReachRate).toBeGreaterThanOrEqual(0);
    expect(metrics.foundationReachRate).toBeLessThanOrEqual(1);
  });

  it("simulateRollout tracks foundation peak and time-to-first", () => {
    const r = simulateRollout("solitaire-pool:v2:foundation-track", 0, { matchSeconds: 300 });
    expect(r.foundationCardsPeak).toBeGreaterThanOrEqual(0);
    if (r.foundationCardsPeak > 0) {
      expect(r.timeToFirstFoundationSec).not.toBeNull();
      expect(r.timeToFirstFoundationSec!).toBeGreaterThan(0);
      expect(r.timeToFirstFoundationSec!).toBeLessThanOrEqual(r.elapsedSimSeconds + 1e-6);
    } else {
      expect(r.timeToFirstFoundationSec).toBeNull();
    }
  });

  it("computeClearEaseScore ranks shorter solve paths higher", async () => {
    const { computeClearEaseScore } = await import("../solitaireSeedDifficulty");
    const shortPath = computeClearEaseScore({
      openingMoveCount: 4,
      solvable: "solvable",
      solvableSource: "search",
      pathLength: 80,
      nodesExpanded: 200,
    });
    const longPath = computeClearEaseScore({
      openingMoveCount: 4,
      solvable: "solvable",
      solvableSource: "search",
      pathLength: 400,
      nodesExpanded: 50_000,
    });
    const unsolvable = computeClearEaseScore({
      openingMoveCount: 11,
      solvable: "unknown",
      solvableSource: "search",
      pathLength: null,
      nodesExpanded: 200_000,
    });
    const empirical = computeClearEaseScore({
      openingMoveCount: 4,
      solvable: "solvable",
      solvableSource: "empirical_completed",
      pathLength: null,
      nodesExpanded: 0,
    });
    expect(shortPath).toBeGreaterThan(longPath);
    expect(unsolvable).toBe(0);
    expect(empirical).toBeGreaterThan(shortPath);
  });

  it("computeSolitaireOnboardingScore rises with foundation progress and early first foundation", () => {
    const base = {
      clearEaseScore: 2000,
      foundationReachRate: 1,
      matchTimeLimitSec: 300,
    };
    const deepEarly = computeSolitaireOnboardingScore({
      ...base,
      foundationCardsP25: 12,
      timeToFirstFoundationP50: 30,
    });
    const shallowLate = computeSolitaireOnboardingScore({
      ...base,
      foundationCardsP25: 2,
      timeToFirstFoundationP50: 180,
    });
    const lowReach = computeSolitaireOnboardingScore({
      ...base,
      foundationCardsP25: 12,
      timeToFirstFoundationP50: 30,
      foundationReachRate: 0.2,
    });
    expect(deepEarly).toBeGreaterThan(shallowLate);
    expect(deepEarly).toBeGreaterThan(lowReach);
  });

  it("computeSolitaireOnboardingScore treats clearEase as a secondary bonus", () => {
    const foundation = {
      foundationCardsP25: 6,
      timeToFirstFoundationP50: 60,
      foundationReachRate: 1,
      matchTimeLimitSec: 300,
    };
    const withClear = computeSolitaireOnboardingScore({
      ...foundation,
      clearEaseScore: 2000,
    });
    const withoutClear = computeSolitaireOnboardingScore({
      ...foundation,
      clearEaseScore: 0,
    });
    const foundationBoost = computeSolitaireOnboardingScore({
      ...foundation,
      foundationCardsP25: 16,
      clearEaseScore: 0,
    });
    expect(withClear).toBeGreaterThan(withoutClear);
    // +10 foundation cards (×35) outweighs clearEase 2000 (×0.12).
    expect(foundationBoost - withoutClear).toBeGreaterThan(withClear - withoutClear);
  });

  it("withClearEaseScore recomputes onboarding from clearEase + foundation metrics", () => {
    const base = mockMetrics({
      clearEaseScore: 0,
      onboardingScore: 0,
      foundationCardsP25: 8,
      timeToFirstFoundationP50: 45,
      foundationReachRate: 1,
      openingMoveCount: 5,
    });
    const annotated = withClearEaseScore(base, {
      openingMoveCount: 5,
      solvable: "solvable",
      solvableSource: "search",
      pathLength: 100,
      nodesExpanded: 500,
    });
    expect(annotated.clearEaseScore).toBeGreaterThan(0);
    expect(annotated.onboardingScore).toBe(
      computeSolitaireOnboardingScore({
        clearEaseScore: annotated.clearEaseScore,
        foundationCardsP25: 8,
        timeToFirstFoundationP50: 45,
        foundationReachRate: 1,
        matchTimeLimitSec: 300,
      })
    );
    expect(annotated.onboardingScore).not.toBe(annotated.clearEaseScore);

    const noSolvability = withClearEaseScore(base, null);
    expect(noSolvability.clearEaseScore).toBe(0);
    expect(noSolvability.onboardingScore).toBe(
      computeSolitaireOnboardingScore({
        clearEaseScore: 0,
        foundationCardsP25: 8,
        timeToFirstFoundationP50: 45,
        foundationReachRate: 1,
        matchTimeLimitSec: 300,
      })
    );
  });

  it("buildTierIndex groups entries by layout tier", () => {
    const entries = assignTiers(
      Array.from({ length: 6 }, (_, i) => ({
        seedId: `solitaire-pool:v2:${i}`,
        poolVersion: "v2",
        difficultyScore: 100 - i,
        metrics: mockMetrics({ layoutFingerprint: `fp:${i}` }),
        rolloutSummaries: [],
      })),
      { easy: 0.33, medium: 0.34 }
    );
    const tierIndex = buildTierIndex(entries, "v2", 200, "2026-01-01T00:00:00.000Z");
    expect(tierIndex.tiers.easy.length + tierIndex.tiers.medium.length + tierIndex.tiers.hard.length).toBe(
      6
    );
    for (const tier of ["easy", "medium", "hard"] as const) {
      for (const row of tierIndex.tiers[tier]) {
        expect(row.layoutTier).toBe(tier);
        expect(row.scoreDistribution.bandThresholds).toBeDefined();
        expect(row.playerEaseScore).toBeDefined();
        expect(row.clearEaseScore).toBeDefined();
      }
    }
  });

  it("openingMoveCount includes talon draw on dealt seeds", () => {
    let withDraw = 0;
    for (let i = 0; i < 30; i++) {
      const state = buildDealtState(`solitaire-pool:v2:opening-audit-${i}`);
      if (openingMoveCount(state) >= 1) withDraw += 1;
    }
    expect(withDraw).toBeGreaterThan(0);
  });

  it("isCollapsedDistribution detects single-bucket dominance", () => {
    const hist = { "0-499": 0, "500-999": 0, "1000-1999": 190, "2000-3999": 10, "4000+": 0 };
    expect(isCollapsedDistribution(hist, 200)).toBe(true);
    const spread = { "0-499": 20, "500-999": 40, "1000-1999": 60, "2000-3999": 50, "4000+": 30 };
    expect(isCollapsedDistribution(spread, 200)).toBe(false);
  });

  it("computePlayerEaseScore penalizes likely_dead", () => {
    const base = mockMetrics({ openingMoveCount: 2, scoreSpread: 20 });
    const dead = computePlayerEaseScore({ ...base, layoutOutcome: "likely_dead" });
    const mixed = computePlayerEaseScore({ ...base, layoutOutcome: "mixed" });
    expect(dead).toBeLessThan(mixed);
  });

  it("selectTopCandidatesByPlayerEase keeps highest ease scores", () => {
    const candidates = [
      {
        seedId: "a",
        poolVersion: "v2",
        difficultyScore: 80,
        metrics: mockMetrics({ playerEaseScore: 10 }),
        rolloutSummaries: [],
      },
      {
        seedId: "b",
        poolVersion: "v2",
        difficultyScore: 90,
        metrics: mockMetrics({ playerEaseScore: 50 }),
        rolloutSummaries: [],
      },
    ];
    const top = selectTopCandidatesByPlayerEase(candidates, 1);
    expect(top).toHaveLength(1);
    expect(top[0]!.seedId).toBe("b");
  });
});

describe("solitaireSeedQuickScreen", () => {
  it("rejects when minOpeningMoves not met", () => {
    const seedId = "solitaire-pool:v2:quick-reject-opening";
    const result = quickScreenSeed(
      seedId,
      {
        ...DEFAULT_PLAYER_FRIENDLY_OPTIONS,
        minOpeningMoves: 999,
        quickScreenRollouts: 4,
      },
      300
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.entry.reason).toBe("no_opening_moves");
    }
  });

  it("rejects when foundationCardsP25 too low", () => {
    const reject = rejectPlayerFriendlyMetrics(
      "solitaire-pool:v2:foundation-gate",
      mockMetrics({ foundationCardsP25: 1, timeToFirstFoundationP50: 30 }),
      {
        ...DEFAULT_PLAYER_FRIENDLY_OPTIONS,
        minFoundationCardsP25: 4,
      }
    );
    expect(reject?.reason).toBe("low_foundation_progress");
    expect(reject?.detail).toContain("foundationCardsP25=1");
  });

  it("rejects when timeToFirstFoundationP50 too high", () => {
    const reject = rejectPlayerFriendlyMetrics(
      "solitaire-pool:v2:foundation-late",
      mockMetrics({ foundationCardsP25: 8, timeToFirstFoundationP50: 120 }),
      {
        ...DEFAULT_PLAYER_FRIENDLY_OPTIONS,
        maxTimeToFirstFoundationP50: 90,
      }
    );
    expect(reject?.reason).toBe("low_foundation_progress");
    expect(reject?.detail).toContain("timeToFirstFoundationP50=120");
  });

  it("passes foundation gates when within thresholds", () => {
    const reject = rejectPlayerFriendlyMetrics(
      "solitaire-pool:v2:foundation-ok",
      mockMetrics({ foundationCardsP25: 6, timeToFirstFoundationP50: 45 }),
      {
        ...DEFAULT_PLAYER_FRIENDLY_OPTIONS,
        minFoundationCardsP25: 4,
        maxTimeToFirstFoundationP50: 90,
      }
    );
    expect(reject).toBeNull();
  });

  it("processOneSeed rejects collapsed_scores when enabled", () => {
    const seen = new Set<string>();
    let collapsedReject = false;
    for (let i = 0; i < 120; i++) {
      const r = processOneSeed(
        10000 + i,
        {
          poolVersion: "v2",
          rejectDead: false,
          rolloutCount: 8,
          matchSeconds: 300,
          writeRolloutSummaries: false,
          writeRolloutFiles: false,
          checkSolvability: false,
          playerFriendly: {
            ...DEFAULT_PLAYER_FRIENDLY_OPTIONS,
            minOpeningMoves: 0,
            rejectCollapsed: true,
            quickScreenRollouts: 0,
          },
        },
        seen
      );
      if (r.kind === "rejected" && r.entry.reason === "collapsed_scores") {
        collapsedReject = true;
        break;
      }
    }
    expect(collapsedReject).toBe(true);
  });

  it("processOneSeed rejects not_solvable when requireSolvable and budget is tiny", () => {
    const seen = new Set<string>();
    let notSolvable = false;
    for (let i = 0; i < 40; i++) {
      const r = processOneSeed(
        20000 + i,
        {
          poolVersion: "v2",
          rejectDead: false,
          rolloutCount: 1,
          matchSeconds: 300,
          writeRolloutSummaries: false,
          writeRolloutFiles: false,
          requireSolvable: true,
          solveOpts: { maxNodes: 1, timeoutMs: 1 },
          playerFriendly: {
            ...DEFAULT_PLAYER_FRIENDLY_OPTIONS,
            quickScreenRollouts: 0,
          },
        },
        seen
      );
      if (r.kind === "rejected" && r.entry.reason === "not_solvable") {
        notSolvable = true;
        break;
      }
    }
    expect(notSolvable).toBe(true);
  });
});

describe("solitaireSeedScoreLookup", () => {
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

  it("identical scores → all ranks tie at top band, nearest rolloutIndex 0", () => {
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
    const scores = Array.from({ length: 10 }, (_, i) => i * 10);
    const sorted = [...scores].sort((a, b) => a - b);
    const lowMax = percentileForBand(sorted, PERFORMANCE_BAND_LOW_FRACTION);
    const midMax = percentileForBand(sorted, PERFORMANCE_BAND_HIGH_CUMULATIVE_FRACTION);
    expect(lowMax).toBe(20);
    expect(midMax).toBe(60);
    expect(resolveScoreBandFromThresholds(lowMax, { lowMax, midMax })).toBe("low");
    expect(resolveScoreBandFromThresholds(midMax, { lowMax, midMax })).toBe("mid");
    expect(resolveScoreBandFromThresholds(midMax + 1, { lowMax, midMax })).toBe("high");
  });

  it("30/40/30 bands partition 200 distinct rollout scores", () => {
    const scores = Array.from({ length: 200 }, (_, i) => i + 1);
    const lowMax = percentileForBand(scores, PERFORMANCE_BAND_LOW_FRACTION);
    const midMax = percentileForBand(scores, PERFORMANCE_BAND_HIGH_CUMULATIVE_FRACTION);
    expect(lowMax).toBe(60);
    expect(midMax).toBe(140);
    expect(resolveScoreBandFromThresholds(60, { lowMax, midMax })).toBe("low");
    expect(resolveScoreBandFromThresholds(61, { lowMax, midMax })).toBe("mid");
    expect(resolveScoreBandFromThresholds(140, { lowMax, midMax })).toBe("mid");
    expect(resolveScoreBandFromThresholds(141, { lowMax, midMax })).toBe("high");
  });

  it("nearest rollout picks smaller index on tie", () => {
    const near = findNearestRollout(
      summaries([84, 86]),
      85
    );
    expect(near.finalScore).toBe(84);
    expect(near.rolloutIndex).toBe(0);
  });

  it("index-only entry resolves player band from metrics without summaries", () => {
    const entry = {
      seedId: "solitaire-pool:v2:21",
      poolVersion: "v2",
      tier: "easy" as const,
      difficultyScore: 575,
      metrics: mockMetrics({
        scoreP50: 575,
        scoreMin: 575,
        scoreMax: 575,
        bandThresholds: { lowMax: 575, midMax: 575 },
      }),
    };
    const result = resolvePlayerSeedScore(entry, 600);
    expect(result.scoreBand).toBe("high");
    expect(result.nearestRollout.finalScore).toBe(575);
  });

  it("simulateRolloutsForSeedEntry regenerates from seedId", () => {
    const entry = {
      seedId: "solitaire-pool:v2:21",
      metrics: mockMetrics({ rolloutCount: 1, matchTimeLimitSec: 300 }),
    };
    const { rolloutSummaries } = simulateRolloutsForSeedEntry(entry, 1);
    expect(rolloutSummaries.length).toBeGreaterThan(0);
    expect(rolloutSummaries[0]!.finalScore).toBeGreaterThan(0);
  });

  it("percentileOnSeed matches manual count", () => {
    const scores = [10, 20, 30, 40, 50];
    expect(computePercentileOnSeed(scores, 30)).toBe(3 / 5);
  });
});

describe("solitaireScoring (Solitaire Cash)", () => {
  it("base action deltas match verified Cash rules", () => {
    expect(scoreDeltaForDraw()).toBe(0);
    expect(scoreDeltaForRecycle()).toBe(SOLITAIRE_CASH_RECYCLE_SCORE);
    expect(scoreDeltaForMove("waste", "foundation-hearts", 0)).toBe(SOLITAIRE_CASH_WASTE_TO_FOUNDATION);
    expect(scoreDeltaForMove("waste", "tableau-0", 0)).toBe(SOLITAIRE_CASH_WASTE_TO_TABLEAU);
    expect(scoreDeltaForMove("tableau-0", "foundation-hearts", 0)).toBe(
      SOLITAIRE_CASH_TABLEAU_TO_FOUNDATION
    );
    expect(scoreDeltaForMove("tableau-0", "tableau-1", 1)).toBe(20);
    expect(scoreDeltaForMove("foundation-hearts", "tableau-0", 0)).toBe(
      SOLITAIRE_CASH_FOUNDATION_TO_TABLEAU
    );
  });

  it("time bonus = base × remaining / 5min", () => {
    expect(computeSolitaireCashTimeBonus(5000, 240, 300)).toBe(4000);
    expect(computeSolitaireCashTimeBonus(0, 240, 300)).toBe(0);
  });

  it("total score adds base and time bonus at terminal", () => {
    expect(computeSolitaireCashTotalScore(5000, 60, 300)).toBe(9000);
    expect(buildSolitaireCashGameReport(5000, 60, 300)).toEqual({
      baseScore: 5000,
      timeBonus: 4000,
      completeBonus: 0,
      totalScore: 9000,
    });
  });

  it("applyOp draw scores 0; recycle scores -20 at zero base", () => {
    const state = buildDealtState("solitaire-pool:v2:cash-scoring-smoke");
    for (let i = 0; i < 30; i++) {
      const res = applyOp(state, { op: "draw" });
      if (!res.ok) break;
    }
    expect(state.score ?? 0).toBe(0);
    const recycleRes = applyOp(state, { op: "recycle" });
    expect(recycleRes.ok).toBe(true);
    expect(state.score).toBe(SOLITAIRE_CASH_RECYCLE_SCORE);
  });

  it("simulateRollout has no pointless tableau-to-tableau shuffles", () => {
    const seedId = "solitaire-pool:v2:99";
    for (let i = 0; i < 12; i++) {
      const r = simulateRollout(seedId, i);
      const st = buildDealtState(seedId);
      for (const op of r.ops) {
        if (
          op.op === "move" &&
          op.from.startsWith("tableau-") &&
          op.to.startsWith("tableau-")
        ) {
          const before = st.score ?? 0;
          applyOp(st, op);
          expect(st.score ?? 0).toBeGreaterThan(before);
        } else {
          applyOp(st, op);
        }
      }
    }
  });

  it("simulateRollout still recycles on stalled layouts but caps futile cycles", () => {
    let layoutsWithRecycle = 0;
    let maxRecycle = 0;
    for (let s = 0; s < 48; s++) {
      for (let i = 0; i < 6; i++) {
        const r = simulateRollout(`solitaire-pool:v2:${s}`, i);
        const n = r.ops.filter((o) => o.op === "recycle").length;
        if (n > 0) layoutsWithRecycle += 1;
        maxRecycle = Math.max(maxRecycle, n);
      }
    }
    expect(layoutsWithRecycle).toBeGreaterThanOrEqual(1);
    expect(maxRecycle).toBeGreaterThanOrEqual(1);
  });

  it("simulateRollout does not tail with long futile recycle loops", () => {
    const seedId = "solitaire-pool:v2:99";
    for (let i = 0; i < 12; i++) {
      const r = simulateRollout(seedId, i);
      const st = buildDealtState(seedId);
      let lastScoreIdx = -1;
      for (let j = 0; j < r.ops.length; j++) {
        const before = st.score ?? 0;
        applyOp(st, r.ops[j]!);
        if ((st.score ?? 0) > before) {
          lastScoreIdx = j;
        }
      }
      const tail = r.ops.slice(Math.max(0, lastScoreIdx + 1));
      const tailRecycles = tail.filter((o) => o.op === "recycle").length;
      expect(tailRecycles).toBeLessThanOrEqual(
        personaForRollout(i).maxRecyclesWithoutScore
      );
    }
  });
});