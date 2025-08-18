/**
 * 锦标赛规则系统数据库Schema
 * 支持段位和Battle Pass积分独立设计
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

// ==================== 锦标赛规则表 ====================

/**
 * 锦标赛规则表
 */
export const tournamentRulesTable = defineTable({
    // 基础信息
    tournamentId: v.string(),           // 锦标赛ID
    gameType: v.string(),               // 游戏类型
    tournamentType: v.string(),         // 锦标赛类型

    // 参与规则
    minPlayers: v.number(),             // 最小玩家数
    maxPlayers: v.number(),             // 最大玩家数
    timeLimit: v.number(),              // 时间限制（分钟）

    // 积分规则
    pointMultiplier: v.number(),        // 全局积分倍数
    enableRankPoints: v.boolean(),      // 是否启用段位积分
    enableSeasonPoints: v.boolean(),    // 是否启用赛季积分
    enablePrestigePoints: v.boolean(),  // 是否启用声望积分
    enableAchievementPoints: v.boolean(), // 是否启用成就积分
    enableTournamentPoints: v.boolean(),  // 是否启用锦标赛积分

    // 段位相关规则
    segmentBasedScoring: v.boolean(),   // 是否基于段位调整积分
    segmentBonusMultiplier: v.number(), // 段位奖励倍数

    // 限制规则
    maxAttemptsPerPlayer: v.number(),   // 每个玩家最大尝试次数
    dailyLimit: v.number(),             // 每日参与限制
    weeklyLimit: v.number(),            // 每周参与限制

    // 时间规则
    startTime: v.string(),              // 开始时间
    endTime: v.string(),                // 结束时间
    registrationDeadline: v.string(),   // 注册截止时间

    // 元数据
    createdAt: v.string(),              // 创建时间
    updatedAt: v.string(),              // 更新时间
    createdBy: v.string(),              // 创建者
    isActive: v.boolean(),              // 是否激活
    version: v.string()                 // 规则版本
})
    .index("by_tournament_id", ["tournamentId"])
    .index("by_game_type", ["gameType"])
    .index("by_tournament_type", ["tournamentType"])
    .index("by_active", ["isActive"])
    .index("by_created_by", ["createdBy"]);

// ==================== 积分记录表 ====================

/**
 * 锦标赛积分记录表
 */
export const tournamentPointRecordsTable = defineTable({
    // 基础信息
    tournamentId: v.string(),           // 锦标赛ID
    uid: v.string(),                    // 玩家ID
    matchId: v.string(),                // 比赛ID
    matchRank: v.number(),              // 比赛排名
    matchScore: v.number(),             // 比赛分数
    matchDuration: v.number(),          // 比赛时长（秒）

    // 段位信息
    segmentName: v.string(),            // 段位名称
    segmentTier: v.number(),            // 段位等级

    // 积分详情
    points: v.object({
        rankPoints: v.number(),         // 段位积分
        seasonPoints: v.number(),       // 赛季积分
        prestigePoints: v.number(),     // 声望积分
        achievementPoints: v.number(),  // 成就积分
        tournamentPoints: v.number()    // 锦标赛积分
    }),

    // 奖励信息
    bonuses: v.optional(v.array(v.object({
        type: v.string(),               // 奖励类型
        description: v.string(),        // 奖励描述
        multiplier: v.number()          // 奖励倍数
    }))),

    // 元数据
    createdAt: v.string(),              // 创建时间
    calculatedAt: v.string(),           // 计算时间
    source: v.string()                  // 积分来源
})
    .index("by_tournament_uid", ["tournamentId", "uid"])
    .index("by_uid_tournament", ["uid", "tournamentId"])
    .index("by_match_id", ["matchId"])
    .index("by_segment", ["segmentName"])
    .index("by_created_at", ["createdAt"])
    .index("by_tournament_rank", ["tournamentId", "matchRank"]);

// ==================== 段位积分规则表 ====================

/**
 * 段位积分规则表
 */
