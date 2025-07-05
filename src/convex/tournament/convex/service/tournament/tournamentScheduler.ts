import { internalMutation, mutation } from "../../_generated/server";
import { getTorontoDate } from "../utils";

/**
 * 锦标赛调度器
 * 负责自动创建 daily、weekly、seasonal 锦标赛
 */
export class TournamentScheduler {
    /**
     * 创建每日锦标赛
     */
    static async createDailyTournaments(ctx: any) {
        const now = getTorontoDate();
        const today = now.localDate.toISOString().split("T")[0];

        console.log(`开始创建每日锦标赛 - ${today}`);

        try {
            // 获取所有每日锦标赛配置
            const dailyConfigs = await ctx.db
                .query("tournament_types")
                .filter((q: any) => q.eq(q.field("category"), "daily"))
                .filter((q: any) => q.eq(q.field("isActive"), true))
                .collect();

            for (const config of dailyConfigs) {
                // 检查是否已创建今日锦标赛
                const existingTournament = await ctx.db
                    .query("tournaments")
                    .withIndex("by_type_status", (q: any) =>
                        q.eq("tournamentType", config.typeId)
                            .eq("status", "open")
                    )
                    .filter((q: any) => {
                        const createdAt = q.field("createdAt");
                        return q.eq(createdAt.split("T")[0], today);
                    })
                    .first();

                if (existingTournament) {
                    console.log(`每日锦标赛 ${config.typeId} 今日已存在，跳过创建`);
                    continue;
                }

                // 获取当前赛季
                const season = await ctx.db
                    .query("seasons")
                    .withIndex("by_isActive", (q: any) => q.eq("isActive", true))
                    .first();

                if (!season) {
                    console.log("无活跃赛季，跳过创建每日锦标赛");
                    continue;
                }

                // 创建每日锦标赛
                const tournamentId = await ctx.db.insert("tournaments", {
                    seasonId: season._id,
                    gameType: config.gameType,
                    segmentName: "all", // 每日锦标赛对所有段位开放
                    status: "open",
                    playerUids: [],
                    tournamentType: config.typeId,
                    isSubscribedRequired: config.defaultConfig?.isSubscribedRequired || false,
                    isSingleMatch: config.defaultConfig?.rules?.isSingleMatch || false,
                    prizePool: config.defaultConfig?.entryFee?.coins ? config.defaultConfig.entryFee.coins * 0.8 : 0,
                    config: config.defaultConfig,
                    createdAt: now.iso,
                    updatedAt: now.iso,
                    endTime: new Date(now.localDate.getTime() + (config.defaultConfig?.duration || 86400) * 1000).toISOString(),
                });

                console.log(`成功创建每日锦标赛 ${config.typeId}: ${tournamentId}`);

                // 发送通知给所有玩家
                await this.notifyPlayersAboutNewTournament(ctx, {
                    tournamentId,
                    tournamentType: config.typeId,
                    name: config.name,
                    description: config.description,
                    gameType: config.gameType
                });
            }

            return {
                success: true,
                message: `每日锦标赛创建完成 - ${today}`,
                createdCount: dailyConfigs.length
            };

        } catch (error) {
            console.error("创建每日锦标赛失败:", error);
            throw error;
        }
    }

