import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { TournamentMatchingService } from "./tournamentMatchingService";

/**
 * 前端匹配客户端服务
 * 提供前端友好的匹配接口
 */
export class MatchingClientService {

    /**
     * 加入匹配队列（前端接口）
     */
    static async joinQueue(ctx: any, params: {
        uid: string;
        tournamentId?: string;
        gameType: string;
        tournamentType?: string;
        mode?: "traditional" | "independent";
    }) {
        try {
            const result = await TournamentMatchingService.joinMatchingQueue(ctx, {
                ...params,
                player: await this.getPlayerInfo(ctx, params.uid),
                config: await this.getConfig(ctx, params)
            });

            return {
                success: true,
                queueId: result.queueId,
                status: result.status,
                message: result.message,
                estimatedWaitTime: result.estimatedWaitTime,
                nextPollTime: this.calculateNextPollTime(result.estimatedWaitTime)
            };

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : "未知错误"
            };
        }
    }

    /**
     * 获取匹配状态（前端接口）
     */
    static async getQueueStatus(ctx: any, params: {
        uid: string;
        tournamentId?: string;
        tournamentType?: string;
        gameType?: string;
        mode?: string;
    }) {
        try {
            const status = await TournamentMatchingService.getMatchingStatus(ctx, params);

            if (status.inQueue) {
                return {
                    success: true,
                    inQueue: true,
                    queueId: status.queueId,
                    status: status.status,
                    waitTime: status.waitTime,
                    otherPlayers: status.otherPlayers,
                    message: status.message,
                    nextPollTime: this.calculateNextPollTime(status.waitTime)
                };
            } else {
                return {
                    success: true,
                    inQueue: false,
                    message: status.message || "未在匹配队列中"
                };
            }

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : "未知错误"
            };
        }
    }

    /**
     * 检查匹配结果（前端接口）
     */
    static async checkMatchResult(ctx: any, params: {
        uid: string;
        queueId: string;
    }) {
        try {
            // 检查队列状态
            const queueEntry = await ctx.db.get(params.queueId);

            if (!queueEntry) {
                return {
                    success: true,
                    matched: false,
                    message: "队列条目不存在"
                };
            }

            if (queueEntry.status === "matched") {
                // 获取匹配详情
                const matchDetails = await this.getMatchDetails(ctx, {
                    matchId: queueEntry.matchId,
                    tournamentId: queueEntry.tournamentId
                });

                return {
                    success: true,
                    matched: true,
                    matchId: queueEntry.matchId,
                    tournamentId: queueEntry.tournamentId,
                    gameId: `match_${queueEntry.matchId}`,
                    serverUrl: "remote_server_url",
                    playerCount: matchDetails.playerCount,
                    message: "匹配成功！"
                };
            } else if (queueEntry.status === "cancelled") {
                return {
                    success: true,
                    matched: false,
                    cancelled: true,
                    message: "匹配已取消"
                };
            } else if (queueEntry.status === "expired") {
                return {
                    success: true,
                    matched: false,
                    expired: true,
                    message: "匹配已过期"
                };
            } else {
                // 仍在等待中
                return {
                    success: true,
                    matched: false,
                    waiting: true,
                    message: "仍在等待匹配中"
                };
            }

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : "未知错误"
            };
        }
    }

    /**
     * 获取匹配通知（前端接口）
     */
    static async getMatchNotifications(ctx: any, params: {
        uid: string;
        limit?: number;
    }) {
        try {
            const { uid, limit = 10 } = params;

            const notifications = await ctx.db
                .query("notifications")
                .withIndex("by_uid_type", (q: any) =>
                    q.eq("uid", uid).eq("type", "match_success")
                )
                .filter((q: any) => q.eq(q.field("read"), false))
                .order("desc")
                .take(limit);

            return {
                success: true,
                notifications: notifications.map((notification: any) => ({
                    id: notification._id,
                    type: notification.type,
                    title: notification.title,
                    message: notification.message,
                    data: notification.data,
                    createdAt: notification.createdAt
                }))
            };

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : "未知错误"
            };
        }
    }

    /**
     * 标记通知为已读（前端接口）
     */
    static async markNotificationRead(ctx: any, params: {
        notificationId: string;
    }) {
        try {
            await ctx.db.patch(params.notificationId, {
                read: true,
                readAt: new Date().toISOString()
            });

            return {
                success: true,
                message: "通知已标记为已读"
            };

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : "未知错误"
            };
        }
    }

    /**
     * 获取玩家信息
     */
    private static async getPlayerInfo(ctx: any, uid: string) {
        const player = await ctx.db
            .query("players")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .first();

        if (!player) {
            throw new Error("玩家不存在");
        }

        return player;
    }

    /**
     * 获取配置信息
     */
    private static async getConfig(ctx: any, params: {
        tournamentId?: string;
        tournamentType?: string;
        mode?: string;
    }) {
        const { tournamentId, tournamentType, mode } = params;

        if (mode === "traditional" && tournamentId) {
            const tournament = await ctx.db.get(tournamentId);
            if (!tournament) {
                throw new Error("锦标赛不存在");
            }
            return {
                entryRequirements: tournament.config?.entryRequirements,
                matchRules: tournament.config?.matchRules,
                rewards: tournament.config?.rewards,
                schedule: tournament.config?.schedule,
                limits: tournament.config?.limits,
                advanced: tournament.config?.advanced
            };
        } else if (mode === "independent" && tournamentType) {
            const tournamentTypeConfig = await ctx.db
                .query("tournament_types")
                .withIndex("by_typeId", (q: any) => q.eq("typeId", tournamentType))
                .first();
            if (!tournamentTypeConfig) {
                throw new Error("锦标赛类型不存在");
            }
            return {
                entryRequirements: tournamentTypeConfig.entryRequirements,
                matchRules: tournamentTypeConfig.matchRules,
                rewards: tournamentTypeConfig.rewards,
                schedule: tournamentTypeConfig.schedule,
                limits: tournamentTypeConfig.limits,
                advanced: tournamentTypeConfig.advanced
            };
        } else {
            throw new Error("无效的匹配模式或缺少必要参数");
        }
    }

    /**
     * 获取匹配详情
     */
    private static async getMatchDetails(ctx: any, params: {
        matchId: string;
        tournamentId: string;
    }) {
        const { matchId, tournamentId } = params;

        // 获取比赛信息
        const match = await ctx.db.get(matchId);
        if (!match) {
            throw new Error("比赛不存在");
        }

        // 获取参与玩家数量
        const playerMatches = await ctx.db
            .query("player_matches")
            .withIndex("by_match", (q: any) => q.eq("matchId", matchId))
            .collect();

        return {
            matchId,
            tournamentId,
            playerCount: playerMatches.length,
            matchStatus: match.status,
            gameData: match.gameData
        };
    }

    /**
     * 计算下次轮询时间
     */
    private static calculateNextPollTime(waitTime: number): number {
        // 根据等待时间动态调整轮询间隔
        if (waitTime < 30) {
            return 3; // 3秒
        } else if (waitTime < 60) {
            return 5; // 5秒
        } else if (waitTime < 120) {
            return 10; // 10秒
        } else {
            return 15; // 15秒
        }
    }
}