export const segmentPointRulesTable = defineTable({
    // 段位信息
    segmentName: v.string(),            // 段位名称
    segmentTier: v.number(),            // 段位等级

    // 基础配置
    baseMultiplier: v.number(),         // 基础倍数
    bonusMultiplier: v.number(),        // 奖励倍数
    protectionBonus: v.number(),        // 保护期奖励
    demotionPenalty: v.number(),        // 降级惩罚

    // 段位特定积分配置
    rankPointsConfig: v.object({
        basePoints: v.number(),         // 基础积分
        bonusMultiplier: v.number(),    // 奖励倍数
        maxPoints: v.number()           // 最大积分
    }),

    seasonPointsConfig: v.object({
        basePoints: v.number(),         // 基础积分
        bonusMultiplier: v.number(),    // 奖励倍数
        maxPoints: v.number()           // 最大积分
    }),

    // 元数据
    createdAt: v.string(),              // 创建时间
    updatedAt: v.string(),              // 更新时间
    isActive: v.boolean(),              // 是否激活
    version: v.string()                 // 规则版本
})
    .index("by_segment_name", ["segmentName"])
    .index("by_segment_tier", ["segmentTier"])
    .index("by_active", ["isActive"]);

// ==================== 排名积分配置表 ====================

/**
 * 排名积分配置表
 */
export const rankPointConfigsTable = defineTable({
    // 排名信息
    rank: v.number(),                   // 排名
    rankName: v.string(),               // 排名名称（如：1st, 2nd, 3rd）

    // 各类积分配置
    rankPoints: v.object({
        pointType: v.string(),          // 积分类型
        basePoints: v.number(),         // 基础积分
        bonusMultiplier: v.number(),    // 奖励倍数
        maxPoints: v.number(),          // 最大积分上限
        minPoints: v.number()           // 最小积分下限
    }),

    seasonPoints: v.object({
        pointType: v.string(),          // 积分类型
        basePoints: v.number(),         // 基础积分
        bonusMultiplier: v.number(),    // 奖励倍数
        maxPoints: v.number(),          // 最大积分上限
        minPoints: v.number()           // 最小积分下限
    }),

    prestigePoints: v.object({
        pointType: v.string(),          // 积分类型
        basePoints: v.number(),         // 基础积分
        bonusMultiplier: v.number(),    // 奖励倍数
        maxPoints: v.number(),          // 最大积分上限
        minPoints: v.number()           // 最小积分下限
    }),

    achievementPoints: v.object({
        pointType: v.string(),          // 积分类型
        basePoints: v.number(),         // 基础积分
        bonusMultiplier: v.number(),    // 奖励倍数
        maxPoints: v.number(),          // 最大积分上限
        minPoints: v.number()           // 最小积分下限
    }),

    tournamentPoints: v.object({
        pointType: v.string(),          // 积分类型
        basePoints: v.number(),         // 基础积分
        bonusMultiplier: v.number(),    // 奖励倍数
        maxPoints: v.number(),          // 最大积分上限
        minPoints: v.number()           // 最小积分下限
    }),

    // 元数据
    createdAt: v.string(),              // 创建时间
    updatedAt: v.string(),              // 更新时间
    isActive: v.boolean(),              // 是否激活
    version: v.string()                 // 规则版本
})
    .index("by_rank", ["rank"])
    .index("by_active", ["isActive"]);

// ==================== 奖励规则表 ====================

/**
 * 奖励规则表
 */
export const bonusRulesTable = defineTable({
    // 规则信息
    ruleId: v.string(),                 // 规则ID
    ruleName: v.string(),               // 规则名称
    ruleType: v.string(),               // 规则类型

    // 规则条件
    condition: v.object({
        type: v.string(),               // 条件类型
        value: v.any(),                 // 条件值
        operator: v.string()            // 操作符
    }),

    // 奖励配置
    rewards: v.array(v.object({
        pointType: v.string(),          // 积分类型
        amount: v.number(),             // 奖励数量
        multiplier: v.optional(v.number()) // 奖励倍数
    })),

    // 规则描述
    description: v.string(),            // 规则描述
    category: v.string(),               // 规则分类

    // 应用范围
    applicableSegments: v.optional(v.array(v.string())), // 适用段位
    applicableGameTypes: v.optional(v.array(v.string())), // 适用游戏类型
    applicableTournamentTypes: v.optional(v.array(v.string())), // 适用锦标赛类型

    // 元数据
    createdAt: v.string(),              // 创建时间
    updatedAt: v.string(),              // 更新时间
    isActive: v.boolean(),              // 是否激活
    priority: v.number(),               // 优先级
    version: v.string()                 // 规则版本
})
    .index("by_rule_id", ["ruleId"])
    .index("by_rule_type", ["ruleType"])
    .index("by_category", ["category"])
    .index("by_active", ["isActive"])
    .index("by_priority", ["priority"]);

