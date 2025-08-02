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
        category: v.string(), // 添加category字段
        gameType: v.optional(v.string()),
        condition: v.any(),
        rewards: v.any(), // 改为any类型以支持更灵活的奖励结构
        resetInterval: v.optional(v.string()), // 改为optional
        maxCompletions: v.optional(v.number()), // 添加maxCompletions字段
        isActive: v.boolean(), // 添加isActive字段
        validFrom: v.optional(v.string()), // 添加validFrom字段
        validUntil: v.optional(v.string()), // 添加validUntil字段
        allocationRules: v.optional(v.any()),
        version: v.optional(v.string()), // 添加version字段
        lastUpdated: v.optional(v.string()), // 添加lastUpdated字段
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_templateId", ["templateId"])
        .index("by_type", ["type"])
        .index("by_category", ["category"])
        .index("by_active", ["isActive"])
        .index("by_validDate", ["validFrom", "validUntil"]),

    // 玩家任务表 - 只存储正在进行中的任务
    player_tasks: defineTable({
        uid: v.string(),
        taskId: v.string(),
        templateId: v.string(),
        name: v.string(),
        description: v.string(),
        type: v.string(),
        category: v.string(),
        condition: v.any(), // 任务条件
        progress: v.any(), // 进度（可以是数字或复杂对象）
        dueTime: v.optional(v.string()), // 任务过期时间
        rewards: v.any(), // 奖励配置
        version: v.optional(v.string()), // 添加version字段
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_uid", ["uid"])
        .index("by_task", ["taskId"])
        .index("by_uid_taskId", ["uid", "taskId"])
        .index("by_uid_templateId", ["uid", "templateId"]) // 添加新的复合索引
        .index("by_templateId", ["templateId"]) // 添加模板ID索引
        .index("by_dueTime", ["dueTime"]), // 添加过期时间索引

    // 已完成任务表 - 存储成功完成的任务
    task_completed: defineTable({
        uid: v.string(),
        taskId: v.string(),
        templateId: v.string(),
        name: v.string(),
        description: v.string(),
        type: v.string(),
        category: v.string(),
        condition: v.any(), // 任务条件
        progress: v.any(), // 最终进度
        completedAt: v.string(),
        rewardsClaimed: v.boolean(),
        claimedAt: v.optional(v.string()),
        rewards: v.any(), // 奖励配置
        version: v.optional(v.string()),
        createdAt: v.string(),
    }).index("by_uid", ["uid"])
        .index("by_task", ["taskId"])
        .index("by_uid_taskId", ["uid", "taskId"])
        .index("by_uid_templateId", ["uid", "templateId"])
        .index("by_templateId", ["templateId"])
        .index("by_completedAt", ["completedAt"])
        .index("by_rewardsClaimed", ["rewardsClaimed"]),

    // 过期任务表 - 存储过期未完成的任务
    task_expired: defineTable({
        uid: v.string(),
        taskId: v.string(),
        templateId: v.string(),
        name: v.string(),
        description: v.string(),
        type: v.string(),
        category: v.string(),
        condition: v.any(), // 任务条件
        progress: v.any(), // 最终进度
        expiredAt: v.string(), // 过期时间
        rewards: v.any(), // 奖励配置
        version: v.optional(v.string()),
        createdAt: v.string(),
    }).index("by_uid", ["uid"])
        .index("by_task", ["taskId"])
        .index("by_uid_taskId", ["uid", "taskId"])
        .index("by_uid_templateId", ["uid", "templateId"])
        .index("by_templateId", ["templateId"])
        .index("by_expiredAt", ["expiredAt"]),

    // 任务事件表 - 用于记录任务相关的事件
    task_events: defineTable({
        uid: v.string(),
        action: v.string(), // "login", "game_win", "tournament_join", etc.
        actionData: v.any(), // 事件相关的数据
        gameType: v.optional(v.string()),
        tournamentId: v.optional(v.string()),
        matchId: v.optional(v.string()),
        processed: v.boolean(), // 是否已处理
        error: v.optional(v.string()), // 处理错误信息
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_uid", ["uid"])
        .index("by_uid_processed", ["uid", "processed"])
        .index("by_action", ["action"])
        .index("by_processed", ["processed"]), // 添加processed索引用于批量查询

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

    // 任务历史记录表
    task_history: defineTable({
        uid: v.string(),
        taskId: v.string(),
        templateId: v.string(),
        action: v.string(), // "created", "completed", "claimed", "reset", "progress_updated"
        oldState: v.optional(v.any()), // 操作前的状态
        newState: v.optional(v.any()), // 操作后的状态
        metadata: v.optional(v.any()), // 额外信息
        createdAt: v.string(),
    }).index("by_uid", ["uid"])
        .index("by_taskId", ["taskId"])
        .index("by_action", ["action"])
        .index("by_uid_action", ["uid", "action"])
        .index("by_createdAt", ["createdAt"]),
}; 