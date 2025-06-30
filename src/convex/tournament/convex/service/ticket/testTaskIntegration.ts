// @ts-nocheck
import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { getTorontoDate } from "../utils";
import { TaskTicketIntegration } from "./taskIntegration";
import { TicketSystem } from "./ticketSystem";

// 测试门票与任务系统集成
export const testTaskIntegration = (mutation as any)({
    args: {},
    handler: async (ctx: any) => {
        console.log("开始测试门票与任务系统集成...");

        const testUid = "task_integration_test_player";
        const results: any[] = [];

        try {
            // 1. 创建玩家段位信息
            console.log("1. 创建玩家段位信息...");
            const playerSegmentData = {
                uid: testUid,
                gameType: "ludo",
                segment: "bronze",
                points: 200,
                elo: 1000,
                createdAt: getTorontoDate().iso,
                lastUpdated: getTorontoDate().iso
            };

            const segmentId = await ctx.db.insert("player_segments", playerSegmentData);
            results.push({ test: "create_player_segment", success: true, segmentId });

            // 2. 创建门票收集任务
            console.log("2. 创建门票收集任务...");
            const collectionTask = await ctx.runMutation(createTicketTask, {
                taskId: "test_ticket_collection",
                taskName: "测试门票收集",
                taskDescription: "收集3张普通门票",
                taskType: "ticket_collection",
                requirements: {
                    type: "ticket_collection",
                    ticketType: "normal",
                    count: 3
                },
                rewards: {
                    tickets: [
                        { type: "advanced", expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() }
                    ],
                    points: 100
                }
            });
            results.push({ test: "create_collection_task", success: true, result: collectionTask });

            // 3. 创建门票使用任务
            console.log("3. 创建门票使用任务...");
            const usageTask = await ctx.runMutation(createTicketTask, {
                taskId: "test_ticket_usage",
                taskName: "测试门票使用",
                taskDescription: "使用2张门票参加锦标赛",
                taskType: "ticket_usage",
                requirements: {
                    type: "ticket_usage",
                    ticketType: "normal",
                    count: 2
                },
                rewards: {
                    tickets: [
                        { type: "event", expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() }
                    ],
                    points: 150
                }
            });
            results.push({ test: "create_usage_task", success: true, result: usageTask });

            // 4. 创建测试门票
            console.log("4. 创建测试门票...");
            const tickets = [];
            for (let i = 0; i < 5; i++) {
                const ticket = TicketSystem.createTicket({
                    ticketType: "normal",
                    uid: testUid,
                    gameType: "ludo"
                });

                const ticketId = await ctx.db.insert("tickets", {
                    ...ticket,
                    createdAt: getTorontoDate().iso
                });
                tickets.push(ticketId);
            }
            results.push({ test: "create_tickets", success: true, ticketCount: tickets.length });

            // 5. 检查门票收集任务进度
            console.log("5. 检查门票收集任务进度...");
            const collectionProgress = await ctx.runMutation(checkTaskProgress, {
                uid: testUid,
                gameType: "ludo",
                taskId: "test_ticket_collection"
            });
            results.push({ test: "check_collection_progress", success: true, result: collectionProgress });

            // 6. 使用门票（模拟参加锦标赛）
            console.log("6. 使用门票...");
            for (let i = 0; i < 2; i++) {
                const ticketId = tickets[i];
                const useResult = await ctx.runMutation(useTicket, {
                    ticketId,
                    tournamentId: `test_tournament_${i}`,
                    uid: testUid,
                    gameType: "ludo"
                });
                results.push({ test: `use_ticket_${i}`, success: true, result: useResult });
            }

            // 7. 检查门票使用任务进度
            console.log("7. 检查门票使用任务进度...");
            const usageProgress = await ctx.runMutation(checkTaskProgress, {
                uid: testUid,
                gameType: "ludo",
                taskId: "test_ticket_usage"
            });
            results.push({ test: "check_usage_progress", success: true, result: usageProgress });

            // 8. 获取玩家任务列表
            console.log("8. 获取玩家任务列表...");
            const playerTasks = await ctx.runQuery(getPlayerTasks, {
                uid: testUid,
                gameType: "ludo"
            });
            results.push({ test: "get_player_tasks", success: true, result: playerTasks });

            // 9. 创建每日任务
            console.log("9. 创建每日任务...");
            const dailyTasks = await ctx.runMutation(createDailyTasks, {});
            results.push({ test: "create_daily_tasks", success: true, result: dailyTasks });

            // 10. 创建成就任务
            console.log("10. 创建成就任务...");
            const achievementTasks = await ctx.runMutation(createAchievementTasks, {});
            results.push({ test: "create_achievement_tasks", success: true, result: achievementTasks });

            // 11. 获取任务统计
            console.log("11. 获取任务统计...");
            const taskStats = await ctx.runQuery(getTaskStatistics, {
                uid: testUid,
                gameType: "ludo"
            });
            results.push({ test: "get_task_statistics", success: true, result: taskStats });

            return {
                success: true,
                message: "门票与任务系统集成测试完成",
                testUid,
                results,
                summary: {
                    totalTests: results.length,
                    successfulTests: results.filter((r: any) => r.success).length,
                    ticketsCreated: tickets.length,
                    tasksCreated: 2,
                    dailyTasksCreated: dailyTasks.success ? dailyTasks.count : 0,
                    achievementTasksCreated: achievementTasks.success ? achievementTasks.count : 0
                }
            };

        } catch (error: any) {
            console.error("门票与任务系统集成测试失败:", error);

            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                testUid,
                results
            };
        }
    }
});