    /**
     * 创建每周锦标赛
     */
    static async createWeeklyTournaments(ctx: any) {
        const now = getTorontoDate();
        const weekStart = this.getWeekStart(now.localDate.toISOString().split("T")[0]);

        console.log(`开始创建每周锦标赛 - ${weekStart}`);

        try {
            // 获取所有每周锦标赛配置
            const weeklyConfigs = await ctx.db
                .query("tournament_types")
                .filter((q: any) => q.eq(q.field("category"), "weekly"))
                .filter((q: any) => q.eq(q.field("isActive"), true))
                .collect();

            for (const config of weeklyConfigs) {
                // 检查是否已创建本周锦标赛
                const existingTournament = await ctx.db
                    .query("tournaments")
                    .withIndex("by_type_status", (q: any) =>
                        q.eq("tournamentType", config.typeId)
                            .eq("status", "open")
                    )
                    .filter((q: any) => {
                        const createdAt = q.field("createdAt");
                        const tournamentWeekStart = this.getWeekStart(createdAt.split("T")[0]);
                        return q.eq(tournamentWeekStart, weekStart);
                    })
                    .first();

                if (existingTournament) {
                    console.log(`每周锦标赛 ${config.typeId} 本周已存在，跳过创建`);
                    continue;
                }

                // 获取当前赛季
                const season = await ctx.db
                    .query("seasons")
                    .withIndex("by_isActive", (q: any) => q.eq("isActive", true))
                    .first();

                if (!season) {
                    console.log("无活跃赛季，跳过创建每周锦标赛");
                    continue;
                }

                // 创建每周锦标赛
                const tournamentId = await ctx.db.insert("tournaments", {
                    seasonId: season._id,
                    gameType: config.gameType,
                    segmentName: "all", // 每周锦标赛对所有段位开放
                    status: "open",
                    playerUids: [],
                    tournamentType: config.typeId,
                    isSubscribedRequired: config.defaultConfig?.isSubscribedRequired || false,
                    isSingleMatch: config.defaultConfig?.rules?.isSingleMatch || false,
                    prizePool: config.defaultConfig?.entryFee?.coins ? config.defaultConfig.entryFee.coins * 0.8 : 0,
                    config: config.defaultConfig,
                    createdAt: now.iso,
                    updatedAt: now.iso,
                    endTime: new Date(now.localDate.getTime() + (config.defaultConfig?.duration || 604800) * 1000).toISOString(),
                });

                console.log(`成功创建每周锦标赛 ${config.typeId}: ${tournamentId}`);

                // 发送通知给所有玩家
                await this.notifyPlayersAboutNewTournament(ctx, {
                    tournamentId,
                    tournamentType: config.typeId,
                    name: config.name,
                    description: config.description,
                    gameType: config.gameType
                });
            }

            return {
                success: true,
                message: `每周锦标赛创建完成 - ${weekStart}`,
                createdCount: weeklyConfigs.length
            };

        } catch (error) {
            console.error("创建每周锦标赛失败:", error);
            throw error;
        }
    }

    /**
     * 创建赛季锦标赛
     */
    static async createSeasonalTournaments(ctx: any) {
        const now = getTorontoDate();

        console.log(`开始创建赛季锦标赛`);

        try {
            // 获取所有赛季锦标赛配置
            const seasonalConfigs = await ctx.db
                .query("tournament_types")
                .filter((q: any) => q.eq(q.field("category"), "seasonal"))
                .filter((q: any) => q.eq(q.field("isActive"), true))
                .collect();

            for (const config of seasonalConfigs) {
                // 获取当前赛季
                const season = await ctx.db
                    .query("seasons")
                    .withIndex("by_isActive", (q: any) => q.eq("isActive", true))
                    .first();

                if (!season) {
                    console.log("无活跃赛季，跳过创建赛季锦标赛");
                    continue;
                }

                // 检查是否已创建本赛季锦标赛
                const existingTournament = await ctx.db
                    .query("tournaments")
                    .withIndex("by_type_status", (q: any) =>
                        q.eq("tournamentType", config.typeId)
                            .eq("status", "open")
                    )
                    .filter((q: any) => q.eq(q.field("seasonId"), season._id))
                    .first();

                if (existingTournament) {
                    console.log(`赛季锦标赛 ${config.typeId} 本赛季已存在，跳过创建`);
                    continue;
                }

                // 创建赛季锦标赛
                const tournamentId = await ctx.db.insert("tournaments", {
                    seasonId: season._id,
                    gameType: config.gameType,
                    segmentName: "all", // 赛季锦标赛对所有段位开放
                    status: "open",
                    playerUids: [],
                    tournamentType: config.typeId,
                    isSubscribedRequired: config.defaultConfig?.isSubscribedRequired || false,
                    isSingleMatch: config.defaultConfig?.rules?.isSingleMatch || false,
                    prizePool: config.defaultConfig?.entryFee?.coins ? config.defaultConfig.entryFee.coins * 0.8 : 0,
                    config: config.defaultConfig,
                    createdAt: now.iso,
                    updatedAt: now.iso,
                    endTime: new Date(now.localDate.getTime() + (config.defaultConfig?.duration || 2592000) * 1000).toISOString(),
                });

                console.log(`成功创建赛季锦标赛 ${config.typeId}: ${tournamentId}`);

                // 发送通知给所有玩家
                await this.notifyPlayersAboutNewTournament(ctx, {
                    tournamentId,
                    tournamentType: config.typeId,
                    name: config.name,
                    description: config.description,
                    gameType: config.gameType
                });
            }

            return {
                success: true,
                message: `赛季锦标赛创建完成`,
                createdCount: seasonalConfigs.length
            };

        } catch (error) {
            console.error("创建赛季锦标赛失败:", error);
            throw error;
        }
    }

