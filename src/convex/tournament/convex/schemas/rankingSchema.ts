/**
 * 分数门槛控制系统数据库模式
 * 定义所有必要的表结构和索引
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

export const rankingSchema = {
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

    // 玩家性能指标表（用于缓存 PlayerPerformanceProfile，按游戏类型）
    player_performance_metrics: defineTable({
        uid: v.string(),
        gameType: v.optional(v.string()),  // 游戏类型（新增）
        totalMatches: v.number(),
        totalWins: v.number(),
        totalLosses: v.number(),
        averageScore: v.number(),
        averageRank: v.number(),            // 平均排名（新增）
        currentWinStreak: v.number(),
        currentLoseStreak: v.number(),
        bestScore: v.number(),
        worstScore: v.number(),
        bestRank: v.number(),               // 最佳排名（新增）
        worstRank: v.number(),              // 最差排名（新增）
        consistency: v.number(),            // 一致性（新增）
        trendDirection: v.union(v.literal("improving"), v.literal("declining"), v.literal("stable")),  // 趋势（新增）
        lastUpdated: v.string()
    })
        .index("by_uid", ["uid"])
        .index("by_gameType", ["gameType"])
        .index("by_uid_gameType", ["uid", "gameType"])  // 复合索引：按玩家和游戏类型查询
        .index("by_totalMatches", ["totalMatches"])
        .index("by_winStreak", ["currentWinStreak"])
        .index("by_loseStreak", ["currentLoseStreak"]),





    // 比赛结果表（统一存储所有比赛数据，包含种子信息）
    // match_results: defineTable({
    //     matchId: v.string(),
    //     seed: v.string(),          // 种子标识
    //     uid: v.string(),           // 玩家用户ID
    //     score: v.number(),         // 玩家得分
    //     rank: v.number(),          // 玩家排名
    //     segmentName: v.optional(v.string()), // 玩家当前段位（可选）
    //     createdAt: v.string()      // 记录创建时间
    // })
    //     .index("by_matchId", ["matchId"])
    //     .index("by_seed", ["seed"])
    //     .index("by_uid", ["uid"])
    //     .index("by_createdAt", ["createdAt"])
    //     .index("by_seed_created", ["seed", "createdAt"]) // 复合索引，用于增量查询
    //     .index("by_score", ["score"])                    // 按得分查询
    //     .index("by_rank", ["rank"])                      // 按排名查询
    //     .index("by_segment", ["segmentName"])            // 按段位查询
    //     .index("by_uid_created", ["uid", "createdAt"]),  // 复合索引，用于玩家历史查询

    // 分数门槛比赛配置表
    score_threshold_match_configs: defineTable({
        matchId: v.string(),
        uid: v.string(),
        status: v.string(), // "active", "completed", "cancelled"
        aiCount: v.number(), // AI数量在创建match时确定
        targetRank: v.optional(v.number()),
        humanScore: v.optional(v.number()),
        // aiScores: v.optional(v.array(v.number())), // 移除：AI分数应该在提交分数后智能生成
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
        .index("by_aiCount", ["aiCount"]) // 新增：按AI数量查询
        .index("by_targetRank", ["targetRank"])
        .index("by_createdAt", ["createdAt"]),

    // 种子统计缓存表
    seed_statistics_cache: defineTable({
        seed: v.string(),
        totalMatches: v.number(),
        difficultyLevel: v.string(),        // 新增：难度等级
        difficultyCoefficient: v.number(),  // 新增：难度系数
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
        .index("by_difficulty", ["difficultyLevel"])        // 新增：按难度查询
        .index("by_lastAnalysisTime", ["lastAnalysisTime"])
        .index("by_totalMatches", ["totalMatches"]),



    // 用户反馈表（用于改进推荐算法）
    user_feedback: defineTable({
        uid: v.string(),
        seedId: v.string(),
        feedback: v.object({
            difficulty: v.union(v.literal("too_easy"), v.literal("just_right"), v.literal("too_hard")),
            enjoyment: v.optional(v.number()),
            completionTime: v.optional(v.number()),
            retryCount: v.optional(v.number())
        }),
        createdAt: v.string()
    })
        .index("by_uid", ["uid"])
        .index("by_seedId", ["seedId"])
        .index("by_createdAt", ["createdAt"])
        .index("by_difficulty", ["feedback.difficulty"]),

    // 玩家画像表
    player_personalization_profiles: defineTable({
        uid: v.string(),
        preferences: v.object({
            challengeLevel: v.union(v.literal("easy"), v.literal("normal"), v.literal("hard"), v.literal("extreme")),
            competitionStyle: v.union(v.literal("conservative"), v.literal("balanced"), v.literal("aggressive")),
            focusArea: v.union(v.literal("ranking"), v.literal("score"), v.literal("improvement"), v.literal("fun")),
            riskTolerance: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
            playTime: v.union(v.literal("morning"), v.literal("afternoon"), v.literal("evening"), v.literal("night")),
            sessionLength: v.union(v.literal("short"), v.literal("medium"), v.literal("long"))
        }),
        behavioralPatterns: v.object({
            playFrequency: v.union(v.literal("daily"), v.literal("weekly"), v.literal("casual")),
            retryBehavior: v.union(v.literal("persistent"), v.literal("occasional"), v.literal("rare")),
            goalOrientation: v.union(v.literal("competitive"), v.literal("casual"), v.literal("social")),
            learningStyle: v.union(v.literal("explorer"), v.literal("achiever"), v.literal("socializer"), v.literal("killer")),
            stressResponse: v.union(v.literal("calm"), v.literal("moderate"), v.literal("anxious"))
        }),
        performanceHistory: v.object({
            bestRank: v.number(),
            worstRank: v.number(),
            averageRank: v.number(),
            rankingTrend: v.union(v.literal("improving"), v.literal("declining"), v.literal("stable")),
            consistency: v.number(),
            riskTaking: v.number(),
            comebackAbility: v.number()
        }),
        psychologicalProfile: v.object({
            motivationType: v.union(v.literal("intrinsic"), v.literal("extrinsic"), v.literal("mixed")),
            feedbackPreference: v.union(v.literal("immediate"), v.literal("delayed"), v.literal("detailed")),
            socialInteraction: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
            achievementOrientation: v.union(v.literal("high"), v.literal("medium"), v.literal("low"))
        }),
        confidence: v.number(),
        dataQuality: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
        lastUpdated: v.string(),
        updateCount: v.number(),
        createdAt: v.string()
    })
        .index("by_uid", ["uid"])
        .index("by_lastUpdated", ["lastUpdated"])
        .index("by_updateCount", ["updateCount"]),

    // 玩家行为事件表
    player_behavior_events: defineTable({
        uid: v.string(),
        eventType: v.string(),
        eventData: v.any(),
        timestamp: v.string(),
        sessionId: v.optional(v.string())
    })
        .index("by_uid", ["uid"])
        .index("by_eventType", ["eventType"])
        .index("by_timestamp", ["timestamp"])
        .index("by_uid_timestamp", ["uid", "timestamp"]),

    // 系统监控事件表
    system_monitoring_events: defineTable({
        eventType: v.string(),
        eventData: v.any(),
        timestamp: v.string(),
        severity: v.union(v.literal("info"), v.literal("warning"), v.literal("error"), v.literal("critical"))
    })
        .index("by_eventType", ["eventType"])
        .index("by_timestamp", ["timestamp"])
        .index("by_severity", ["severity"])
};
