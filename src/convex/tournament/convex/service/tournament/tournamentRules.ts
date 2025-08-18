/**
 * 锦标赛规则系统 - 支持段位和Battle Pass积分独立设计
 * 重新定义锦标赛规则，支持多种积分类型的独立计算和分配
 */

import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { SegmentPromotionDemotionManager } from "../segment/segmentPromotionDemotionManager";

// ==================== 积分类型定义 ====================

/**
 * 积分类型枚举
 */
export enum PointType {
    RANK_POINTS = "rankPoints",           // 段位积分 - 用于段位升降级
    SEASON_POINTS = "seasonPoints",       // 赛季积分 - 用于Battle Pass升级
    PRESTIGE_POINTS = "prestigePoints",   // 声望积分 - 用于特殊成就和奖励
    ACHIEVEMENT_POINTS = "achievementPoints", // 成就积分 - 用于成就系统
    TOURNAMENT_POINTS = "tournamentPoints"    // 锦标赛积分 - 用于锦标赛排名
}

/**
 * 积分分配配置
 */
export interface PointAllocationConfig {
    pointType: PointType;
    basePoints: number;           // 基础积分
    bonusMultiplier: number;      // 奖励倍数
    maxPoints: number;            // 最大积分上限
    minPoints: number;            // 最小积分下限
}

/**
 * 排名积分配置
 */
export interface RankPointConfig {
    rank: number;                 // 排名 (1, 2, 3, 4...)
    rankPoints: PointAllocationConfig;      // 段位积分配置
    seasonPoints: PointAllocationConfig;    // 赛季积分配置
    prestigePoints: PointAllocationConfig;  // 声望积分配置
    achievementPoints: PointAllocationConfig; // 成就积分配置
    tournamentPoints: PointAllocationConfig;  // 锦标赛积分配置
}

// ==================== 锦标赛规则配置 ====================

/**
 * 锦标赛基础规则
 */
export interface TournamentBaseRules {
    tournamentId: string;
    gameType: string;
    tournamentType: string;

    // 参与规则
    minPlayers: number;           // 最小玩家数
    maxPlayers: number;           // 最大玩家数
    timeLimit: number;            // 时间限制（分钟）

    // 积分规则
    pointMultiplier: number;      // 全局积分倍数
    enableRankPoints: boolean;    // 是否启用段位积分
    enableSeasonPoints: boolean;  // 是否启用赛季积分
    enablePrestigePoints: boolean; // 是否启用声望积分
    enableAchievementPoints: boolean; // 是否启用成就积分
    enableTournamentPoints: boolean;  // 是否启用锦标赛积分

    // 段位相关规则
    segmentBasedScoring: boolean; // 是否基于段位调整积分
    segmentBonusMultiplier: number; // 段位奖励倍数

    // 限制规则
    maxAttemptsPerPlayer: number; // 每个玩家最大尝试次数
    dailyLimit: number;           // 每日参与限制
    weeklyLimit: number;          // 每周参与限制

    // 奖励规则
    bonusRules: BonusRule[];

    // 时间规则
    startTime: string;
    endTime: string;
    registrationDeadline: string;

    createdAt: string;
    updatedAt: string;
}

/**
 * 奖励规则
 */
export interface BonusRule {
    type: BonusRuleType;
    condition: BonusCondition;
    rewards: PointReward[];
    description: string;
}

/**
 * 奖励规则类型
 */
export enum BonusRuleType {
    WINNING_STREAK = "winning_streak",           // 连胜奖励
    PERFECT_SCORE = "perfect_score",             // 完美分数
    QUICK_WIN = "quick_win",                     // 快速获胜
    HIGH_SCORE = "high_score",                   // 高分奖励
    FIRST_PLACE = "first_place",                 // 第一名奖励
    COMEBACK_WIN = "comeback_win",               // 翻盘获胜
    PERFECT_GAME = "perfect_game",               // 完美游戏
    SEASONAL_BONUS = "seasonal_bonus",           // 赛季奖励
    WEEKEND_BONUS = "weekend_bonus",             // 周末奖励
    NEW_PLAYER_BONUS = "new_player_bonus"        // 新玩家奖励
}

