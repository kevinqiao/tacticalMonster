/**
 * 段位系统与锦标赛集成 Convex 函数
 */

import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { TournamentSegmentIntegration } from "./tournamentIntegration";

/**
 * 处理锦标赛结束后的段位更新
 */
export const handleTournamentCompletion = mutation({
    args: {
        tournamentId: v.string(),
        results: v.array(v.object({
            uid: v.string(),
            matchRank: v.number(),
            score: v.number(),
            segmentName: v.optional(v.string())
        }))
    },
    handler: async (ctx, args) => {
        const integration = new TournamentSegmentIntegration(ctx);
        return await integration.handleTournamentCompletion(args.tournamentId, args.results);
    }
});

/**
 * 批量处理多个锦标赛的段位更新
 */
export const batchProcessTournaments = mutation({
    args: {
        tournaments: v.array(v.object({
            tournamentId: v.string(),
            results: v.array(v.object({
                uid: v.string(),
                matchRank: v.number(),
                score: v.number(),
                segmentName: v.optional(v.string())
            }))
        }))
    },
    handler: async (ctx, args) => {
        const integration = new TournamentSegmentIntegration(ctx);
        return await integration.batchProcessTournaments(args.tournaments);
    }
});

/**
 * 获取段位统计信息
 */
export const getSegmentStatistics = query({
    args: {},
    handler: async (ctx) => {
        const integration = new TournamentSegmentIntegration(ctx);
        return await integration.getSegmentStatistics();
    }
});

/**
 * 重置所有玩家段位（用于赛季重置）
 */
export const resetAllPlayerSegments = mutation({
    args: {
        targetSegment: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const integration = new TournamentSegmentIntegration(ctx);
        return await integration.resetAllPlayerSegments(args.targetSegment || "bronze");
    }
});

/**
 * 计算玩家积分奖励
 */
export const calculatePlayerPointsReward = query({
    args: {
        matchRank: v.number(),
        score: v.number(),
        currentSegment: v.string()
    },
    handler: async (ctx, args) => {
        const integration = new TournamentSegmentIntegration(ctx);

        // 模拟积分计算逻辑
        let basePoints = 0;
        switch (args.matchRank) {
            case 1: basePoints = 100; break;
            case 2: basePoints = 80; break;
            case 3: basePoints = 60; break;
            case 4: basePoints = 40; break;
            default: basePoints = 20; break;
        }

        const segmentMultipliers: Record<string, number> = {
            bronze: 1.0,
            silver: 1.2,
            gold: 1.5,
            platinum: 1.8,
            diamond: 2.0,
            master: 2.5,
            grandmaster: 3.0
        };

        const multiplier = segmentMultipliers[args.currentSegment] || 1.0;
        const scoreBonus = Math.floor(args.score / 100) * 5;
        const totalPoints = Math.floor((basePoints + scoreBonus) * multiplier);

        return {
            basePoints,
            scoreBonus,
            segmentMultiplier: multiplier,
            totalPoints
        };
    }
});
