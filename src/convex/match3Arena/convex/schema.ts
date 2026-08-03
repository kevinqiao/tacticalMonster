import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

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