/**
 * 奖励条件
 */
export interface BonusCondition {
    type: string;
    value: any;
    operator: "equals" | "greater_than" | "less_than" | "greater_equal" | "less_equal" | "in_range";
}

/**
 * 积分奖励
 */
export interface PointReward {
    pointType: PointType;
    amount: number;
    multiplier?: number;
}

// ==================== 段位相关规则 ====================

/**
 * 段位积分规则
 */
export interface SegmentPointRules {
    segmentName: string;
    baseMultiplier: number;       // 基础倍数
    bonusMultiplier: number;      // 奖励倍数
    protectionBonus: number;      // 保护期奖励
    demotionPenalty: number;      // 降级惩罚

    // 段位特定积分配置
    rankPointsConfig: {
        basePoints: number;
        bonusMultiplier: number;
        maxPoints: number;
    };

    seasonPointsConfig: {
        basePoints: number;
        bonusMultiplier: number;
        maxPoints: number;
    };
}

/**
 * 段位升降级规则
 */
export interface SegmentPromotionDemotionRules {
    segmentName: string;

    // 升级条件
    promotion: {
        pointsRequired: number;        // 升级所需积分
        winRateRequired: number;       // 最低胜率要求
        stabilityPeriod: number;       // 稳定期（连续保持）
        minMatches: number;            // 最少比赛场次
        consecutiveWinsRequired?: number; // 连续胜利要求
    };

    // 降级条件
    demotion: {
        pointsThreshold: number;       // 降级积分阈值
        consecutiveLosses: number;     // 连续失败次数
        gracePeriod: number;           // 宽限期
        protectionLevels: number;      // 保护等级数量
        winRateThreshold?: number;     // 最低胜率阈值
    };

    // 段位关系
    nextSegment: string | null;        // 升级后的段位
    previousSegment: string | null;    // 降级后的段位
}

// ==================== 积分计算规则 ====================

/**
 * 积分计算规则
 */
export interface PointCalculationRules {
    // 基础积分计算
    basePoints: {
        useRankBased: boolean;         // 是否基于排名计算
        useScoreBased: boolean;        // 是否基于分数计算
        useTimeBased: boolean;         // 是否基于时间计算
        usePerformanceBased: boolean;  // 是否基于表现计算
    };

    // 奖励积分计算
    bonusPoints: {
        enableStreakBonus: boolean;    // 启用连胜奖励
        enablePerfectBonus: boolean;   // 启用完美奖励
        enableSpeedBonus: boolean;     // 启用速度奖励
        enableScoreBonus: boolean;     // 启用分数奖励
        enableSeasonalBonus: boolean;  // 启用赛季奖励
    };

    // 惩罚规则
    penalties: {
        enableDemotionPenalty: boolean;    // 启用降级惩罚
        enableInactivityPenalty: boolean;  // 启用不活跃惩罚
        enableCheatingPenalty: boolean;    // 启用作弊惩罚
    };
}

// ==================== 默认规则配置 ====================

/**
 * 默认段位积分规则
 */
