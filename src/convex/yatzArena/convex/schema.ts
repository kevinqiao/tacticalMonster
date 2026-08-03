import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const yatzCategory = v.union(
  v.literal("ones"),
  v.literal("twos"),
  v.literal("threes"),
  v.literal("fours"),
  v.literal("fives"),
  v.literal("sixes"),
  v.literal("three_kind"),
  v.literal("four_kind"),
  v.literal("full_house"),
  v.literal("small_straight"),
  v.literal("large_straight"),
  v.literal("yahtzee"),
  v.literal("chance")
);

const yatzRecordedStep = v.union(
  v.object({ op: v.literal("roll"), pacingMs: v.optional(v.number()) }),
  v.object({ op: v.literal("toggle_hold"), index: v.number(), pacingMs: v.optional(v.number()) }),
  v.object({ op: v.literal("pick_category"), category: yatzCategory, pacingMs: v.optional(v.number()) }),
  v.object({ op: v.literal("concede"), pacingMs: v.optional(v.number()) })
);

export default defineSchema({
  yatz_game: defineTable({
    gameId: v.string(),
    dice: v.array(v.number()),
    held: v.array(v.boolean()),
    rollCount: v.number(),
    roundIndex: v.number(),
    categoryScores: v.record(v.string(), v.number()),
    yahtzeeBonus: v.number(),
    yahtzeeScored: v.boolean(),
    manifestPolicyVersion: v.optional(v.string()),
    score: v.number(),
    status: v.number(),
    seed: v.optional(v.string()),
    playStartedAt: v.optional(v.number()),
    dueTime: v.optional(v.number()),
    casualTimeoutScheduledId: v.optional(v.id("_scheduled_functions")),
    lastUpdate: v.optional(v.number()),
    recordedOps: v.optional(v.array(yatzRecordedStep)),
    lastOpAt: v.optional(v.number()),
  }).index("by_gameId", ["gameId"]),
});
