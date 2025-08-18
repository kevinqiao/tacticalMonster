/**
 * 锦标赛规则系统使用示例
 * 展示如何使用新的积分独立设计
 */

import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import {
    DEFAULT_RANK_POINT_CONFIGS,
    DEFAULT_SEGMENT_POINT_RULES
} from "./tournamentRules";

// ==================== 示例配置 ====================

/**
 * 创建示例锦标赛规则
 */
export const createExampleTournamentRules = mutation({
    args: {},
    handler: async (ctx) => {
        const nowISO = new Date().toISOString();
        const tournamentId = `example_tournament_${Date.now()}`;

        // 创建示例锦标赛规则
        const exampleRules = {
            tournamentId,
            gameType: "solitaire",
            tournamentType: "daily_challenge",

            // 参与规则
            minPlayers: 4,
            maxPlayers: 16,
            timeLimit: 30, // 30分钟

            // 积分规则 - 启用所有积分类型
            pointMultiplier: 1.0,
            enableRankPoints: true,      // 启用段位积分
            enableSeasonPoints: true,    // 启用赛季积分
            enablePrestigePoints: true,  // 启用声望积分
            enableAchievementPoints: true, // 启用成就积分
            enableTournamentPoints: true,  // 启用锦标赛积分

            // 段位相关规则
            segmentBasedScoring: true,   // 基于段位调整积分
            segmentBonusMultiplier: 1.2, // 段位奖励倍数

            // 限制规则
            maxAttemptsPerPlayer: 3,
            dailyLimit: 5,
            weeklyLimit: 20,

            // 时间规则
            startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 明天开始
            endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 一周后结束
            registrationDeadline: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // 12小时后截止

            // 元数据
            createdAt: nowISO,
            updatedAt: nowISO,
            createdBy: "system",
            isActive: true,
            version: "1.0.0"
        };

        try {
            // 直接插入到数据库，因为函数在同一个文件中
            await ctx.db.insert("tournament_rules", {
                ...exampleRules,
                createdAt: nowISO,
                updatedAt: nowISO
            });

            return {
                success: true,
                tournamentId,
                message: "示例锦标赛规则创建成功",
                rules: exampleRules
            };
        } catch (error) {
            return {
                success: false,
                message: `创建失败: ${error instanceof Error ? error.message : "未知错误"}`,
                error
            };
        }
    }
});

/**
 * 模拟锦标赛比赛并计算积分
 */
export const simulateTournamentMatch = mutation({
    args: {
        tournamentId: v.string(),
        uid: v.string(),
        matchId: v.string(),
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
        try {
            // 计算玩家在锦标赛中获得的各类积分 - 直接调用本地函数
            const points = calculateExamplePoints(args);

            if (points) {
                // 更新玩家积分统计
                await updatePlayerPointStats(ctx, args.uid, args.tournamentId, points);

                // 记录积分历史
                await recordPointHistory(ctx, args.uid, args.tournamentId, args.matchId || "simulated_match", points, "tournament_match");
            }

            return {
                success: true,
                points,
                message: "模拟比赛完成，积分计算成功"
            };
        } catch (error) {
            return {
                success: false,
                message: `模拟比赛失败: ${error instanceof Error ? error.message : "未知错误"}`,
                error
            };
        }
    }
});

/**
 * 获取段位积分规则示例
 */
export const getSegmentPointRulesExample = query({
    args: { segmentName: v.string() },
    handler: async (ctx, args) => {
        const segmentRules = DEFAULT_SEGMENT_POINT_RULES[args.segmentName];

        if (!segmentRules) {
            return null;
        }

        return {
            segmentName: args.segmentName,
            rules: segmentRules,
            description: `段位 ${args.segmentName} 的积分规则`,
            examples: {
                rankPoints: {
                    basePoints: segmentRules.rankPointsConfig.basePoints,
                    maxPoints: segmentRules.rankPointsConfig.maxPoints,
                    bonusMultiplier: segmentRules.rankPointsConfig.bonusMultiplier
                },
                seasonPoints: {
                    basePoints: segmentRules.seasonPointsConfig.basePoints,
                    maxPoints: segmentRules.seasonPointsConfig.maxPoints,
                    bonusMultiplier: segmentRules.seasonPointsConfig.bonusMultiplier
                }
            }
        };
    }
});

/**
 * 获取排名积分配置示例
 */
export const getRankPointConfigsExample = query({
    args: {},
    handler: async (ctx) => {
        return {
            configs: DEFAULT_RANK_POINT_CONFIGS,
            description: "所有排名的积分配置",
            summary: {
                totalRanks: DEFAULT_RANK_POINT_CONFIGS.length,
                rankPointsRange: {
                    min: Math.min(...DEFAULT_RANK_POINT_CONFIGS.map(c => c.rankPoints.minPoints)),
                    max: Math.max(...DEFAULT_RANK_POINT_CONFIGS.map(c => c.rankPoints.maxPoints))
                },
                seasonPointsRange: {
                    min: Math.min(...DEFAULT_RANK_POINT_CONFIGS.map(c => c.seasonPoints.minPoints)),
                    max: Math.max(...DEFAULT_RANK_POINT_CONFIGS.map(c => c.seasonPoints.maxPoints))
                }
            }
        };
    }
});

