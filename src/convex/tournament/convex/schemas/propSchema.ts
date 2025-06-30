import { defineTable } from "convex/server";
import { v } from "convex/values";

// 道具系统相关表
export const propSchema = {
    inventories: defineTable({
        uid: v.string(),
        gameType: v.string(),
        props: v.array(v.object({
            propType: v.string(),
            quantity: v.number(),
            lastUpdated: v.string()
        })),
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_uid_game", ["uid", "gameType"]),

    prop_usage_logs: defineTable({
        uid: v.string(),
        gameType: v.string(),
        propType: v.string(),
        quantity: v.number(),
        usageType: v.string(), // "immediate", "delayed"
        deductionId: v.optional(v.id("delayed_prop_deductions")),
        context: v.object({
            tournamentId: v.optional(v.string()),
            matchId: v.optional(v.string()),
            reason: v.string()
        }),
        createdAt: v.string(),
    }).index("by_uid", ["uid"]).index("by_gameType", ["gameType"]).index("by_deductionId", ["deductionId"]),

    prop_distribution_logs: defineTable({
        uid: v.string(),
        gameType: v.string(),
        propType: v.string(),
        quantity: v.number(),
        distributionType: v.string(), // "tournament_reward", "purchase", "gift", "achievement"
        source: v.string(), // "tournament_123", "shop", "admin"
        createdAt: v.string(),
    }).index("by_uid", ["uid"]).index("by_gameType", ["gameType"]),

    delayed_prop_deductions: defineTable({
        uid: v.string(),
        gameType: v.string(),
        propType: v.string(),
        quantity: v.number(),
        status: v.string(), // "pending", "executed", "cancelled"
        expiryTime: v.string(),
        context: v.object({
            tournamentId: v.optional(v.string()),
            matchId: v.optional(v.string()),
            reason: v.string()
        }),
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_uid", ["uid"]).index("by_status", ["status"]).index("by_expiry", ["expiryTime"]),

    coin_transactions: defineTable({
        uid: v.string(),
        amount: v.number(),
        transactionType: v.string(), // "purchase", "reward", "refund", "penalty"
        description: v.string(),
        balance: v.number(),
        createdAt: v.string(),
    }).index("by_uid", ["uid"]).index("by_type", ["transactionType"]),
}; 