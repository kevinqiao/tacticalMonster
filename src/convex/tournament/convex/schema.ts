import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    player: defineTable({
        uid: v.string(),
        token: v.optional(v.string()),
        expire: v.optional(v.number()),
        data: v.optional(v.any()),
    }).index("by_uid", ["uid"]),
    tournamentRule: defineTable({
        ruleId: v.string(),
        name: v.string(),
        type: v.number(),//0-single match,1-quick,2-seasonal,3-knockout
        max_players: v.number(),
        rules: v.optional(v.any()),
        rewards: v.optional(v.any()),
        status: v.optional(v.number()),
    }).index("by_ruleId", ["ruleId"]),
    tournament: defineTable({
        ruleId: v.string(),
        name: v.string(),
        type: v.number(),//0-single match,1-quick,2-seasonal,3-knockout
        start_time: v.number(),
        end_time: v.number(),
        custom_rules: v.optional(v.any()),
        custom_rewards: v.optional(v.any()),
        status: v.optional(v.number()),
    }).index("by_rule", ["ruleId"]),
    match: defineTable({
        tournamentId: v.string(),
        start_time: v.number(),
        end_time: v.number(),
        players: v.array(v.object({
            uid: v.string(),
            score: v.number(),
            rank: v.number(),
        })),
        result: v.optional(v.array(v.object({ uid: v.string(), rank: v.number() }))),
        status: v.optional(v.number()),
    }).index("by_tournament", ["tournamentId"]),

    playerTournamentData: defineTable({
        tournamentId: v.string(),
        uid: v.string(),
        points: v.number(),
        rank: v.number(),
        total_matches: v.number(),
        wins: v.number(),
        last_match_time: v.number(),
        extra_data: v.optional(v.any()),
    }).index("by_player", ["uid"]).index("by_tournament", ["tournamentId"]),
    rewards: defineTable({
        tournamentId: v.string(),
        uid: v.string(),
        reward_type: v.number(),//0-item,1-coin,2-gem,3-title
        reward_value: v.any(),
        status: v.optional(v.number()),
        claimAt: v.optional(v.number()),
    }).index("by_uid", ["uid"]),
    leaderboard: defineTable({
        tournamentId: v.string(),
        uid: v.string(),
        points: v.number(),
        rank: v.number(),
        updatedAt: v.number(),
    }).index("by_tournament", ["tournamentId"]),
    match_queue: defineTable({
        uid: v.string(),
        level: v.number(),
        game: v.string(),
        elo: v.number(),
        status: v.optional(v.number()),
    }).index("by_uid", ["uid"]).index("by_status", ["status"]),

});