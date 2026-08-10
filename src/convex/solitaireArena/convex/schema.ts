import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import { solitaireRecordedStep } from "./service/seedPool/solitaireSeedPoolValidators";

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
        actionStatus: v.optional(v.string()),
        status: v.number(),
        score: v.number(),
        moves: v.number(),
        /** 单人挑战 clear 线（结算 / HUD）；达标不终局 */
        targetScore: v.optional(v.number()),
        playStartedAt: v.optional(v.number()),
        /** 休闲 run 绝对截止时间（epoch ms），创局时写入 */
        dueTime: v.optional(v.number()),
        /** 创局时注册的 5 分钟超时 job，终局/强退后 cancel */
        casualTimeoutScheduledId: v.optional(v.id("_scheduled_functions")),
        /** 平台再战 epoch；与 portal `replayEpoch` 对齐，不等则重建局 */
        replayEpoch: v.optional(v.number()),
        seed: v.optional(v.string()),
        lastUpdate: v.optional(v.string()),
        recordedOps: v.optional(v.array(solitaireRecordedStep)),
        lastOpAt: v.optional(v.number()),
    }).index("by_gameId", ["gameId"]),

});
