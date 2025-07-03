import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { getTorontoDate } from "../utils";
import { getHandler } from "./handler";

/**
 * 统一锦标赛服务
 * 支持单人、多人锦标赛，只使用远程游戏服务器
 */
export class TournamentService {
    /**
     * 加入锦标赛
     */
    static async joinTournament(ctx: any, params: {
        uid: string;
        gameType: string;
        tournamentType: string;
    }) {
        const now = getTorontoDate();

        // 获取玩家信息
        const player = await ctx.db
            .query("players")
            .withIndex("by_uid", (q: any) => q.eq("uid", params.uid))
            .first();
        if (!player) {
            throw new Error("玩家不存在");
        }

        // 获取当前赛季
        const season = await ctx.db
            .query("seasons")
            .withIndex("by_isActive", (q: any) => q.eq("isActive", true))
            .first();
        if (!season) {
            throw new Error("无活跃赛季");
        }

        // 获取对应的处理器
        const handler = getHandler(params.tournamentType);

        // 执行加入逻辑
        const result = await handler.join(ctx, {
            uid: params.uid,
            gameType: params.gameType,
            tournamentType: params.tournamentType,
            player,
            season
        });

        return {
            success: true,
            ...result,
            message: "成功加入锦标赛"
        };
    }

    /**
     * 提交分数
     */
    static async submitScore(ctx: any, params: {
        tournamentId: string;
        uid: string;
        gameType: string;
        score: number;
        gameData: any;
        propsUsed: string[];
        gameId?: string;
    }) {
        const now = getTorontoDate();

        // 获取锦标赛信息
        const tournament = await ctx.db.get(params.tournamentId);
        if (!tournament) {
            throw new Error("锦标赛不存在");
        }

        // 获取对应的处理器
        const handler = getHandler(tournament.tournamentType);

        // 执行分数提交
        const result = await handler.submitScore(ctx, {
            tournamentId: params.tournamentId,
            uid: params.uid,
            gameType: params.gameType,
            score: params.score,
            gameData: params.gameData,
            propsUsed: params.propsUsed,
            gameId: params.gameId
        });

        return result;
    }

    /**
     * 结算锦标赛
     */
    static async settleTournament(ctx: any, tournamentId: string) {
        const tournament = await ctx.db.get(tournamentId);
        if (!tournament) {
            throw new Error("锦标赛不存在");
        }

        const handler = getHandler(tournament.tournamentType);
        await handler.settle(ctx, tournamentId);

        return {
            success: true,
            tournamentId,
            message: "锦标赛结算完成"
        };
    }

    /**
     * 获取锦标赛详情
     */
    static async getTournamentDetails(ctx: any, tournamentId: string) {
        const tournament = await ctx.db.get(tournamentId);
        if (!tournament) {
            throw new Error("锦标赛不存在");
        }

        // 获取比赛列表
        const matches = await ctx.db
            .query("matches")
            .withIndex("by_tournament", (q: any) => q.eq("tournamentId", tournamentId))
            .collect();

        // 获取玩家比赛记录
        const playerMatches = await ctx.db
            .query("player_matches")
            .withIndex("by_tournament", (q: any) => q.eq("tournamentId", tournamentId))
            .collect();

        // 获取玩家信息
        const playerUids = Array.from(new Set(playerMatches.map((pm: any) => pm.uid))) as string[];
        const players = await Promise.all(
            playerUids.map((uid: string) =>
                ctx.db.query("players")
                    .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                    .first()
            )
        );

        // 计算玩家统计
        const playerStats = new Map();

        for (const playerMatch of playerMatches) {
            if (!playerMatch.completed) continue;

            const current = playerStats.get(playerMatch.uid) || {
                totalScore: 0,
                matchCount: 0,
                bestScore: 0,
                averageScore: 0
            };

            const newTotal = current.totalScore + playerMatch.score;
            const newCount = current.matchCount + 1;

            playerStats.set(playerMatch.uid, {
                totalScore: newTotal,
                matchCount: newCount,
                bestScore: Math.max(current.bestScore, playerMatch.score),
                averageScore: newTotal / newCount
            });
        }

        // 排序玩家
        const sortedPlayers = Array.from(playerStats.entries())
            .map(([uid, stats]) => ({
                uid,
                ...stats,
                player: players.find((p: any) => p?.uid === uid)
            }))
            .sort((a: any, b: any) => b.bestScore - a.bestScore)
            .map((player: any, index: number) => ({
                ...player,
                rank: index + 1
            }));

        return {
            tournament,
            matches,
            players: sortedPlayers,
            totalMatches: matches.length,
            totalPlayers: playerUids.length
        };
    }

    /**
     * 获取玩家锦标赛历史
     */
    static async getPlayerTournamentHistory(ctx: any, params: {
        uid: string;
        limit?: number;
    }) {
        const { uid, limit = 20 } = params;

        // 获取玩家参与的所有锦标赛
        const playerMatches = await ctx.db
            .query("player_matches")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .order("desc")
            .take(limit);

        const tournamentIds = Array.from(new Set(playerMatches.map((pm: any) => pm.tournamentId))) as string[];
        const tournaments = await Promise.all(
            tournamentIds.map((id: string) => ctx.db.get(id))
        );

        const matchIds = Array.from(new Set(playerMatches.map((pm: any) => pm.matchId))) as string[];
        const matches = await Promise.all(
            matchIds.map((id: string) => ctx.db.get(id))
        );

        // 构建历史记录
        const history = playerMatches.map((pm: any) => {
            const tournament = tournaments.find((t: any) => t?._id === pm.tournamentId);
            const match = matches.find((m: any) => m?._id === pm.matchId);

            return {
                playerMatch: pm,
                tournament,
                match,
                gameType: pm.gameType,
                score: pm.score,
                rank: pm.rank,
                completed: pm.completed,
                createdAt: pm.createdAt
            };
        });

        return history.sort((a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }
}

// Convex 函数接口
export const joinTournament = mutation({
    args: {
        uid: v.string(),
        gameType: v.string(),
        tournamentType: v.string(),
    },
    handler: async (ctx, args): Promise<any> => {
        return await TournamentService.joinTournament(ctx, args);
    },
});

export const submitScore = mutation({
    args: {
        tournamentId: v.id("tournaments"),
        uid: v.string(),
        gameType: v.string(),
        score: v.number(),
        gameData: v.any(),
        propsUsed: v.array(v.string()),
        gameId: v.optional(v.string()),
    },
    handler: async (ctx, args): Promise<any> => {
        return await TournamentService.submitScore(ctx, args);
    },
});

export const settleTournament = mutation({
    args: {
        tournamentId: v.id("tournaments"),
    },
    handler: async (ctx, args): Promise<any> => {
        return await TournamentService.settleTournament(ctx, args.tournamentId);
    },
});

export const getTournamentDetails = query({
    args: {
        tournamentId: v.id("tournaments"),
    },
    handler: async (ctx, args): Promise<any> => {
        return await TournamentService.getTournamentDetails(ctx, args.tournamentId);
    },
});

export const getPlayerTournamentHistory = query({
    args: {
        uid: v.string(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args): Promise<any> => {
        return await TournamentService.getPlayerTournamentHistory(ctx, args);
    },
}); 