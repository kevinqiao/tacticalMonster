/**
 * 游戏流程控制器
 * 基于 ScoreThresholdPlayerController 提供完整的游戏流程接口
 */

import { v } from "convex/values";
import { query } from "../../../../_generated/server";
import { ScoreThresholdPlayerController } from "../core/ScoreThresholdPlayerController";

// ==================== 游戏流程接口 ====================

/**
 * 1. 获取推荐种子（游戏开始）
 */
export const getRecommendedSeeds = query({
    args: {
        uid: v.string(),
        options: v.optional(v.object({
            limit: v.optional(v.number()),
            gameType: v.optional(v.string()),
            preferredDifficulty: v.optional(v.union(
                v.literal('practice'),
                v.literal('balanced'),
                v.literal('challenge')
            ))
        }))
    },
    handler: async (ctx, args) => {
        try {
            const controller = new ScoreThresholdPlayerController(ctx);

            const result = await controller.getRecommendedSeeds(
                args.uid,
                args.options || {}
            );

            return result;

        } catch (error) {
            console.error('获取推荐种子失败:', error);
            return {
                success: false,
                error: String(error)
            };
        }
    }
});

/**
 * 2. 提交游戏分数（游戏结束）
 */


/**
 * 3. 获取玩家游戏历史
 */
export const getPlayerGameHistory = query({
    args: {
        uid: v.string(),
        limit: v.optional(v.number())
    },
    handler: async (ctx, args) => {
        try {
            const controller = new ScoreThresholdPlayerController(ctx);

            const result = await controller.getPlayerGameHistory(
                args.uid,
                args.limit || 20
            );

            return result;

        } catch (error) {
            console.error('获取玩家游戏历史失败:', error);
            return {
                success: false,
                error: String(error)
            };
        }
    }
});

/**
 * 4. 获取种子难度统计
 */
export const getSeedDifficultyStats = query({
    args: {
        seedId: v.string()
    },
    handler: async (ctx, args) => {
        try {
            const controller = new ScoreThresholdPlayerController(ctx);

            const result = await controller.getSeedDifficultyStats(args.seedId);

            return result;

        } catch (error) {
            console.error('获取种子难度统计失败:', error);
            return {
                success: false,
                error: String(error)
            };
        }
    }
});

/**
 * 5. 获取玩家技能等级
 */
export const getPlayerSkillLevel = query({
    args: {
        uid: v.string()
    },
    handler: async (ctx, args) => {
        try {
            const controller = new ScoreThresholdPlayerController(ctx);

            const result = await controller.getPlayerSkillLevel(args.uid);

            return result;

        } catch (error) {
            console.error('获取玩家技能等级失败:', error);
            return {
                success: false,
                error: String(error)
            };
        }
    }
});
