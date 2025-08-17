import { internalMutation, mutation } from "../../_generated/server";
import { createTournament, findTournamentByType } from "./common";

/**
 * 锦标赛调度器
 * 负责自动创建 daily、weekly、seasonal 锦标赛
 */
export class TournamentScheduler {
    /**
     * 并发安全的创建每日锦标赛
     */
    static async createDailyTournaments(ctx: any) {
        const nowISO = new Date().toISOString();
        const today = nowISO.split("T")[0];

        console.log(`开始创建每日锦标赛 - ${today}`);

        try {
            // 获取所有每日锦标赛配置
            const dailyConfigs = await ctx.db
                .query("tournament_types")
                .filter((q: any) => q.eq(q.field("timeRange"), "daily"))
                .filter((q: any) => q.eq(q.field("isActive"), true))
                .collect();

            for (const config of dailyConfigs) {
                try {
                    // 检查是否已创建今日锦标赛
                    const existingTournament = await findTournamentByType(ctx, {
                        tournamentType: config
                    });

                    if (!existingTournament) {
                        // 创建锦标赛
                        await createTournament(ctx, {
                            config,
                        });
                        console.log(`已创建每日锦标赛: ${config.typeId}`);
                    } else {
                        console.log(`每日锦标赛已存在: ${config.typeId}`);
                    }
                } catch (error) {
                    console.error(`创建每日锦标赛失败 (${config.typeId}):`, error);
                }
            }

            return {
                success: true,
                message: "每日锦标赛创建完成",
                date: today
            };
        } catch (error) {
            console.error("创建每日锦标赛失败:", error);
            throw error;
        }
    }

    /**
     * 并发安全的创建每周锦标赛
     */
    static async createWeeklyTournaments(ctx: any) {
        const nowISO = new Date().toISOString();
        const weekStart = this.getWeekStart(nowISO.split("T")[0]);

        console.log(`开始创建每周锦标赛 - ${weekStart}`);

        try {
            // 获取所有每周锦标赛配置
            const weeklyConfigs = await ctx.db
                .query("tournament_types")
                .filter((q: any) => q.eq(q.field("timeRange"), "weekly"))
                .filter((q: any) => q.eq(q.field("isActive"), true))
                .collect();

            for (const config of weeklyConfigs) {
                try {
                    // 检查是否已创建本周锦标赛
                    const existingTournament = await findTournamentByType(ctx, {
                        tournamentType: config
                    });

                    if (!existingTournament) {
                        // 创建锦标赛
                        await createTournament(ctx, {
                            config,
                        });
                        console.log(`已创建每周锦标赛: ${config.typeId}`);
                    } else {
                        console.log(`每周锦标赛已存在: ${config.typeId}`);
                    }
                } catch (error) {
                    console.error(`创建每周锦标赛失败 (${config.typeId}):`, error);
                }
            }

            return {
                success: true,
                message: "每周锦标赛创建完成",
                weekStart
            };
        } catch (error) {
            console.error("创建每周锦标赛失败:", error);
            throw error;
        }
    }

