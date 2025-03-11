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
        seats: v.array(v.object({
            no: v.number(),
            uid: v.optional(v.string()),
            botOn: v.optional(v.boolean()),
            tokens: v.array(v.object({
                id: v.number(),
                x: v.number(),
                y: v.number(),
            })),
            dice: v.optional(v.number()),
        })),
        currentSeat: v.optional(v.number()),
        currentAction: v.optional(v.object({ type: v.number(), tokens: v.optional(v.array(v.number())) })),
        status: v.number(),//0-open,1-close 2-settled 3-cancelled
        actDue: v.optional(v.number()),
        lastUpdate: v.optional(v.id("game_event")),
        tiles: v.optional(v.array(v.object({
            x: v.number(),
            y: v.number(),
            type: v.number(),
            status: v.optional(v.number())
        })))
    }).index("by_due", ["status", "actDue"]),
});