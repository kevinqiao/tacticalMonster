import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { getTorontoDate } from "../utils";

const GAME_MODES: Record<string, string> = {
    solitaire: "independent",
    uno: "shared",
    ludo: "shared",
    rummy: "shared"
}
// 远程游戏服务器配置
const GAME_SERVER_CONFIG: Record<string, string> = {
    "solitaire": "https://game-server.example.com/api/games",
    "uno": "https://game-server.example.com/api/games",
    "ludo": "https://game-server.example.com/api/games",
    "rummy": "https://game-server.example.com/api/games"
};

/**
 * 比赛管理器 - 使用新的 matches 和 player_matches 表结构
 * 只支持远程游戏服务器
 */
export class MatchManager {
    /**
     * 创建新比赛
     */
    static async createMatch(ctx: any, params: {
        tournamentId: string;
        typeId: string;
        uids?: string[];
    }) {

        const tournamentType = await ctx.db.query("tournamentTypes").withIndex("by_typeId", (q: any) => q.eq("typeId", params.typeId)).unique();
        if (!tournamentType) {
            throw new Error("锦标赛类型不存在");
        }
        const { uids, typeId, tournamentId } = params;
        const now = getTorontoDate();

        const matchId = await ctx.db.insert("matches", {
            tournamentId,
            tournamentType: typeId,
            gameType: tournamentType.gameType,
            matchType: tournamentType.matchRules.matchType,
            status: "pending",
            maxPlayers: tournamentType.matchRules.maxPlayers,
            minPlayers: tournamentType.matchRules.minPlayers,
            startTime: undefined,
            endTime: undefined,
            gameData: {},
            createdAt: now.iso,
            updatedAt: now.iso,
        });

        // 记录比赛创建事件

        const match = await ctx.db.get(matchId);
        if (uids) {
            await this.joinMatch(ctx, {
                uids,
                match: match
            });
        }
        await ctx.db.insert("match_events", {
            matchId,
            tournamentId: params.tournamentId,
            eventType: "match_created",
            eventData: {
                matchType: tournamentType.matchRules.matchType,
                maxPlayers: tournamentType.matchRules.maxPlayers,
                minPlayers: tournamentType.matchRules.minPlayers,
            },
            timestamp: now.iso,
            createdAt: now.iso,
        });
        return match;
    }

    /**
     * 玩家加入比赛
     */
    static async joinMatch(ctx: any, params: {
        uids: string[];
        match: any;
    }) {
        const now = getTorontoDate();
        const { uids, match } = params;
        if (uids.length === 0) {
            throw new Error("玩家列表不能为空");
        }

        // 检查比赛人数限制
        const currentPlayers = match.maxPlayers !== match.minPlayers ? await ctx.db
            .query("player_matches")
            .withIndex("by_match", (q: any) => q.eq("matchId", match._id))
            .collect() : [];
        const size = currentPlayers.length + uids.length;
        if (size > match.maxPlayers) {
            throw new Error("比赛人数已满");
        } else {
            await ctx.db.patch(match._id, {
                status: size === match.maxPlayers ? "matched" : "matching"
            });
        }
        const gameSize = GAME_MODES[match.gameType] === "independent" ? uids.length : 1;
        const gameIds: string[] = [];
        for (let i = 0; i < gameSize; i++) {
            const gameId = `game_${match._id}_${Date.now()}_${i + 1}`;
            gameIds.push(gameId);
        }

        uids.forEach(async (uid: string, index: number) => {
            const gameId = GAME_MODES[match.gameType] === "independent" ? gameIds[index] : gameIds[0];
            await ctx.db.insert("player_matches", {
                matchId: match._id,
                tournamentId: match.tournamentId,
                uid: uid,
                gameId: gameId,
                gameType: match.gameType,
                score: 0,
                rank: undefined,
                completed: false,
                attemptNumber: 1,
                propsUsed: [],
                playerGameData: {},
                joinTime: now.iso,
                leaveTime: undefined,
                createdAt: now.iso,
                updatedAt: now.iso,
            });
        });
        // await this.createRemoteGame(ctx, {
        //     gameType: match.gameType,
        //     gameIds: gameIds
        // });

    }