    /**
     * 重置每日限制
     */
    static async resetDailyLimits(ctx: any) {
        const now = getTorontoDate();
        const today = now.localDate.toISOString().split("T")[0];

        console.log(`开始重置每日限制 - ${today}`);

        try {
            // 获取所有玩家的每日限制记录
            const dailyLimits = await ctx.db
                .query("player_tournament_limits")
                .filter((q: any) => q.neq(q.field("date"), today))
                .collect();

            let resetCount = 0;

            for (const limit of dailyLimits) {
                // 重置参与次数
                await ctx.db.patch(limit._id, {
                    participationCount: 0,
                    tournamentCount: 0,
                    submissionCount: 0,
                    updatedAt: now.iso
                });

                resetCount++;
            }

            console.log(`每日限制重置完成，重置了 ${resetCount} 条记录`);

            return {
                success: true,
                message: `每日限制重置完成 - ${today}`,
                resetCount
            };

        } catch (error) {
            console.error("重置每日限制失败:", error);
            throw error;
        }
    }

    /**
     * 重置每周限制
     */
    static async resetWeeklyLimits(ctx: any) {
        const now = getTorontoDate();
        const weekStart = this.getWeekStart(now.localDate.toISOString().split("T")[0]);

        console.log(`开始重置每周限制 - ${weekStart}`);

        try {
            // 获取所有玩家的每周限制记录
            const weeklyLimits = await ctx.db
                .query("player_tournament_limits")
                .filter((q: any) => q.neq(q.field("weekStart"), weekStart))
                .collect();

            let resetCount = 0;

            for (const limit of weeklyLimits) {
                // 重置参与次数
                await ctx.db.patch(limit._id, {
                    participationCount: 0,
                    tournamentCount: 0,
                    submissionCount: 0,
                    updatedAt: now.iso
                });

                resetCount++;
            }

            console.log(`每周限制重置完成，重置了 ${resetCount} 条记录`);

            return {
                success: true,
                message: `每周限制重置完成 - ${weekStart}`,
                resetCount
            };

        } catch (error) {
            console.error("重置每周限制失败:", error);
            throw error;
        }
    }

    /**
     * 重置赛季限制
     */
    static async resetSeasonalLimits(ctx: any) {
        const now = getTorontoDate();

        console.log(`开始重置赛季限制`);

        try {
            // 获取当前赛季
            const season = await ctx.db
                .query("seasons")
                .withIndex("by_isActive", (q: any) => q.eq("isActive", true))
                .first();

            if (!season) {
                console.log("无活跃赛季，跳过重置赛季限制");
                return {
                    success: true,
                    message: "无活跃赛季，跳过重置赛季限制",
                    resetCount: 0
                };
            }

            // 获取所有玩家的赛季限制记录
            const seasonalLimits = await ctx.db
                .query("player_tournament_limits")
                .filter((q: any) => q.neq(q.field("seasonId"), season._id))
                .collect();

            let resetCount = 0;

            for (const limit of seasonalLimits) {
                // 重置参与次数
                await ctx.db.patch(limit._id, {
                    participationCount: 0,
                    tournamentCount: 0,
                    submissionCount: 0,
                    updatedAt: now.iso
                });

                resetCount++;
            }

            console.log(`赛季限制重置完成，重置了 ${resetCount} 条记录`);

            return {
                success: true,
                message: `赛季限制重置完成`,
                resetCount
            };

        } catch (error) {
            console.error("重置赛季限制失败:", error);
            throw error;
        }
    }

