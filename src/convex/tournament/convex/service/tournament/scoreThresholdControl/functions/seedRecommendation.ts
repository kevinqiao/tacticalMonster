/**
 * 种子推荐系统 - 重构版本
 * 基于 IntelligentRecommendationManager 提供智能推荐接口
 */

import { v } from "convex/values";
import { mutation, query } from "../../../../_generated/server";
import { IncrementalStatisticsManager } from "../managers/IncrementalStatisticsManager";
import { IntelligentRecommendationManager } from "../managers/IntelligentRecommendationManager";

/**
 * 根据玩家技能等级推荐种子（传统方式）
 */
export const recommendSeedsBySkill = query({
    args: {
        uid: v.string(),
        preferredDifficulty: v.optional(v.union(
            v.literal("challenge"),
            v.literal("balanced"),
            v.literal("practice")
        )),
        limit: v.optional(v.number())
    },
    handler: async (ctx, args) => {
        try {
            const manager = new IncrementalStatisticsManager(ctx);

            // 1. 获取玩家技能等级（使用增量统计）
            const playerSkillLevel = await manager.getPlayerSkillLevel(args.uid);

            // 2. 推荐种子
            const recommendation = await manager.recommendSeedsByPlayerSkill(
                playerSkillLevel,
                args.preferredDifficulty || 'balanced',
                args.limit || 5
            );

            return {
                success: true,
                playerSkillLevel,
                recommendation
            };

        } catch (error) {
            console.error('推荐种子失败:', error);
            return {
                success: false,
                error: String(error)
            };
        }
    }
});

/**
 * 智能推荐种子（结合智能体验管理）
 */
export const intelligentRecommendSeeds = query({
    args: {
        uid: v.string(),
        limit: v.optional(v.number())
    },
    handler: async (ctx, args) => {
        try {
            const recommendationManager = new IntelligentRecommendationManager(ctx);

            const result = await recommendationManager.intelligentRecommendSeeds(
                args.uid,
                args.limit || 5
            );

            return {
                success: true,
                ...result
            };

        } catch (error) {
            console.error('智能推荐失败:', error);
            return { success: false, error: String(error) };
        }
    }
});

/**
 * 获取指定难度等级的种子列表
 */
export const getSeedsByDifficulty = query({
    args: {
        difficultyLevel: v.union(
            v.literal("very_easy"),
            v.literal("easy"),
            v.literal("normal"),
            v.literal("hard"),
            v.literal("very_hard")
        ),
        limit: v.optional(v.number())
    },
    handler: async (ctx, args) => {
        try {
            const manager = new IncrementalStatisticsManager(ctx);
            const seeds = await manager.getSeedsByDifficultyLevel(
                args.difficultyLevel,
                args.limit || 10
            );

            return {
                success: true,
                difficultyLevel: args.difficultyLevel,
                seeds,
                count: seeds.length
            };

        } catch (error) {
            console.error('获取难度等级种子失败:', error);
            return {
                success: false,
                error: String(error)
            };
        }
    }
});

/**
 * 获取玩家技能等级（使用增量统计）
 */
export const getPlayerSkillLevel = query({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        try {
            const manager = new IncrementalStatisticsManager(ctx);
            const skillLevel = await manager.getPlayerSkillLevel(args.uid);

            // 获取玩家最近的比赛记录（限制数量以提高性能）
            const recentMatches = await ctx.db
                .query("match_results")
                .withIndex("by_uid")
                .filter((q: any) => q.eq(q.field("uid"), args.uid))
                .order("desc")
                .take(10);

            // 计算基础统计
            const totalMatches = recentMatches.length;
            const wins = recentMatches.filter((m: any) => m.rank === 1).length;
            const winRate = totalMatches > 0 ? wins / totalMatches : 0;
            const averageRank = totalMatches > 0 ?
                recentMatches.reduce((sum: number, m: any) => sum + m.rank, 0) / totalMatches : 0;
            const averageScore = totalMatches > 0 ?
                recentMatches.reduce((sum: number, m: any) => sum + m.score, 0) / totalMatches : 0;

            return {
                success: true,
                uid: args.uid,
                skillLevel,
                statistics: {
                    totalMatches,
                    wins,
                    winRate: Math.round(winRate * 100) / 100,
                    averageRank: Math.round(averageRank * 100) / 100,
                    averageScore: Math.round(averageScore * 100) / 100
                },
                recentMatches: recentMatches.slice(0, 5).map((m: any) => ({
                    matchId: m.matchId,
                    score: m.score,
                    rank: m.rank,
                    points: m.points,
                    createdAt: m.createdAt
                }))
            };
        } catch (error) {
            console.error('获取玩家技能等级失败:', error);
            return { success: false, error: String(error) };
        }
    }
});

/**
 * 获取种子难度系数
 */
