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
        const tournamentType = await ctx.db.query("tournament_types").withIndex("by_typeId", (q: any) => q.eq("typeId", params.tournamentType)).first();
        if (!tournamentType) {
            throw new Error("锦标赛类型不存在");
        }
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

        // 获取玩家信息 - 简化版本
        const playerUids: string[] = [];
        const uidSet = new Set<string>();
        for (const pm of playerMatches) {
            if (pm.uid && !uidSet.has(pm.uid)) {
                uidSet.add(pm.uid);
                playerUids.push(pm.uid);
            }
        }

        const players: any[] = [];
        for (const uid of playerUids) {
            const player = await ctx.db.query("players")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .first();
            if (player) {
                players.push(player);
            }
        }

        // 计算玩家统计
        const playerStats = new Map<string, any>();

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

        // 排序玩家 - 简化版本
        const entries = Array.from(playerStats.entries());
        const playerArray: any[] = [];

        for (const [uid, stats] of entries) {
            const player = players.find((p: any) => p?.uid === uid);
            playerArray.push({
                uid,
                ...stats,
                player
            });
        }

        playerArray.sort((a: any, b: any) => b.bestScore - a.bestScore);

        // 排序玩家
        const sortedPlayers: any[] = [];
        for (let i = 0; i < playerArray.length; i++) {
            const player = playerArray[i];
            sortedPlayers.push({
                ...player,
                rank: i + 1
            });
        }

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

        // 收集唯一的锦标赛和比赛ID
        const tournamentIdSet = new Set<string>();
        const matchIdSet = new Set<string>();

        for (const pm of playerMatches) {
            tournamentIdSet.add(pm.tournamentId);
            matchIdSet.add(pm.matchId);
        }

        const tournamentIds = Array.from(tournamentIdSet);
        const matchIds = Array.from(matchIdSet);

        // 获取锦标赛和比赛数据
        const tournaments: any[] = [];
        const matches: any[] = [];

        for (const id of tournamentIds) {
            const tournament = await ctx.db.get(id);
            if (tournament) {
                tournaments.push(tournament);
            }
        }

        for (const id of matchIds) {
            const match = await ctx.db.get(id);
            if (match) {
                matches.push(match);
            }
        }

        // 构建历史记录
        const history: any[] = [];
        for (const pm of playerMatches) {
            const tournament = tournaments.find((t: any) => t?._id === pm.tournamentId);
            const match = matches.find((m: any) => m?._id === pm.matchId);

            history.push({
                playerMatch: pm,
                tournament,
                match,
                gameType: pm.gameType,
                score: pm.score,
                rank: pm.rank,
                completed: pm.completed,
                createdAt: pm.createdAt
            });
        }

        // 排序历史记录
        history.sort((a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        return history;
    }

    /**
     * 清理过期锦标赛
     */
    static async cleanupExpiredTournaments(ctx: any) {
        const now = getTorontoDate();

        console.log("开始清理过期锦标赛");

        try {
            // 查找所有过期的开放锦标赛
            const expiredTournaments = await ctx.db
                .query("tournaments")
                .filter((q: any) => q.eq(q.field("status"), "open"))
                .filter((q: any) => q.lt(q.field("endTime"), now.iso))
                .collect();

            let cleanedCount = 0;

            for (const tournament of expiredTournaments) {
                // 检查是否有未完成的比赛
                const incompleteMatches = await ctx.db
                    .query("matches")
                    .withIndex("by_tournament", (q: any) => q.eq("tournamentId", tournament._id))
                    .filter((q: any) => q.neq(q.field("status"), "completed"))
                    .collect();

                if (incompleteMatches.length > 0) {
                    console.log(`锦标赛 ${tournament._id} 有未完成的比赛，跳过清理`);
                    continue;
                }

                // 关闭锦标赛
                await ctx.db.patch(tournament._id, {
                    status: "expired",
                    updatedAt: now.iso
                });

                cleanedCount++;
                console.log(`已关闭过期锦标赛: ${tournament._id}`);
            }

            return {
                success: true,
                message: `过期锦标赛清理完成`,
                cleanedCount
            };

        } catch (error) {
            console.error("清理过期锦标赛失败:", error);
            throw error;
        }
    }

    /**
     * 结算完成的锦标赛
     */
    static async settleCompletedTournaments(ctx: any) {
        const now = getTorontoDate();

        console.log("开始结算完成的锦标赛");

        try {
            // 查找所有开放且已过期的锦标赛
            const completedTournaments = await ctx.db
                .query("tournaments")
                .filter((q: any) => q.eq(q.field("status"), "open"))
                .filter((q: any) => q.lt(q.field("endTime"), now.iso))
                .collect();

            let settledCount = 0;

            for (const tournament of completedTournaments) {
                try {
                    // 获取对应的处理器
                    const handler = getHandler(tournament.tournamentType);

                    // 执行结算
                    await handler.settle(ctx, tournament._id);

                    settledCount++;
                    console.log(`已结算锦标赛: ${tournament._id}`);
                } catch (error) {
                    console.error(`结算锦标赛 ${tournament._id} 失败:`, error);

                    // 记录错误日志
                    await ctx.db.insert("error_logs", {
                        error: `结算锦标赛失败: ${error instanceof Error ? error.message : "未知错误"}`,
                        context: "settleCompletedTournaments",
                        tournamentId: tournament._id,
                        createdAt: now.iso
                    });
                }
            }

            return {
                success: true,
                message: `完成锦标赛结算`,
                settledCount
            };

        } catch (error) {
            console.error("结算完成锦标赛失败:", error);
            throw error;
        }
    }

    /**
     * 获取当前玩家可参与的锦标赛列表
     */
    static async getAvailableTournaments(ctx: any, params: {
        uid: string;
        gameType?: string; // 可选，过滤特定游戏类型
        category?: string; // 可选，过滤特定分类
    }) {
        const { uid, gameType, category } = params;

        // 获取玩家信息
        const player = await ctx.db
            .query("players")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .first();
        if (!player) {
            throw new Error("玩家不存在");
        }

        // 获取玩家库存
        const inventory = await ctx.db
            .query("player_inventory")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .first();

        // 获取当前赛季
        const season = await ctx.db
            .query("seasons")
            .withIndex("by_isActive", (q: any) => q.eq("isActive", true))
            .first();

        // 获取所有活跃的锦标赛类型
        let tournamentTypes = await ctx.db
            .query("tournament_types")
            .filter((q: any) => q.eq(q.field("isActive"), true))
            .collect();

        // 应用过滤条件
        if (gameType) {
            tournamentTypes = tournamentTypes.filter((tt: any) =>
                tt.defaultConfig?.gameType === gameType
            );
        }

        if (category) {
            tournamentTypes = tournamentTypes.filter((tt: any) =>
                tt.category === category
            );
        }

        const availableTournaments: any[] = [];

        for (const tournamentType of tournamentTypes) {
            try {
                // 检查参赛资格
                const eligibility = await this.checkTournamentEligibility(ctx, {
                    uid,
                    tournamentType,
                    player,
                    inventory,
                    season
                });

                if (eligibility.eligible) {
                    // 获取参与统计
                    const participationStats = await this.getParticipationStats(ctx, {
                        uid,
                        tournamentType: tournamentType.typeId,
                        gameType: tournamentType.defaultConfig?.gameType
                    });

                    availableTournaments.push({
                        typeId: tournamentType.typeId,
                        name: tournamentType.name,
                        description: tournamentType.description,
                        category: tournamentType.category,
                        gameType: tournamentType.defaultConfig?.gameType,
                        config: tournamentType.defaultConfig,
                        eligibility,
                        participationStats,
                        priority: tournamentType.defaultConfig?.priority || 5
                    });
                }
            } catch (error) {
                console.error(`检查锦标赛资格失败 (${tournamentType.typeId}):`, error);
                // 继续检查其他锦标赛，不中断整个流程
            }
        }

        // 按优先级排序
        availableTournaments.sort((a: any, b: any) => a.priority - b.priority);

        return {
            success: true,
            tournaments: availableTournaments,
            totalCount: availableTournaments.length
        };
    }

    /**
     * 检查锦标赛参赛资格
     */
    private static async checkTournamentEligibility(ctx: any, params: {
        uid: string;
        tournamentType: any;
        player: any;
        inventory: any;
        season: any;
    }) {
        const { uid, tournamentType, player, inventory, season } = params;
        const config = tournamentType.defaultConfig;
        const reasons: string[] = [];

        // 检查段位要求
        if (config.entryRequirements?.minSegment) {
            const segments = ["bronze", "silver", "gold", "platinum", "diamond"];
            const playerIndex = segments.indexOf(player.segmentName);
            const minIndex = segments.indexOf(config.entryRequirements.minSegment);
            if (playerIndex < minIndex) {
                reasons.push(`需要至少 ${config.entryRequirements.minSegment} 段位`);
            }
        }

        if (config.entryRequirements?.maxSegment) {
            const segments = ["bronze", "silver", "gold", "platinum", "diamond"];
            const playerIndex = segments.indexOf(player.segmentName);
            const maxIndex = segments.indexOf(config.entryRequirements.maxSegment);
            if (playerIndex > maxIndex) {
                reasons.push(`段位不能超过 ${config.entryRequirements.maxSegment}`);
            }
        }

        // 检查订阅要求
        if (config.entryRequirements?.isSubscribedRequired && !player.isSubscribed) {
            reasons.push("需要订阅会员");
        }

        // 检查入场费
        const entryFee = config.entryRequirements?.entryFee;
        if (entryFee?.coins && (!inventory || inventory.coins < entryFee.coins)) {
            reasons.push(`需要 ${entryFee.coins} 金币`);
        }

        if (entryFee?.tickets) {
            const ticket = inventory?.tickets?.find((t: any) =>
                t.gameType === entryFee.tickets.gameType &&
                t.tournamentType === entryFee.tickets.tournamentType
            );
            if (!ticket || ticket.quantity < entryFee.tickets.quantity) {
                reasons.push(`需要 ${entryFee.tickets.quantity} 张门票`);
            }
        }

        // 检查参与次数限制
        const timeRange = this.getTimeRangeForTournament(tournamentType.typeId);
        const attempts = await this.getPlayerAttempts(ctx, {
            uid,
            tournamentType: tournamentType.typeId,
            gameType: config.gameType,
            timeRange
        });

        const maxAttempts = config.matchRules?.maxAttempts;
        if (maxAttempts && attempts >= maxAttempts) {
            const timeRangeText = timeRange === 'daily' ? '今日' :
                timeRange === 'weekly' ? '本周' :
                    timeRange === 'seasonal' ? '本赛季' : '';
            reasons.push(`已达${timeRangeText}最大尝试次数 (${attempts}/${maxAttempts})`);
        }

        return {
            eligible: reasons.length === 0,
            reasons
        };
    }

    /**
     * 获取参与统计
     */
    private static async getParticipationStats(ctx: any, params: {
        uid: string;
        tournamentType: string;
        gameType: string;
    }) {
        const { uid, tournamentType, gameType } = params;
        const now = getTorontoDate();

        // 获取今日开始时间
        const today = now.localDate.toISOString().split("T")[0] + "T00:00:00.000Z";

        // 获取本周开始时间
        const weekStart = new Date(now.localDate);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);

        // 统计各种时间范围的参与次数
        const dailyAttempts = await this.getPlayerAttempts(ctx, {
            uid, tournamentType, gameType, timeRange: "daily"
        });

        const weeklyAttempts = await this.getPlayerAttempts(ctx, {
            uid, tournamentType, gameType, timeRange: "weekly"
        });

        const totalAttempts = await this.getPlayerAttempts(ctx, {
            uid, tournamentType, gameType, timeRange: "total"
        });

        return {
            dailyAttempts,
            weeklyAttempts,
            totalAttempts,
            lastParticipation: null // 可以扩展获取最后参与时间
        };
    }

    /**
     * 获取锦标赛时间范围
     */
    private static getTimeRangeForTournament(tournamentType: string): "daily" | "weekly" | "seasonal" | "total" {
        if (tournamentType.startsWith("daily_")) {
            return "daily";
        } else if (tournamentType.startsWith("weekly_")) {
            return "weekly";
        } else if (tournamentType.startsWith("seasonal_") || tournamentType.startsWith("monthly_")) {
            return "seasonal";
        } else {
            return "total";
        }
    }

    /**
     * 获取玩家尝试次数
     */
    private static async getPlayerAttempts(ctx: any, params: {
        uid: string;
        tournamentType: string;
        gameType: string;
        timeRange?: "daily" | "weekly" | "seasonal" | "total";
    }) {
        const { uid, tournamentType, gameType, timeRange } = params;
        const now = getTorontoDate();
        let startTime: string;

        switch (timeRange) {
            case "daily":
                startTime = now.localDate.toISOString().split("T")[0] + "T00:00:00.000Z";
                break;
            case "weekly":
                const weekStart = new Date(now.localDate);
                weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                weekStart.setHours(0, 0, 0, 0);
                startTime = weekStart.toISOString();
                break;
            case "seasonal":
                const season = await ctx.db
                    .query("seasons")
                    .withIndex("by_isActive", (q: any) => q.eq("isActive", true))
                    .first();
                startTime = season?.startDate || now.localDate.toISOString();
                break;
            case "total":
            default:
                startTime = "1970-01-01T00:00:00.000Z";
                break;
        }

        const tournaments = await ctx.db
            .query("tournaments")
            .filter((q: any) =>
                q.and(
                    q.eq(q.field("tournamentType"), tournamentType),
                    q.eq(q.field("gameType"), gameType),
                    q.includes(q.field("playerUids"), uid),
                    q.gte(q.field("createdAt"), startTime)
                )
            )
            .collect();

        return tournaments.length;
    }
}

