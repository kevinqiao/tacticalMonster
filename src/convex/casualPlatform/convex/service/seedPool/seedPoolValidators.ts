import { v } from "convex/values";

export const catalogGameType = v.union(
  v.literal("block_blast"),
  v.literal("solitaire"),
  v.literal("match_3"),
  v.literal("tower_arena")
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
});

export const rolloutTerminalReason = v.union(
  v.literal("completed"),
  v.literal("stuck"),
  v.literal("time_up"),
  v.literal("exited")
);

export const seedPoolEntryImport = v.object({
  seedId: v.string(),
  poolVersion: v.string(),
  tier: catalogSeedTier,
  difficultyScore: v.number(),
  metrics: rolloutDistributionMetrics,
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
