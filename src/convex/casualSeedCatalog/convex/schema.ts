import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import {
  catalogGameType,
  catalogSeedTier,
  rolloutDistributionMetrics,
  rolloutTerminalReason,
} from "./service/seedPool/seedPoolValidators";

export default defineSchema({
  seed_pool_meta: defineTable({
    gameType: catalogGameType,
    poolVersion: v.string(),
    rolloutCount: v.number(),
    matchTimeLimitSec: v.number(),
    generatedAt: v.string(),
    entryCount: v.number(),
    isActive: v.boolean(),
    importStatus: v.optional(v.union(v.literal("importing"), v.literal("ready"))),
    importedAt: v.number(),
  })
    .index("by_gameType_and_poolVersion", ["gameType", "poolVersion"])
    .index("by_gameType_and_isActive", ["gameType", "isActive"]),

  seed_pool_entries: defineTable({
    gameType: catalogGameType,
    poolVersion: v.string(),
    seedId: v.string(),
    tier: catalogSeedTier,
    difficultyScore: v.number(),
    metrics: rolloutDistributionMetrics,
  })
    .index("by_gameType_and_poolVersion", ["gameType", "poolVersion"])
    .index("by_gameType_poolVersion_seedId", ["gameType", "poolVersion", "seedId"])
    .index("by_gameType_poolVersion_tier", ["gameType", "poolVersion", "tier"]),

  seed_pool_rollout_summaries: defineTable({
    gameType: catalogGameType,
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
    .index("by_gameType_and_poolVersion", ["gameType", "poolVersion"])
    .index("by_gameType_poolVersion_seedId", ["gameType", "poolVersion", "seedId"])
    .index("by_gameType_poolVersion_seedId_rolloutIndex", [
      "gameType",
      "poolVersion",
      "seedId",
      "rolloutIndex",
    ]),

  match_seed_picks: defineTable({
    gameType: catalogGameType,
    matchId: v.string(),
    seedId: v.string(),
    poolVersion: v.string(),
    uids: v.array(v.string()),
    sessionKey: v.string(),
    pickedAt: v.number(),
  }).index("by_gameType_and_matchId", ["gameType", "matchId"]),

  player_seeds: defineTable({
    gameType: catalogGameType,
    uid: v.string(),
    seedId: v.string(),
    poolVersion: v.string(),
    matchId: v.optional(v.string()),
    usedAt: v.number(),
  })
    .index("by_gameType_uid_poolVersion", ["gameType", "uid", "poolVersion"])
    .index("by_gameType_uid_poolVersion_seedId", [
      "gameType",
      "uid",
      "poolVersion",
      "seedId",
    ])
    .index("by_matchId", ["matchId"]),
});
