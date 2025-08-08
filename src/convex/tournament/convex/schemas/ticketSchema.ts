import { defineTable } from "convex/server";
import { v } from "convex/values";

export const ticketSchema = {
    // 玩家门票表
    player_tickets: defineTable({
        uid: v.string(),
        type: v.string(), // "bronze", "silver", "gold"
        quantity: v.number(),
        lastUsedAt: v.optional(v.string()),
        seasonId: v.optional(v.string()), // 记录获得赛季
        createdAt: v.string(),
        updatedAt: v.string()
    }).index("by_uid", ["uid"])
        .index("by_uid_type", ["uid", "type"])
        .index("by_type_quantity", ["type", "quantity"]),

    // 门票使用统计表
    ticket_usage_stats: defineTable({
        uid: v.string(),
        type: v.string(), // "bronze", "silver", "gold"
        totalUsed: v.number(),
        totalWon: v.number(),
        totalLost: v.number(),
        winRate: v.number(),
        lastUsedAt: v.string(),
        createdAt: v.string(),
        updatedAt: v.string()
    }).index("by_uid", ["uid"])
        .index("by_type", ["type"])
        .index("by_uid_type", ["uid", "type"])
}; 