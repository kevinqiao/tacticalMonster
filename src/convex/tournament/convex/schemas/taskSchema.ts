import { defineTable } from "convex/server";
import { v } from "convex/values";

// 任务系统相关表
export const taskSchema = {
    // tasks: defineTable({
    //     taskId: v.string(),
    //     name: v.string(),
    //     description: v.string(),
    //     type: v.string(), // "daily", "achievement", "tournament", "ticket"
    //     category: v.string(), // "gameplay", "social", "collection", "challenge"
    //     requirements: v.object({
    //         targetValue: v.number(),
    //         currentValue: v.number(),
    //         gameType: v.optional(v.string()),
    //         segmentName: v.optional(v.string()),
    //         ticketType: v.optional(v.string()),
    //     }),
    //     rewards: v.array(v.object({
    //         type: v.string(), // "points", "tickets", "props", "coins"
    //         itemId: v.string(),
    //         quantity: v.number(),
    //     })),
    //     isActive: v.boolean(),
    //     expiresAt: v.optional(v.string()),
    //     createdAt: v.string(),
    //     updatedAt: v.string(),
    // }).index("by_taskId", ["taskId"]).index("by_type", ["type"]).index("by_active", ["isActive"]),

    // 任务模板表
    task_templates: defineTable({
        templateId: v.string(),
        name: v.string(),
        description: v.string(),
        type: v.string(),
        gameType: v.optional(v.string()),
        condition: v.any(),
        rewards: v.object({
            coins: v.number(),
            props: v.array(v.object({ gameType: v.string(), propType: v.string(), quantity: v.number() })),
            tickets: v.array(v.object({ gameType: v.string(), tournamentType: v.string(), quantity: v.number() })),
            gamePoints: v.number(),
        }),
        resetInterval: v.string(),
        allocationRules: v.any(),
        isDynamic: v.optional(v.boolean()),
        validDate: v.optional(v.string()),
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_templateId", ["templateId"]).index("by_validDate", ["validDate"]),

    player_tasks: defineTable({
        uid: v.string(),
        taskId: v.string(),
        name: v.string(),
        type: v.string(),
        description: v.string(),
        condition: v.any(), // 任务条件
        progress: v.any(), // 进度（可以是数字或复杂对象）
        isCompleted: v.boolean(),
        completedAt: v.optional(v.string()),
        rewardsClaimed: v.boolean(),
        claimedAt: v.optional(v.string()),
        lastReset: v.optional(v.string()),
        rewards: v.any(), // 奖励配置
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_uid", ["uid"]).index("by_task", ["taskId"]).index("by_completed", ["isCompleted"]).index("by_uid_taskId", ["uid", "taskId"]),

    // 任务事件表 - 用于记录任务相关的事件
    task_events: defineTable({
        uid: v.string(),
        action: v.string(), // "login", "game_win", "tournament_join", etc.
        actionData: v.any(), // 事件相关的数据
        processed: v.boolean(), // 是否已处理
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_uid", ["uid"]).index("by_uid_processed", ["uid", "processed"]).index("by_action", ["action"]),

    task_progress_logs: defineTable({
        uid: v.string(),
        taskId: v.string(),
        oldProgress: v.number(),
        newProgress: v.number(),
        increment: v.number(),
        source: v.string(), // "tournament", "gameplay", "purchase"
        context: v.object({
            tournamentId: v.optional(v.string()),
            matchId: v.optional(v.string()),
            gameType: v.optional(v.string()),
        }),
        createdAt: v.string(),
    }).index("by_uid", ["uid"]).index("by_task", ["taskId"]),

    daily_task_resets: defineTable({
        uid: v.string(),
        resetDate: v.string(),
        tasksReset: v.number(),
        createdAt: v.string(),
    }).index("by_uid", ["uid"]).index("by_date", ["resetDate"]),

    achievement_tasks: defineTable({
        uid: v.string(),
        achievementId: v.string(),
        taskId: v.string(),
        progress: v.number(),
        isUnlocked: v.boolean(),
        unlockedAt: v.optional(v.string()),
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_uid", ["uid"]).index("by_achievement", ["achievementId"]),
}; 