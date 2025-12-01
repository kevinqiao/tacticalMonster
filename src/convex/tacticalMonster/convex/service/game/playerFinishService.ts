import { mutation, query } from "../../_generated/server";
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { updateParticipantFinish } from "../../dao/participantDao";

/**
 * 玩家完成服务
 * 处理玩家完成游戏的请求（阶段1）
 */
export const playerFinish = mutation({
    args: {
        gameId: v.string(),
        uid: v.string(),
        finalScore: v.number(),
    },
    handler: async (ctx, args) => {
        // 1. 获取游戏信息
        const game = await ctx.db
            .query("tacticalMonster_game")
            .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
            .first();
        
        if (!game) {
            throw new Error("游戏不存在");
        }
        
        if (game.status !== "playing" && game.status !== "waiting") {
            throw new Error(`游戏状态错误，当前状态: ${game.status}`);
        }
        
        // 2. 获取玩家参与记录
        const participant = await ctx.db
            .query("mr_game_participants")
            .withIndex("by_gameId", (q) => 
                q.eq("gameId", args.gameId).eq("uid", args.uid)
            )
            .first();
        
        if (!participant) {
            throw new Error("玩家不在游戏中");
        }
        
        if (participant.status === "finished") {
            // 玩家已经完成过了，返回当前排名
            return await getPlayerRanking(ctx, args.gameId, args.uid);
        }
        
        // 3. 更新玩家分数和完成时间
        const finishedAt = new Date().toISOString();
        await ctx.db.patch(participant._id, {
            status: "finished",
            finalScore: args.finalScore,
            finishedAt: finishedAt,
        });
        
        // 4. 计算当前实时排名（仅基于已完成玩家）
        const allFinishedParticipants = await ctx.db
            .query("mr_game_participants")
            .withIndex("by_gameId_status", (q) => 
                q.eq("gameId", args.gameId).eq("status", "finished")
            )
            .collect();
        
        // 按分数降序排序
        const sorted = allFinishedParticipants.sort((a, b) => 
            (b.finalScore || 0) - (a.finalScore || 0)
        );
        
        // 5. 检查是否所有玩家都完成
        const allParticipants = await ctx.db
            .query("mr_game_participants")
            .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
            .collect();
        
        const allFinished = allParticipants.every(p => p.status === "finished");
        
        // 6. 如果所有玩家都完成，触发游戏结束流程
        if (allFinished) {
            // 异步触发游戏结束（避免阻塞玩家完成响应）
            await ctx.scheduler.runAfter(0, internal.service.game.gameEndService.endGame, {
                gameId: args.gameId,
            });
        }
        
        // 7. 返回当前实时排名
        const currentRank = sorted.findIndex(p => p.uid === args.uid) + 1;
        const totalFinished = sorted.length;
        const totalPlayers = allParticipants.length;
        
        return {
            ok: true,
            status: allFinished ? "game_ending" : "waiting_others",
            currentRank: currentRank,
            totalFinished: totalFinished,
            totalPlayers: totalPlayers,
            finalScore: args.finalScore,
            finishedAt: finishedAt,
        };
    },
});

/**
 * 获取玩家排名信息
 */
export const getPlayerRanking = query({
    args: {
        gameId: v.string(),
        uid: v.string(),
    },
    handler: async (ctx, args) => {
        const participant = await ctx.db
            .query("mr_game_participants")
            .withIndex("by_gameId", (q) => 
                q.eq("gameId", args.gameId).eq("uid", args.uid)
            )
            .first();
        
        if (!participant) {
            throw new Error("玩家不在游戏中");
        }
        
        const game = await ctx.db
            .query("tacticalMonster_game")
            .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
            .first();
        
        return {
            ok: true,
            status: game?.status || "unknown",
            currentRank: participant.rank || null,
            finalScore: participant.finalScore || null,
            finishedAt: participant.finishedAt || null,
            rewarded: participant.status === "rewarded",
        };
    },
});

