// @ts-nocheck
import { v } from "convex/values";
import { internal } from "../../../_generated/api";
import { mutation } from "../../../_generated/server";

// 时间相关任务模板
const timeBasedTaskTemplates = {
    // 连续登录任务
    consecutive_login: {
        title: "连续登录挑战",
        description: "连续7天登录游戏",
        type: "time_based",
        condition: {
            action: "login",
            count: 7,
            gameType: undefined,
            minScore: undefined
        },
        rewards: {
            coins: 300,
            props: [],
            tickets: [],
            gamePoints: 50
        },
        isDynamic: true
    },

    // 连续对战任务
    consecutive_match: {
        title: "连续对战大师",
        description: "连续5天完成对战",
        type: "time_based",
        condition: {
            action: "complete_match",
            count: 5,
            gameType: undefined,
            minScore: undefined
        },
        rewards: {
            coins: 200,
            props: [],
            tickets: [],
            gamePoints: 30
        },
        isDynamic: true
    },

    // 混合时间任务
    mixed_time_task: {
        title: "混合挑战",
        description: "连续登录3天并在7天内完成5场对战",
        type: "time_based",
        condition: {
            action: "login",
            count: 3,
            gameType: undefined,
            minScore: undefined
        },
        rewards: {
            coins: 250,
            props: [],
            tickets: [],
            gamePoints: 40
        },
        isDynamic: true
    },

    // 时间窗口任务
    time_window_task: {
        title: "时间窗口挑战",
        description: "在3天内完成10场对战",
        type: "time_based",
        condition: {
            action: "complete_match",
            count: 10,
            gameType: undefined,
            minScore: undefined
        },
        rewards: {
            coins: 400,
            props: [],
            tickets: [],
            gamePoints: 60
        },
        isDynamic: true
    },

    // 复杂时间任务
    complex_time_task: {
        title: "复杂时间挑战",
        description: "连续登录5天，并在10天内完成15场对战，其中至少5场获胜",
        type: "time_based",
        condition: {
            action: "login",
            count: 5,
            gameType: undefined,
            minScore: undefined
        },
        rewards: {
            coins: 500,
            props: [],
            tickets: [],
            gamePoints: 100
        },
        isDynamic: true
    }
};

// One-time 任务模板
const oneTimeTaskTemplates = {
    first_win: {
        title: "首次胜利",
        description: "赢得第一场对战",
        type: "one_time",
        condition: {
            action: "win_match",
            count: 1,
            gameType: undefined,
            minScore: undefined
        },
        rewards: {
            coins: 100,
            props: [],
            tickets: [],
            gamePoints: 20
        },
        isDynamic: false
    },
    complete_tutorial: {
        title: "完成教程",
        description: "完成游戏教程",
        type: "one_time",
        condition: {
            action: "complete_tutorial",
            count: 1,
            gameType: undefined,
            minScore: undefined
        },
        rewards: {
            coins: 50,
            props: [],
            tickets: [],
            gamePoints: 10
        },
        isDynamic: false
    },
    share_game: {
        title: "分享游戏",
        description: "首次分享游戏到社交媒体",
        type: "one_time",
        condition: {
            action: "share_game",
            count: 1,
            gameType: undefined,
            minScore: undefined
        },
        rewards: {
            coins: 75,
            props: [],
            tickets: [],
            gamePoints: 15
        },
        isDynamic: false
    }
};

// Daily 任务模板
const dailyTaskTemplates = {
    daily_login: {
        title: "每日登录",
        description: "每日登录游戏",
        type: "daily",
        condition: {
            action: "login",
            count: 1,
            gameType: undefined,
            minScore: undefined
        },
        rewards: {
            coins: 25,
            props: [],
            tickets: [],
            gamePoints: 5
        },
        isDynamic: true
    },
    daily_match: {
        title: "每日对战",
        description: "完成一场对战",
        type: "daily",
        condition: {
            action: "complete_match",
            count: 1,
            gameType: undefined,
            minScore: undefined
        },
        rewards: {
            coins: 50,
            props: [],
            tickets: [],
            gamePoints: 10
        },
        isDynamic: true
    },
    daily_win: {
        title: "每日胜利",
        description: "赢得一场对战",
        type: "daily",
        condition: {
            action: "win_match",
            count: 1,
            gameType: undefined,
            minScore: undefined
        },
        rewards: {
            coins: 75,
            props: [],
            tickets: [],
            gamePoints: 15
        },
        isDynamic: true
    }
};

