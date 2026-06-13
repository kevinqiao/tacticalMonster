import { v } from "convex/values";

import { HUMAN_STOCHASTIC_POLICY_VERSION } from "./match3RecordedOpTypes";

export const match3SeedTier = v.union(
  v.literal("easy"),
  v.literal("medium"),
  v.literal("hard")
);

export const rolloutTerminalReason = v.union(
  v.literal("completed"),
  v.literal("stuck"),
  v.literal("time_up"),
  v.literal("exited")
);

export const seedLayoutOutcome = v.union(
  v.literal("winnable"),
  v.literal("likely_dead"),
  v.literal("mixed")
);

const scoreQuantiles = v.object({
  p10: v.number(),
  p25: v.number(),
  p30: v.number(),
  p33: v.number(),
  p50: v.number(),
  p66: v.number(),
  p70: v.number(),
  p75: v.number(),
  p90: v.number(),
});

const bandThresholds = v.object({
  lowMax: v.number(),
  midMax: v.number(),
});

export const rolloutDistributionMetrics = v.object({
  rolloutCount: v.number(),
  scoreMin: v.number(),
  scoreP50: v.number(),
  scoreP90: v.number(),
  scoreMax: v.number(),
  scoreQuantiles,
  scoreHistogram: v.record(v.string(), v.number()),
  bandThresholds,
  completedRate: v.number(),
  stuckRate: v.number(),
  exitedRate: v.number(),
  timeUpRate: v.number(),
  completedCount: v.number(),
  hasAnyCompleted: v.boolean(),
  layoutOutcome: seedLayoutOutcome,
  openingMoveCount: v.number(),
  scoreSpread: v.number(),
  playerEaseScore: v.number(),
  layoutFingerprint: v.string(),
  policyVersion: v.literal(HUMAN_STOCHASTIC_POLICY_VERSION),
  matchTimeLimitSec: v.number(),
});

export const rolloutSummaryFields = {
  rolloutIndex: v.number(),
  finalScore: v.number(),
  moves: v.number(),
  completed: v.boolean(),
  terminalReason: rolloutTerminalReason,
  elapsedSimSeconds: v.number(),
  opCount: v.number(),
};

export const rolloutSummary = v.object(rolloutSummaryFields);

export const seedPoolEntryImport = v.object({
  seedId: v.string(),
  poolVersion: v.string(),
  tier: match3SeedTier,
  difficultyScore: v.number(),
  metrics: rolloutDistributionMetrics,
});

export const rolloutSummaryImport = v.object({
  poolVersion: v.string(),
  seedId: v.string(),
  ...rolloutSummaryFields,
});

export const tierCounts = v.object({
  easy: v.number(),
  medium: v.number(),
  hard: v.number(),
});
