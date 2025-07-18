import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { getTorontoDate } from "../utils";

// 远程游戏服务器配置
const REMOTE_GAME_CONFIG = {
    // 游戏服务器API端点
    gameAPI: process.env.GAME_SERVER_API || "https://game-server.example.com/api/games",
    eventAPI: process.env.EVENT_SYNC_API || "https://event-sync.example.com/api/events",

    // 游戏类型映射
    gameTypeMapping: {
        "solitaire": "solitaire",
        "uno": "uno",
        "ludo": "ludo",
        "rummy": "rummy"
    },

    // 超时配置
    timeout: 30000, // 30秒
    retryAttempts: 3
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
        gameType: string;
        matchType: string;
        maxPlayers: number;
        minPlayers: number;
        gameData?: any;
    }) {
        const now = getTorontoDate();

        const matchId = await ctx.db.insert("matches", {
            tournamentId: params.tournamentId,
            gameType: params.gameType,
            matchType: params.matchType,
            status: "pending",
            maxPlayers: params.maxPlayers,
            minPlayers: params.minPlayers,
            startTime: undefined,
            endTime: undefined,
            gameData: params?.gameData || {},
            createdAt: now.iso,
            updatedAt: now.iso,
        });

        // 记录比赛创建事件
        await ctx.db.insert("match_events", {
            matchId,
            tournamentId: params.tournamentId,
            eventType: "match_created",
            eventData: {
                matchType: params.matchType,
                maxPlayers: params.maxPlayers,
                minPlayers: params.minPlayers,
            },
            timestamp: now.iso,
            createdAt: now.iso,
        });

        return matchId;
    }

    /**
     * 玩家加入比赛
     */
    static async joinMatch(ctx: any, params: {
        matchId: string;
        tournamentId: string;
        uid: string;
        gameType: string;
    }) {
        const now = getTorontoDate();

        // 检查比赛状态
        const match = await ctx.db.get(params.matchId);
        if (!match || match.status !== "pending") {
            throw new Error("比赛不存在或已开始");
        }

        // 检查玩家是否已加入
        const existingPlayer = await ctx.db
            .query("player_matches")
            .withIndex("by_match_uid", (q: any) => q.eq("matchId", params.matchId).eq("uid", params.uid))
            .first();

        if (existingPlayer) {
            throw new Error("玩家已加入此比赛");
        }

        // 检查比赛人数限制
        const currentPlayers = await ctx.db
            .query("player_matches")
            .withIndex("by_match", (q: any) => q.eq("matchId", params.matchId))
            .collect();

        if (currentPlayers.length >= match.maxPlayers) {
            throw new Error("比赛人数已满");
        }

        // 创建玩家比赛记录
        const playerMatchId = await ctx.db.insert("player_matches", {
            matchId: params.matchId,
            tournamentId: params.tournamentId,
            uid: params.uid,
            gameType: params.gameType,
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

        // 记录玩家加入事件
        await ctx.db.insert("match_events", {
            matchId: params.matchId,
            tournamentId: params.tournamentId,
            uid: params.uid,
            eventType: "player_join",
            eventData: {
                playerCount: currentPlayers.length + 1,
            },
            timestamp: now.iso,
            createdAt: now.iso,
        });

        // 如果达到最小人数，开始比赛并创建远程游戏
        if (currentPlayers.length + 1 >= match.minPlayers) {
            await ctx.db.patch(params.matchId, {
                status: "in_progress",
                startTime: now.iso,
                updatedAt: now.iso,
            });

            await ctx.db.insert("match_events", {
                matchId: params.matchId,
                tournamentId: params.tournamentId,
                eventType: "match_start",
                eventData: {
                    playerCount: currentPlayers.length + 1,
                },
                timestamp: now.iso,
                createdAt: now.iso,
            });

            // 创建远程游戏
            const allPlayers = [...currentPlayers, { uid: params.uid }];
            const gameResult = await this.createRemoteGame(ctx, {
                matchId: params.matchId,
                tournamentId: params.tournamentId,
                uids: allPlayers.map((p: any) => p.uid),
                gameType: params.gameType,
                matchType: match.matchType
            });

            // 记录游戏创建事件
            await ctx.db.insert("match_events", {
                matchId: params.matchId,
                tournamentId: params.tournamentId,
                eventType: "remote_game_created",
                eventData: {
                    gameId: gameResult.gameId,
                    uids: allPlayers.map((p: any) => p.uid),
                    gameType: params.gameType,
                    serverUrl: gameResult.serverUrl
                },
                timestamp: now.iso,
                createdAt: now.iso,
            });
        }

        return playerMatchId;
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
        matchId: string;
        tournamentId: string;
        uids: string[];
        gameType: string;
        matchType: string;
    }) {
        const now = getTorontoDate();

        try {
            // 模拟远程游戏创建（用于测试）
            const gameId = `game_${params.matchId}_${Date.now()}`;
            const serverUrl = `https://game-server.example.com/game/${gameId}`;

            // 记录游戏创建事件
            await ctx.db.insert("match_events", {
                matchId: params.matchId,
                tournamentId: params.tournamentId,
                eventType: "remote_game_created",
                eventData: {
                    gameId,
                    uids: params.uids,
                    gameType: params.gameType,
                    serverUrl,
                    mock: true // 标记为模拟数据
                },
                timestamp: now.iso,
                createdAt: now.iso,
            });

            // 在本地记录玩家事件
            for (const uid of params.uids) {
                await ctx.db.insert("player_events", {
                    uid,
                    eventType: "GameCreated",
                    eventData: {
                        gameId,
                        matchId: params.matchId,
                        serverUrl,
                        gameType: params.gameType
                    },
                    timestamp: now.iso,
                    createdAt: now.iso
                });
            }

            return {
                gameId,
                serverUrl,
                type: "remote",
                success: true,
                mock: true // 标记为模拟数据
            };

        } catch (error) {
            console.error("创建远程游戏失败:", error);

            // 记录错误日志
            await ctx.db.insert("error_logs", {
                error: `创建远程游戏失败: ${error instanceof Error ? error.message : "未知错误"}`,
                context: "createRemoteGame",
                matchId: params.matchId,
                tournamentId: params.tournamentId,
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
