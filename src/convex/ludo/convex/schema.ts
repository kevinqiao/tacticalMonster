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
        name:v.string(),
        data: v.optional(v.any())
    }).index("by_game", ["gameId"]).index("by_actor", ["actor"])
    
});