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
     * 提交比赛分数
     */
    static async submitScore(ctx: any, params: {
        matchId: string;
        tournamentId: string;
        uid: string;
        gameType: string;
        score: number;
        gameData: any;
        propsUsed: string[];
        attemptNumber?: number;
    }) {
        const now = getTorontoDate();

        // 获取玩家比赛记录
        const playerMatch = await ctx.db
            .query("player_matches")
            .withIndex("by_match_uid", (q: any) => q.eq("matchId", params.matchId).eq("uid", params.uid))
            .first();

        if (!playerMatch) {
            throw new Error("玩家未加入此比赛");
        }

        // 更新玩家比赛记录
        await ctx.db.patch(playerMatch._id, {
            score: params.score,
            completed: true,
            attemptNumber: params.attemptNumber || playerMatch.attemptNumber,
            propsUsed: params.propsUsed,
            playerGameData: params.gameData,
            leaveTime: now.iso,
            updatedAt: now.iso,
        });

        // 记录分数提交事件
        await ctx.db.insert("match_events", {
            matchId: params.matchId,
            tournamentId: params.tournamentId,
            uid: params.uid,
            eventType: "score_submit",
            eventData: {
                score: params.score,
                propsUsed: params.propsUsed,
                attemptNumber: params.attemptNumber || playerMatch.attemptNumber,
            },
            timestamp: now.iso,
            createdAt: now.iso,
        });

        // 检查是否所有玩家都完成了比赛
        const allPlayers = await ctx.db
            .query("player_matches")
            .withIndex("by_match", (q: any) => q.eq("matchId", params.matchId))
            .collect();

        const completedPlayers = allPlayers.filter((p: any) => p.completed);

        // 如果所有玩家都完成了，结束比赛
        if (completedPlayers.length === allPlayers.length) {
            await this.endMatch(ctx, {
                matchId: params.matchId,
                tournamentId: params.tournamentId
            });
        }

        return {
            success: true,
            playerMatchId: playerMatch._id,
            score: params.score,
        };
    }

    /**
     * 结束比赛
     */
    static async endMatch(ctx: any, params: {
        matchId: string;
        tournamentId: string;
    }) {
        const now = getTorontoDate();

        // 获取比赛信息
        const match = await ctx.db.get(params.matchId);
        if (!match) {
            throw new Error("比赛不存在");
        }

        // 获取所有玩家记录
        const playerMatches = await ctx.db
            .query("player_matches")
            .withIndex("by_match", (q: any) => q.eq("matchId", params.matchId))
            .collect();

        // 计算排名
        const sortedPlayers = playerMatches
            .filter((pm: any) => pm.completed)
            .sort((a: any, b: any) => b.score - a.score)
            .map((pm: any, index: any) => ({
                ...pm,
                rank: index + 1,
            }));

        // 更新排名
        for (const player of sortedPlayers) {
            await ctx.db.patch(player._id, {
                rank: player.rank,
                updatedAt: now.iso,
            });
        }

        // 更新比赛状态
        await ctx.db.patch(params.matchId, {
            status: "completed",
            endTime: now.iso,
            updatedAt: now.iso,
        });

        // 记录比赛结束事件
        await ctx.db.insert("match_events", {
            matchId: params.matchId,
            tournamentId: params.tournamentId,
            eventType: "match_completed",
            eventData: {
                playerCount: playerMatches.length,
                rankings: sortedPlayers.map((p: any) => ({
                    uid: p.uid,
                    rank: p.rank,
                    score: p.score
                }))
            },
            timestamp: now.iso,
            createdAt: now.iso,
        });

        return {
            success: true,
            matchId: params.matchId,
            rankings: sortedPlayers.map((p: any) => ({
                uid: p.uid,
                rank: p.rank,
                score: p.score
            }))
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

    /**
     * 通知玩家事件
     */
    static async notifyPlayers(ctx: any, params: {
        uids: string[];
        eventType: string;
        eventData: any;
    }) {
        const now = getTorontoDate();

        try {
            // 构建事件通知
            const events = params.uids.map(uid => ({
                uid,
                eventType: params.eventType,
                eventData: params.eventData,
                timestamp: now.iso
            }));

            // 在本地记录事件（模拟通知）
            for (const event of events) {
                await ctx.db.insert("player_events", {
                    uid: event.uid,
                    eventType: event.eventType,
                    eventData: event.eventData,
                    timestamp: event.timestamp,
                    createdAt: now.iso
                });
            }

            console.log(`模拟通知 ${params.uids.length} 个玩家: ${params.eventType}`);

        } catch (error) {
            console.error("通知玩家失败:", error);
            // 不抛出错误，避免影响主要流程
        }
    }
}

/**
 * 多人比赛匹配管理器 - 直接从数据库匹配
 * 简化版本，直接从 tournament 中查找和匹配玩家
 */
export class TournamentMatchManager {
    /**
     * 加入多人锦标赛匹配
     */
    static async joinMultiPlayerMatch(ctx: any, params: {
        uid: string;
        tournamentId: string;
        gameType: string;
        segmentName: string;
        eloScore?: number;
    }) {
        const now = getTorontoDate();

        try {
            // 1. 检查锦标赛状态
            const tournament = await ctx.db.get(params.tournamentId);
            if (!tournament || tournament.status !== "open") {
                throw new Error("锦标赛不存在或已关闭");
            }

            // 2. 查找现有的待匹配比赛
            let match = await ctx.db
                .query("matches")
                .withIndex("by_tournament", (q: any) => q.eq("tournamentId", params.tournamentId))
                .filter((q: any) => q.eq(q.field("status"), "pending"))
                .filter((q: any) => q.eq(q.field("gameType"), params.gameType))
                .first();

            // 3. 如果没有待匹配的比赛，创建新比赛
            if (!match) {
                const matchId = await MatchManager.createMatch(ctx, {
                    tournamentId: params.tournamentId,
                    gameType: params.gameType,
                    matchType: "multiplayer_single_match",
                    maxPlayers: 4,
                    minPlayers: 2,
                    gameData: {
                        matchType: "skill_based",
                        createdAt: now.iso
                    }
                });
                match = await ctx.db.get(matchId);
            }

            // 4. 检查玩家是否已在此比赛中
            const existingPlayer = await ctx.db
                .query("player_matches")
                .withIndex("by_match_uid", (q: any) => q.eq("matchId", match._id).eq("uid", params.uid))
                .first();

            if (existingPlayer) {
                return {
                    success: true,
                    matchId: match._id,
                    playerMatchId: existingPlayer._id,
                    status: "already_joined",
                    message: "已在此比赛中"
                };
            }

            // 5. 玩家加入比赛
            const playerMatchId = await MatchManager.joinMatch(ctx, {
                matchId: match._id,
                tournamentId: params.tournamentId,
                uid: params.uid,
                gameType: params.gameType
            });

            // 6. 检查是否达到最小人数，如果达到则开始匹配
            const currentPlayers = await ctx.db
                .query("player_matches")
                .withIndex("by_match", (q: any) => q.eq("matchId", match._id))
                .collect();

            if (currentPlayers.length >= match.minPlayers) {
                // 尝试匹配或开始游戏
                await this.tryStartMatch(ctx, match._id, params.tournamentId, params.gameType);
            }

            return {
                success: true,
                matchId: match._id,
                playerMatchId,
                status: "joined",
                currentPlayers: currentPlayers.length + 1,
                maxPlayers: match.maxPlayers,
                message: "成功加入匹配"
            };

        } catch (error) {
            console.error("加入多人匹配失败:", error);
            throw error;
        }
    }

    /**
     * 尝试开始比赛
     */
    private static async tryStartMatch(ctx: any, matchId: string, tournamentId: string, gameType: string) {
        const now = getTorontoDate();

        try {
            // 获取比赛信息
            const match = await ctx.db.get(matchId);
            if (!match || match.status !== "pending") return;

            // 获取所有玩家
            const players = await ctx.db
                .query("player_matches")
                .withIndex("by_match", (q: any) => q.eq("matchId", matchId))
                .collect();

            // 如果达到最大人数或等待时间过长，开始比赛
            const shouldStart = players.length >= match.maxPlayers ||
                this.shouldStartByTime(match.createdAt);

            if (shouldStart) {
                // 创建远程游戏
                const gameResult = await MatchManager.createRemoteGame(ctx, {
                    matchId,
                    tournamentId,
                    uids: players.map((p: any) => p.uid),
                    gameType,
                    matchType: "multiplayer_single_match"
                });

                // 记录匹配成功事件
                await ctx.db.insert("match_events", {
                    matchId,
                    tournamentId,
                    eventType: "players_matched",
                    eventData: {
                        players: players.map((p: any) => p.uid),
                        gameId: gameResult.gameId,
                        serverUrl: gameResult.serverUrl,
                        playerCount: players.length
                    },
                    timestamp: now.iso,
                    createdAt: now.iso
                });

                // 通知所有玩家
                await MatchManager.notifyPlayers(ctx, {
                    uids: players.map((p: any) => p.uid),
                    eventType: "MatchCreated",
                    eventData: {
                        matchId,
                        gameId: gameResult.gameId,
                        serverUrl: gameResult.serverUrl,
                        players: players.map((p: any) => p.uid)
                    }
                });
            }

        } catch (error) {
            console.error("尝试开始比赛失败:", error);
        }
    }

    /**
     * 检查是否应该按时间开始比赛
     */
    private static shouldStartByTime(createdAt: string): boolean {
        const now = new Date();
        const created = new Date(createdAt);
        const waitTime = (now.getTime() - created.getTime()) / 1000;
        return waitTime > 60; // 1分钟后开始
    }

    /**
     * 获取匹配状态
     */
    static async getMatchStatus(ctx: any, params: {
        uid: string;
        tournamentId: string;
        gameType: string;
    }) {
        try {
            // 查找玩家的比赛
            const playerMatches = await ctx.db
                .query("player_matches")
                .withIndex("by_uid", (q: any) => q.eq("uid", params.uid))
                .filter((q: any) => q.eq(q.field("tournamentId"), params.tournamentId))
                .filter((q: any) => q.eq(q.field("gameType"), params.gameType))
                .order("desc")
                .take(1);

            if (playerMatches.length === 0) {
                return {
                    inMatch: false,
                    message: "未找到匹配"
                };
            }

            const playerMatch = playerMatches[0];
            const match = await ctx.db.get(playerMatch.matchId);

            if (!match) {
                return {
                    inMatch: false,
                    message: "比赛不存在"
                };
            }

            // 获取所有玩家
            const allPlayers = await ctx.db
                .query("player_matches")
                .withIndex("by_match", (q: any) => q.eq("matchId", match._id))
                .collect();

            return {
                inMatch: true,
                matchId: match._id,
                playerMatchId: playerMatch._id,
                status: match.status,
                currentPlayers: allPlayers.length,
                maxPlayers: match.maxPlayers,
                gameId: match.gameId,
                serverUrl: match.serverUrl,
                message: match.status === "in_progress" ? "比赛进行中" : "等待更多玩家"
            };

        } catch (error) {
            console.error("获取匹配状态失败:", error);
            throw error;
        }
    }

    /**
     * 离开匹配
     */
    static async leaveMatch(ctx: any, params: {
        uid: string;
        tournamentId: string;
        gameType: string;
    }) {
        const now = getTorontoDate();

        try {
            // 查找玩家的比赛
            const playerMatches = await ctx.db
                .query("player_matches")
                .withIndex("by_uid", (q: any) => q.eq("uid", params.uid))
                .filter((q: any) => q.eq(q.field("tournamentId"), params.tournamentId))
                .filter((q: any) => q.eq(q.field("gameType"), params.gameType))
                .filter((q: any) => q.eq(q.field("completed"), false))
                .collect();

            for (const playerMatch of playerMatches) {
                const match = await ctx.db.get(playerMatch.matchId);
                if (match && match.status === "pending") {
                    // 删除玩家比赛记录
                    await ctx.db.delete(playerMatch._id);

                    // 记录离开事件
                    await ctx.db.insert("match_events", {
                        matchId: match._id,
                        tournamentId: params.tournamentId,
                        uid: params.uid,
                        eventType: "player_left_match",
                        eventData: { reason: "manual_leave" },
                        timestamp: now.iso,
                        createdAt: now.iso
                    });
                }
            }

            return { success: true, message: "已离开匹配" };

        } catch (error) {
            console.error("离开匹配失败:", error);
            throw error;
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

export const endMatch = (mutation as any)({
    args: {
        matchId: v.id("matches"),
        tournamentId: v.id("tournaments"),
    },
    handler: async (ctx: any, args: any): Promise<any> => {
        return await MatchManager.endMatch(ctx, args);
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

// 处理多人单场比赛事件
export const handleMultiPlayerSingleMatchEvent = (mutation as any)({
    args: {
        event: v.any()
    },
    handler: async (ctx: any, args: any): Promise<any> => {
        const now = getTorontoDate();

        // 记录事件
        await ctx.db.insert("match_events", {
            matchId: args.event.matchId,
            tournamentId: args.event.tournamentId,
            eventType: args.event.name,
            eventData: args.event.data,
            timestamp: now.iso,
            createdAt: now.iso
        });

        // 根据事件类型执行相应逻辑
        switch (args.event.name) {
            case "player_queued":
                // 处理玩家排队
                break;
            case "players_matched":
                // 处理玩家匹配
                break;
            case "game_started":
                // 处理游戏开始
                break;
            case "game_completed":
                // 处理游戏完成
                break;
            default:
                console.log(`未处理的事件类型: ${args.event.name}`);
        }
    }
});

