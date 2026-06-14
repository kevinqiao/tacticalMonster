import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import {
    rolloutDistributionMetrics,
    rolloutTerminalReason,
    solitaireRecordedStep,
    solitaireSeedTier,
    tierCounts,
} from "./service/seedPool/solitaireSeedPoolValidators";

export default defineSchema({
    solitaire_seed_pool_meta: defineTable({
        poolVersion: v.string(),
        rolloutCount: v.number(),
        matchTimeLimitSec: v.number(),
        generatedAt: v.string(),
        entryCount: v.number(),
        tierCounts: v.optional(tierCounts),
        isActive: v.boolean(),
        importStatus: v.optional(v.union(v.literal("importing"), v.literal("ready"))),
        importedAt: v.number(),
    })
        .index("by_poolVersion", ["poolVersion"])
        .index("by_isActive", ["isActive"]),

    solitaire_seed_pool_entries: defineTable({
        poolVersion: v.string(),
        seedId: v.string(),
        tier: solitaireSeedTier,
        difficultyScore: v.number(),
        metrics: rolloutDistributionMetrics,
    })
        .index("by_poolVersion", ["poolVersion"])
        .index("by_poolVersion_and_seedId", ["poolVersion", "seedId"])
        .index("by_poolVersion_and_tier", ["poolVersion", "tier"])
        .index("by_poolVersion_and_difficultyScore", ["poolVersion", "difficultyScore"]),

    solitaire_seed_pool_rollout_summaries: defineTable({
        poolVersion: v.string(),
        seedId: v.string(),
        rolloutIndex: v.number(),
        finalScore: v.number(),
        moves: v.number(),
        completed: v.boolean(),
        terminalReason: rolloutTerminalReason,
        elapsedSimSeconds: v.number(),
        opCount: v.number(),
    })
        .index("by_poolVersion", ["poolVersion"])
        .index("by_poolVersion_and_seedId", ["poolVersion", "seedId"])
        .index("by_poolVersion_and_seedId_and_rolloutIndex", [
            "poolVersion",
            "seedId",
            "rolloutIndex",
        ]),

    /** 真人 loadGame 后写入；pick 阶段仅写 match_seed_picks */
    player_seeds: defineTable({
        uid: v.string(),
        seedId: v.string(),
        poolVersion: v.string(),
        matchId: v.optional(v.string()),
        usedAt: v.number(),
    })
        .index("by_uid_and_poolVersion", ["uid", "poolVersion"])
        .index("by_uid_poolVersion_and_seedId", ["uid", "poolVersion", "seedId"])
        .index("by_matchId", ["matchId"]),

    /** 开桌 pick 快照（不写 player_seeds；loadGame 时再 record） */
    match_seed_picks: defineTable({
        matchId: v.string(),
        seedId: v.string(),
        poolVersion: v.string(),
        uids: v.array(v.string()),
        sessionKey: v.string(),
        pickedAt: v.number(),
    }).index("by_matchId", ["matchId"]),

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
        playStartedAt: v.optional(v.number()),
        /** 休闲 run 绝对截止时间（epoch ms），创局时写入 */
        dueTime: v.optional(v.number()),
        /** 创局时注册的 5 分钟超时 job，终局/强退后 cancel */
        casualTimeoutScheduledId: v.optional(v.id("_scheduled_functions")),
        seed: v.optional(v.string()),
        lastUpdate: v.optional(v.string()),
        recordedOps: v.optional(v.array(solitaireRecordedStep)),
        lastOpAt: v.optional(v.number()),
    }).index("by_gameId", ["gameId"]),

});