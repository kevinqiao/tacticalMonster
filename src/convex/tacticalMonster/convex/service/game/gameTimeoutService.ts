import { internalMutation } from "../../_generated/server";
import { notifyGameEnd } from "./gameService";

/**
 * 游戏超时服务
 * 检查并处理超时的游戏
 */
export const checkAndEndTimeoutGames = internalMutation({
    handler: async (ctx) => {
        const now = Date.now();

        // 查找所有状态为 playing 的 Tournament 游戏（有 matchId 的）
        // 注意：通过 matchId 字段判断是否为 Tournament 模式
        const allPlayingGames = await ctx.db
            .query("tacticalMonster_game")
            .withIndex("by_status_timeoutAt", (q: any) =>
                q.eq("status", "playing")
            )
            .collect();

        // 过滤出有 matchId 的游戏（Tournament 模式）
        const tournamentGames = allPlayingGames.filter((game) => game.matchId);

        // 在 JavaScript 中过滤超时的 Tournament 游戏
        const timeoutGames = tournamentGames.filter((game) => {
            if (!game.timeoutAt) return false;
            const timeoutTime = new Date(game.timeoutAt).getTime();
            return now >= timeoutTime;
        });

        // 结束所有超时游戏（使用共享逻辑）
        for (const game of timeoutGames) {
            await notifyGameEnd(ctx, game.gameId);
        }

        return {
            ok: true,
            endedGames: timeoutGames.length,
        };
    },
});

