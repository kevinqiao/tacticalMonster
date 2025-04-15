import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    player: defineTable({
        uid: v.string(),
        token: v.optional(v.string()),
        expire: v.optional(v.number()),
        level: v.number(),
        exp: v.number(),
        name: v.optional(v.string()),
        avatar: v.optional(v.string())
    }).index("by_uid", ["uid"]),
    tournament: defineTable({
        tournamentId: v.string(),
        name: v.string(),
        type: v.number(),
        start_time: v.number(),
        end_time: v.number(),
        min_level: v.number(),
        group_size: v.optional(v.number()),
        max_matches_per_day: v.optional(v.number()),
        max_matches_total: v.optional(v.number()),
        entry_fee_coins: v.number(),
        entry_fee_gems: v.number(),
        status: v.optional(v.number()),
    }).index("by_tournamentId", ["tournamentId"]),
    tournamentGroup: defineTable({
        groupId: v.string(),
        tournamentId: v.string(),
        strength_score_min: v.number(),
        strength_score_max: v.number(),
        status: v.optional(v.number()),
    }).index("by_tournamentId", ["tournamentId", "groupId"]),
    tournamentEntry: defineTable({
        entryId: v.string(),
        entry_time: v.number(),
        playerId: v.string(),
        groupId: v.string(),
        fee_type: v.number(),
        fee_amount: v.number(),
        total_matches: v.number(),
        total_points: v.number(),
        total_columns_cleared: v.number(),
        rank: v.number(),
    }).index("by_groupId", ["groupId", "entryId"]),
    tournamentMatch: defineTable({
        gameId: v.string(),
        game_type: v.number(),
        entryId: v.string(),
        opponent_entryId: v.string(),
        start_time: v.number(),
        end_time: v.number(),
        is_winner: v.boolean(),
        points_earned: v.number(),
        report: v.optional(v.object({
            columns_cleared: v.number(),
            is_instant_clear: v.boolean(),
            base_moves: v.number(),
            skill_uses: v.optional(v.array(v.object({ skillId: v.string(), count: v.number() }))),
            boost_uses: v.optional(v.array(v.object({ boostId: v.string(), count: v.number() }))),
        })),

    }).index("by_gameId", ["gameId"]),
    match_queue: defineTable({
        playerId: v.string(),
        groupId: v.string(),
        strength_score: v.number(),
    }).index("by_groupId", ["groupId", "playerId"]),

});