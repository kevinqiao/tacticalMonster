/**
 * 分数门槛控制系统数据库模式
 * 定义所有必要的表结构和索引
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

export default {
    // 分数门槛配置表
    score_threshold_configs: defineTable({
        uid: v.string(),
        segmentName: v.string(),
        scoreThresholds: v.array(v.object({
            minScore: v.number(),
            maxScore: v.number(),
            rankingProbabilities: v.array(v.number()), // 动态长度数组
            priority: v.number()
        })),
        baseRankingProbability: v.array(v.number()), // 动态长度数组
        maxRank: v.number(), // 新增字段
        adaptiveMode: v.boolean(),
        learningRate: v.number(),
        autoAdjustLearningRate: v.boolean(),
        createdAt: v.string(),
        updatedAt: v.string()
    })
        .index("by_uid", ["uid"])
        .index("by_segment", ["segmentName"])
        .index("by_adaptiveMode", ["adaptiveMode"]),

    // 玩家性能指标表
    player_performance_metrics: defineTable({
        uid: v.string(),
        totalMatches: v.number(),
        totalWins: v.number(),
        totalLosses: v.number(),
        totalPoints: v.number(),
        averageScore: v.number(),
        currentWinStreak: v.number(),
        currentLoseStreak: v.number(),
        bestScore: v.number(),
        worstScore: v.number(),
        lastUpdated: v.string()
    })
        .index("by_uid", ["uid"])
        .index("by_totalMatches", ["totalMatches"])
        .index("by_totalPoints", ["totalPoints"])
        .index("by_winStreak", ["currentWinStreak"])
        .index("by_loseStreak", ["currentLoseStreak"]),

    // 玩家保护状态表
    player_protection_status: defineTable({
        uid: v.string(),
        segmentName: v.string(),
        protectionLevel: v.number(),
        protectionThreshold: v.number(),
        demotionGracePeriod: v.number(),
        promotionStabilityPeriod: v.number(),
        lastSegmentChange: v.string(),
        createdAt: v.string(),
        updatedAt: v.string()
    })
        .index("by_uid", ["uid"])
        .index("by_segment", ["segmentName"])
        .index("by_protectionLevel", ["protectionLevel"]),

    // 段位变化历史表
    segment_change_history: defineTable({
        uid: v.string(),
        oldSegment: v.string(),
        newSegment: v.string(),
        changeType: v.union(v.literal("promotion"), v.literal("demotion")),
        reason: v.string(),
        matchId: v.optional(v.string()),
        createdAt: v.string()
    })
        .index("by_uid", ["uid"])
        .index("by_changeType", ["changeType"])
        .index("by_createdAt", ["createdAt"])
        .index("by_oldSegment", ["oldSegment"])
        .index("by_newSegment", ["newSegment"]),

    // 玩家比赛记录表
    player_match_records: defineTable({
        matchId: v.string(),
        uid: v.string(),
        score: v.number(),
        rank: v.number(),
        points: v.number(),
        createdAt: v.string()
    })
        .index("by_uid", ["uid"])
        .index("by_matchId", ["matchId"])
        .index("by_createdAt", ["createdAt"])
        .index("by_score", ["score"])
        .index("by_rank", ["rank"])
        .index("by_points", ["points"]),

    // 分数门槛比赛配置表
    score_threshold_match_configs: defineTable({
        matchId: v.string(),
        uid: v.string(),
        status: v.string(), // "active", "completed", "cancelled"
        targetRank: v.optional(v.number()),
        humanScore: v.optional(v.number()),
        aiScores: v.optional(v.array(v.number())),
        finalRankings: v.optional(v.array(v.object({
            uid: v.string(),
            score: v.number(),
            rank: v.number()
        }))),
        createdAt: v.string(),
        updatedAt: v.string()
    })
        .index("by_matchId", ["matchId"])
        .index("by_uid", ["uid"])
        .index("by_status", ["status"])
        .index("by_targetRank", ["targetRank"])
        .index("by_createdAt", ["createdAt"])
};