/**
 * 比较不同段位的积分差异
 */
export const compareSegmentPointDifferences = query({
    args: {
        segment1: v.string(),
        segment2: v.string()
    },
    handler: async (ctx, args) => {
        const segment1Rules = DEFAULT_SEGMENT_POINT_RULES[args.segment1];
        const segment2Rules = DEFAULT_SEGMENT_POINT_RULES[args.segment2];

        if (!segment1Rules || !segment2Rules) {
            return null;
        }

        return {
            comparison: {
                segment1: args.segment1,
                segment2: args.segment2,
                differences: {
                    baseMultiplier: {
                        segment1: segment1Rules.baseMultiplier,
                        segment2: segment2Rules.baseMultiplier,
                        difference: segment2Rules.baseMultiplier - segment1Rules.baseMultiplier
                    },
                    bonusMultiplier: {
                        segment1: segment1Rules.bonusMultiplier,
                        segment2: segment2Rules.bonusMultiplier,
                        difference: segment2Rules.bonusMultiplier - segment1Rules.bonusMultiplier
                    },
                    rankPoints: {
                        segment1: segment1Rules.rankPointsConfig.basePoints,
                        segment2: segment2Rules.rankPointsConfig.basePoints,
                        difference: segment2Rules.rankPointsConfig.basePoints - segment1Rules.rankPointsConfig.basePoints
                    },
                    seasonPoints: {
                        segment1: segment1Rules.seasonPointsConfig.basePoints,
                        segment2: segment2Rules.seasonPointsConfig.basePoints,
                        difference: segment2Rules.seasonPointsConfig.basePoints - segment1Rules.seasonPointsConfig.basePoints
                    }
                }
            },
            analysis: {
                segment1Advantage: segment1Rules.baseMultiplier < segment2Rules.baseMultiplier ? "段位1积分获取较慢，适合新手" : "段位1积分获取较快，适合有经验玩家",
                segment2Advantage: segment2Rules.baseMultiplier > segment1Rules.baseMultiplier ? "段位2积分获取较快，奖励更丰厚" : "段位2积分获取较慢，挑战性更高"
            }
        };
    }
});

/**
 * 计算玩家在不同段位下的积分收益
 */
export const calculatePlayerPointEarnings = query({
    args: {
        uid: v.string(),
        matchRank: v.number(),
        matchScore: v.number(),
        segmentNames: v.array(v.string())
    },
    handler: async (ctx, args) => {
        const results = [];

        for (const segmentName of args.segmentNames) {
            const segmentRules = DEFAULT_SEGMENT_POINT_RULES[segmentName];
            const rankConfig = DEFAULT_RANK_POINT_CONFIGS.find(config => config.rank === args.matchRank);

            if (segmentRules && rankConfig) {
                // 模拟计算各类积分
                const rankPoints = calculateExampleRankPoints(rankConfig.rankPoints, segmentRules, args.matchScore);
                const seasonPoints = calculateExampleSeasonPoints(rankConfig.seasonPoints, segmentRules, args.matchScore);

                results.push({
                    segmentName,
                    matchRank: args.matchRank,
                    matchScore: args.matchScore,
                    earnings: {
                        rankPoints,
                        seasonPoints,
                        totalPoints: rankPoints + seasonPoints
                    },
                    segmentMultiplier: segmentRules.baseMultiplier,
                    bonusMultiplier: segmentRules.bonusMultiplier
                });
            }
        }

        return {
            uid: args.uid,
            matchRank: args.matchRank,
            matchScore: args.matchScore,
            segmentEarnings: results,
            summary: {
                bestSegment: results.reduce((best, current) =>
                    current.earnings.totalPoints > best.earnings.totalPoints ? current : best
                ),
                worstSegment: results.reduce((worst, current) =>
                    current.earnings.totalPoints < worst.earnings.totalPoints ? current : worst
                ),
                averageEarnings: {
                    rankPoints: results.reduce((sum, r) => sum + r.earnings.rankPoints, 0) / results.length,
                    seasonPoints: results.reduce((sum, r) => sum + r.earnings.seasonPoints, 0) / results.length
                }
            }
        };
    }
});

// ==================== 辅助函数 ====================

/**
 * 更新玩家积分统计
 */
