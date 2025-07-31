import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { TaskIntegration } from "./service/task/taskIntegration";
import { TaskSystem } from "./service/task/taskSystem";

// ============================================================================
// 任务系统API接口
// ============================================================================

// 查询接口

/**
 * 获取玩家所有任务
 */
export const getPlayerTasks = query({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        return await TaskSystem.getPlayerTasks(ctx, args.uid);
    },
});

/**
 * 获取玩家特定任务
 */
export const getPlayerTask = query({
    args: {
        uid: v.string(),
        taskId: v.string()
    },
    handler: async (ctx, args) => {
        return await TaskSystem.getPlayerTask(ctx, args.uid, args.taskId);
    },
});

/**
 * 获取玩家未完成任务
 */
export const getPlayerIncompleteTasks = query({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        return await TaskSystem.getPlayerIncompleteTasks(ctx, args.uid);
    },
});

/**
 * 获取玩家已完成但未领取奖励的任务
 */
export const getPlayerCompletedUnclaimedTasks = query({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        return await TaskSystem.getPlayerCompletedUnclaimedTasks(ctx, args.uid);
    },
});

/**
 * 获取所有任务模板
 */
export const getAllTaskTemplates = query({
    args: {},
    handler: async (ctx, args) => {
        return await TaskSystem.getAllTaskTemplates(ctx);
    },
});

/**
 * 根据类型获取任务模板
 */
export const getTaskTemplatesByType = query({
    args: { type: v.string() },
    handler: async (ctx, args) => {
        return await TaskSystem.getTaskTemplatesByType(ctx, args.type);
    },
});

/**
 * 根据游戏类型获取任务模板
 */
export const getTaskTemplatesByGameType = query({
    args: { gameType: v.string() },
    handler: async (ctx, args) => {
        return await TaskSystem.getTaskTemplatesByGameType(ctx, args.gameType);
    },
});

/**
 * 获取玩家任务统计
 */
export const getPlayerTaskStats = query({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        return await TaskSystem.getPlayerTaskStats(ctx, args.uid);
    },
});

/**
 * 获取热门任务模板
 */
export const getPopularTaskTemplates = query({
    args: {},
    handler: async (ctx, args) => {
        return await TaskSystem.getPopularTaskTemplates(ctx);
    },
});

// 修改接口

/**
 * 为玩家分配任务
 */
export const allocateTasksForPlayer = mutation({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        return await TaskSystem.allocateTasksForPlayer(ctx, args.uid);
    },
});

/**
 * 重新分配周期性任务
 */
export const reallocatePeriodicTasks = mutation({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        return await TaskSystem.reallocatePeriodicTasks(ctx, args.uid);
    },
});

/**
 * 处理任务事件
 */
export const processTaskEvent = mutation({
    args: {
        uid: v.string(),
        action: v.string(),
        actionData: v.any(),
        gameType: v.optional(v.string()),
        tournamentId: v.optional(v.string()),
        matchId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        return await TaskSystem.processTaskEvent(ctx, args);
    },
});

/**
 * 领取任务奖励
 */
export const claimTaskRewards = mutation({
    args: {
        uid: v.string(),
        taskId: v.string(),
    },
    handler: async (ctx, args) => {
        return await TaskSystem.claimTaskRewards(ctx, args);
    },
});

/**
 * 重置玩家任务
 */
export const resetPlayerTasks = mutation({
    args: {
        uid: v.string(),
        resetType: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly")),
    },
    handler: async (ctx, args) => {
        return await TaskSystem.resetPlayerTasks(ctx, args.uid, args.resetType);
    },
});

/**
 * 智能重置玩家任务
 */
export const smartResetPlayerTasks = mutation({
    args: {
        uid: v.string(),
        resetType: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly")),
    },
    handler: async (ctx, args) => {
        return await TaskSystem.smartResetPlayerTasks(ctx, args.uid, args.resetType);
    },
});

// ============================================================================
// 任务事件处理 - 常用事件
// ============================================================================

/**
 * 处理登录事件
 */
export const processLoginEvent = mutation({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        return await TaskSystem.processTaskEvent(ctx, {
            uid: args.uid,
            action: "login",
            actionData: { increment: 1 },
        });
    },
});

/**
 * 处理游戏完成事件
 */