    /**
     * 获取本周开始日期（周一）
     */
    private static getWeekStart(dateStr: string): string {
        const date = new Date(dateStr);
        const day = date.getDay() || 7;
        date.setDate(date.getDate() - (day - 1));
        return date.toISOString().split("T")[0];
    }

    /**
     * 通知玩家新锦标赛
     */
    private static async notifyPlayersAboutNewTournament(ctx: any, params: {
        tournamentId: string;
        tournamentType: string;
        name: string;
        description: string;
        gameType: string;
    }) {
        const now = getTorontoDate();

        try {
            // 获取所有活跃玩家
            const players = await ctx.db
                .query("players")
                .filter((q: any) => q.eq(q.field("isActive"), true))
                .collect();

            // 为每个玩家创建通知
            for (const player of players) {
                await ctx.db.insert("notifications", {
                    uid: player.uid,
                    message: `新的${params.name}已开始！快来参与吧！`,
                    data: {
                        tournamentId: params.tournamentId,
                        tournamentType: params.tournamentType,
                        gameType: params.gameType,
                        name: params.name,
                        description: params.description
                    },
                    createdAt: now.iso
                });
            }

            console.log(`已通知 ${players.length} 个玩家关于新锦标赛 ${params.tournamentType}`);

        } catch (error) {
            console.error("通知玩家失败:", error);
            // 不抛出错误，避免影响主要流程
        }
    }
}

// Convex 函数接口
export const createDailyTournaments = (internalMutation as any)({
    args: {} as Record<string, never>,
    handler: async (ctx: any, args: any) => {
        return await TournamentScheduler.createDailyTournaments(ctx);
    },
});

export const createWeeklyTournaments = (internalMutation as any)({
    args: {} as Record<string, never>,
    handler: async (ctx: any, args: any) => {
        return await TournamentScheduler.createWeeklyTournaments(ctx);
    },
});

export const createSeasonalTournaments = (internalMutation as any)({
    args: {} as Record<string, never>,
    handler: async (ctx: any, args: any) => {
        return await TournamentScheduler.createSeasonalTournaments(ctx);
    },
});

export const resetDailyLimits = (internalMutation as any)({
    args: {} as Record<string, never>,
    handler: async (ctx: any, args: any) => {
        return await TournamentScheduler.resetDailyLimits(ctx);
    },
});

export const resetWeeklyLimits = (internalMutation as any)({
    args: {} as Record<string, never>,
    handler: async (ctx: any, args: any) => {
        return await TournamentScheduler.resetWeeklyLimits(ctx);
    },
});

export const resetSeasonalLimits = (internalMutation as any)({
    args: {} as Record<string, never>,
    handler: async (ctx: any, args: any) => {
        return await TournamentScheduler.resetSeasonalLimits(ctx);
    },
});

// 手动触发函数（用于测试）
export const manualCreateDailyTournaments = (mutation as any)({
    args: {} as Record<string, never>,
    handler: async (ctx: any) => {
        return await TournamentScheduler.createDailyTournaments(ctx);
    },
});

export const manualCreateWeeklyTournaments = (mutation as any)({
    args: {} as Record<string, never>,
    handler: async (ctx: any) => {
        return await TournamentScheduler.createWeeklyTournaments(ctx);
    },
});

export const manualCreateSeasonalTournaments = (mutation as any)({
    args: {} as Record<string, never>,
    handler: async (ctx: any) => {
        return await TournamentScheduler.createSeasonalTournaments(ctx);
    },
}); 