import { v } from "convex/values";

export const catalogGameType = v.union(
  v.literal("block_blast"),
  v.literal("solitaire"),
  v.literal("match_3"),
  v.literal("tower_arena"),
  v.literal("yatz")
);

export const catalogSeedTier = v.union(
  v.literal("easy"),
  v.literal("medium"),
  v.literal("hard")
);

export const scoreQuantiles = v.object({
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

export const rolloutDistributionMetrics = v.object({
  rolloutCount: v.number(),
  scoreMin: v.number(),
  scoreP50: v.number(),
  scoreP90: v.number(),
  scoreMax: v.number(),
  scoreSpread: v.number(),
  scoreQuantiles,
  scoreHistogram: v.optional(v.record(v.string(), v.number())),
  /** Solitaire: clear-board ease (higher = easier). Optional for older imports. */
  clearEaseScore: v.optional(v.number()),
  /** Yatz / Solitaire / Match3: human-feel ease (higher = friendlier). Optional for older imports. */
  playerEaseScore: v.optional(v.number()),
  /** Match3: early cascade / ritual axis (higher = friendlier first wave). */
  onboardingScore: v.optional(v.number()),
  /** Match3: fraction of rollouts stuck in the early-move window. */
  earlyStuckRate: v.optional(v.number()),
  meanEarlyClearWaveSum: v.optional(v.number()),
  earlyCascadeHitRate: v.optional(v.number()),
  /** Block Blast: experience / early-clear ritual proxies. */
  experienceScore: v.optional(v.number()),
  earlyClearRate: v.optional(v.number()),
  /** Block Blast: survival duration percentiles (seconds). Optional for older imports. */
  survivalTimeP25: v.optional(v.number()),
  survivalTimeP50: v.optional(v.number()),
  survivalTimeP90: v.optional(v.number()),
  survivalTimeSpread: v.optional(v.number()),
  /** Solitaire: foundation progress percentiles / rates. Optional for older imports. */
  foundationCardsP25: v.optional(v.number()),
  foundationCardsP50: v.optional(v.number()),
  foundationCardsP90: v.optional(v.number()),
  timeToFirstFoundationP50: v.optional(v.number()),
  foundationReachRate: v.optional(v.number()),
});

export const rolloutTerminalReason = v.union(
  v.literal("completed"),
  v.literal("stuck"),
  v.literal("time_up"),
  v.literal("exited")
);

export const seedPoolSolvableStatus = v.union(
  v.literal("solvable"),
  v.literal("unsolvable"),
  v.literal("unknown")
);

export const seedPoolSolvableSource = v.union(
  v.literal("empirical_completed"),
  v.literal("search")
);

export const seedPoolEntryImport = v.object({
  seedId: v.string(),
  poolVersion: v.string(),
  tier: catalogSeedTier,
  difficultyScore: v.number(),
  metrics: rolloutDistributionMetrics,
  solvable: v.optional(seedPoolSolvableStatus),
  solvableSource: v.optional(seedPoolSolvableSource),
  solvableReason: v.optional(v.union(v.string(), v.null())),
});

export const rolloutSummaryImport = v.object({
  poolVersion: v.string(),
  seedId: v.string(),
  rolloutIndex: v.number(),
  finalScore: v.number(),
  moves: v.number(),
  completed: v.boolean(),
  terminalReason: rolloutTerminalReason,
  elapsedSimSeconds: v.number(),
  opCount: v.number(),
});
