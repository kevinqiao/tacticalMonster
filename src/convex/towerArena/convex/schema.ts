import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const placedTower = v.object({
  slotId: v.string(),
  towerId: v.string(),
  level: v.number(),
});

export default defineSchema({
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