// Weekly 任务模板
const weeklyTaskTemplates = {
    weekly_login: {
        title: "每周登录",
        description: "连续7天登录",
        type: "weekly",
        condition: {
            action: "login",
            count: 7,
            gameType: undefined,
            minScore: undefined
        },
        rewards: {
            coins: 200,
            props: [],
            tickets: [],
            gamePoints: 40
        },
        isDynamic: true
    },
    weekly_matches: {
        title: "每周对战",
        description: "完成10场对战",
        type: "weekly",
        condition: {
            action: "complete_match",
            count: 10,
            gameType: undefined,
            minScore: undefined
        },
        rewards: {
            coins: 300,
            props: [],
            tickets: [],
            gamePoints: 60
        },
        isDynamic: true
    },
    weekly_wins: {
        title: "每周胜利",
        description: "赢得5场对战",
        type: "weekly",
        condition: {
            action: "win_match",
            count: 5,
            gameType: undefined,
            minScore: undefined
        },
        rewards: {
            coins: 400,
            props: [],
            tickets: [],
            gamePoints: 80
        },
        isDynamic: true
    }
};

// Season 任务模板
const seasonTaskTemplates = {
    season_points: {
        title: "赛季积分",
        description: "累计获得1000赛季积分",
        type: "season",
        condition: {
            action: "earn_season_points",
            count: 1000,
            gameType: undefined,
            minScore: undefined
        },
        rewards: {
            coins: 1000,
            props: [],
            tickets: [],
            gamePoints: 200
        },
        isDynamic: true
    },
    season_master: {
        title: "赛季大师",
        description: "达到钻石段位",
        type: "season",
        condition: {
            action: "reach_segment",
            count: 1,
            gameType: undefined,
            minScore: undefined
        },
        rewards: {
            coins: 2000,
            props: [],
            tickets: [],
            gamePoints: 500
        },
        isDynamic: true
    }
};

// Complex 任务模板 - 使用简单条件结构
const complexTaskTemplates = {
    complex_login_match: {
        title: "登录对战任务",
        description: "登录并完成对战",
        type: "complex",
        condition: {
            action: "login",
            count: 1,
            gameType: undefined,
            minScore: undefined
        },
        rewards: {
            coins: 150,
            props: [],
            tickets: [],
            gamePoints: 30
        },
        isDynamic: false
    },
    complex_share_win: {
        title: "分享胜利任务",
        description: "分享游戏或赢得比赛",
        type: "complex",
        condition: {
            action: "share_game",
            count: 1,
            gameType: undefined,
            minScore: undefined
        },
        rewards: {
            coins: 100,
            props: [],
            tickets: [],
            gamePoints: 20
        },
        isDynamic: false
    },
    multi_stage_login: {
        title: "多阶段登录任务",
        description: "完成登录、对战、胜利三个阶段",
        type: "complex",
        condition: {
            action: "login",
            count: 1,
            gameType: undefined,
            minScore: undefined
        },
        rewards: {
            coins: 200,
            props: [],
            tickets: [],
            gamePoints: 40
        },
        isDynamic: false
    }
};

