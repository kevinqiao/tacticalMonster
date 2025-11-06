import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    game: defineTable({
        gameId: v.string(),
        cards: v.array(v.object({
            id: v.string(),
            suit: v.string(),
            rank: v.string(),
            value: v.number(),
            isRed: v.boolean(),
            isRevealed: v.boolean(),
            zone: v.string(),
            zoneId: v.string(),
            zoneIndex: v.number(),
        })),
        zones: v.array(v.object({
            id: v.string(),
            type: v.string(),
        })),
        actionStatus: v.string(),
        status: v.number(),
        score: v.number(),
        moves: v.number(),
        lastUpdate: v.optional(v.string()),
    }).index("by_gameId", ["gameId"]),

});