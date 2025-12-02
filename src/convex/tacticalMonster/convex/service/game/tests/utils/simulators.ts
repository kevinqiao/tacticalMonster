/**
 * 测试模拟工具
 * 用于模拟游戏流程
 */

import { endGameLogic } from "../../gameEndLogic";

/**
 * 模拟玩家完成游戏
 * 注意：这里直接操作数据库，模拟 playerFinish 的逻辑
 */
export async function simulatePlayerFinish(
    ctx: any,
    gameId: string,
    uid: string,
    score: number
): Promise<{
    success: boolean;
    error?: string;
    data?: any;
}> {
    try {
        // 获取玩家参与记录
        const participant = await ctx.db
            .query("mr_game_participants")
            .withIndex("by_gameId", (q: any) =>
                q.eq("gameId", gameId).eq("uid", uid)
            )
            .first();

        if (!participant) {
            return {
                success: false,
                error: "玩家不在游戏中",
            };
        }

        if (participant.status === "finished") {
            return {
                success: true,
                data: { ok: true, alreadyFinished: true },
            };
        }

        // 更新玩家分数和完成时间
        const finishedAt = new Date().toISOString();
        await ctx.db.patch(participant._id, {
            status: "finished",
            finalScore: score,
            finishedAt: finishedAt,
        });

        // 计算当前实时排名
        const allFinishedParticipants = await ctx.db
            .query("mr_game_participants")
            .withIndex("by_gameId", (q: any) => q.eq("gameId", gameId))
            .collect()
            .then((participants: any[]) =>
                participants
                    .filter((p: any) => p.status === "finished")
                    .sort((a: any, b: any) => (b.finalScore || 0) - (a.finalScore || 0))
            );

        const currentRank = allFinishedParticipants.findIndex((p: any) => p.uid === uid) + 1;
        const totalFinished = allFinishedParticipants.length;

        // 检查是否所有玩家都完成
        const allParticipants = await ctx.db
            .query("mr_game_participants")
            .withIndex("by_gameId", (q: any) => q.eq("gameId", gameId))
            .collect();
        const allFinished = allParticipants.every((p: any) => p.status === "finished");

        return {
            success: true,
            data: {
                ok: true,
                status: allFinished ? "game_ending" : "waiting_others",
                currentRank,
                totalFinished,
                totalPlayers: allParticipants.length,
                finalScore: score,
                finishedAt,
            },
        };
    } catch (error: any) {
        return {
            success: false,
            error: error.message,
        };
    }
}

/**
 * 模拟游戏结束
 */
export async function simulateGameEnd(
    ctx: any,
    gameId: string
): Promise<{
    success: boolean;
    error?: string;
    data?: any;
}> {
    try {
        const result = await endGameLogic(ctx, gameId);
        return {
            success: result.ok === true,
            data: result,
        };
    } catch (error: any) {
        return {
            success: false,
            error: error.message,
        };
    }
}

/**
 * 模拟多个玩家完成游戏
 */
export async function simulateMultiplePlayersFinish(
    ctx: any,
    gameId: string,
    playerScores: Array<{ uid: string; score: number }>
): Promise<{
    success: boolean;
    errors: string[];
    results: Array<{ uid: string; success: boolean; error?: string }>;
}> {
    const errors: string[] = [];
    const results: Array<{ uid: string; success: boolean; error?: string }> = [];

    for (const { uid, score } of playerScores) {
        const result = await simulatePlayerFinish(ctx, gameId, uid, score);
        results.push({
            uid,
            success: result.success,
            error: result.error,
        });

        if (!result.success) {
            errors.push(`玩家 ${uid} 完成失败: ${result.error}`);
        }
    }

    return {
        success: errors.length === 0,
        errors,
        results,
    };
}

/**
 * 模拟多场游戏
 */
export async function simulateMultipleGames(
    ctx: any,
    playerUids: string[],
    gameCount: number,
    tier: string = "bronze"
): Promise<{
    success: boolean;
    errors: string[];
    gameIds: string[];
}> {
    const errors: string[] = [];
    const gameIds: string[] = [];

    // 这里简化处理，实际应该通过匹配系统创建游戏
    // 实际测试中应该调用匹配服务来创建真实的游戏

    return {
        success: errors.length === 0,
        errors,
        gameIds,
    };
}

