import { internalMutation, mutation } from "../../_generated/server";
import { createTournament } from "./common";

/**
 * 锦标赛调度器
 * 负责自动创建 daily、weekly、seasonal 锦标赛
 */
export class TournamentScheduler {
    /**
     * 并发安全的创建每日锦标赛
     */
    static async createScheduleTournaments(ctx: any) {
        // const nowISO = new Date().toISOString();
        // const today = nowISO.split("T")[0];

        // console.log(`开始创建每日锦标赛 - ${today}`);

        try {
            // 获取所有每日锦标赛配置
            const configs = await ctx.db
                .query("tournament_types")
                // .filter((q: any) => ['daily', 'weekly', 'monthly'].includes(q.field("timeRange")))
                .withIndex("by_isActive", (q: any) => q.eq("isActive", true))
                .collect();
            console.log("configs", configs.length)
            for (const config of configs) {
                try {
                    // 检查是否已创建今日锦标赛
                    await createTournament(ctx, {
                        tournamentType: config,
                    });
                } catch (error) {
                    console.error(`创建每日锦标赛失败 (${config.typeId}):`, error);
                }
            }

            return {
                success: true,
                message: "每日锦标赛创建完成"
            };
        } catch (error) {
            console.error("创建每日锦标赛失败:", error);
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



}

// Convex 函数接口
export const createScheduleTournaments = (internalMutation as any)({
    args: {} as Record<string, never>,
    handler: async (ctx: any, args: any) => {
        return await TournamentScheduler.createScheduleTournaments(ctx);
    },
});



export const resetDailyLimits = (internalMutation as any)({
    args: {} as Record<string, never>,
    handler: async (ctx: any, args: any) => {
        return await TournamentScheduler.resetDailyLimits(ctx);
    },
});


// 手动触发函数（用于测试）
export const manualCreateTournaments = (mutation as any)({
    args: {} as Record<string, never>,
    handler: async (ctx: any) => {
        return await TournamentScheduler.createScheduleTournaments(ctx);
    },
});