// ==================== 积分统计表 ====================

/**
 * 玩家积分统计表
 */
export const playerPointStatsTable = defineTable({
    // 玩家信息
    uid: v.string(),                    // 玩家ID
    seasonId: v.string(),               // 赛季ID

    // 积分统计
    totalRankPoints: v.number(),        // 总段位积分
    totalSeasonPoints: v.number(),      // 总赛季积分
    totalPrestigePoints: v.number(),    // 总声望积分
    totalAchievementPoints: v.number(), // 总成就积分
    totalTournamentPoints: v.number(),  // 总锦标赛积分

    // 段位统计
    currentSegment: v.string(),         // 当前段位
    segmentProgress: v.number(),        // 段位进度
    segmentMatches: v.number(),         // 段位比赛数

    // 锦标赛统计
    tournamentCount: v.number(),        // 锦标赛参与数
    tournamentWins: v.number(),         // 锦标赛胜利数
    bestTournamentRank: v.number(),     // 最佳锦标赛排名

    // 元数据
    lastUpdated: v.string(),            // 最后更新时间
    seasonStartDate: v.string(),        // 赛季开始时间
    seasonEndDate: v.string()           // 赛季结束时间
})
    .index("by_uid_season", ["uid", "seasonId"])
    .index("by_season", ["seasonId"])
    .index("by_segment", ["currentSegment"])
    .index("by_last_updated", ["lastUpdated"]);

// ==================== 积分历史表 ====================

/**
 * 积分历史记录表
 */
export const pointHistoryTable = defineTable({
    // 基础信息
    uid: v.string(),                    // 玩家ID
    tournamentId: v.string(),           // 锦标赛ID
    matchId: v.string(),                // 比赛ID

    // 积分变化
    pointChanges: v.object({
        rankPoints: v.number(),         // 段位积分变化
        seasonPoints: v.number(),       // 赛季积分变化
        prestigePoints: v.number(),     // 声望积分变化
        achievementPoints: v.number(),  // 成就积分变化
        tournamentPoints: v.number()    // 锦标赛积分变化
    }),

    // 变化原因
    changeReason: v.string(),           // 变化原因
    changeType: v.string(),             // 变化类型（增加/减少）
    changeSource: v.string(),           // 变化来源

    // 变化前积分
    previousPoints: v.optional(v.object({
        rankPoints: v.number(),
        seasonPoints: v.number(),
        prestigePoints: v.number(),
        achievementPoints: v.number(),
        tournamentPoints: v.number()
    })),

    // 变化后积分
    currentPoints: v.optional(v.object({
        rankPoints: v.number(),
        seasonPoints: v.number(),
        prestigePoints: v.number(),
        achievementPoints: v.number(),
        tournamentPoints: v.number()
    })),

    // 元数据
    createdAt: v.string(),              // 创建时间
    processedAt: v.string()             // 处理时间
})
    .index("by_uid", ["uid"])
    .index("by_tournament", ["tournamentId"])
    .index("by_match", ["matchId"])
    .index("by_created_at", ["createdAt"])
    .index("by_change_type", ["changeType"]);

// ==================== 导出Schema ====================

export const tournamentRulesSchema = {
    // 锦标赛规则相关表
    tournament_rules: tournamentRulesTable,
    tournament_point_records: tournamentPointRecordsTable,
    segment_point_rules: segmentPointRulesTable,
    rank_point_configs: rankPointConfigsTable,
    bonus_rules: bonusRulesTable,

    // 积分统计相关表
    player_point_stats: playerPointStatsTable,
    point_history: pointHistoryTable
};