export const DEFAULT_SEGMENT_POINT_RULES: Record<string, SegmentPointRules> = {
    bronze: {
        segmentName: "bronze",
        baseMultiplier: 1.0,
        bonusMultiplier: 1.2,
        protectionBonus: 1.1,
        demotionPenalty: 0.9,
        rankPointsConfig: {
            basePoints: 10,
            bonusMultiplier: 1.5,
            maxPoints: 50
        },
        seasonPointsConfig: {
            basePoints: 5,
            bonusMultiplier: 1.3,
            maxPoints: 25
        }
    },
    silver: {
        segmentName: "silver",
        baseMultiplier: 1.1,
        bonusMultiplier: 1.3,
        protectionBonus: 1.15,
        demotionPenalty: 0.85,
        rankPointsConfig: {
            basePoints: 15,
            bonusMultiplier: 1.6,
            maxPoints: 75
        },
        seasonPointsConfig: {
            basePoints: 8,
            bonusMultiplier: 1.4,
            maxPoints: 35
        }
    },
    gold: {
        segmentName: "gold",
        baseMultiplier: 1.2,
        bonusMultiplier: 1.4,
        protectionBonus: 1.2,
        demotionPenalty: 0.8,
        rankPointsConfig: {
            basePoints: 20,
            bonusMultiplier: 1.7,
            maxPoints: 100
        },
        seasonPointsConfig: {
            basePoints: 12,
            bonusMultiplier: 1.5,
            maxPoints: 50
        }
    },
    platinum: {
        segmentName: "platinum",
        baseMultiplier: 1.3,
        bonusMultiplier: 1.5,
        protectionBonus: 1.25,
        demotionPenalty: 0.75,
        rankPointsConfig: {
            basePoints: 25,
            bonusMultiplier: 1.8,
            maxPoints: 125
        },
        seasonPointsConfig: {
            basePoints: 15,
            bonusMultiplier: 1.6,
            maxPoints: 60
        }
    },
    diamond: {
        segmentName: "diamond",
        baseMultiplier: 1.4,
        bonusMultiplier: 1.6,
        protectionBonus: 1.3,
        demotionPenalty: 0.7,
        rankPointsConfig: {
            basePoints: 30,
            bonusMultiplier: 1.9,
            maxPoints: 150
        },
        seasonPointsConfig: {
            basePoints: 18,
            bonusMultiplier: 1.7,
            maxPoints: 70
        }
    },
    master: {
        segmentName: "master",
        baseMultiplier: 1.5,
        bonusMultiplier: 1.7,
        protectionBonus: 1.35,
        demotionPenalty: 0.65,
        rankPointsConfig: {
            basePoints: 35,
            bonusMultiplier: 2.0,
            maxPoints: 175
        },
        seasonPointsConfig: {
            basePoints: 20,
            bonusMultiplier: 1.8,
            maxPoints: 80
        }
    },
    grandmaster: {
        segmentName: "grandmaster",
        baseMultiplier: 1.6,
        bonusMultiplier: 1.8,
        protectionBonus: 1.4,
        demotionPenalty: 0.6,
        rankPointsConfig: {
            basePoints: 40,
            bonusMultiplier: 2.1,
            maxPoints: 200
        },
        seasonPointsConfig: {
            basePoints: 25,
            bonusMultiplier: 1.9,
            maxPoints: 100
        }
    }
};

/**
 * 默认排名积分配置
 */
