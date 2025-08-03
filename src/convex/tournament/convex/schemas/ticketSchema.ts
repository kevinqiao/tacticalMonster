import { defineTable } from "convex/server";
import { v } from "convex/values";

// 门票系统相关表 - 基于三种门票类型简化设计
export const ticketSchema = {
    // 玩家门票表 - 存储玩家拥有的门票
    player_tickets: defineTable({
        uid: v.string(),
        type: v.string(), // "bronze", "silver", "gold"
        quantity: v.number(),
        lastUsedAt: v.optional(v.string()),
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_uid", ["uid"]).index("by_type", ["type"]),

    // 门票使用统计表 - 记录使用情况和胜率
    ticket_usage_stats: defineTable({
        uid: v.string(),
        type: v.string(), // "bronze", "silver", "gold"
        totalUsed: v.number(),
        totalWon: v.number(),
        totalLost: v.number(),
        winRate: v.number(),
        lastUsedAt: v.string(),
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_uid", ["uid"]).index("by_type", ["type"]),
}; 