// Convex 函数接口
export const joinTournament = (mutation as any)({
    args: {
        uid: v.string(),
        gameType: v.string(),
        tournamentType: v.string(),
    },
    handler: async (ctx: any, args: any) => {
        const result = await TournamentService.joinTournament(ctx, args);
        return result;
    },
});

export const submitScore = (mutation as any)({
    args: {
        tournamentId: v.id("tournaments"),
        uid: v.string(),
        gameType: v.string(),
        score: v.number(),
        gameData: v.any(),
        propsUsed: v.any(),
        gameId: v.optional(v.string()),
    },
    handler: async (ctx: any, args: any) => {
        const result = await TournamentService.submitScore(ctx, args);
        return result;
    },
});

export const settleTournament = (mutation as any)({
    args: {
        tournamentId: v.id("tournaments"),
    },
    handler: async (ctx: any, args: any) => {
        const result = await TournamentService.settleTournament(ctx, args.tournamentId);
        return result;
    },
});

export const getTournamentDetails = (query as any)({
    args: {
        tournamentId: v.id("tournaments"),
    },
    handler: async (ctx: any, args: any) => {
        const result = await TournamentService.getTournamentDetails(ctx, args.tournamentId);
        return result;
    },
});

export const getPlayerTournamentHistory = (query as any)({
    args: {
        uid: v.string(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx: any, args: any) => {
        const result = await TournamentService.getPlayerTournamentHistory(ctx, args);
        return result;
    },
});

export const cleanupExpiredTournaments = (mutation as any)({
    args: {},
    handler: async (ctx: any, args: any) => {
        const result = await TournamentService.cleanupExpiredTournaments(ctx);
        return result;
    },
});

export const settleCompletedTournaments = (mutation as any)({
    args: {},
    handler: async (ctx: any, args: any) => {
        const result = await TournamentService.settleCompletedTournaments(ctx);
        return result;
    },
});

export const getAvailableTournaments = (query as any)({
    args: {
        uid: v.string(),
        gameType: v.optional(v.string()),
        category: v.optional(v.string()),
    },
    handler: async (ctx: any, args: any) => {
        const result = await TournamentService.getAvailableTournaments(ctx, args);
        return result;
    },
}); 