export const processGameCompleteEvent = mutation({
    args: {
        uid: v.string(),
        gameType: v.string(),
        isWin: v.boolean(),
        matchId: v.optional(v.string()),
        tournamentId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const events = [];

        // 游戏完成事件
        events.push({
            uid: args.uid,
            action: "complete_match",
            actionData: { increment: 1, gameType: args.gameType, isWin: args.isWin },
            gameType: args.gameType,
            matchId: args.matchId,
            tournamentId: args.tournamentId,
        });

        // 游戏胜利事件
        if (args.isWin) {
            events.push({
                uid: args.uid,
                action: "win_match",
                actionData: { increment: 1, gameType: args.gameType },
                gameType: args.gameType,
                matchId: args.matchId,
                tournamentId: args.tournamentId,
            });
        }

        // 处理所有事件
        const results = [];
        for (const event of events) {
            const result = await TaskSystem.processTaskEvent(ctx, event);
            results.push(result);
        }

        return {
            success: true,
            message: `处理了 ${events.length} 个游戏事件`,
            results,
        };
    },
});

/**
 * 处理道具使用事件
 */
export const processPropUseEvent = mutation({
    args: {
        uid: v.string(),
        gameType: v.string(),
        propType: v.string(),
        matchId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        return await TaskSystem.processTaskEvent(ctx, {
            uid: args.uid,
            action: "use_prop",
            actionData: {
                increment: 1,
                gameType: args.gameType,
                propType: args.propType
            },
            gameType: args.gameType,
            matchId: args.matchId,
        });
    },
});

/**
 * 处理锦标赛参与事件
 */
export const processTournamentJoinEvent = mutation({
    args: {
        uid: v.string(),
        gameType: v.string(),
        tournamentId: v.string(),
        tournamentType: v.string(),
    },
    handler: async (ctx, args) => {
        return await TaskSystem.processTaskEvent(ctx, {
            uid: args.uid,
            action: "tournament_join",
            actionData: {
                increment: 1,
                gameType: args.gameType,
                tournamentType: args.tournamentType
            },
            gameType: args.gameType,
            tournamentId: args.tournamentId,
        });
    },
});

/**
 * 处理社交事件
 */
export const processSocialEvent = mutation({
    args: {
        uid: v.string(),
        action: v.string(), // "invite_friend", "share_game", "join_clan", etc.
        actionData: v.any(),
    },
    handler: async (ctx, args) => {
        return await TaskSystem.processTaskEvent(ctx, {
            uid: args.uid,
            action: args.action,
            actionData: args.actionData,
        });
    },
});

/**
 * 处理成就事件
 */
export const processAchievementEvent = mutation({
    args: {
        uid: v.string(),
        achievementId: v.string(),
        achievementType: v.string(),
    },
    handler: async (ctx, args) => {
        return await TaskSystem.processTaskEvent(ctx, {
            uid: args.uid,
            action: "unlock_achievement",
            actionData: {
                increment: 1,
                achievementId: args.achievementId,
                achievementType: args.achievementType
            },
        });
    },
});

// ============================================================================
// 批量操作接口
// ============================================================================

/**
 * 批量领取任务奖励
 */
export const batchClaimTaskRewards = mutation({
    args: {
        uid: v.string(),
        taskIds: v.array(v.string()),
    },
    handler: async (ctx, args) => {
        const results = [];
        const claimedRewards = [];

        for (const taskId of args.taskIds) {
            const result = await TaskSystem.claimTaskRewards(ctx, {
                uid: args.uid,
                taskId,
            });

            results.push(result);
            if (result.success && result.rewards) {
                claimedRewards.push({
                    taskId,
                    rewards: result.rewards,
                });
            }
        }

        const successCount = results.filter(r => r.success).length;
        const totalCoins = claimedRewards.reduce((sum, item) =>
            sum + (item.rewards.coins || 0), 0
        );
        const totalSeasonPoints = claimedRewards.reduce((sum, item) =>
            sum + (item.rewards.seasonPoints || 0), 0
        );

        return {
            success: true,
            message: `成功领取 ${successCount}/${args.taskIds.length} 个任务奖励`,
            totalCoins,
            totalSeasonPoints,
            claimedRewards,
            results,
        };
    },
});

/**
 * 批量分配任务
 */
export const batchAllocateTasks = mutation({
    args: {
        uids: v.array(v.string()),
    },
    handler: async (ctx, args) => {
        const results = [];

        for (const uid of args.uids) {
            const result = await TaskSystem.allocateTasksForPlayer(ctx, uid);
            results.push({ uid, ...result });
        }

        const successCount = results.filter(r => r.success).length;
        const totalAllocated = results.reduce((sum, r) =>
            sum + (r.allocatedTasks?.length || 0), 0
        );

        return {
            success: true,
            message: `为 ${successCount}/${args.uids.length} 个玩家分配了 ${totalAllocated} 个任务`,
            results,
        };
    },
});

/**
 * 批量处理未处理的事件
 */
export const processUnprocessedEvents = mutation({
    args: { uid: v.optional(v.string()) },
    handler: async (ctx, args) => {
        return await TaskSystem.processUnprocessedEvents(ctx, args.uid);
    },
});

/**
 * 获取未处理事件统计
 */
