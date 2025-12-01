import { defineTable } from "convex/server";
import { v } from "convex/values";

export const rewardSchema = {
    // 奖励发放记录表
    reward_grants: defineTable({
        uid: v.string(),
        rewards: v.object({
            coins: v.optional(v.number()),
            gems: v.optional(v.number()),
            seasonPoints: v.optional(v.number()),
            prestige: v.optional(v.number()),
            exp: v.optional(v.number()),
            props: v.optional(v.array(v.object({
                gameType: v.string(),
                propType: v.string(),
                quantity: v.number(),
                rarity: v.optional(v.string()),
            }))),
            tickets: v.optional(v.array(v.object({
                type: v.string(),
                quantity: v.number(),
            }))),
            monsters: v.optional(v.array(v.object({
                monsterId: v.string(),
                level: v.optional(v.number()),
                stars: v.optional(v.number()),
            }))),
            monsterShards: v.optional(v.array(v.object({
                monsterId: v.string(),
                quantity: v.number(),
            }))),
            energy: v.optional(v.number()),
            exclusiveItems: v.optional(v.array(v.object({
                itemId: v.string(),
                itemType: v.string(),
                quantity: v.number(),
            }))),
        }),
        source: v.string(),
        sourceId: v.optional(v.string()),
        metadata: v.optional(v.any()),
        status: v.union(
            v.literal("pending"),
            v.literal("granted"),
            v.literal("failed"),
            v.literal("partial")
        ),
        grantedAt: v.optional(v.string()),
        errorMessage: v.optional(v.string()),
        createdAt: v.string(),
    }).index("by_uid", ["uid"])
        .index("by_source", ["source", "sourceId"])
        .index("by_status", ["status"])
        .index("by_uid_source", ["uid", "source"]),
};

