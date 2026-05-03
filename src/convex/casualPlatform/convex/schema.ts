import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  casual_players: defineTable({
    uid: v.string(),
    token: v.optional(v.string()),
    coins: v.optional(v.number()),
    gems: v.optional(v.number()),
    stamina: v.optional(v.number()),
    seasonXp: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  }).index("by_uid", ["uid"]),

  casual_tournaments: defineTable({
    tournamentId: v.string(),
    title: v.string(),
    gameId: v.string(),
    matchType: v.string(),
    status: v.string(),
    endsAt: v.optional(v.number()),
  }).index("by_tournamentId", ["tournamentId"]),

  casual_entries: defineTable({
    uid: v.string(),
    tournamentId: v.string(),
    score: v.optional(v.number()),
    submittedAt: v.optional(v.number()),
    /** Phase A：外链局完成标记或校验摘要 */
    externalGameId: v.optional(v.string()),
  })
    .index("by_uid_tournament", ["uid", "tournamentId"])
    .index("by_tournament_score", ["tournamentId", "score"]),

  casual_seasons: defineTable({
    seasonId: v.string(),
    name: v.string(),
    startsAt: v.number(),
    endsAt: v.number(),
    active: v.boolean(),
  }).index("by_seasonId", ["seasonId"]),

  casual_pass_progress: defineTable({
    uid: v.string(),
    seasonId: v.string(),
    level: v.number(),
    xp: v.number(),
    updatedAt: v.number(),
  }).index("by_uid_season", ["uid", "seasonId"]),

  casual_tasks: defineTable({
    uid: v.string(),
    taskId: v.string(),
    progress: v.number(),
    completedAt: v.optional(v.number()),
    updatedAt: v.number(),
  }).index("by_uid_task", ["uid", "taskId"]),
});
