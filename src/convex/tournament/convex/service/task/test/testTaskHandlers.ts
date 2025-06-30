// @ts-nocheck
import { v } from "convex/values";
import { internal } from "../../../_generated/api";
import { internalMutation } from "../../../_generated/server";

// 测试任务处理器系统
export const testTaskHandlers = internalMutation({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        const now = new Date().toISOString();
        const today = now.split("T")[0];

        try {
            // 1. 创建测试玩家
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

            // 2. 创建测试赛季
            const season = await ctx.db.insert("seasons", {
                name: "测试赛季 2025",
                startDate: "2025-01-01",
                endDate: "2025-12-31",
                isActive: true,
                createdAt: now,
                updatedAt: now,
            });

            // 3. 创建测试任务模板
            const testTemplates = [
                {
                    templateId: "test_one_time",
                    isDynamic: false,
                    name: "测试一次性任务",
                    description: "登录并完成比赛",
                    type: "one_time",
                    condition: {
                        type: "and",
                        subConditions: [
                            { action: "login", count: 1 },
                            { action: "complete_match", count: 2, gameType: "solitaire" }
                        ]
                    },
                    rewards: { coins: 100, props: [], tickets: [], gamePoints: 50 },
                    resetInterval: "none",
                    allocationRules: { minSegment: "bronze" },
                    createdAt: now,
                    updatedAt: now,
                },
                {
                    templateId: "test_daily",
                    isDynamic: true,
                    validDate: today,
                    name: "测试每日任务",
                    description: "每日登录",
                    type: "daily",
                    condition: { action: "login", count: 1 },
                    rewards: { coins: 50, props: [], tickets: [], gamePoints: 25 },
                    resetInterval: "daily",
                    allocationRules: { minSegment: "bronze" },
                    createdAt: now,
                    updatedAt: now,
                },
                {
                    templateId: "test_season",
                    isDynamic: true,
                    validDate: season,
                    name: "测试赛季任务",
                    description: "获得赛季积分",
                    type: "season",
                    condition: { action: "earn_season_points", count: 1000 },
                    rewards: { coins: 200, props: [], tickets: [], gamePoints: 100 },
                    resetInterval: "season",
                    allocationRules: { minSegment: "bronze" },
                    createdAt: now,
                    updatedAt: now,
                }
            ];

            for (const template of testTemplates) {
                await ctx.db.insert("task_templates", template);
            }

            // 4. 为玩家分配任务
            await ctx.scheduler.runAfter(0, internal.service.task.assignTasks.assignTasks, { uid: args.uid });

            // 5. 验证任务分配
            const assignedTasks = await ctx.db
                .query("player_tasks")
                .withIndex("by_uid_taskId", (q) => q.eq("uid", args.uid))
                .collect();

            if (assignedTasks.length === 0) {
                throw new Error("任务未分配");
            }

            // 6. 测试不同事件类型
            const testEvents = [
                {
                    action: "login",
                    actionData: {},
                    expectedTasks: ["test_one_time", "test_daily"]
                },
                {
                    action: "complete_match",
                    actionData: { gameType: "solitaire", score: 1000 },
                    expectedTasks: ["test_one_time"]
                },
                {
                    action: "earn_season_points",
                    actionData: { points: 500 },
                    expectedTasks: ["test_season"]
                }
            ];

            for (const testEvent of testEvents) {
                // 插入测试事件
                await ctx.db.insert("task_events", {
                    uid: args.uid,
                    action: testEvent.action,
                    actionData: testEvent.actionData,
                    processed: false,
                    createdAt: now,
                    updatedAt: now,
                });

                // 处理事件
                await ctx.scheduler.runAfter(0, internal.service.task.processTaskEvents.processTaskEvents, { uid: args.uid });

                // 验证进度更新
                const updatedTasks = await ctx.db
                    .query("player_tasks")
                    .withIndex("by_uid_taskId", (q) => q.eq("uid", args.uid))
                    .collect();

                for (const task of updatedTasks) {
                    const template = testTemplates.find(t => t.templateId === task.taskId);
                    if (template && testEvent.expectedTasks.includes(template.templateId)) {
                        console.log(`Task ${template.templateId} progress:`, task.progress);

                        // 验证进度是否正确更新
                        if (template.type === "one_time") {
                            const progress = task.progress as { sub_0: number; sub_1: number };
                            if (testEvent.action === "login" && progress.sub_0 === 0) {
                                throw new Error(`One-time task login progress not updated: ${template.templateId}`);
                            }
                            if (testEvent.action === "complete_match" && progress.sub_1 === 0) {
                                throw new Error(`One-time task match progress not updated: ${template.templateId}`);
                            }
                        } else {
                            if ((task.progress as number) === 0) {
                                throw new Error(`Task progress not updated: ${template.templateId}`);
                            }
                        }
                    }
                }
            }

            // 7. 测试任务完成
            // 插入足够的事件来完成 daily 任务
            for (let i = 0; i < 5; i++) {
                await ctx.db.insert("task_events", {
                    uid: args.uid,
                    action: "earn_season_points",
                    actionData: { points: 200 },
                    processed: false,
                    createdAt: now,
                    updatedAt: now,
                });
            }

            await ctx.scheduler.runAfter(0, internal.service.task.processTaskEvents.processTaskEvents, { uid: args.uid });

            // 验证任务完成
            const completedTasks = await ctx.db
                .query("player_tasks")
                .withIndex("by_uid_taskId", (q) => q.eq("uid", args.uid))
                .filter((q) => q.eq(q.field("isCompleted"), true))
                .collect();

            console.log("Completed tasks:", completedTasks.map(t => t.name));

            // 8. 清理测试数据
            await ctx.db.delete(season);
            for (const template of testTemplates) {
                const templateDoc = await ctx.db
                    .query("task_templates")
                    .withIndex("by_templateId", (q) => q.eq("templateId", template.templateId))
                    .first();
                if (templateDoc) {
                    await ctx.db.delete(templateDoc._id);
                }
            }

            return {
                success: true,
                message: "任务处理器系统测试通过",
                assignedTasksCount: assignedTasks.length,
                completedTasksCount: completedTasks.length
            };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            await ctx.db.insert("error_logs", {
                error: errorMessage,
                context: "testTaskHandlers",
                uid: args.uid,
                createdAt: now,
            });
            return { success: false, message: `任务处理器测试失败: ${errorMessage}` };
        }
    },
}); 