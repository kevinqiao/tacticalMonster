import { describe, expect, it } from "vitest";

import {
  entryDocToSeedPoolEntry,
  matchesRolloutFilter,
  sortRolloutSummaries,
} from "../solitaireSeedPoolStore";
import type { RolloutSummary } from "../solitaireRecordedOpTypes";

const sampleMetrics = {
  rolloutCount: 40,
  scoreMin: 0,
  scoreP50: 1000,
  scoreP90: 2000,
  scoreMax: 3000,
  scoreQuantiles: {
    p10: 100,
    p25: 400,
    p30: 500,
    p33: 600,
    p50: 1000,
    p66: 1200,
    p70: 1300,
    p75: 1400,
    p90: 2000,
  },
  scoreHistogram: { "0-499": 1 },
  bandThresholds: { lowMax: 500, midMax: 1300 },
  completedRate: 0.1,
  stuckRate: 0,
  exitedRate: 0.1,
  timeUpRate: 0.8,
  completedCount: 4,
  hasAnyCompleted: true,
  layoutOutcome: "winnable" as const,
  openingMoveCount: 3,
  scoreSpread: 3000,
  playerEaseScore: 1500,
  layoutFingerprint: "fp:test",
  policyVersion: "human-stochastic-v6",
  matchTimeLimitSec: 300,
};

describe("solitaireSeedPoolStore", () => {
  it("sortRolloutSummaries orders by rolloutIndex", () => {
    const input: RolloutSummary[] = [
      {
        rolloutIndex: 2,
        finalScore: 1,
        moves: 1,
        completed: false,
        terminalReason: "time_up",
        elapsedSimSeconds: 1,
        opCount: 1,
      },
      {
        rolloutIndex: 0,
        finalScore: 2,
        moves: 1,
        completed: false,
        terminalReason: "time_up",
        elapsedSimSeconds: 1,
        opCount: 1,
      },
    ];
    expect(sortRolloutSummaries(input).map((s) => s.rolloutIndex)).toEqual([0, 2]);
  });

  it("matchesRolloutFilter applies score and terminalReason", () => {
    const s: RolloutSummary = {
      rolloutIndex: 0,
      finalScore: 1500,
      moves: 10,
      completed: false,
      terminalReason: "time_up",
      elapsedSimSeconds: 100,
      opCount: 10,
    };
    expect(matchesRolloutFilter(s, { minScore: 1000, maxScore: 2000 })).toBe(true);
    expect(matchesRolloutFilter(s, { minScore: 2001 })).toBe(false);
    expect(matchesRolloutFilter(s, { terminalReason: "completed" })).toBe(false);
    expect(matchesRolloutFilter(s, { completed: false })).toBe(true);
  });

  it("entryDocToSeedPoolEntry attaches summaries when provided", () => {
    const entry = {
      _id: "x" as any,
      _creationTime: 0,
      poolVersion: "v2",
      seedId: "solitaire-pool:v2:1",
      tier: "easy" as const,
      difficultyScore: 1000,
      metrics: sampleMetrics,
    };
    const summaries: RolloutSummary[] = [
      {
        rolloutIndex: 0,
        finalScore: 900,
        moves: 1,
        completed: false,
        terminalReason: "exited",
        elapsedSimSeconds: 1,
        opCount: 1,
      },
    ];
    const out = entryDocToSeedPoolEntry(entry, summaries);
    expect(out.rolloutSummaries).toHaveLength(1);
    expect(out.seedId).toBe("solitaire-pool:v2:1");
  });
});
