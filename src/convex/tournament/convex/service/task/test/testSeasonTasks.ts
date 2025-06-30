// @ts-nocheck
import { v } from "convex/values";
import { api, internal } from "../../../_generated/api";
import { internalMutation } from "../../../_generated/server";

// 测试赛季任务系统
export const testSeasonTasks = internalMutation({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        const now = new Date().toISOString();
        const today = now.split("T")[0];

        try {
            // 1. 创建测试赛季
            const season = await ctx.db.insert("seasons", {
                name: "测试赛季 2025",
                startDate: "2025-01-01",
                endDate: "2025-12-31",
                isActive: true,
                createdAt: now,
                updatedAt: now,
            });

            // 2. 创建测试玩家
            const player = await ctx.db.query("players").withIndex("by_uid", (q) => q.eq("uid", args.uid)).first();
            if (!player) {
                await ctx.db.insert("players", {
                    uid: args.uid,
                    segmentName: "silver",
                    isSubscribed: false,
                    gamePreferences: ["solitaire"],
                    createdAt: now,
                    updatedAt: now,
                });
            }

            // 3. 加载赛季任务模板
            await ctx.scheduler.runAfter(0, api.init.loadTaskTemplatesFromJson.loadTaskTemplatesFromJson, {});

            // 4. 生成动态赛季任务模板
            await ctx.scheduler.runAfter(0, internal.service.task.scheduleTaskAssignment.scheduleTaskAssignment, {});

            // 5. 为玩家分配赛季任务
            await ctx.scheduler.runAfter(0, internal.service.task.assignTasks.assignTasks, { uid: args.uid });

            // 6. 验证赛季任务分配
            const seasonTasks = await ctx.db
                .query("player_tasks")
                .withIndex("by_uid_taskId", (q) => q.eq("uid", args.uid))
                .filter((q) => q.eq(q.field("name"), "赛季大师挑战"))
                .collect();

            if (seasonTasks.length === 0) {
                throw new Error("赛季任务未分配");
            }

            const seasonTask = seasonTasks[0];
            if (seasonTask.lastReset !== season) {
                throw new Error("赛季任务 lastReset 设置错误");
            }

            // 7. 模拟赛季积分事件
            await ctx.db.insert("task_events", {
                uid: args.uid,
                action: "earn_season_points",
                actionData: { gameType: "solitaire", points: 5000 },
                processed: false,
                createdAt: now,
                updatedAt: now,
            });

            // 8. 处理任务事件
            await ctx.scheduler.runAfter(0, internal.service.task.processTaskEvents.processTaskEvents, { uid: args.uid });

            // 9. 验证任务进度
            const updatedTask = await ctx.db
                .query("player_tasks")
                .withIndex("by_uid_taskId", (q) => q.eq("uid", args.uid).eq("taskId", seasonTask.taskId))
                .first();

            if (!updatedTask) {
                throw new Error("赛季任务不存在");
            }

            // 10. 清理测试数据
            await ctx.db.delete(season);

            return {
                success: true,
                message: "赛季任务系统测试通过",
                taskProgress: updatedTask.progress,
                isCompleted: updatedTask.isCompleted
            };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            await ctx.db.insert("error_logs", {
                error: errorMessage,
                context: "testSeasonTasks",
                uid: args.uid,
                createdAt: now,
            });
            return { success: false, message: `赛季任务测试失败: ${errorMessage}` };
        }
    },
}); 