// Convex 函数接口
export const joinQueue = (mutation as any)({
    args: {
        uid: v.string(),
        tournamentId: v.optional(v.id("tournaments")),
        gameType: v.string(),
        tournamentType: v.optional(v.string()),
        mode: v.optional(v.union(v.literal("traditional"), v.literal("independent")))
    },
    handler: async (ctx: any, args: any) => {
        return await MatchingClientService.joinQueue(ctx, args);
    },
});

export const getQueueStatus = (query as any)({
    args: {
        uid: v.string(),
        tournamentId: v.optional(v.id("tournaments")),
        tournamentType: v.optional(v.string()),
        gameType: v.optional(v.string()),
        mode: v.optional(v.union(v.literal("traditional"), v.literal("independent")))
    },
    handler: async (ctx: any, args: any) => {
        return await MatchingClientService.getQueueStatus(ctx, args);
    },
});

export const checkMatchResult = (query as any)({
    args: {
        uid: v.string(),
        queueId: v.string()
    },
    handler: async (ctx: any, args: any) => {
        return await MatchingClientService.checkMatchResult(ctx, args);
    },
});

export const getMatchNotifications = (query as any)({
    args: {
        uid: v.string(),
        limit: v.optional(v.number())
    },
    handler: async (ctx: any, args: any) => {
        return await MatchingClientService.getMatchNotifications(ctx, args);
    },
});

export const markNotificationRead = (mutation as any)({
    args: {
        notificationId: v.string()
    },
    handler: async (ctx: any, args: any) => {
        return await MatchingClientService.markNotificationRead(ctx, args);
    },
}); 