export const getSeedDifficulty = query({
    args: { seed: v.string() },
    handler: async (ctx, args) => {
        try {
            const manager = new IncrementalStatisticsManager(ctx);
            const coefficient = await manager.getSeedDifficultyCoefficient(args.seed);
            const level = await manager.getSeedDifficultyLevel(args.seed);

            return {
                success: true,
                seed: args.seed,
                difficultyCoefficient: coefficient,
                difficultyLevel: level
            };

        } catch (error) {
            console.error('获取种子难度失败:', error);
            return {
                success: false,
                error: String(error)
            };
        }
    }
});

/**
 * 批量更新种子统计（用于维护）
 */
export const batchUpdateSeedStatistics = mutation({
    args: { seeds: v.array(v.string()) },
    handler: async (ctx, args) => {
        try {
            const manager = new IncrementalStatisticsManager(ctx);
            const results = [];

            for (const seed of args.seeds) {
                try {
                    const result = await manager.incrementalUpdateSeedStatistics(seed);
                    results.push({
                        seed,
                        success: true,
                        updated: result.updated,
                        newMatchesCount: result.newMatchesCount
                    });
                } catch (error) {
                    results.push({
                        seed,
                        success: false,
                        error: String(error)
                    });
                }
            }

            const successCount = results.filter(r => r.success).length;
            const updatedCount = results.filter(r => r.success && r.updated).length;

            return {
                success: true,
                total: args.seeds.length,
                successful: successCount,
                updated: updatedCount,
                results
            };

        } catch (error) {
            console.error('批量更新种子统计失败:', error);
            return {
                success: false,
                error: String(error)
            };
        }
    }
});

/**
 * 清理过期缓存
 */
export const cleanupExpiredCache = mutation({
    args: { daysToKeep: v.optional(v.number()) },
    handler: async (ctx, args) => {
        try {
            const manager = new IncrementalStatisticsManager(ctx);
            const deletedCount = await manager.cleanupExpiredCache(args.daysToKeep || 30);

            return {
                success: true,
                deletedCount,
                daysKept: args.daysToKeep || 30
            };

        } catch (error) {
            console.error('清理过期缓存失败:', error);
            return {
                success: false,
                error: String(error)
            };
        }
    }
});

/**
 * 用户反馈学习（用于改进推荐算法）
 */
export const submitUserFeedback = mutation({
    args: {
        uid: v.string(),
        seedId: v.string(),
        feedback: v.object({
            difficulty: v.union(v.literal("too_easy"), v.literal("just_right"), v.literal("too_hard")),
            enjoyment: v.optional(v.number()), // 1-5 评分
            completionTime: v.optional(v.number()),
            retryCount: v.optional(v.number())
        })
    },
    handler: async (ctx, args) => {
        try {
            const expManager = new IntelligentRecommendationManager(ctx);
            await expManager.learnFromUserFeedback(
                args.uid,
                args.seedId,
                args.feedback
            );

            return { success: true };
        } catch (error) {
            console.error('提交用户反馈失败:', error);
            return { success: false, error: String(error) };
        }
    }
});

/**
 * 获取段位技能等级分布统计
 */
export const getSegmentSkillDistribution = query({
    args: {},
    handler: async (ctx) => {
        try {
            const manager = new IncrementalStatisticsManager(ctx);

            // 获取所有玩家记录（限制数量以提高性能）
            const allMatches = await ctx.db
                .query("match_results")
                .take(1000); // 限制查询数量

            // 按玩家分组统计
            const playerStats = new Map();
            for (const match of allMatches) {
                if (!playerStats.has(match.uid)) {
                    playerStats.set(match.uid, {
                        uid: match.uid,
                        matches: [],
                        segmentName: match.segmentName || 'bronze'
                    });
                }
                playerStats.get(match.uid).matches.push(match);
            }

            // 计算每个玩家的技能等级
            const distribution = {
                bronze: 0,
                silver: 0,
                gold: 0,
                platinum: 0,
                diamond: 0
            };

            // 限制处理的玩家数量以提高性能
            const playerUids = Array.from(playerStats.keys()).slice(0, 100);

            for (const uid of playerUids) {
                try {
                    const skillLevel = await manager.getPlayerSkillLevel(uid);
                    if (distribution[skillLevel as keyof typeof distribution] !== undefined) {
                        distribution[skillLevel as keyof typeof distribution]++;
                    }
                } catch (error) {
                    // 如果计算失败，使用段位作为默认技能等级
                    const stats = playerStats.get(uid);
                    const segmentSkill = stats.segmentName || 'bronze';
                    if (distribution[segmentSkill as keyof typeof distribution] !== undefined) {
                        distribution[segmentSkill as keyof typeof distribution]++;
                    }
                }
            }

            return {
                success: true,
                distribution,
                totalPlayers: playerUids.length,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('获取段位技能分布失败:', error);
            return { success: false, error: String(error) };
        }
    }
});
