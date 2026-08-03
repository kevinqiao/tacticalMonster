import { authedQuery } from "../../custom/session";
import { PlayerLevelService } from "./playerLevelService";

/**
 * 获取玩家等级信息
 */
export const getPlayerLevelInfo = authedQuery({
    args: {},
    handler: async (ctx) => {
        return await PlayerLevelService.getPlayerLevelInfo(ctx, ctx.uid);
    },
});

/**
 * 获取玩家等级进度（用于进度条显示）
 */
export const getPlayerLevelProgress = authedQuery({
    args: {},
    handler: async (ctx) => {
        const levelInfo = await PlayerLevelService.getPlayerLevelInfo(ctx, ctx.uid);
        
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

