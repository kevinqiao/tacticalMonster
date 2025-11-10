/**
 * PlayerPerformanceProfile 缓存更新示例
 * 演示如何在比赛结束时更新性能指标缓存
 */

import { v } from "convex/values";
import { internal } from "../../../../_generated/api";
import { internalMutation } from "../../../../_generated/server";

const getDbApi = (): any => ((internal as any)['service']['ranking']['managers']['database']['playerProfileDB']);

/**
 * 示例：在比赛结束时更新性能指标缓存
 * 这个函数应该在 MatchManager.settleMatch 中被调用
 */
export const updatePerformanceMetricsAfterMatch = internalMutation({
    args: {
        uid: v.string(),
        gameType: v.optional(v.string()),
        score: v.number(),
        rank: v.number()
    },
    handler: async (ctx, args) => {
        const { uid, gameType, score, rank } = args;

        console.log(`更新性能指标缓存: ${uid} (${gameType || 'all'}), 得分: ${score}, 排名: ${rank}`);

        // 使用增量更新，高效快速
        const result: any = await ctx.runMutation(getDbApi().incrementPlayerPerformanceMetrics, {
            uid,
            gameType,
            score,
            rank
        });

        console.log(`性能指标缓存已更新: ${result}`);

        return { success: true, cacheId: result };
    }
});

/**
 * 示例：完整重建性能指标缓存
 * 用于定期维护或修复缓存数据
 */
export const rebuildPerformanceMetrics = internalMutation({
    args: {
        uid: v.string(),
        gameType: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const { uid, gameType } = args;

        console.log(`重建性能指标缓存: ${uid} (${gameType || 'all'})`);

        // 1. 从 player_matches 表获取历史数据
        let recentMatches: any[];
        if (gameType) {
            recentMatches = await ctx.db
                .query("player_matches")
                .withIndex("by_uid_gameType_created", (q: any) => q.eq("uid", uid).eq("gameType", gameType))
                .order("desc")
                .take(50);
        } else {
            recentMatches = await ctx.db
                .query("player_matches")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .order("desc")
                .take(50);
        }

        if (recentMatches.length === 0) {
            console.log(`没有历史数据，跳过重建`);
            return { success: false, reason: 'No data' };
        }

        // 2. 计算统计数据
        const scores = recentMatches.map((m: any) => m.score || 0);
        const ranks = recentMatches.map((m: any) => m.rank || 1);
        const wins = ranks.filter((rank: any) => rank === 1).length;

        const averageScore = scores.reduce((sum: any, score: any) => sum + score, 0) / scores.length;
        const averageRank = ranks.reduce((sum: any, rank: any) => sum + rank, 0) / ranks.length;

        // 计算一致性
        const mean = averageScore;
        const variance = scores.reduce((sum: number, s: number) => sum + Math.pow(s - mean, 2), 0) / scores.length;
        const stdDev = Math.sqrt(variance);
        const consistency = mean > 0 ? Math.max(0, Math.min(1, 1 - (stdDev / mean))) : 0.5;

        // 计算趋势
        const recentScores = recentMatches.slice(0, 5).map((m: any) => m.score || 0);
        const olderScores = recentMatches.slice(5, 10).map((m: any) => m.score || 0);
        const recentAvg = recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;
        const olderAvg = olderScores.length > 0 ? olderScores.reduce((sum, score) => sum + score, 0) / olderScores.length : recentAvg;
        const improvement = olderAvg > 0 ? (recentAvg - olderAvg) / olderAvg : 0;

        let trendDirection: 'improving' | 'declining' | 'stable' = 'stable';
        if (improvement > 0.1) trendDirection = 'improving';
        else if (improvement < -0.1) trendDirection = 'declining';

        // 3. 更新缓存
        const result: any = await ctx.runMutation(getDbApi().upsertPlayerPerformanceMetrics, {
            uid,
            gameType,
            metrics: {
                totalMatches: recentMatches.length,
                totalWins: wins,
                totalLosses: recentMatches.length - wins,
                averageScore,
                averageRank,
                currentWinStreak: 0, // 需要单独计算
                currentLoseStreak: 0, // 需要单独计算
                bestScore: Math.max(...scores),
                worstScore: Math.min(...scores),
                bestRank: Math.min(...ranks),
                worstRank: Math.max(...ranks),
                consistency,
                trendDirection
            }
        });

        console.log(`性能指标缓存已重建: ${result}`);

        return { success: true, cacheId: result, matchCount: recentMatches.length };
    }
});

/**
 * 示例：批量重建多个玩家的性能指标缓存
 */
export const batchRebuildPerformanceMetrics = internalMutation({
    args: {
        uids: v.array(v.string()),
        gameType: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const { uids, gameType } = args;

        console.log(`批量重建性能指标缓存: ${uids.length} 个玩家`);

        const results: any[] = [];
        for (const uid of uids) {
            try {
                const result: any = await ctx.runMutation(
                    (internal as any)['service']['ranking']['managers']['examples']['PlayerRankingProfileCacheExample']['rebuildPerformanceMetrics'],
                    { uid, gameType }
                );
                results.push({ uid, ...result });
            } catch (error) {
                results.push({
                    uid,
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }

        const successCount: number = results.filter(r => r.success).length;
        console.log(`批量重建完成: ${successCount}/${uids.length} 成功`);

        return {
            success: true,
            total: uids.length,
            succeeded: successCount,
            failed: uids.length - successCount,
            results
        };
    }
});

