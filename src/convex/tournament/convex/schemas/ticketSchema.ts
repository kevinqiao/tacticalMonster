import { defineTable } from "convex/server";
import { v } from "convex/values";

// 门票系统相关表
export const ticketSchema = {
    ticket_templates: defineTable({
        templateId: v.string(),
        name: v.string(),
        description: v.string(),
        rarity: v.string(), // "normal", "advanced", "event", "exclusive"
        tier: v.string(), // "bronze", "silver", "gold", "platinum", "diamond", "master"
        matchingRules: v.object({
            minSegmentPoints: v.number(),
            maxSegmentPoints: v.optional(v.number()),
            minElo: v.number(),
            maxElo: v.optional(v.number()),
            gameTypes: v.array(v.string()),
            maxSegmentTier: v.string(),
        }),
        price: v.object({
            coins: v.number(),
            realMoney: v.optional(v.number()),
        }),
        validityDays: v.number(),
        maxUsagePerDay: v.number(),
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_templateId", ["templateId"]).index("by_rarity", ["rarity"]),

    player_tickets: defineTable({
        uid: v.string(),
        templateId: v.string(),
        quantity: v.number(),
        expiresAt: v.string(),
        lastUsedAt: v.optional(v.string()),
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_uid", ["uid"]).index("by_template", ["templateId"]).index("by_expiry", ["expiresAt"]),

    ticket_transactions: defineTable({
        uid: v.string(),
        templateId: v.string(),
        quantity: v.number(),
        transactionType: v.string(), // "purchase", "reward", "usage", "expiry", "refund"
        source: v.string(), // "shop", "tournament", "achievement", "gift"
        context: v.object({
            tournamentId: v.optional(v.string()),
            matchId: v.optional(v.string()),
            bundleId: v.optional(v.string()),
        }),
        createdAt: v.string(),
    }).index("by_uid", ["uid"]).index("by_template", ["templateId"]).index("by_type", ["transactionType"]),

    ticket_bundles: defineTable({
        bundleId: v.string(),
        name: v.string(),
        description: v.string(),
        tickets: v.array(v.object({
            templateId: v.string(),
            quantity: v.number(),
        })),
        price: v.object({
            coins: v.number(),
            realMoney: v.optional(v.number()),
            discount: v.optional(v.number()),
        }),
        validityDays: v.number(),
        maxPurchases: v.optional(v.number()),
        isActive: v.boolean(),
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_bundleId", ["bundleId"]).index("by_active", ["isActive"]),

    bundle_purchases: defineTable({
        uid: v.string(),
        bundleId: v.string(),
        quantity: v.number(),
        totalPrice: v.object({
            coins: v.number(),
            realMoney: v.optional(v.number()),
        }),
        createdAt: v.string(),
    }).index("by_uid", ["uid"]).index("by_bundle", ["bundleId"]),

    ticket_usage_stats: defineTable({
        uid: v.string(),
        templateId: v.string(),
        totalUsed: v.number(),
        totalWon: v.number(),
        totalLost: v.number(),
        winRate: v.number(),
        lastUsedAt: v.string(),
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_uid", ["uid"]).index("by_template", ["templateId"]),

    ticket_recommendations: defineTable({
        uid: v.string(),
        templateId: v.string(),
        reason: v.string(), // "popular", "trending", "personalized", "promotion"
        score: v.number(),
        expiresAt: v.string(),
        createdAt: v.string(),
    }).index("by_uid", ["uid"]).index("by_score", ["score"]).index("by_expiry", ["expiresAt"]),
}; 