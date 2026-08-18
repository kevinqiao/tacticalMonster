import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  portal_player_wallets: defineTable({
    uid: v.string(),
    scopeKey: v.string(),
    coins: v.number(),
    tickets: v.number(),
  }).index("by_scope_uid", ["scopeKey", "uid"]),

  rpg_hourly_seeds: defineTable({
    leagueScopeKey: v.string(),
    tierId: v.string(),
    gameType: v.string(),
    hourKey: v.string(),
    seedId: v.string(),
  }).index("by_pointer", ["leagueScopeKey", "tierId", "gameType", "hourKey"]),

  rpg_runs: defineTable({
    gameId: v.string(),
    matchId: v.string(),
    uid: v.string(),
    tableId: v.string(),
    hallKind: v.string(),
    gameType: v.string(),
    seedId: v.string(),
    hourKey: v.string(),
    loadout: v.array(v.string()),
    status: v.string(),
    score: v.number(),
    weekKey: v.string(),
  })
    .index("by_gameId", ["gameId"])
    .index("by_uid", ["uid"]),

  player_matches: defineTable({
    gameId: v.string(),
    matchId: v.string(),
    uid: v.string(),
    seed: v.string(),
    loadout: v.array(v.string()),
    tableId: v.string(),
    hallKind: v.string(),
    gameType: v.string(),
    hourKey: v.string(),
    score: v.number(),
    status: v.number(),
  }).index("by_game", ["gameId"]),

  portal_weekly_scores: defineTable({
    uid: v.string(),
    scopeKey: v.string(),
    weekKey: v.string(),
    hourKey: v.string(),
    points: v.number(),
  })
    .index("by_week_uid", ["weekKey", "uid"])
    .index("by_hour", ["uid", "scopeKey", "weekKey", "hourKey"]),

  portal_pass: defineTable({
    uid: v.string(),
    scopeKey: v.string(),
    xp: v.number(),
    claimed: v.array(v.number()),
  }).index("by_scope_uid", ["scopeKey", "uid"]),
});
