import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import {
  rolloutDistributionMetrics,
  rolloutTerminalReason,
  match3SeedTier,
  tierCounts,
} from "./service/seedPool/match3SeedPoolValidators";

const match3Cell = v.object({
  row: v.number(),
  col: v.number(),
  asset: v.number(),
  id: v.string(),
});

const match3RecordedStep = v.union(
  v.object({
    op: v.literal("swap"),
    r1: v.number(),
    c1: v.number(),
    r2: v.number(),
    c2: v.number(),
    pacingMs: v.optional(v.number()),
  }),
  v.object({
    op: v.literal("concede"),
    pacingMs: v.optional(v.number()),
  })
);

export default defineSchema({
  match3_seed_pool_meta: defineTable({
    poolVersion: v.string(),
    rolloutCount: v.number(),
    matchTimeLimitSec: v.number(),
    generatedAt: v.string(),
    entryCount: v.number(),
    tierCounts: v.optional(tierCounts),
    isActive: v.boolean(),
    importStatus: v.optional(v.union(v.literal("importing"), v.literal("ready"))),
    importedAt: v.number(),
  })
    .index("by_poolVersion", ["poolVersion"])
    .index("by_isActive", ["isActive"]),

  match3_seed_pool_entries: defineTable({
    poolVersion: v.string(),
    seedId: v.string(),
    tier: match3SeedTier,
    difficultyScore: v.number(),
    metrics: rolloutDistributionMetrics,
  })
    .index("by_poolVersion", ["poolVersion"])
    .index("by_poolVersion_and_seedId", ["poolVersion", "seedId"])
    .index("by_poolVersion_and_tier", ["poolVersion", "tier"])
    .index("by_poolVersion_and_difficultyScore", ["poolVersion", "difficultyScore"]),

  match3_seed_pool_rollout_summaries: defineTable({
    poolVersion: v.string(),
    seedId: v.string(),
    rolloutIndex: v.number(),
    finalScore: v.number(),
    moves: v.number(),
    completed: v.boolean(),
    terminalReason: rolloutTerminalReason,
    elapsedSimSeconds: v.number(),
    opCount: v.number(),
  })
    .index("by_poolVersion", ["poolVersion"])
    .index("by_poolVersion_and_seedId", ["poolVersion", "seedId"])
    .index("by_poolVersion_and_seedId_and_rolloutIndex", [
      "poolVersion",
      "seedId",
      "rolloutIndex",
    ]),

  player_seeds: defineTable({
    uid: v.string(),
    seedId: v.string(),
    poolVersion: v.string(),
    matchId: v.optional(v.string()),
    usedAt: v.number(),
  })
    .index("by_uid_and_poolVersion", ["uid", "poolVersion"])
    .index("by_uid_poolVersion_and_seedId", ["uid", "poolVersion", "seedId"])
    .index("by_matchId", ["matchId"]),

  match_seed_picks: defineTable({
    matchId: v.string(),
    seedId: v.string(),
    poolVersion: v.string(),
    uids: v.array(v.string()),
    sessionKey: v.string(),
    pickedAt: v.number(),
  }).index("by_matchId", ["matchId"]),

  match3_game: defineTable({
    gameId: v.string(),
    grid: v.array(v.array(match3Cell)),
    score: v.number(),
    moves: v.number(),
    status: v.number(),
    seed: v.optional(v.string()),
    refillCounter: v.optional(v.number()),
    playStartedAt: v.optional(v.number()),
    dueTime: v.optional(v.number()),
    casualTimeoutScheduledId: v.optional(v.id("_scheduled_functions")),
    lastUpdate: v.optional(v.number()),
    recordedOps: v.optional(v.array(match3RecordedStep)),
    lastOpAt: v.optional(v.number()),
  }).index("by_gameId", ["gameId"]),
});