// 测试任务进度更新
export const testTaskProgressUpdate = (mutation as any)({
    args: {
        uid: v.string(),
        gameType: v.string(),
        taskId: v.string()
    },
    handler: async (ctx: any, args: any) => {
        const { uid, gameType, taskId } = args;

        try {
            // 检查任务进度
            const progress = await TaskTicketIntegration.checkTaskProgress({
                ctx,
                uid,
                gameType,
                taskId
            });

            return {
                success: true,
                progress,
                analysis: {
                    taskId,
                    currentProgress: progress.currentProgress,
                    maxProgress: progress.maxProgress,
                    completionRate: progress.currentProgress / progress.maxProgress * 100,
                    isCompleted: progress.isCompleted
                }
            };

        } catch (error: any) {
            return {
                success: false,
                error: error.message
            };
        }
    }
});

// 测试任务奖励发放
export const testTaskRewardDistribution = (mutation as any)({
    args: {
        uid: v.string(),
        gameType: v.string(),
        taskId: v.string()
    },
    handler: async (ctx: any, args: any) => {
        const { uid, gameType, taskId } = args;

        try {
            // 获取任务信息
            const task = await ctx.db
                .query("tasks")
                .withIndex("by_task_id", (q: any) => q.eq("taskId", taskId))
                .first();

            if (!task) {
                return {
                    success: false,
                    error: "任务不存在"
                };
            }

            // 模拟完成任务
            const now = getTorontoDate();
            await ctx.db.patch(task._id, {
                isCompleted: true,
                completedAt: now.iso
            });

            // 记录任务完成
            const completionId = await ctx.db.insert("task_completions", {
                taskId: task.taskId,
                uid,
                gameType,
                taskType: task.taskType,
                completedAt: now.iso,
                rewards: task.rewards,
                createdAt: now.iso
            });

            // 发放奖励
            const rewardResult = await TaskTicketIntegration.distributeTaskRewards(
                ctx,
                task.rewards,
                uid,
                gameType
            );

            return {
                success: true,
                taskId,
                completionId,
                rewards: task.rewards,
                rewardResult,
                message: "任务奖励发放完成"
            };

        } catch (error: any) {
            return {
                success: false,
                error: error.message
            };
        }
    }
});

// 测试每日任务重置
export const testDailyTaskReset = (mutation as any)({
    args: {},
    handler: async (ctx: any) => {
        try {
            // 重置每日任务
            const resetResult = await ctx.runMutation(resetDailyTasks, {});

            return {
                success: true,
                resetResult,
                message: "每日任务重置完成"
            };

        } catch (error: any) {
            return {
                success: false,
                error: error.message
            };
        }
    }
});

// 导入必要的函数
import {
    checkTaskProgress,
    createAchievementTasks,
    createDailyTasks,
    createTicketTask,
    getPlayerTasks,
    getTaskStatistics,
    resetDailyTasks
} from "./taskIntegration";

import { useTicket } from "./ticketSystem";

