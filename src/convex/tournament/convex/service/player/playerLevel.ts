import { v } from "convex/values";
import { query } from "../../_generated/server";
import { PlayerLevelService } from "./playerLevelService";

/**
 * 获取玩家等级信息
 */
export const getPlayerLevelInfo = query({
    args: {
        uid: v.string(),
    },
    handler: async (ctx, args) => {
        return await PlayerLevelService.getPlayerLevelInfo(ctx, args.uid);
    },
});

/**
 * 获取玩家等级进度（用于进度条显示）
 */
export const getPlayerLevelProgress = query({
    args: {
        uid: v.string(),
    },
    handler: async (ctx, args) => {
        const levelInfo = await PlayerLevelService.getPlayerLevelInfo(ctx, args.uid);
        
        if (!levelInfo) {
            return null;
        }

        const { level, exp, expToNextLevel, requiredExpForNextLevel } = levelInfo;
        
        // 计算进度百分比
        const progressPercentage = requiredExpForNextLevel > 0
            ? Math.floor((expToNextLevel / requiredExpForNextLevel) * 100)
            : 100;

        return {
            ...levelInfo,
            progressPercentage,
        };
    },
});