export const DEFAULT_RANK_POINT_CONFIGS: RankPointConfig[] = [
    {
        rank: 1,
        rankPoints: { pointType: PointType.RANK_POINTS, basePoints: 50, bonusMultiplier: 2.0, maxPoints: 200, minPoints: 25 },
        seasonPoints: { pointType: PointType.SEASON_POINTS, basePoints: 25, bonusMultiplier: 1.8, maxPoints: 100, minPoints: 15 },
        prestigePoints: { pointType: PointType.PRESTIGE_POINTS, basePoints: 10, bonusMultiplier: 1.5, maxPoints: 50, minPoints: 5 },
        achievementPoints: { pointType: PointType.ACHIEVEMENT_POINTS, basePoints: 5, bonusMultiplier: 1.2, maxPoints: 25, minPoints: 2 },
        tournamentPoints: { pointType: PointType.TOURNAMENT_POINTS, basePoints: 100, bonusMultiplier: 2.5, maxPoints: 500, minPoints: 50 }
    },
    {
        rank: 2,
        rankPoints: { pointType: PointType.RANK_POINTS, basePoints: 30, bonusMultiplier: 1.5, maxPoints: 120, minPoints: 15 },
        seasonPoints: { pointType: PointType.SEASON_POINTS, basePoints: 15, bonusMultiplier: 1.3, maxPoints: 60, minPoints: 10 },
        prestigePoints: { pointType: PointType.PRESTIGE_POINTS, basePoints: 6, bonusMultiplier: 1.2, maxPoints: 30, minPoints: 3 },
        achievementPoints: { pointType: PointType.ACHIEVEMENT_POINTS, basePoints: 3, bonusMultiplier: 1.1, maxPoints: 15, minPoints: 1 },
        tournamentPoints: { pointType: PointType.TOURNAMENT_POINTS, basePoints: 60, bonusMultiplier: 1.8, maxPoints: 300, minPoints: 30 }
    },
    {
        rank: 3,
        rankPoints: { pointType: PointType.RANK_POINTS, basePoints: 20, bonusMultiplier: 1.2, maxPoints: 80, minPoints: 10 },
        seasonPoints: { pointType: PointType.SEASON_POINTS, basePoints: 10, bonusMultiplier: 1.1, maxPoints: 40, minPoints: 5 },
        prestigePoints: { pointType: PointType.PRESTIGE_POINTS, basePoints: 4, bonusMultiplier: 1.0, maxPoints: 20, minPoints: 2 },
        achievementPoints: { pointType: PointType.ACHIEVEMENT_POINTS, basePoints: 2, bonusMultiplier: 1.0, maxPoints: 10, minPoints: 1 },
        tournamentPoints: { pointType: PointType.TOURNAMENT_POINTS, basePoints: 40, bonusMultiplier: 1.3, maxPoints: 200, minPoints: 20 }
    },
    {
        rank: 4,
        rankPoints: { pointType: PointType.RANK_POINTS, basePoints: 10, bonusMultiplier: 1.0, maxPoints: 40, minPoints: 5 },
        seasonPoints: { pointType: PointType.SEASON_POINTS, basePoints: 5, bonusMultiplier: 1.0, maxPoints: 20, minPoints: 2 },
        prestigePoints: { pointType: PointType.PRESTIGE_POINTS, basePoints: 2, bonusMultiplier: 1.0, maxPoints: 10, minPoints: 1 },
        achievementPoints: { pointType: PointType.ACHIEVEMENT_POINTS, basePoints: 1, bonusMultiplier: 1.0, maxPoints: 5, minPoints: 0 },
        tournamentPoints: { pointType: PointType.TOURNAMENT_POINTS, basePoints: 20, bonusMultiplier: 1.0, maxPoints: 100, minPoints: 10 }
    }
];

// ==================== 规则管理函数 ====================

/**
 * 获取段位积分规则
 */
export const getSegmentPointRules = query({
    args: { segmentName: v.string() },
    handler: async (ctx, args) => {
        return DEFAULT_SEGMENT_POINT_RULES[args.segmentName] || null;
    }
});

/**
 * 获取排名积分配置
 */
export const getRankPointConfigs = query({
    args: {},
    handler: async (ctx) => {
        return DEFAULT_RANK_POINT_CONFIGS;
    }
});

/**
 * 获取特定排名的积分配置
 */
export const getRankPointConfig = query({
    args: { rank: v.number() },
    handler: async (ctx, args) => {
        return DEFAULT_RANK_POINT_CONFIGS.find(config => config.rank === args.rank) || null;
    }
});

/**
 * 验证锦标赛规则
 */
