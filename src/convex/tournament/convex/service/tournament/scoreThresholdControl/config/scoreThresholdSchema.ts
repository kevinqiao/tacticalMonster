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

    // 比赛结果表（统一存储所有比赛数据，包含种子信息）
    match_results: defineTable({
        matchId: v.string(),
        seed: v.string(),          // 种子标识
        uid: v.string(),           // 玩家用户ID
        score: v.number(),         // 玩家得分
        rank: v.number(),          // 玩家排名
        points: v.number(),        // 玩家获得的积分
        segmentName: v.optional(v.string()), // 玩家当前段位（可选）
        createdAt: v.string()      // 记录创建时间
    })
        .index("by_matchId", ["matchId"])
        .index("by_seed", ["seed"])
        .index("by_uid", ["uid"])
        .index("by_createdAt", ["createdAt"])
        .index("by_seed_created", ["seed", "createdAt"]) // 复合索引，用于增量查询
        .index("by_score", ["score"])                    // 按得分查询
        .index("by_rank", ["rank"])                      // 按排名查询
        .index("by_points", ["points"])                  // 按积分查询
        .index("by_segment", ["segmentName"])            // 按段位查询
        .index("by_uid_created", ["uid", "createdAt"]),  // 复合索引，用于玩家历史查询

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
        .index("by_createdAt", ["createdAt"]),

    // 种子统计缓存表
    seed_statistics_cache: defineTable({
        seed: v.string(),
        totalMatches: v.number(),
        lastAnalysisTime: v.string(),
        lastMatchCreatedAt: v.string(),
        scoreStats: v.object({
            totalScores: v.number(),
            averageScore: v.number(),
            minScore: v.number(),
            maxScore: v.number(),
            scoreCount: v.number()
        }),
        createdAt: v.string()
    })
        .index("by_seed", ["seed"])
        .index("by_lastAnalysisTime", ["lastAnalysisTime"])
        .index("by_totalMatches", ["totalMatches"])
};
