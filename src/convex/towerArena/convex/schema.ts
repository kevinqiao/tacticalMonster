import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import {
  rolloutDistributionMetrics,
  rolloutTerminalReason,
  towerSeedTier,
  tierCounts,
} from "./service/seedPool/towerSeedPoolValidators";

const placedTower = v.object({
  slotId: v.string(),
  towerId: v.string(),
  level: v.number(),
});

export default defineSchema({
  tower_seed_pool_meta: defineTable({
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

  tower_seed_pool_entries: defineTable({
    poolVersion: v.string(),
    seedId: v.string(),
    tier: towerSeedTier,
    difficultyScore: v.number(),
    metrics: rolloutDistributionMetrics,
  })
    .index("by_poolVersion", ["poolVersion"])
    .index("by_poolVersion_and_seedId", ["poolVersion", "seedId"])
    .index("by_poolVersion_and_tier", ["poolVersion", "tier"])
    .index("by_poolVersion_and_difficultyScore", ["poolVersion", "difficultyScore"]),

  tower_seed_pool_rollout_summaries: defineTable({
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

  game: defineTable({
    gameId: v.string(),
    seedId: v.string(),
    phase: v.string(),
    status: v.number(),
    lives: v.number(),
    gold: v.number(),
    currentWave: v.number(),
    wavesCleared: v.number(),
    towers: v.array(placedTower),
    unlockedTowerIds: v.array(v.string()),
    score: v.number(),
    elapsedSimMs: v.number(),
    moves: v.number(),
    playStartedAt: v.optional(v.number()),
    dueTime: v.optional(v.number()),
    casualTimeoutScheduledId: v.optional(v.id("_scheduled_functions")),
    lastUpdate: v.optional(v.number()),
  }).index("by_gameId", ["gameId"]),
});