    /**
     * 结束比赛
     */
    static async submitScore(ctx: any, params: {
        match: any;
        tournamentType: any;
        scores: {
            uid: string;
            score: number;
            rank?: number;
            gameData: any;
        }[];
    }) {
        const now = getTorontoDate();

        for (const score of params.scores) {
            const playerMatch = await ctx.db.query("player_matches").withIndex("by_player_match", (q: any) => q.eq("uid", score.uid).eq("matchId", params.match._id)).unique();
            if (!playerMatch) {
                throw new Error("玩家比赛记录不存在");
            }
            const playerTournament = await ctx.db.query("player_tournaments").withIndex("by_player_tournament", (q: any) => q.eq("uid", score.uid).eq("tournamentId", params.match.tournamentId)).unique();
            if (!playerTournament) {
                throw new Error("玩家锦标赛记录不存在");
            }
            const pointsPerMatch = params.tournamentType.matchRules.pointsPerMatch;
            if (pointsPerMatch) {
                if (score.rank) {
                    playerTournament.gamePoint = (playerTournament.gamePoint ?? 0) + (pointsPerMatch[score.rank] ?? 0);
                } else {
                    throw new Error("排名积分不存在");
                }
            } else {
                if (params.tournamentType.matchRules.rankingMethod === "best_score") {
                    playerTournament.score = Math.max(playerTournament.score ?? 0, score.score);
                } else if (params.tournamentType.matchRules.rankingMethod === "average_score") {
                    playerTournament.score = Math.round(((playerTournament.score ?? 0) + score.score) / 2);
                } else if (params.tournamentType.matchRules.rankingMethod === "total_score") {
                    playerTournament.score = (playerTournament.score ?? 0) + score.score;
                }
            }
            const playerTournamentPatch = {
                gamePoint: playerTournament.gamePoint,
                score: playerTournament.score,
                completed: params.tournamentType.matchRules.matchType === "single" ? true : false,
                updatedAt: getTorontoDate().iso
            }
            await ctx.db.patch(playerTournament._id, playerTournamentPatch);
            await ctx.db.patch(playerMatch._id, {
                score: score.score,
                rank: score.rank,
                gameData: score.gameData,
                completed: true,
                updatedAt: getTorontoDate().iso
            });
        }



        // 记录比赛结束事件
        await ctx.db.insert("match_events", {
            matchId: params.match._id,
            tournamentId: params.match.tournamentId,
            eventType: "match_score_submitted",
            eventData: {
                scores: params.scores
            },
            timestamp: now.iso,
            createdAt: now.iso,
        });


        return {
            success: true
        };
    }

    /**
     * 获取比赛详情
     */
    static async getMatchDetails(ctx: any, matchId: string) {
        const match = await ctx.db.get(matchId);
        if (!match) {
            throw new Error("比赛不存在");
        }

        const playerMatches = await ctx.db
            .query("player_matches")
            .withIndex("by_match", (q: any) => q.eq("matchId", matchId))
            .collect();

        const events = await ctx.db
            .query("match_events")
            .withIndex("by_match", (q: any) => q.eq("matchId", matchId))
            .collect();

        return {
            match,
            players: playerMatches,
            events: events.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
        };
    }

    /**
     * 获取玩家比赛历史
     */
    static async getPlayerMatchHistory(ctx: any, uid: string, limit: number = 20) {
        const playerMatches = await ctx.db
            .query("player_matches")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .order("desc")
            .take(limit);

        const matchIds = [...new Set(playerMatches.map((pm: any) => pm.matchId))];
        const matches = await Promise.all(matchIds.map((id: any) => ctx.db.get(id)));

        return playerMatches.map((pm: any) => ({
            ...pm,
            match: matches.find((m: any) => m?._id === pm.matchId),
        }));
    }

    /**
     * 创建远程游戏 - 统一接口
     */
    static async createRemoteGame(ctx: any, params: {
        gameType: string;
        gameIds: string[];
        seed?: string;
    }) {
        const now = getTorontoDate();

        try {
            const gameServerUrl = GAME_SERVER_CONFIG[params.gameType];
            if (!gameServerUrl) {
                throw new Error("游戏服务器配置不存在");
            }
            const response = await fetch(gameServerUrl, {
                method: "POST",
                body: JSON.stringify({
                    gameIds: params.gameIds,
                    seed: params.seed
                })
            });
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("创建远程游戏失败:", error);

            // 记录错误日志
            await ctx.db.insert("error_logs", {
                error: `创建远程游戏失败: ${error instanceof Error ? error.message : "未知错误"}`,
                context: "createRemoteGame",
                createdAt: now.iso
            });

            throw new Error(`创建远程游戏失败: ${error instanceof Error ? error.message : "未知错误"}`);
        }
    }
}


// Convex 函数接口
export const createMatch = (mutation as any)({
    args: {
        tournamentId: v.id("tournaments"),
        gameType: v.string(),
        matchType: v.string(),
        maxPlayers: v.number(),
        minPlayers: v.number(),
        gameData: v.optional(v.string()),
    },
    handler: async (ctx: any, args: any): Promise<any> => {
        return await MatchManager.createMatch(ctx, args);
    },
});

export const joinMatch = (mutation as any)({
    args: {
        matchId: v.id("matches"),
        tournamentId: v.id("tournaments"),
        uid: v.string(),
        gameType: v.string(),
    },
    handler: async (ctx: any, args: any): Promise<any> => {
        return await MatchManager.joinMatch(ctx, args);
    },
});

export const submitScore = (mutation as any)({
    args: {
        matchId: v.id("matches"),
        tournamentId: v.id("tournaments"),
        uid: v.string(),
        gameType: v.string(),
        score: v.number(),
        gameData: v.string(),
        propsUsed: v.any(),
        attemptNumber: v.optional(v.number()),
    },
    handler: async (ctx: any, args: any): Promise<any> => {
        return await MatchManager.submitScore(ctx, args);
    },
});

export const getMatchDetails = (query as any)({
    args: { matchId: v.id("matches") },
    handler: async (ctx: any, args: any): Promise<any> => {
        return await MatchManager.getMatchDetails(ctx, args.matchId);
    },
});

export const getPlayerMatchHistory = (query as any)({
    args: {
        uid: v.string(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx: any, args: any): Promise<any> => {
        return await MatchManager.getPlayerMatchHistory(ctx, args.uid, args.limit);
    },
});