// 测试任务系统集成场景
export const testTaskIntegrationScenarios = (mutation as any)({
    args: {},
    handler: async (ctx: any) => {
        console.log("开始测试任务系统集成场景...");

        const scenarios = [
            {
                name: "新手玩家完成门票收集任务",
                playerMS: 150,
                playerSegment: "bronze",
                playerELO: 900,
                taskType: "ticket_collection",
                requirements: {
                    type: "ticket_collection",
                    ticketType: "normal",
                    count: 2
                },
                expectedResult: "completable"
            },
            {
                name: "高级玩家完成门票精通任务",
                playerMS: 800,
                playerSegment: "diamond",
                playerELO: 1600,
                taskType: "ticket_mastery",
                requirements: {
                    type: "ticket_mastery"
                },
                expectedResult: "completable"
            },
            {
                name: "玩家完成锦标赛胜利任务",
                playerMS: 500,
                playerSegment: "gold",
                playerELO: 1300,
                taskType: "tournament_victory",
                requirements: {
                    type: "tournament_victory",
                    count: 3
                },
                expectedResult: "completable"
            }
        ];

        const results = [];

        for (const scenario of scenarios) {
            console.log(`测试场景: ${scenario.name}`);

            try {
                // 创建测试玩家
                const testUid = `scenario_${Date.now()}_${Math.random()}`;

                // 创建玩家段位
                await ctx.db.insert("player_segments", {
                    uid: testUid,
                    gameType: "ludo",
                    segment: scenario.playerSegment,
                    points: scenario.playerMS,
                    elo: scenario.playerELO,
                    createdAt: getTorontoDate().iso
                });

                // 创建任务
                const taskResult = await ctx.runMutation(createTicketTask, {
                    taskId: `scenario_task_${Date.now()}`,
                    taskName: scenario.name,
                    taskDescription: `测试任务: ${scenario.name}`,
                    taskType: scenario.taskType,
                    requirements: scenario.requirements,
                    rewards: {
                        tickets: [
                            { type: "normal", expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() }
                        ],
                        points: 100
                    }
                });

                if (taskResult.success) {
                    // 检查任务进度
                    const progress = await ctx.runMutation(checkTaskProgress, {
                        uid: testUid,
                        gameType: "ludo",
                        taskId: taskResult.task.taskId
                    });

                    const passed = progress.success && progress.currentProgress >= 0;

                    results.push({
                        scenario: scenario.name,
                        passed,
                        expected: scenario.expectedResult,
                        actual: passed ? "completable" : "not_completable",
                        progress: progress.currentProgress,
                        maxProgress: progress.maxProgress
                    });
                } else {
                    results.push({
                        scenario: scenario.name,
                        passed: false,
                        error: taskResult.error
                    });
                }

            } catch (error: any) {
                results.push({
                    scenario: scenario.name,
                    passed: false,
                    error: error.message
                });
            }
        }

        return {
            success: true,
            message: "任务系统集成场景测试完成",
            results,
            summary: {
                totalScenarios: scenarios.length,
                passedScenarios: results.filter((r: any) => r.passed).length,
                failedScenarios: results.filter((r: any) => !r.passed).length
            }
        };
    }
});

// 清理测试数据
export const cleanupTaskIntegrationTestData = (mutation as any)({
    args: { uid: v.string() },
    handler: async (ctx: any, args: any) => {
        const { uid } = args;
        const now = getTorontoDate();

        let deletedCount = 0;

        try {
            // 删除任务
            const tasks = await ctx.db
                .query("tasks")
                .withIndex("by_category", (q: any) => q.eq("category", "ticket"))
                .collect();

            for (const task of tasks) {
                await ctx.db.delete(task._id);
                deletedCount++;
            }

            // 删除任务完成记录
            const taskCompletions = await ctx.db
                .query("task_completions")
                .withIndex("by_uid_game", (q: any) => q.eq("uid", uid).eq("gameType", "ludo"))
                .collect();

            for (const completion of taskCompletions) {
                await ctx.db.delete(completion._id);
                deletedCount++;
            }

            // 删除任务奖励记录
            const taskRewards = await ctx.db
                .query("task_rewards")
                .withIndex("by_uid_game", (q: any) => q.eq("uid", uid).eq("gameType", "ludo"))
                .collect();

            for (const reward of taskRewards) {
                await ctx.db.delete(reward._id);
                deletedCount++;
            }

            // 删除门票
            const tickets = await ctx.db
                .query("tickets")
                .withIndex("by_uid_game", (q: any) => q.eq("uid", uid).eq("gameType", "ludo"))
                .collect();

            for (const ticket of tickets) {
                await ctx.db.delete(ticket._id);
                deletedCount++;
            }

            // 删除门票使用记录
            const usageLogs = await ctx.db
                .query("ticket_usage_logs")
                .withIndex("by_uid_game", (q: any) => q.eq("uid", uid).eq("gameType", "ludo"))
                .collect();

            for (const log of usageLogs) {
                await ctx.db.delete(log._id);
                deletedCount++;
            }

            // 删除玩家段位
            const segments = await ctx.db
                .query("player_segments")
                .withIndex("by_uid_game", (q: any) => q.eq("uid", uid).eq("gameType", "ludo"))
                .collect();

            for (const segment of segments) {
                await ctx.db.delete(segment._id);
                deletedCount++;
            }

            return {
                success: true,
                message: `任务集成测试数据清理完成`,
                uid,
                deletedCount
            };

        } catch (error: any) {
            console.error("清理任务集成测试数据失败:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                uid,
                deletedCount
            };
        }
    }
}); 