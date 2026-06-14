import { v } from "convex/values";

import { HUMAN_STOCHASTIC_POLICY_VERSION } from "./solitaireRecordedOpTypes";

export const solitaireSeedTier = v.union(
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

export const solitaireRecordedStep = v.union(
  v.object({ op: v.literal("draw"), pacingMs: v.optional(v.number()) }),
  v.object({ op: v.literal("recycle"), pacingMs: v.optional(v.number()) }),
  v.object({
    op: v.literal("move"),
    suit: v.union(
      v.literal("hearts"),
      v.literal("diamonds"),
      v.literal("clubs"),
      v.literal("spades")
    ),
    rank: v.union(
      v.literal("A"),
      v.literal("2"),
      v.literal("3"),
      v.literal("4"),
      v.literal("5"),
      v.literal("6"),
      v.literal("7"),
      v.literal("8"),
      v.literal("9"),
      v.literal("10"),
      v.literal("J"),
      v.literal("Q"),
      v.literal("K")
    ),
    from: v.string(),
    to: v.string(),
    pacingMs: v.optional(v.number()),
  }),
  v.object({ op: v.literal("concede"), pacingMs: v.optional(v.number()) })
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
  policyVersion: v.union(
    v.literal("human-stochastic-v4"),
    v.literal(HUMAN_STOCHASTIC_POLICY_VERSION)
  ),
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
  tier: solitaireSeedTier,
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
