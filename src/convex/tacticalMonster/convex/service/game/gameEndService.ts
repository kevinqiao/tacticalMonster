import { v } from "convex/values";
import { internalMutation } from "../../_generated/server";
import { endGameLogic } from "./gameEndLogic";

/**
 * 游戏结束服务
 * 处理游戏结束流程（阶段2：所有玩家完成或超时后）
 */
export const endGame = internalMutation({
    args: {
        gameId: v.string(),
    },
    handler: async (ctx, args) => {
        return await endGameLogic(ctx, args.gameId);
    },
});

