/**
 * 锦标赛积分计算系统
 * 专注于积分计算逻辑，支持多种积分类型的独立计算
 */

import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";

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

// ==================== 段位积分规则 ====================

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

// ==================== 积分计算服务类 ====================

/**
 * 积分计算服务类
 * 专注于积分计算逻辑
 */
export class PointCalculationService {

    /**
     * 获取段位积分规则
     */
    static getSegmentPointRules(segmentName: string) {
        return DEFAULT_SEGMENT_POINT_RULES[segmentName] || null;
    }

    /**
     * 获取排名积分配置
     */
    static getRankPointConfigs() {
        return DEFAULT_RANK_POINT_CONFIGS;
    }

    /**
     * 获取特定排名的积分配置
     */
    static getRankPointConfig(rank: number) {
        return DEFAULT_RANK_POINT_CONFIGS.find(config => config.rank === rank) || null;
    }

    /**
     * 计算玩家在锦标赛中获得的各类积分
     */
    static async calculatePlayerTournamentPoints(ctx: any, args: {
        tournamentId: string;
        uid: string;
        matchRank: number;
        matchScore: number;
        matchDuration: number;
        segmentName: string;
    }) {
        const {
            tournamentId,
            uid,
            matchRank,
            matchScore,
            matchDuration,
            segmentName
        } = args;

        // 获取锦标赛信息
        const tournament = await ctx.db.get(tournamentId as any);
        if (!tournament) {
            throw new Error("锦标赛不存在");
        }

        // 获取锦标赛类型配置（包含积分规则）
        const tournamentType = await ctx.db
            .query("tournament_types")
            .withIndex("by_typeId", (q: any) => q.eq("typeId", tournament.type))
            .unique();

        if (!tournamentType) {
            throw new Error("锦标赛类型不存在");
        }

        // 如果没有配置积分规则，使用默认规则
        const pointRules = tournamentType.pointRules || this.getDefaultPointRules();

        // 获取排名积分配置
        const rankConfig = pointRules.rankPointConfigs.find((config: any) => config.rank === matchRank);
        if (!rankConfig) {
            throw new Error(`排名 ${matchRank} 的积分配置不存在`);
        }

        // 获取段位积分规则
        const segmentRules = pointRules.segmentPointRules[segmentName];
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
        if (pointRules.enableRankPoints) {
            points.rankPoints = this.calculateRankPoints(
                rankConfig.rankPoints,
                segmentRules,
                pointRules,
                matchScore
            );
        }

        // 计算赛季积分
        if (pointRules.enableSeasonPoints) {
            points.seasonPoints = this.calculateSeasonPoints(
                rankConfig.seasonPoints,
                segmentRules,
                pointRules,
                matchScore
            );
        }

        // 计算声望积分
        if (pointRules.enablePrestigePoints) {
            points.prestigePoints = this.calculatePrestigePoints(
                rankConfig.prestigePoints,
                segmentRules,
                pointRules,
                matchScore
            );
        }

        // 计算成就积分
        if (pointRules.enableAchievementPoints) {
            points.achievementPoints = this.calculateAchievementPoints(
                rankConfig.achievementPoints,
                segmentRules,
                pointRules,
                matchScore
            );
        }

        // 计算锦标赛积分
        if (pointRules.enableTournamentPoints) {
            points.tournamentPoints = this.calculateTournamentPoints(
                rankConfig.tournamentPoints,
                segmentRules,
                pointRules,
                matchScore
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

    /**
     * 获取默认积分规则
     */
    private static getDefaultPointRules() {
        return {
            enableRankPoints: true,
            enableSeasonPoints: true,
            enablePrestigePoints: true,
            enableAchievementPoints: true,
            enableTournamentPoints: true,
            pointMultiplier: 1.0,
            segmentBasedScoring: true,
            segmentBonusMultiplier: 1.0,
            rankPointConfigs: DEFAULT_RANK_POINT_CONFIGS.map((config: RankPointConfig) => ({
                rank: config.rank,
                rankPoints: config.rankPoints,
                seasonPoints: config.seasonPoints,
                prestigePoints: config.prestigePoints,
                achievementPoints: config.achievementPoints,
                tournamentPoints: config.tournamentPoints
            })),
            segmentPointRules: DEFAULT_SEGMENT_POINT_RULES
        };
    }

    // ==================== 辅助计算函数 ====================

    /**
     * 计算段位积分
     */
    private static calculateRankPoints(
        config: PointAllocationConfig,
        segmentRules: SegmentPointRules,
        tournamentRules: any,
        matchScore: number
    ): number {
        let points = config.basePoints * segmentRules.rankPointsConfig.basePoints;

        // 应用段位倍数
        points *= segmentRules.baseMultiplier;

        // 应用全局倍数
        points *= tournamentRules.pointMultiplier;

        // 应用奖励倍数
        if (matchScore >= 90) points *= 1.5; // 完美分数奖励
        if (matchScore >= 80) points *= 1.3; // 快速获胜奖励

        // 应用段位奖励倍数
        points *= segmentRules.rankPointsConfig.bonusMultiplier;

        // 限制在配置范围内
        return Math.max(config.minPoints, Math.min(config.maxPoints, Math.round(points)));
    }

    /**
     * 计算赛季积分
     */
    private static calculateSeasonPoints(
        config: PointAllocationConfig,
        segmentRules: SegmentPointRules,
        tournamentRules: any,
        matchScore: number
    ): number {
        let points = config.basePoints * segmentRules.seasonPointsConfig.basePoints;

        // 应用段位倍数
        points *= segmentRules.baseMultiplier;

        // 应用全局倍数
        points *= tournamentRules.pointMultiplier;

        // 应用奖励倍数
        if (matchScore >= 90) points *= 1.4; // 完美分数奖励
        if (matchScore >= 80) points *= 1.2; // 快速获胜奖励

        // 应用段位奖励倍数
        points *= segmentRules.seasonPointsConfig.bonusMultiplier;

        // 限制在配置范围内
        return Math.max(config.minPoints, Math.min(config.maxPoints, Math.round(points)));
    }

    /**
     * 计算声望积分
     */
    private static calculatePrestigePoints(
        config: PointAllocationConfig,
        segmentRules: SegmentPointRules,
        tournamentRules: any,
        matchScore: number
    ): number {
        let points = config.basePoints;

        // 应用段位倍数
        points *= segmentRules.baseMultiplier;

        // 应用全局倍数
        points *= tournamentRules.pointMultiplier;

        // 应用奖励倍数
        if (matchScore >= 90) points *= 2.0; // 完美分数奖励
        if (matchScore >= 80) points *= 1.5; // 快速获胜奖励

        // 限制在配置范围内
        return Math.max(config.minPoints, Math.min(config.maxPoints, Math.round(points)));
    }

    /**
     * 计算成就积分
     */
    private static calculateAchievementPoints(
        config: PointAllocationConfig,
        segmentRules: SegmentPointRules,
        tournamentRules: any,
        matchScore: number
    ): number {
        let points = config.basePoints;

        // 应用段位倍数
        points *= segmentRules.baseMultiplier;

        // 应用全局倍数
        points *= tournamentRules.pointMultiplier;

        // 应用奖励倍数
        if (matchScore >= 90) points *= 3.0; // 完美分数奖励
        if (matchScore >= 80) points *= 2.0; // 快速获胜奖励

        // 限制在配置范围内
        return Math.max(config.minPoints, Math.min(config.maxPoints, Math.round(points)));
    }

    /**
     * 计算锦标赛积分
     */
    private static calculateTournamentPoints(
        config: PointAllocationConfig,
        segmentRules: SegmentPointRules,
        tournamentRules: any,
        matchScore: number
    ): number {
        let points = config.basePoints;

        // 应用段位倍数
        points *= segmentRules.baseMultiplier;

        // 应用全局倍数
        points *= tournamentRules.pointMultiplier;

        // 应用奖励倍数
        if (matchScore >= 90) points *= 1.8; // 完美分数奖励
        if (matchScore >= 80) points *= 1.4; // 快速获胜奖励

        // 限制在配置范围内
        return Math.max(config.minPoints, Math.min(config.maxPoints, Math.round(points)));
    }
}

// ==================== Convex 函数导出 ====================

/**
 * 获取段位积分规则
 */
export const getSegmentPointRules = query({
    args: { segmentName: v.string() },
    handler: async (ctx, args) => {
        return PointCalculationService.getSegmentPointRules(args.segmentName);
    }
});

/**
 * 获取排名积分配置
 */
export const getRankPointConfigs = query({
    args: {},
    handler: async (ctx) => {
        return PointCalculationService.getRankPointConfigs();
    }
});

/**
 * 获取特定排名的积分配置
 */
export const getRankPointConfig = query({
    args: { rank: v.number() },
    handler: async (ctx, args) => {
        return PointCalculationService.getRankPointConfig(args.rank);
    }
});

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
        segmentName: v.string()
    },
    handler: async (ctx, args) => {
        return PointCalculationService.calculatePlayerTournamentPoints(ctx, args);
    }
});