// 测试 One-time 任务
export const testOneTimeTasks = mutation({
    args: {
        playerId: v.string(),
        taskType: v.optional(v.string()),
        event: v.optional(v.any())
    },
    handler: async (ctx, { playerId, taskType = "first_win", event }) => {
        const { db } = ctx;

        const template = oneTimeTaskTemplates[taskType as keyof typeof oneTimeTaskTemplates];
        if (!template) {
            throw new Error(`Unknown one-time task type: ${taskType}`);
        }

        // 创建任务
        const taskId = await db.insert("player_tasks", {
            uid: playerId,
            taskId: `one_time_${taskType}`,
            name: template.title,
            type: template.type,
            description: template.description,
            condition: template.condition,
            rewards: template.rewards,
            progress: 0,
            isCompleted: false,
            lastReset: new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        console.log(`Created one-time task ${taskId} of type ${taskType}`);

        if (event) {
            await db.insert("task_events", {
                uid: playerId,
                action: event.action,
                actionData: event.actionData || {},
                processed: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            await ctx.scheduler.runAfter(0, internal.service.task.processTaskEvents.processTaskEvents, { uid: playerId });

            return {
                taskId,
                taskType,
                template,
                event,
                message: "Event recorded and task processing scheduled"
            };
        }

        return {
            taskId,
            taskType,
            template,
            message: "One-time task created successfully"
        };
    }
});

// 测试 Daily 任务
export const testDailyTasks = mutation({
    args: {
        playerId: v.id("players"),
        taskType: v.optional(v.string()),
        event: v.optional(v.any())
    },
    handler: async (ctx, { playerId, taskType = "daily_login", event }) => {
        const { db } = ctx;

        const template = dailyTaskTemplates[taskType as keyof typeof dailyTaskTemplates];
        if (!template) {
            throw new Error(`Unknown daily task type: ${taskType}`);
        }

        // 创建任务
        const taskId = await db.insert("player_tasks", {
            uid: playerId,
            taskId: `daily_${taskType}_${new Date().toISOString().split('T')[0]}`,
            name: template.title,
            type: template.type,
            description: template.description,
            condition: template.condition,
            rewards: template.rewards,
            progress: 0,
            isCompleted: false,
            lastReset: new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        console.log(`Created daily task ${taskId} of type ${taskType}`);

        if (event) {
            await db.insert("task_events", {
                uid: playerId,
                action: event.action,
                actionData: event.actionData || {},
                processed: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            await ctx.scheduler.runAfter(0, internal.service.task.processTaskEvents.processTaskEvents, { uid: playerId });

            return {
                taskId,
                taskType,
                template,
                event,
                message: "Event recorded and task processing scheduled"
            };
        }

        return {
            taskId,
            taskType,
            template,
            message: "Daily task created successfully"
        };
    }
});

// 测试 Weekly 任务
export const testWeeklyTasks = mutation({
    args: {
        playerId: v.id("players"),
        taskType: v.optional(v.string()),
        event: v.optional(v.any())
    },
    handler: async (ctx, { playerId, taskType = "weekly_login", event }) => {
        const { db } = ctx;

        const template = weeklyTaskTemplates[taskType as keyof typeof weeklyTaskTemplates];
        if (!template) {
            throw new Error(`Unknown weekly task type: ${taskType}`);
        }

        // 获取本周开始日期
        const now = new Date();
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
        const weekStartDate = weekStart.toISOString().split('T')[0];

        // 创建任务
        const taskId = await db.insert("player_tasks", {
            uid: playerId,
            taskId: `weekly_${taskType}_${weekStartDate}`,
            name: template.title,
            type: template.type,
            description: template.description,
            condition: template.condition,
            rewards: template.rewards,
            progress: 0,
            isCompleted: false,
            lastReset: weekStartDate,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        console.log(`Created weekly task ${taskId} of type ${taskType}`);

        if (event) {
            await db.insert("task_events", {
                uid: playerId,
                action: event.action,
                actionData: event.actionData || {},
                processed: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            await ctx.scheduler.runAfter(0, internal.service.task.processTaskEvents.processTaskEvents, { uid: playerId });

            return {
                taskId,
                taskType,
                template,
                event,
                message: "Event recorded and task processing scheduled"
            };
        }

        return {
            taskId,
            taskType,
            template,
            message: "Weekly task created successfully"
        };
    }
});

// 测试 Season 任务
export const testSeasonTasks = mutation({
    args: {
        playerId: v.id("players"),
        taskType: v.optional(v.string()),
        event: v.optional(v.any())
    },
    handler: async (ctx, { playerId, taskType = "season_points", event }) => {
        const { db } = ctx;

        const template = seasonTaskTemplates[taskType as keyof typeof seasonTaskTemplates];
        if (!template) {
            throw new Error(`Unknown season task type: ${taskType}`);
        }

        // 获取当前赛季
        const activeSeason = await db.query("seasons")
            .filter((q) => q.eq(q.field("isActive"), true))
            .first();

        if (!activeSeason) {
            throw new Error("No active season found");
        }

        // 创建任务
        const taskId = await db.insert("player_tasks", {
            uid: playerId,
            taskId: `season_${taskType}_${activeSeason._id}`,
            name: template.title,
            type: template.type,
            description: template.description,
            condition: template.condition,
            rewards: template.rewards,
            progress: 0,
            isCompleted: false,
            lastReset: activeSeason._id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        console.log(`Created season task ${taskId} of type ${taskType}`);

        if (event) {
            await db.insert("task_events", {
                uid: playerId,
                action: event.action,
                actionData: event.actionData || {},
                processed: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            await ctx.scheduler.runAfter(0, internal.service.task.processTaskEvents.processTaskEvents, { uid: playerId });

            return {
                taskId,
                taskType,
                template,
                event,
                message: "Event recorded and task processing scheduled"
            };
        }

        return {
            taskId,
            taskType,
            template,
            message: "Season task created successfully"
        };
    }
});

// 测试 Complex 任务
export const testComplexTasks = mutation({
    args: {
        playerId: v.id("players"),
        taskType: v.optional(v.string()),
        event: v.optional(v.any())
    },
    handler: async (ctx, { playerId, taskType = "complex_login_match", event }) => {
        const { db } = ctx;

        const template = complexTaskTemplates[taskType as keyof typeof complexTaskTemplates];
        if (!template) {
            throw new Error(`Unknown complex task type: ${taskType}`);
        }

        // 初始化复杂任务进度
        const getComplexProgress = (template: any) => {
            if (template.type === "complex") {
                return { sub_0: 0, sub_1: 0 };
            }
            return 0;
        };

        // 创建任务
        const taskId = await db.insert("player_tasks", {
            uid: playerId,
            taskId: `complex_${taskType}`,
            name: template.title,
            type: template.type,
            description: template.description,
            condition: template.condition,
            rewards: template.rewards,
            progress: getComplexProgress(template),
            isCompleted: false,
            lastReset: new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        console.log(`Created complex task ${taskId} of type ${taskType}`);

        if (event) {
            await db.insert("task_events", {
                uid: playerId,
                action: event.action,
                actionData: event.actionData || {},
                processed: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            await ctx.scheduler.runAfter(0, internal.service.task.processTaskEvents.processTaskEvents, { uid: playerId });

            return {
                taskId,
                taskType,
                template,
                event,
                message: "Event recorded and task processing scheduled"
            };
        }

        return {
            taskId,
            taskType,
            template,
            message: "Complex task created successfully"
        };
    }
});

// 测试时间相关任务
export const testTimeBasedTask = mutation({
    args: {
        playerId: v.id("players"),
        taskType: v.optional(v.string()),
        event: v.optional(v.any())
    },
    handler: async (ctx, { playerId, taskType = "consecutive_login", event }) => {
        const { db } = ctx;

        // 获取任务模板
        const template = timeBasedTaskTemplates[taskType as keyof typeof timeBasedTaskTemplates];
        if (!template) {
            throw new Error(`Unknown task type: ${taskType}`);
        }

        // 初始化进度结构
        const getInitialProgress = (template: any) => {
            if (template.type === "time_based") {
                return {
                    actions: [{ [template.condition.action]: 0 }],
                    lastActionDate: "",
                    consecutiveDays: 0,
                    startDate: new Date().toISOString().split('T')[0]
                };
            }
            return 0;
        };

        // 创建任务
        const taskId = await db.insert("player_tasks", {
            uid: playerId,
            taskId: `time_based_${taskType}`,
            name: template.title,
            type: template.type,
            description: template.description,
            condition: template.condition,
            rewards: template.rewards,
            progress: getInitialProgress(template),
            isCompleted: false,
            lastReset: new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        console.log(`Created time-based task ${taskId} of type ${taskType}`);

        // 如果提供了事件，则处理事件
        if (event) {
            // 记录任务事件
            await db.insert("task_events", {
                uid: playerId,
                action: event.action,
                actionData: event.actionData || {},
                processed: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            // 异步处理任务事件
            await ctx.scheduler.runAfter(0, internal.service.task.processTaskEvents.processTaskEvents, { uid: playerId });

            return {
                taskId,
                taskType,
                template,
                event,
                message: "Event recorded and task processing scheduled"
            };
        }

        return {
            taskId,
            taskType,
            template,
            message: "Task created successfully. Use processTaskEvents to update progress."
        };
    }
});

// 测试连续登录场景
export const testConsecutiveLoginScenario = mutation({
    args: { playerId: v.id("players") },
    handler: async (ctx, { playerId }) => {
        const { db } = ctx;

        // 创建连续登录任务
        const taskId = await db.insert("player_tasks", {
            uid: playerId,
            taskId: "consecutive_login_test",
            name: "连续登录测试",
            description: "连续3天登录",
            type: "time_based",
            condition: {
                action: "login",
                count: 3,
                gameType: undefined,
                minScore: undefined
            },
            rewards: {
                coins: 100,
                props: [],
                tickets: [],
                gamePoints: 20
            },
            progress: {
                actions: [{ login: 1 }],
                lastActionDate: new Date().toISOString().split('T')[0],
                consecutiveDays: 1,
                startDate: new Date().toISOString().split('T')[0]
            },
            isCompleted: false,
            lastReset: new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        // 模拟连续登录事件
        const events = [
            { action: "login", actionData: {} },
            { action: "login", actionData: {} },
            { action: "login", actionData: {} }
        ];

        const results = [];
        for (const event of events) {
            // 记录任务事件
            await db.insert("task_events", {
                uid: playerId,
                action: event.action,
                actionData: event.actionData || {},
                processed: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            // 异步处理任务事件
            await ctx.scheduler.runAfter(0, internal.service.task.processTaskEvents.processTaskEvents, { uid: playerId });

            results.push({ event, message: "Event recorded and processing scheduled" });
        }

        return {
            taskId,
            scenario: "consecutive_login",
            results
        };
    }
});

// 测试混合时间任务场景
export const testMixedTimeTaskScenario = mutation({
    args: { playerId: v.id("players") },
    handler: async (ctx, { playerId }) => {
        const { db } = ctx;

        // 创建混合时间任务
        const taskId = await db.insert("player_tasks", {
            uid: playerId,
            taskId: "mixed_time_test",
            name: "混合时间测试",
            description: "连续登录2天并在3天内完成3场对战",
            type: "time_based",
            condition: {
                action: "login",
                count: 2,
                gameType: undefined,
                minScore: undefined
            },
            rewards: {
                coins: 150,
                props: [],
                tickets: [],
                gamePoints: 25
            },
            progress: {
                actions: [{ login: 0 }, { complete_match: 0 }],
                lastActionDate: "",
                consecutiveDays: 0,
                startDate: new Date().toISOString().split('T')[0]
            },
            isCompleted: false,
            lastReset: new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        const results = [];

        // 模拟一系列事件
        const events = [
            { action: "login" },
            { action: "complete_match", actionData: { gameType: "ludo" } },
            { action: "login" },
            { action: "complete_match", actionData: { gameType: "ludo" } },
            { action: "complete_match", actionData: { gameType: "ludo" } }
        ];

        for (const event of events) {
            // 记录任务事件
            await db.insert("task_events", {
                uid: playerId,
                action: event.action,
                actionData: event.actionData || {},
                processed: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            // 异步处理任务事件
            await ctx.scheduler.runAfter(0, internal.service.task.processTaskEvents.processTaskEvents, { uid: playerId });

            results.push({ event, message: "Event recorded and processing scheduled" });
        }

        return {
            taskId,
            scenario: "mixed_time_task",
            events,
            results
        };
    }
});

// 测试时间窗口任务场景
export const testTimeWindowScenario = mutation({
    args: { playerId: v.id("players") },
    handler: async (ctx, { playerId }) => {
        const { db } = ctx;

        // 创建时间窗口任务
        const taskId = await db.insert("player_tasks", {
            uid: playerId,
            taskId: "time_window_test",
            name: "时间窗口测试",
            description: "在2天内完成4场对战",
            type: "time_based",
            condition: {
                action: "complete_match",
                count: 4,
                gameType: undefined,
                minScore: undefined
            },
            rewards: {
                coins: 200,
                props: [],
                tickets: [],
                gamePoints: 30
            },
            progress: {
                actions: [{ complete_match: 0 }],
                lastActionDate: "",
                consecutiveDays: 0,
                startDate: new Date().toISOString().split('T')[0]
            },
            isCompleted: false,
            lastReset: new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        const results = [];

        // 模拟快速完成对战
        for (let i = 0; i < 4; i++) {
            // 记录任务事件
            await db.insert("task_events", {
                uid: playerId,
                action: "complete_match",
                actionData: { gameType: "ludo" },
                processed: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            // 异步处理任务事件
            await ctx.scheduler.runAfter(0, internal.service.task.processTaskEvents.processTaskEvents, { uid: playerId });

            results.push({ match: i + 1, message: "Event recorded and processing scheduled" });
        }

        return {
            taskId,
            scenario: "time_window",
            results
        };
    }
});

// 获取所有时间相关任务模板
export const getTimeBasedTaskTemplates = mutation({
    args: {},
    handler: async () => {
        return {
            templates: timeBasedTaskTemplates,
            count: Object.keys(timeBasedTaskTemplates).length
        };
    }
});

// 批量创建时间相关任务
export const createMultipleTimeBasedTasks = mutation({
    args: { playerId: v.id("players") },
    handler: async (ctx, { playerId }) => {
        const { db } = ctx;
        const taskIds = [];

        for (const [key, template] of Object.entries(timeBasedTaskTemplates)) {
            const taskId = await db.insert("player_tasks", {
                uid: playerId,
                taskId: `time_based_${key}`,
                name: template.title,
                type: template.type,
                description: template.description,
                condition: template.condition,
                rewards: template.rewards,
                progress: {
                    actions: [{ [template.condition.action]: 0 }],
                    lastActionDate: "",
                    consecutiveDays: 0,
                    startDate: new Date().toISOString().split('T')[0]
                },
                isCompleted: false,
                lastReset: new Date().toISOString().split('T')[0],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            taskIds.push({ key, taskId });
        }

        return {
            message: `Created ${taskIds.length} time-based tasks`,
            tasks: taskIds
        };
    }
});

// 获取所有任务模板
export const getAllTaskTemplates = mutation({
    args: {},
    handler: async () => {
        return {
            oneTime: oneTimeTaskTemplates,
            daily: dailyTaskTemplates,
            weekly: weeklyTaskTemplates,
            season: seasonTaskTemplates,
            complex: complexTaskTemplates,
            timeBased: timeBasedTaskTemplates
        };
    }
});

// 批量创建所有类型任务
export const createAllTaskTypes = mutation({
    args: { playerId: v.id("players") },
    handler: async (ctx, { playerId }) => {
        const { db } = ctx;
        const results: any = {};

        // 创建 One-time 任务
        results.oneTime = [];
        for (const [key, template] of Object.entries(oneTimeTaskTemplates)) {
            const taskId = await db.insert("player_tasks", {
                uid: playerId,
                taskId: `one_time_${key}`,
                name: template.title,
                type: template.type,
                description: template.description,
                condition: template.condition,
                rewards: template.rewards,
                progress: 0,
                isCompleted: false,
                lastReset: new Date().toISOString().split('T')[0],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            results.oneTime.push({ key, taskId });
        }

        // 创建 Daily 任务
        results.daily = [];
        for (const [key, template] of Object.entries(dailyTaskTemplates)) {
            const taskId = await db.insert("player_tasks", {
                uid: playerId,
                taskId: `daily_${key}_${new Date().toISOString().split('T')[0]}`,
                name: template.title,
                type: template.type,
                description: template.description,
                condition: template.condition,
                rewards: template.rewards,
                progress: 0,
                isCompleted: false,
                lastReset: new Date().toISOString().split('T')[0],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            results.daily.push({ key, taskId });
        }

        // 创建 Weekly 任务
        results.weekly = [];
        const now = new Date();
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
        const weekStartDate = weekStart.toISOString().split('T')[0];

        for (const [key, template] of Object.entries(weeklyTaskTemplates)) {
            const taskId = await db.insert("player_tasks", {
                uid: playerId,
                taskId: `weekly_${key}_${weekStartDate}`,
                name: template.title,
                type: template.type,
                description: template.description,
                condition: template.condition,
                rewards: template.rewards,
                progress: 0,
                isCompleted: false,
                lastReset: weekStartDate,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            results.weekly.push({ key, taskId });
        }

        // 创建 Complex 任务
        results.complex = [];
        for (const [key, template] of Object.entries(complexTaskTemplates)) {
            const getComplexProgress = (template: any) => {
                if (template.type === "complex") {
                    return { sub_0: 0, sub_1: 0 };
                }
                return 0;
            };

            const taskId = await db.insert("player_tasks", {
                uid: playerId,
                taskId: `complex_${key}`,
                name: template.title,
                type: template.type,
                description: template.description,
                condition: template.condition,
                rewards: template.rewards,
                progress: getComplexProgress(template),
                isCompleted: false,
                lastReset: new Date().toISOString().split('T')[0],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            results.complex.push({ key, taskId });
        }

        return {
            message: "Created all task types",
            results
        };
    }
}); 