async function updatePlayerPointStats(ctx: any, uid: string, tournamentId: string, points: any) {
    const nowISO = new Date().toISOString();
    const seasonId = getCurrentSeasonId();

    // 查找现有统计记录
    const existingStats = await ctx.db
        .query("player_point_stats")
        .withIndex("by_uid_season", (q: any) => q.eq("uid", uid).eq("seasonId", seasonId))
        .unique();

    if (existingStats) {
        // 更新现有记录
        await ctx.db.patch(existingStats._id, {
            totalRankPoints: existingStats.totalRankPoints + points.rankPoints,
            totalSeasonPoints: existingStats.totalSeasonPoints + points.seasonPoints,
            totalPrestigePoints: existingStats.totalPrestigePoints + points.prestigePoints,
            totalAchievementPoints: existingStats.totalAchievementPoints + points.achievementPoints,
            totalTournamentPoints: existingStats.totalTournamentPoints + points.tournamentPoints,
            lastUpdated: nowISO
        });
    } else {
        // 创建新记录
        await ctx.db.insert("player_point_stats", {
            uid,
            seasonId,
            totalRankPoints: points.rankPoints,
            totalSeasonPoints: points.seasonPoints,
            totalPrestigePoints: points.prestigePoints,
            totalAchievementPoints: points.achievementPoints,
            totalTournamentPoints: points.tournamentPoints,
            currentSegment: "bronze", // 默认段位
            segmentProgress: 0,
            segmentMatches: 1,
            tournamentCount: 1,
            tournamentWins: points.rankPoints > 0 ? 1 : 0,
            bestTournamentRank: 1,
            lastUpdated: nowISO,
            seasonStartDate: getSeasonStartDate(),
            seasonEndDate: getSeasonEndDate()
        });
    }
}

/**
 * 记录积分历史
 */
async function recordPointHistory(ctx: any, uid: string, tournamentId: string, matchId: string, points: any, source: string) {
    const nowISO = new Date().toISOString();

    await ctx.db.insert("point_history", {
        uid,
        tournamentId,
        matchId,
        pointChanges: points,
        changeReason: "锦标赛比赛",
        changeType: "increase",
        changeSource: source,
        createdAt: nowISO,
        processedAt: nowISO
    });
}

/**
 * 获取当前赛季ID
 */
function getCurrentSeasonId(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `season_${year}_${month}`;
}

/**
 * 获取赛季开始日期
 */
function getSeasonStartDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    return new Date(year, month, 1).toISOString();
}

/**
 * 获取赛季结束日期
 */
function getSeasonEndDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    return new Date(year, month + 1, 0).toISOString();
}

/**
 * 计算示例积分
 */
function calculateExamplePoints(args: any) {
    const { matchRank, matchScore, segmentName, isPerfectScore, isQuickWin, isComebackWin, winningStreak } = args;

    // 获取排名积分配置
    const rankConfig = DEFAULT_RANK_POINT_CONFIGS.find(config => config.rank === matchRank);
    if (!rankConfig) {
        return null;
    }

    // 获取段位积分规则
    const segmentRules = DEFAULT_SEGMENT_POINT_RULES[segmentName];
    if (!segmentRules) {
        return null;
    }

    // 计算各类积分
    const rankPoints = calculateExampleRankPoints(rankConfig, segmentRules, matchScore);
    const seasonPoints = calculateExampleSeasonPoints(rankConfig, segmentRules, matchScore);

    // 基础积分
    const prestigePoints = Math.round(rankPoints * 0.3);
    const achievementPoints = Math.round(seasonPoints * 0.2);
    const tournamentPoints = Math.round(rankPoints * 0.5);

    // 应用奖励倍数
    let multiplier = 1.0;
    if (isPerfectScore) multiplier *= 1.5;
    if (isQuickWin) multiplier *= 1.3;
    if (isComebackWin) multiplier *= 1.2;
    if (winningStreak >= 3) multiplier *= 1.1;

    return {
        rankPoints: Math.round(rankPoints * multiplier),
        seasonPoints: Math.round(seasonPoints * multiplier),
        prestigePoints: Math.round(prestigePoints * multiplier),
        achievementPoints: Math.round(achievementPoints * multiplier),
        tournamentPoints: Math.round(tournamentPoints * multiplier)
    };
}

/**
 * 示例计算段位积分
 */
function calculateExampleRankPoints(rankConfig: any, segmentRules: any, matchScore: number): number {
    let points = rankConfig.basePoints * segmentRules.rankPointsConfig.basePoints;
    points *= segmentRules.baseMultiplier;
    points *= segmentRules.rankPointsConfig.bonusMultiplier;

    // 基于分数调整
    if (matchScore > 1000) points *= 1.2;
    if (matchScore > 2000) points *= 1.3;

    return Math.max(rankConfig.minPoints, Math.min(rankConfig.maxPoints, Math.round(points)));
}

/**
 * 示例计算赛季积分
 */
function calculateExampleSeasonPoints(rankConfig: any, segmentRules: any, matchScore: number): number {
    let points = rankConfig.basePoints * segmentRules.seasonPointsConfig.basePoints;
    points *= segmentRules.baseMultiplier;
    points *= segmentRules.seasonPointsConfig.bonusMultiplier;

    // 基于分数调整
    if (matchScore > 1000) points *= 1.1;
    if (matchScore > 2000) points *= 1.2;

    return Math.max(rankConfig.minPoints, Math.min(rankConfig.maxPoints, Math.round(points)));
}