export const getUnprocessedEventsStats = query({
    args: {},
    handler: async (ctx, args) => {
        return await TaskSystem.getUnprocessedEventsStats(ctx);
    },
});

// ============================================================================
// 管理接口
// ============================================================================

/**
 * 创建任务模板
 */
export const createTaskTemplate = mutation({
    args: {
        templateId: v.string(),
        name: v.string(),
        description: v.string(),
        type: v.string(),
        category: v.string(),
        gameType: v.optional(v.string()),
        condition: v.any(),
        rewards: v.any(),
        resetInterval: v.optional(v.string()),
        maxCompletions: v.optional(v.number()),
        isActive: v.boolean(),
        validFrom: v.optional(v.string()),
        validUntil: v.optional(v.string()),
        allocationRules: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        const now = new Date().toISOString();

        const templateId = await ctx.db.insert("task_templates", {
            templateId: args.templateId,
            name: args.name,
            description: args.description,
            type: args.type,
            category: args.category,
            gameType: args.gameType,
            condition: args.condition,
            rewards: args.rewards,
            resetInterval: args.resetInterval,
            maxCompletions: args.maxCompletions,
            isActive: args.isActive,
            validFrom: args.validFrom,
            validUntil: args.validUntil,
            allocationRules: args.allocationRules,
            createdAt: now,
            updatedAt: now,
        });

        return {
            success: true,
            message: "任务模板创建成功",
            templateId,
        };
    },
});

/**
 * 更新任务模板
 */
export const updateTaskTemplate = mutation({
    args: {
        templateId: v.string(),
        updates: v.any(),
    },
    handler: async (ctx, args) => {
        const template = await ctx.db.query("task_templates")
            .withIndex("by_templateId", (q: any) => q.eq("templateId", args.templateId))
            .unique();

        if (!template) {
            return { success: false, message: "任务模板不存在" };
        }

        await ctx.db.patch(template._id, {
            ...args.updates,
            updatedAt: new Date().toISOString(),
        });

        return {
            success: true,
            message: "任务模板更新成功",
        };
    },
});

/**
 * 删除任务模板
 */
export const deleteTaskTemplate = mutation({
    args: {
        templateId: v.string(),
    },
    handler: async (ctx, args) => {
        const template = await ctx.db.query("task_templates")
            .withIndex("by_templateId", (q: any) => q.eq("templateId", args.templateId))
            .unique();

        if (!template) {
            return { success: false, message: "任务模板不存在" };
        }

        await ctx.db.delete(template._id);

        return {
            success: true,
            message: "任务模板删除成功",
        };
    },
});




/**
 * 管理玩家周期性任务
 */
export const managePlayerPeriodicTasks = mutation({
    args: {
        uid: v.string(),
        taskType: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly"))
    },
    handler: async (ctx, args) => {
        return await TaskSystem.managePeriodicTasks(ctx, args.uid, args.taskType);
    },
});



/**
 * 统一的任务管理 - 处理新玩家和现有玩家的所有任务逻辑
 */
export const managePlayerTasks = mutation({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        try {
            const results = await TaskIntegration.managePlayerTasks(ctx, args.uid);

            return {
                success: true,
                message: "任务管理完成",
                results
            };
        } catch (error) {
            console.error("任务管理失败:", error);
            return {
                success: false,
                message: error instanceof Error ? error.message : "任务管理失败",
                results: null
            };
        }
    },
});

/**
 * 玩家登录时的完整任务管理 - 包含登录事件处理和任务管理
 */
export const handlePlayerLoginComplete = mutation({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        try {
            // 处理登录事件
            await TaskSystem.processTaskEvent(ctx, {
                uid: args.uid,
                action: "login",
                actionData: { increment: 1 }
            });

            // 统一的任务管理 - 处理新玩家和现有玩家的所有任务逻辑
            const taskManagementResults = await TaskIntegration.managePlayerTasks(ctx, args.uid);

            // 获取玩家当前任务状态
            const playerTasks = await TaskSystem.getPlayerTasks(ctx, args.uid);
            const incompleteTasks = await TaskSystem.getPlayerIncompleteTasks(ctx, args.uid);
            const completedUnclaimedTasks = await TaskSystem.getPlayerCompletedUnclaimedTasks(ctx, args.uid);

            return {
                success: true,
                message: "登录任务管理完成",
                taskManagementResults,
                playerTasks: {
                    total: playerTasks.length,
                    incomplete: incompleteTasks.length,
                    completedUnclaimed: completedUnclaimedTasks.length
                }
            };
        } catch (error) {
            console.error("登录任务管理失败:", error);
            return {
                success: false,
                message: error instanceof Error ? error.message : "登录任务管理失败"
            };
        }
    },
}); 