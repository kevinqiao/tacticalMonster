import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    game_player: defineTable({
        uid: v.string(),
        token: v.optional(v.string()),
        expire: v.optional(v.number()),
        level: v.number(),
        exp: v.number(),
        name: v.optional(v.string()),
        avatar: v.optional(v.string())
    }).index("by_uid", ["uid"]),
    game_event: defineTable({
        gameId: v.optional(v.string()),
        actor: v.optional(v.string()),
        name: v.string(),
        data: v.optional(v.any())
    }).index("by_game", ["gameId"]).index("by_actor", ["actor"]),
    game: defineTable({
        seats: v.optional(v.array(v.object({
            field: v.number(),
            uid: v.optional(v.string()),
            score: v.optional(v.number()),
            botOn: v.optional(v.boolean()),
        }))),
        currentRound: v.optional(v.object({ no: v.number(), turnOvers: v.array(v.string()), status: v.optional(v.number()) })),
        currentTurn: v.optional(v.object({
            uid: v.string(),
            actions: v.object({ acted: v.array(v.object({ type: v.string(), result: v.optional(v.any()) })), max: v.number() }),
            status: v.optional(v.number()),
        })),
        skillUse: v.optional(v.object({
            skillId: v.string(),
            status: v.number(),
            data: v.optional(v.any())
        })),
        status: v.number(),//0-init,1-playing  2-over 3-settled 4-cancelled
        actDue: v.optional(v.number()),
        lastUpdate: v.optional(v.id("game_event")),
        cards: v.array(v.object({
            id: v.string(),
            suit: v.string(),
            rank: v.string(),
            field: v.number(),
            col: v.optional(v.number()),
            row: v.optional(v.number()),
            status: v.optional(v.number())
        }))
    }).index("by_due", ["status", "actDue"]),
});