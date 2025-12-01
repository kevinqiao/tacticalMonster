import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { RewardService } from "./rewardService";

/**
 * 发放奖励（统一接口）
 */
export const grantRewards = mutation({
    args: {
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
        gameType: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        return await RewardService.grantRewards(ctx, {
            uid: args.uid,
            rewards: args.rewards,
            source: {
                source: args.source,
                sourceId: args.sourceId,
                metadata: args.metadata,
            },
            gameType: args.gameType,
        });
    },
});