export const validateTournamentRules = mutation({
    args: {
        rules: v.object({
            tournamentId: v.string(),
            gameType: v.string(),
            tournamentType: v.string(),
            minPlayers: v.number(),
            maxPlayers: v.number(),
            timeLimit: v.number(),
            pointMultiplier: v.number(),
            enableRankPoints: v.boolean(),
            enableSeasonPoints: v.boolean(),
            enablePrestigePoints: v.boolean(),
            enableAchievementPoints: v.boolean(),
            enableTournamentPoints: v.boolean(),
            segmentBasedScoring: v.boolean(),
            segmentBonusMultiplier: v.number(),
            maxAttemptsPerPlayer: v.number(),
            dailyLimit: v.number(),
            weeklyLimit: v.number(),
            startTime: v.string(),
            endTime: v.string(),
            registrationDeadline: v.string()
        })
    },
    handler: async (ctx, args) => {
        const { rules } = args;
        const errors: string[] = [];

        // 验证基础规则
        if (rules.minPlayers < 2) {
            errors.push("最小玩家数不能少于2");
        }
        if (rules.maxPlayers < rules.minPlayers) {
            errors.push("最大玩家数不能少于最小玩家数");
        }
        if (rules.maxPlayers > 100) {
            errors.push("最大玩家数不能超过100");
        }
        if (rules.timeLimit < 1 || rules.timeLimit > 1440) {
            errors.push("时间限制必须在1-1440分钟之间");
        }
        if (rules.pointMultiplier < 0.1 || rules.pointMultiplier > 10) {
            errors.push("积分倍数必须在0.1-10之间");
        }
        if (rules.segmentBonusMultiplier < 0.5 || rules.segmentBonusMultiplier > 5) {
            errors.push("段位奖励倍数必须在0.5-5之间");
        }

        // 验证时间规则
        const startTime = new Date(rules.startTime);
        const endTime = new Date(rules.endTime);
        const registrationDeadline = new Date(rules.registrationDeadline);
        const now = new Date();

        if (startTime <= now) {
            errors.push("开始时间必须在当前时间之后");
        }
        if (endTime <= startTime) {
            errors.push("结束时间必须在开始时间之后");
        }
        if (registrationDeadline >= startTime) {
            errors.push("注册截止时间必须在开始时间之前");
        }

        // 验证限制规则
        if (rules.maxAttemptsPerPlayer < 1) {
            errors.push("每个玩家最大尝试次数不能少于1");
        }
        if (rules.dailyLimit < 1) {
            errors.push("每日限制不能少于1");
        }
        if (rules.weeklyLimit < rules.dailyLimit) {
            errors.push("每周限制不能少于每日限制");
        }

        // 验证至少启用一种积分类型
        const enabledPointTypes = [
            rules.enableRankPoints,
            rules.enableSeasonPoints,
            rules.enablePrestigePoints,
            rules.enableAchievementPoints,
            rules.enableTournamentPoints
        ];

        if (!enabledPointTypes.some(enabled => enabled)) {
            errors.push("至少需要启用一种积分类型");
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
});

/**
 * 创建自定义锦标赛规则
 */
export const createCustomTournamentRules = mutation({
    args: {
        rules: v.object({
            tournamentId: v.string(),
            gameType: v.string(),
            tournamentType: v.string(),
            minPlayers: v.number(),
            maxPlayers: v.number(),
            timeLimit: v.number(),
            pointMultiplier: v.number(),
            enableRankPoints: v.boolean(),
            enableSeasonPoints: v.boolean(),
            enablePrestigePoints: v.boolean(),
            enableAchievementPoints: v.boolean(),
            enableTournamentPoints: v.boolean(),
            segmentBasedScoring: v.boolean(),
            segmentBonusMultiplier: v.number(),
            maxAttemptsPerPlayer: v.number(),
            dailyLimit: v.number(),
            weeklyLimit: v.number(),
            startTime: v.string(),
            endTime: v.string(),
            registrationDeadline: v.string()
        })
    },
    handler: async (ctx, args) => {
        const nowISO = new Date().toISOString();

        // 验证规则 - 暂时跳过验证，直接保存
        // TODO: 实现规则验证逻辑

        // 保存到数据库
        const existing = await ctx.db
            .query("tournament_rules")
            .withIndex("by_tournament_id", (q) => q.eq("tournamentId", args.rules.tournamentId))
            .unique();

        if (existing) {
            await ctx.db.patch(existing._id, {
                ...args.rules,
                updatedAt: nowISO
            });
        } else {
            await ctx.db.insert("tournament_rules", {
                ...args.rules,
                isActive: true,
                version: "1.0.0",
                createdBy: "system",
                createdAt: nowISO,
                updatedAt: nowISO
            });
        }

        return { success: true, message: "锦标赛规则创建成功" };
    }
});

/**
 * 获取锦标赛规则
 */
export const getTournamentRules = query({
    args: { tournamentId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("tournament_rules")
            .withIndex("by_tournament_id", (q) => q.eq("tournamentId", args.tournamentId))
            .unique();
    }
});

/**
 * 获取所有可用段位
 */
export const getAvailableSegments = query({
    args: {},
    handler: async (ctx) => {
        return SegmentPromotionDemotionManager.getAvailableSegments();
    }
});

/**
 * 获取段位信息
 */
export const getSegmentInfo = query({
    args: { segmentName: v.string() },
    handler: async (ctx, args) => {
        return SegmentPromotionDemotionManager.getSegmentInfo(args.segmentName);
    }
});

// ==================== 积分计算函数 ====================

/**
 * 计算玩家在锦标赛中获得的各类积分
 */
export const calculatePlayerTournamentPoints = mutation({
    args: {
        tournamentId: v.string(),
        uid: v.string(),
        matchRank: v.number(),
        matchScore: v.number(),
        matchDuration: v.number(),
        segmentName: v.string(),
        isPerfectScore: v.boolean(),
        isQuickWin: v.boolean(),
        isComebackWin: v.boolean(),
        winningStreak: v.number()
    },
    handler: async (ctx, args) => {
        const {
            tournamentId,
            uid,
            matchRank,
            matchScore,
            matchDuration,
            segmentName,
            isPerfectScore,
            isQuickWin,
            isComebackWin,
            winningStreak
        } = args;

        // 获取锦标赛规则
        const tournamentRules = await ctx.db
            .query("tournament_rules")
            .withIndex("by_tournament_id", (q) => q.eq("tournamentId", tournamentId))
            .unique();

        if (!tournamentRules) {
            throw new Error("锦标赛规则不存在");
        }

        // 获取排名积分配置
        const rankConfig = DEFAULT_RANK_POINT_CONFIGS.find(config => config.rank === matchRank);
        if (!rankConfig) {
            throw new Error(`排名 ${matchRank} 的积分配置不存在`);
        }

        // 获取段位积分规则
        const segmentRules = DEFAULT_SEGMENT_POINT_RULES[segmentName];
        if (!segmentRules) {
            throw new Error(`段位 ${segmentName} 的积分规则不存在`);
        }

        // 计算各类积分
        const points = {
            rankPoints: 0,
            seasonPoints: 0,
            prestigePoints: 0,
            achievementPoints: 0,
            tournamentPoints: 0
        };

        // 计算段位积分
        if (tournamentRules.enableRankPoints) {
            points.rankPoints = calculateRankPoints(
                rankConfig.rankPoints,
                segmentRules,
                tournamentRules,
                matchScore,
                isPerfectScore,
                isQuickWin,
                winningStreak
            );
        }

        // 计算赛季积分
        if (tournamentRules.enableSeasonPoints) {
            points.seasonPoints = calculateSeasonPoints(
                rankConfig.seasonPoints,
                segmentRules,
                tournamentRules,
                matchScore,
                isPerfectScore,
                isQuickWin,
                winningStreak
            );
        }

        // 计算声望积分
        if (tournamentRules.enablePrestigePoints) {
            points.prestigePoints = calculatePrestigePoints(
                rankConfig.prestigePoints,
                segmentRules,
                tournamentRules,
                matchScore,
                isPerfectScore,
                isQuickWin,
                winningStreak
            );
        }

        // 计算成就积分
        if (tournamentRules.enableAchievementPoints) {
            points.achievementPoints = calculateAchievementPoints(
                rankConfig.achievementPoints,
                segmentRules,
                tournamentRules,
                matchScore,
                isPerfectScore,
                isQuickWin,
                isComebackWin,
                winningStreak
            );
        }

        // 计算锦标赛积分
        if (tournamentRules.enableTournamentPoints) {
            points.tournamentPoints = calculateTournamentPoints(
                rankConfig.tournamentPoints,
                segmentRules,
                tournamentRules,
                matchScore,
                isPerfectScore,
                isQuickWin,
                winningStreak
            );
        }

        // 保存积分记录到数据库
        await ctx.db.insert("tournament_point_records", {
            tournamentId,
            uid,
            matchId: `match_${Date.now()}`, // 生成临时matchId
            source: "tournament",
            segmentTier: 1, // 默认段位等级，可以根据实际需求调整
            calculatedAt: new Date().toISOString(),
            matchRank,
            matchScore,
            matchDuration,
            segmentName,
            points,
            createdAt: new Date().toISOString()
        });

        return {
            success: true,
            points,
            message: "积分计算完成"
        };
    }
});

// ==================== 辅助计算函数 ====================

/**
 * 计算段位积分
 */
function calculateRankPoints(
    config: PointAllocationConfig,
    segmentRules: SegmentPointRules,
    tournamentRules: any,
    matchScore: number,
    isPerfectScore: boolean,
    isQuickWin: boolean,
    winningStreak: number
): number {
    let points = config.basePoints * segmentRules.rankPointsConfig.basePoints;

    // 应用段位倍数
    points *= segmentRules.baseMultiplier;

    // 应用全局倍数
    points *= tournamentRules.pointMultiplier;

    // 应用奖励倍数
    if (isPerfectScore) points *= 1.5;
    if (isQuickWin) points *= 1.3;
    if (winningStreak >= 3) points *= 1.2;

    // 应用段位奖励倍数
    points *= segmentRules.rankPointsConfig.bonusMultiplier;

    // 限制在配置范围内
    return Math.max(config.minPoints, Math.min(config.maxPoints, Math.round(points)));
}

/**
 * 计算赛季积分
 */
function calculateSeasonPoints(
    config: PointAllocationConfig,
    segmentRules: SegmentPointRules,
    tournamentRules: any,
    matchScore: number,
    isPerfectScore: boolean,
    isQuickWin: boolean,
    winningStreak: number
): number {
    let points = config.basePoints * segmentRules.seasonPointsConfig.basePoints;

    // 应用段位倍数
    points *= segmentRules.baseMultiplier;

    // 应用全局倍数
    points *= tournamentRules.pointMultiplier;

    // 应用奖励倍数
    if (isPerfectScore) points *= 1.4;
    if (isQuickWin) points *= 1.2;
    if (winningStreak >= 3) points *= 1.1;

    // 应用段位奖励倍数
    points *= segmentRules.seasonPointsConfig.bonusMultiplier;

    // 限制在配置范围内
    return Math.max(config.minPoints, Math.min(config.maxPoints, Math.round(points)));
}

/**
 * 计算声望积分
 */
function calculatePrestigePoints(
    config: PointAllocationConfig,
    segmentRules: SegmentPointRules,
    tournamentRules: any,
    matchScore: number,
    isPerfectScore: boolean,
    isQuickWin: boolean,
    winningStreak: number
): number {
    let points = config.basePoints;

    // 应用段位倍数
    points *= segmentRules.baseMultiplier;

    // 应用全局倍数
    points *= tournamentRules.pointMultiplier;

    // 应用奖励倍数
    if (isPerfectScore) points *= 2.0;
    if (isQuickWin) points *= 1.5;
    if (winningStreak >= 5) points *= 1.3;

    // 限制在配置范围内
    return Math.max(config.minPoints, Math.min(config.maxPoints, Math.round(points)));
}

/**
 * 计算成就积分
 */
function calculateAchievementPoints(
    config: PointAllocationConfig,
    segmentRules: SegmentPointRules,
    tournamentRules: any,
    matchScore: number,
    isPerfectScore: boolean,
    isQuickWin: boolean,
    isComebackWin: boolean,
    winningStreak: number
): number {
    let points = config.basePoints;

    // 应用段位倍数
    points *= segmentRules.baseMultiplier;

    // 应用全局倍数
    points *= tournamentRules.pointMultiplier;

    // 应用奖励倍数
    if (isPerfectScore) points *= 3.0;
    if (isQuickWin) points *= 2.0;
    if (isComebackWin) points *= 1.8;
    if (winningStreak >= 7) points *= 1.5;

    // 限制在配置范围内
    return Math.max(config.minPoints, Math.min(config.maxPoints, Math.round(points)));
}

/**
 * 计算锦标赛积分
 */
function calculateTournamentPoints(
    config: PointAllocationConfig,
    segmentRules: SegmentPointRules,
    tournamentRules: any,
    matchScore: number,
    isPerfectScore: boolean,
    isQuickWin: boolean,
    winningStreak: number
): number {
    let points = config.basePoints;

    // 应用段位倍数
    points *= segmentRules.baseMultiplier;

    // 应用全局倍数
    points *= tournamentRules.pointMultiplier;

    // 应用奖励倍数
    if (isPerfectScore) points *= 1.8;
    if (isQuickWin) points *= 1.4;
    if (winningStreak >= 3) points *= 1.2;

    // 限制在配置范围内
    return Math.max(config.minPoints, Math.min(config.maxPoints, Math.round(points)));
}
