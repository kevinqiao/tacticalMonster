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
            gameData: params.gameData || {},
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
            // 构建游戏创建请求
            const gameRequest = {
                matchId: params.matchId,
                tournamentId: params.tournamentId,
                uids: params.uids,
                gameType: REMOTE_GAME_CONFIG.gameTypeMapping[params.gameType as keyof typeof REMOTE_GAME_CONFIG.gameTypeMapping] || params.gameType,
                matchType: params.matchType,
                timestamp: now.iso,
                config: {
                    timeout: REMOTE_GAME_CONFIG.timeout,
                    maxPlayers: params.uids.length,
                    gameMode: "tournament"
                }
            };

            // 发送请求到远程游戏服务器
            const gameResponse = await fetch(REMOTE_GAME_CONFIG.gameAPI, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.GAME_SERVER_TOKEN || ""}`
                },
                body: JSON.stringify(gameRequest),
                signal: AbortSignal.timeout(REMOTE_GAME_CONFIG.timeout)
            });

            if (!gameResponse.ok) {
                throw new Error(`游戏服务器响应错误: ${gameResponse.status} ${gameResponse.statusText}`);
            }

            const gameResult = await gameResponse.json();

            // 验证响应
            if (!gameResult.gameId || !gameResult.serverUrl) {
                throw new Error("游戏服务器返回无效响应");
            }

            // 发送事件通知给所有玩家
            await this.notifyPlayers(ctx, {
                uids: params.uids,
                eventType: "GameCreated",
                eventData: {
                    gameId: gameResult.gameId,
                    matchId: params.matchId,
                    serverUrl: gameResult.serverUrl,
                    gameType: params.gameType
                }
            });

            return {
                gameId: gameResult.gameId,
                serverUrl: gameResult.serverUrl,
                type: "remote",
                success: true
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

            // 发送到事件同步服务
            const eventResponse = await fetch(REMOTE_GAME_CONFIG.eventAPI, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.EVENT_SYNC_TOKEN || ""}`
                },
                body: JSON.stringify(events),
                signal: AbortSignal.timeout(10000) // 10秒超时
            });

            if (!eventResponse.ok) {
                console.warn(`事件通知失败: ${eventResponse.status} ${eventResponse.statusText}`);
            }

            // 同时在本地记录事件
            for (const event of events) {
                await ctx.db.insert("player_events", {
                    uid: event.uid,
                    eventType: event.eventType,
                    eventData: event.eventData,
                    timestamp: event.timestamp,
                    createdAt: now.iso
                });
            }

        } catch (error) {
            console.error("通知玩家失败:", error);
            // 不抛出错误，避免影响主要流程
        }
    }
}

// 多人比赛队列管理器
class MatchQueueManager {
    private queue: Map<string, any> = new Map();

    // 添加玩家到队列
    async addToQueue(ctx: any, player: any, tournamentId: any) {
        const queueItem = {
            uid: player.uid,
            tournamentId,
            joinTime: new Date().toISOString(),
            segment: player.segmentName,
            eloScore: player.eloScore || 1000,
            status: "waiting"
        };

        this.queue.set(player.uid, queueItem);
        await this.tryMatch(ctx, queueItem);
    }

    // 尝试匹配
    async tryMatch(ctx: any, queueItem: any) {
        const eligiblePlayers = await this.findEligiblePlayers(ctx, queueItem);
        if (eligiblePlayers.length >= 4) {
            await this.createMatch(ctx, eligiblePlayers);
        }
    }

    // 查找符合条件的玩家
    private async findEligiblePlayers(ctx: any, queueItem: any) {
        const eligiblePlayers = [];
        const segmentRange = this.getSegmentRange(queueItem.segment);
        const eloRange = this.getEloRange(queueItem.eloScore);

        for (const [uid, item] of this.queue.entries()) {
            if (uid === queueItem.uid) continue;

            if (item.tournamentId === queueItem.tournamentId &&
                segmentRange.includes(item.segment) &&
                Math.abs(item.eloScore - queueItem.eloScore) <= eloRange) {
                eligiblePlayers.push(item);
            }
        }

        return eligiblePlayers.slice(0, 3); // 最多4个玩家
    }

    // 获取段位范围
    private getSegmentRange(segment: string): string[] {
        const segments = ["bronze", "silver", "gold", "diamond"];
        const index = segments.indexOf(segment);
        const start = Math.max(0, index - 1);
        const end = Math.min(segments.length - 1, index + 1);
        return segments.slice(start, end + 1);
    }

    // 获取ELO分数范围
    private getEloRange(eloScore: number): number {
        if (eloScore < 1000) return 200;
        if (eloScore < 1500) return 300;
        if (eloScore < 2000) return 400;
        return 500;
    }

    // 创建比赛
    private async createMatch(ctx: any, players: any[]) {
        const matchId = await MatchManager.createMatch(ctx, {
            tournamentId: players[0].tournamentId,
            gameType: "rummy", // 默认游戏类型
            matchType: "multiplayer_single_match",
            maxPlayers: 4,
            minPlayers: 4,
            gameData: {}
        });

        // 让所有玩家加入比赛
        for (const player of players) {
            await MatchManager.joinMatch(ctx, {
                matchId,
                tournamentId: player.tournamentId,
                uid: player.uid,
                gameType: "rummy"
            });

            // 从队列中移除
            this.queue.delete(player.uid);
        }
    }
}

// Convex 函数接口
export const createMatch = mutation({
    args: {
        tournamentId: v.id("tournaments"),
        gameType: v.string(),
        matchType: v.string(),
        maxPlayers: v.number(),
        minPlayers: v.number(),
        gameData: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        return await MatchManager.createMatch(ctx, args);
    },
});

export const joinMatch = mutation({
    args: {
        matchId: v.id("matches"),
        tournamentId: v.id("tournaments"),
        uid: v.string(),
        gameType: v.string(),
    },
    handler: async (ctx, args) => {
        return await MatchManager.joinMatch(ctx, args);
    },
});

export const submitScore = mutation({
    args: {
        matchId: v.id("matches"),
        tournamentId: v.id("tournaments"),
        uid: v.string(),
        gameType: v.string(),
        score: v.number(),
        gameData: v.any(),
        propsUsed: v.array(v.string()),
        attemptNumber: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        return await MatchManager.submitScore(ctx, args);
    },
});

export const endMatch = mutation({
    args: {
        matchId: v.id("matches"),
        tournamentId: v.id("tournaments"),
    },
    handler: async (ctx, args) => {
        return await MatchManager.endMatch(ctx, args);
    },
});

export const getMatchDetails = query({
    args: { matchId: v.id("matches") },
    handler: async (ctx, args) => {
        return await MatchManager.getMatchDetails(ctx, args.matchId);
    },
});

export const getPlayerMatchHistory = query({
    args: {
        uid: v.string(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        return await MatchManager.getPlayerMatchHistory(ctx, args.uid, args.limit);
    },
});

// 处理多人单场比赛事件
export const handleMultiPlayerSingleMatchEvent = mutation({
    args: {
        event: v.any()
    },
    handler: async (ctx, args) => {
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