    /**
     * 并发安全的创建赛季锦标赛
     */
    static async createSeasonalTournaments(ctx: any) {
        const nowISO = new Date().toISOString();
        const season = await this.getCurrentSeason(ctx);

        if (!season) {
            console.log("无活跃赛季，跳过赛季锦标赛创建");
            return {
                success: true,
                message: "无活跃赛季，跳过创建"
            };
        }

        console.log(`开始创建赛季锦标赛 - ${season.name}`);

        try {
            // 获取所有赛季锦标赛配置
            const seasonalConfigs = await ctx.db
                .query("tournament_types")
                .filter((q: any) => q.eq(q.field("timeRange"), "seasonal"))
                .filter((q: any) => q.eq(q.field("isActive"), true))
                .collect();

            for (const config of seasonalConfigs) {
                try {
                    // 检查是否已创建本赛季锦标赛
                    const existingTournament = await findTournamentByType(ctx, {
                        tournamentType: config
                    });

                    if (!existingTournament) {
                        // 创建锦标赛
                        await createTournament(ctx, {
                            config,
                        });
                        console.log(`已创建赛季锦标赛: ${config.typeId}`);
                    } else {
                        console.log(`赛季锦标赛已存在: ${config.typeId}`);
                    }
                } catch (error) {
                    console.error(`创建赛季锦标赛失败 (${config.typeId}):`, error);
                }
            }

            return {
                success: true,
                message: "赛季锦标赛创建完成",
                seasonName: season.name
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
        const nowISO = new Date().toISOString();
        const today = nowISO.split("T")[0];

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
                    updatedAt: nowISO
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
        const nowISO = new Date().toISOString();
        const weekStart = this.getWeekStart(nowISO.split("T")[0]);

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
                    updatedAt: nowISO
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
        const nowISO = new Date().toISOString();

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
                    updatedAt: nowISO
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
        const { getWeekStart } = require("./common.js");
        return getWeekStart(dateStr);
    }


    // /**
    //  * 查找现有锦标赛
    //  */
    // private static async findExistingTournament(ctx: any, params: {
    //     tournamentType: any;
    // }) {
    //     const now = getTorontoDate();
    //     let startTime: string;
    //     // 根据时间范围确定开始时间
    //     switch (params.tournamentType.timeRange) {
    //         case "daily":
    //             startTime = now.localDate.toISOString().split("T")[0] + "T00:00:00.000Z";
    //             break;
    //         case "weekly":
    //             const weekStart = new Date(now.localDate);
    //             weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    //             weekStart.setHours(0, 0, 0, 0);
    //             startTime = weekStart.toISOString();
    //             break;
    //         case "seasonal":
    //             // 获取当前赛季开始时间
    //             const season = await ctx.db
    //                 .query("seasons")
    //                 .withIndex("by_isActive", (q: any) => q.eq("isActive", true))
    //                 .first();
    //             startTime = season?.startDate || now.localDate.toISOString();
    //             break;
    //         case "total":
    //             startTime = "1970-01-01T00:00:00.000Z";
    //             break;
    //         default:
    //             startTime = "1970-01-01T00:00:00.000Z"; // 从1970年开始
    //             break;
    //     }
    //     const tournament = await ctx.db.query("tournaments").withIndex("by_type_status_createdAt", (q: any) => q.eq("tournamentType", params.tournamentType.typeId).eq("status", TournamentStatus.OPEN).gte("createdAt", startTime)).first();
    //     console.log("tournament", tournament);
    //     return tournament;
    // }

    /**
     * 获取当前赛季
     */
    private static async getCurrentSeason(ctx: any) {
        return await ctx.db
            .query("seasons")
            .withIndex("by_isActive", (q: any) => q.eq("isActive", true))
            .first();
    }

    /**
     * 创建锦标赛
     */
    // private static async createTournament(ctx: any, params: {
    //     config: any;
    //     season: any;
    //     now: any;
    // }) {
    //     const { config, season, now } = params;
    //     console.log("config", config);
    //     // 计算结束时间
    //     let endTime: string;
    //     switch (config.timeRange) {
    //         case "daily":
    //             endTime = new Date(now.localDate.getTime() + 24 * 60 * 60 * 1000).toISOString();
    //             break;
    //         case "weekly":
    //             endTime = new Date(now.localDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    //             break;
    //         case "seasonal":
    //             endTime = new Date(now.localDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    //             break;
    //         default:
    //             endTime = new Date(now.localDate.getTime() + 24 * 60 * 60 * 1000).toISOString();
    //     }

    //     // 创建锦标赛
    //     const tournamentId = await ctx.db.insert("tournaments", {
    //         seasonId: season._id,
    //         gameType: config.gameType,
    //         segmentName: "all", // 对所有段位开放
    //         status: TournamentStatus.OPEN,
    //         tournamentType: config.typeId,
    //         // config: {
    //         //     entryRequirements: config.entryRequirements,
    //         //     matchRules: config.matchRules,
    //         //     rewards: config.rewards,
    //         //     schedule: config.schedule,
    //         //     limits: config.limits,
    //         //     advanced: config.advanced
    //         // },
    //         createdAt: now.iso,
    //         updatedAt: now.iso,
    //         endTime: endTime,
    //     });

    //     console.log(`成功创建锦标赛 ${config.typeId}: ${tournamentId}`);
    //     return tournamentId;
    // }
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