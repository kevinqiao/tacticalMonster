import { internalMutation } from "../../_generated/server";
import { TASK_TEMPLATES } from "../../data/taskTemplate";
import { getTorontoMidnight } from "../simpleTimezoneUtils";
import { TicketSystem } from "../ticket/ticketSystem";

// ============================================================================
// 任务系统核心服务 - 基于三表设计
// ============================================================================

export interface TaskTemplate {
    templateId: string;
    name: string;
    description: string;
    type: string;
    category: string;
    gameType?: string;
    condition: TaskCondition;
    rewards: TaskRewards;
    resetInterval?: string;
    maxCompletions?: number; // 最大完成次数
    isActive: boolean;
    validFrom?: string;
    validUntil?: string;
    allocationRules?: TaskAllocationRules;
    version?: string;
    lastUpdated?: string;
}

export interface TaskCondition {
    type: "simple" | "multi_stage" | "conditional" | "time_based";
    action?: string;
    targetValue?: number;
    gameType?: string;
    consecutive?: boolean;
    withinDays?: number;
    stages?: TaskStage[];
    logic?: "and" | "or";
    subConditions?: TaskCondition[];
}

export interface TaskStage {
    action: string;
    targetValue: number;
    reward?: TaskRewards;
}

export interface TaskRewards {
    coins?: number;
    props?: TaskProp[];
    tickets?: Ticket[];
    seasonPoints?: number;
    // gamePoints: {
    //     general: number;
    //     specific?: {
    //         gameType: string;
    //         points: number;
    //     };
    // };
}

export interface TaskProp {
    gameType: string;
    propType: string;
    quantity: number;
}

export interface Ticket {
    type: string; // 门票类型：bronze, silver, gold
    quantity: number;
}

export interface TaskAllocationRules {
    playerLevel?: {
        min?: number;
        max?: number;
    };
    segmentName?: string[];
    gamePreferences?: string[];
    subscriptionRequired?: boolean;
    maxDailyAllocations?: number;
}

export interface PlayerTask {
    uid: string;
    taskId: string;
    templateId: string;
    name: string;
    description: string;
    type: string;
    category: string;
    condition: TaskCondition;
    progress: TaskProgress;
    dueTime?: string; // 任务过期时间
    rewards: TaskRewards;
    version?: string; // 任务模板版本
    createdAt: string;
    updatedAt: string;
}

export interface CompletedTask {
    uid: string;
    taskId: string;
    templateId: string;
    name: string;
    description: string;
    type: string;
    category: string;
    condition: TaskCondition;
    progress: TaskProgress; // 最终进度
    completedAt: string;
    rewardsClaimed: boolean;
    claimedAt?: string;
    rewards: TaskRewards;
    version?: string;
    createdAt: string;
}

export interface ExpiredTask {
    uid: string;
    taskId: string;
    templateId: string;
    name: string;
    description: string;
    type: string;
    category: string;
    condition: TaskCondition;
    progress: TaskProgress; // 最终进度
    expiredAt: string; // 过期时间
    rewards: TaskRewards;
    version?: string;
    createdAt: string;
}

export interface TaskProgress {
    currentValue: number;
    stageProgress?: number[];
    subProgress?: { [key: string]: number };
    consecutiveDays?: number;
    lastActionDate?: string;
    timeProgress?: {
        startTime: string;
        endTime: string;
        currentTime: string;
    };
}

export interface TaskEvent {
    uid: string;
    action: string;
    actionData: any;
    gameType?: string;
    tournamentId?: string;
    matchId?: string;
    processed: boolean;
    error?: string;
    createdAt: string;
    updatedAt: string;
}

export class TaskSystem {
    // ============================================================================
    // 任务模板管理
    // ============================================================================

    /**
     * 获取所有任务模板
     */
    static async getAllTaskTemplates(ctx: any): Promise<TaskTemplate[]> {
        const templates = await ctx.db.query("task_templates")
            .withIndex("by_active", (q: any) => q.eq("isActive", true))
            .collect();

        return templates.map((template: any) => ({
            templateId: template.templateId,
            name: template.name,
            description: template.description,
            type: template.type,
            category: template.category,
            gameType: template.gameType,
            condition: template.condition,
            rewards: template.rewards,
            resetInterval: template.resetInterval,
            maxCompletions: template.maxCompletions,
            isActive: template.isActive,
            validFrom: template.validFrom,
            validUntil: template.validUntil,
            allocationRules: template.allocationRules,
            version: template.version,
            lastUpdated: template.lastUpdated
        }));
    }

    /**
     * 根据类型获取任务模板
     */
    static async getTaskTemplatesByType(ctx: any, type: string): Promise<TaskTemplate[]> {
        const templates = await ctx.db.query("task_templates")
            .withIndex("by_type", (q: any) => q.eq("type", type))
            .filter((q: any) => q.eq(q.field("isActive"), true))
            .collect();

        return templates.map((template: any) => ({
            templateId: template.templateId,
            name: template.name,
            description: template.description,
            type: template.type,
            category: template.category,
            gameType: template.gameType,
            condition: template.condition,
            rewards: template.rewards,
            resetInterval: template.resetInterval,
            maxCompletions: template.maxCompletions,
            isActive: template.isActive,
            validFrom: template.validFrom,
            validUntil: template.validUntil,
            allocationRules: template.allocationRules,
            version: template.version,
            lastUpdated: template.lastUpdated
        }));
    }

    /**
     * 根据游戏类型获取任务模板
     */
    static async getTaskTemplatesByGameType(ctx: any, gameType: string): Promise<TaskTemplate[]> {
        const templates = await ctx.db.query("task_templates")
            .withIndex("by_active", (q: any) => q.eq("isActive", true))
            .collect();

        return templates
            .filter((template: any) => !template.gameType || template.gameType === gameType)
            .map((template: any) => ({
                templateId: template.templateId,
                name: template.name,
                description: template.description,
                type: template.type,
                category: template.category,
                gameType: template.gameType,
                condition: template.condition,
                rewards: template.rewards,
                resetInterval: template.resetInterval,
                maxCompletions: template.maxCompletions,
                isActive: template.isActive,
                validFrom: template.validFrom,
                validUntil: template.validUntil,
                allocationRules: template.allocationRules,
                version: template.version,
                lastUpdated: template.lastUpdated
            }));
    }

    // ============================================================================
    // 玩家任务管理 - 三表设计
    // ============================================================================

    /**
     * 获取玩家活跃任务
     */
    static async getPlayerActiveTasks(ctx: any, uid: string): Promise<PlayerTask[]> {
        const activeTasks = await ctx.db.query("player_tasks")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .collect();

        return activeTasks.map((task: any) => ({
            uid: task.uid,
            taskId: task.taskId,
            templateId: task.templateId,
            name: task.name,
            description: task.description,
            type: task.type,
            category: task.category,
            condition: task.condition,
            progress: task.progress,
            dueTime: task.dueTime,
            rewards: task.rewards,
            version: task.version,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt
        }));
    }

    /**
     * 获取玩家已完成任务
     */
    static async getPlayerCompletedTasks(ctx: any, uid: string): Promise<CompletedTask[]> {
        const completedTasks = await ctx.db.query("task_completed")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .collect();

        return completedTasks.map((task: any) => ({
            uid: task.uid,
            taskId: task.taskId,
            templateId: task.templateId,
            name: task.name,
            description: task.description,
            type: task.type,
            category: task.category,
            condition: task.condition,
            progress: task.progress,
            completedAt: task.completedAt,
            rewardsClaimed: task.rewardsClaimed,
            claimedAt: task.claimedAt,
            rewards: task.rewards,
            version: task.version,
            createdAt: task.createdAt
        }));
    }

    /**
     * 获取玩家过期任务
     */
    static async getPlayerExpiredTasks(ctx: any, uid: string): Promise<ExpiredTask[]> {
        const expiredTasks = await ctx.db.query("task_expired")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .collect();

        return expiredTasks.map((task: any) => ({
            uid: task.uid,
            taskId: task.taskId,
            templateId: task.templateId,
            name: task.name,
            description: task.description,
            type: task.type,
            category: task.category,
            condition: task.condition,
            progress: task.progress,
            expiredAt: task.expiredAt,
            rewards: task.rewards,
            version: task.version,
            createdAt: task.createdAt
        }));
    }

    /**
     * 获取玩家特定活跃任务
     */
    static async getPlayerActiveTask(ctx: any, uid: string, taskId: string): Promise<PlayerTask | null> {
        const activeTask = await ctx.db.query("player_tasks")
            .withIndex("by_uid_taskId", (q: any) => q.eq("uid", uid).eq("taskId", taskId))
            .unique();

        if (!activeTask) return null;

        return {
            uid: activeTask.uid,
            taskId: activeTask.taskId,
            templateId: activeTask.templateId,
            name: activeTask.name,
            description: activeTask.description,
            type: activeTask.type,
            category: activeTask.category,
            condition: activeTask.condition,
            progress: activeTask.progress,
            dueTime: activeTask.dueTime,
            rewards: activeTask.rewards,
            version: activeTask.version,
            createdAt: activeTask.createdAt,
            updatedAt: activeTask.updatedAt
        };
    }

    /**
     * 获取玩家特定已完成任务
     */
    static async getPlayerCompletedTask(ctx: any, uid: string, taskId: string): Promise<CompletedTask | null> {
        const completedTask = await ctx.db.query("task_completed")
            .withIndex("by_uid_taskId", (q: any) => q.eq("uid", uid).eq("taskId", taskId))
            .unique();

        if (!completedTask) return null;

        return {
            uid: completedTask.uid,
            taskId: completedTask.taskId,
            templateId: completedTask.templateId,
            name: completedTask.name,
            description: completedTask.description,
            type: completedTask.type,
            category: completedTask.category,
            condition: completedTask.condition,
            progress: completedTask.progress,
            completedAt: completedTask.completedAt,
            rewardsClaimed: completedTask.rewardsClaimed,
            claimedAt: completedTask.claimedAt,
            rewards: completedTask.rewards,
            version: completedTask.version,
            createdAt: completedTask.createdAt
        };
    }

    /**
     * 获取玩家特定过期任务
     */
    static async getPlayerExpiredTask(ctx: any, uid: string, taskId: string): Promise<ExpiredTask | null> {
        const expiredTask = await ctx.db.query("task_expired")
            .withIndex("by_uid_taskId", (q: any) => q.eq("uid", uid).eq("taskId", taskId))
            .unique();

        if (!expiredTask) return null;

        return {
            uid: expiredTask.uid,
            taskId: expiredTask.taskId,
            templateId: expiredTask.templateId,
            name: expiredTask.name,
            description: expiredTask.description,
            type: expiredTask.type,
            category: expiredTask.category,
            condition: expiredTask.condition,
            progress: expiredTask.progress,
            expiredAt: expiredTask.expiredAt,
            rewards: expiredTask.rewards,
            version: expiredTask.version,
            createdAt: expiredTask.createdAt
        };
    }

    // ============================================================================
    // 任务分配和管理
    // ============================================================================

    /**
     * 为玩家分配任务 - 基于三表设计
     */
    static async allocateTasksForPlayer(ctx: any, uid: string): Promise<{ success: boolean; message: string; allocatedTasks?: string[] }> {
        const now = getTorontoMidnight();
        const allocatedTasks: string[] = [];

        // 获取玩家信息
        const player = await ctx.db.query("players")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .unique();

        if (!player) {
            return { success: false, message: "玩家不存在" };
        }

        // 获取所有活跃任务模板
        const templates = await this.getAllTaskTemplates(ctx);

        for (const template of templates) {
            console.log("template", template)
            // 检查分配规则
            if (!this.checkAllocationRules(template.allocationRules, player)) {
                continue;
            }

            // 检查有效期
            if (template.validFrom && now.iso < template.validFrom) {
                continue;
            }
            if (template.validUntil && now.iso > template.validUntil) {
                continue;
            }

            // 检查是否已有活跃任务
            const existingActiveTask = await ctx.db.query("player_tasks")
                .withIndex("by_uid_templateId", (q: any) => q.eq("uid", uid).eq("templateId", template.templateId))
                .unique();

            if (existingActiveTask) {
                continue; // 已有活跃任务，不重复分配
            }

            // 检查是否已完成且在有效期内
            const isCompletedInValidPeriod = await this.isTemplateCompletedInValidPeriod(ctx, uid, template.templateId, template);
            if (isCompletedInValidPeriod) {
                continue; // 已完成且在有效期内，不重复分配
            }

            // 创建新活跃任务
            const taskId = `${uid}_${template.templateId}_${now.iso}`;
            const initialProgress = this.getInitialProgress(template.condition);
            const dueTime = this.calculateTaskDueTime(template.type, now);

            await ctx.db.insert("player_tasks", {
                uid,
                taskId,
                templateId: template.templateId,
                name: template.name,
                description: template.description,
                type: template.type,
                category: template.category,
                condition: template.condition,
                progress: initialProgress,
                dueTime: dueTime,
                rewards: template.rewards,
                version: template.version,
                createdAt: now.iso,
                updatedAt: now.iso
            });

            allocatedTasks.push(taskId);
        }

        return {
            success: true,
            message: `成功分配 ${allocatedTasks.length} 个活跃任务`,
            allocatedTasks
        };
    }

    /**
     * 完成任务 - 从活跃任务移动到已完成任务
     */
    static async completeTask(ctx: any, uid: string, taskId: string): Promise<{ success: boolean; message: string; rewards?: TaskRewards }> {
        const now = getTorontoMidnight();

        // 获取活跃任务
        const activeTask = await ctx.db.query("player_tasks")
            .withIndex("by_uid_taskId", (q: any) => q.eq("uid", uid).eq("taskId", taskId))
            .unique();

        if (!activeTask) {
            return { success: false, message: "任务不存在或已完成" };
        }

        // // 处理奖励结算
        // const rewardResult = await this.grantRewards(ctx, uid, activeTask.rewards);

        // 创建已完成任务记录
        await ctx.db.insert("task_completed", {
            uid: activeTask.uid,
            taskId: activeTask.taskId,
            templateId: activeTask.templateId,
            name: activeTask.name,
            description: activeTask.description,
            type: activeTask.type,
            category: activeTask.category,
            condition: activeTask.condition,
            progress: activeTask.progress,
            completedAt: now.iso,
            rewardsClaimed: true, // 奖励已结算
            claimedAt: now.iso,   // 记录结算时间
            rewards: activeTask.rewards,
            version: activeTask.version,
            createdAt: activeTask.createdAt
        });

        // 删除活跃任务
        await ctx.db.delete(activeTask._id);

        return {
            success: true,
            message: "任务完成，奖励已结算",
            rewards: activeTask.rewards
        };
    }

    /**
     * 处理过期任务 - 从活跃任务移动到过期任务表
     */
    static async handleExpiredTasks(ctx: any, uid: string): Promise<{
        success: boolean;
        message: string;
        movedTasks?: string[];
        totalExpired?: number;
    }> {
        const now = getTorontoMidnight();
        const movedTasks: string[] = [];
        let totalExpired = 0;

        // 获取所有活跃任务
        const activeTasks = await this.getPlayerActiveTasks(ctx, uid);

        for (const task of activeTasks) {
            if (!task.dueTime) continue; // 没有过期时间的任务跳过

            const taskDueTime = new Date(task.dueTime);
            const nowTime = now.localDate.getTime();
            const isExpired = nowTime > taskDueTime.getTime();

            if (isExpired) {
                totalExpired++;
                const activeTaskRecord = await ctx.db.query("player_tasks")
                    .withIndex("by_uid_taskId", (q: any) => q.eq("uid", uid).eq("taskId", task.taskId))
                    .unique();

                if (activeTaskRecord) {
                    // 创建过期任务记录
                    await ctx.db.insert("task_expired", {
                        uid: activeTaskRecord.uid,
                        taskId: activeTaskRecord.taskId,
                        templateId: activeTaskRecord.templateId,
                        name: activeTaskRecord.name,
                        description: activeTaskRecord.description,
                        type: activeTaskRecord.type,
                        category: activeTaskRecord.category,
                        condition: activeTaskRecord.condition,
                        progress: activeTaskRecord.progress,
                        expiredAt: now.iso,
                        rewards: activeTaskRecord.rewards,
                        version: activeTaskRecord.version,
                        createdAt: activeTaskRecord.createdAt
                    });

                    // 删除活跃任务
                    await ctx.db.delete(activeTaskRecord._id);
                    movedTasks.push(task.taskId);
                }
            }
        }

        return {
            success: true,
            message: `处理了 ${totalExpired} 个过期任务，移动了 ${movedTasks.length} 个到过期任务表`,
            movedTasks,
            totalExpired
        };
    }

    /**
     * 恢复过期任务 - 从过期任务表移回活跃任务表
     */
    static async restoreExpiredTask(ctx: any, uid: string, taskId: string): Promise<{ success: boolean; message: string }> {
        const now = getTorontoMidnight();

        // 查找过期任务
        const expiredTask = await ctx.db.query("task_expired")
            .withIndex("by_uid_taskId", (q: any) => q.eq("uid", uid).eq("taskId", taskId))
            .unique();

        if (!expiredTask) {
            return { success: false, message: "过期任务不存在" };
        }

        // 计算新的过期时间
        const newDueTime = this.calculateTaskDueTime(expiredTask.type, now);

        // 创建新的活跃任务
        await ctx.db.insert("player_tasks", {
            uid: expiredTask.uid,
            taskId: expiredTask.taskId,
            templateId: expiredTask.templateId,
            name: expiredTask.name,
            description: expiredTask.description,
            type: expiredTask.type,
            category: expiredTask.category,
            condition: expiredTask.condition,
            progress: expiredTask.progress,
            dueTime: newDueTime,
            rewards: expiredTask.rewards,
            version: expiredTask.version,
            createdAt: expiredTask.createdAt,
            updatedAt: now.iso
        });

        // 删除过期任务
        await ctx.db.delete(expiredTask._id);

        return {
            success: true,
            message: "任务已恢复，可以继续完成"
        };
    }

    /**
     * 统一的任务管理流程
     */
    static async managePlayerTasks(ctx: any, uid: string): Promise<{
        success: boolean;
        message: string;
        allocatedTasks?: string[];
        movedTasks?: string[];
        totalExpired?: number;
    }> {
        const results: {
            allocatedTasks: string[];
            movedTasks: string[];
            totalExpired: number;
        } = {
            allocatedTasks: [],
            movedTasks: [],
            totalExpired: 0
        };

        // 步骤1: 处理过期任务
        const expiredResult = await this.handleExpiredTasks(ctx, uid);
        if (expiredResult.success) {
            results.movedTasks = expiredResult.movedTasks || [];
            results.totalExpired = expiredResult.totalExpired || 0;
        }

        // 步骤2: 分配新任务
        const allocationResult = await this.allocateTasksForPlayer(ctx, uid);
        if (allocationResult.success) {
            results.allocatedTasks = allocationResult.allocatedTasks || [];
        }

        return {
            success: true,
            message: `任务管理完成，分配了 ${results.allocatedTasks.length} 个新任务，处理了 ${results.totalExpired} 个过期任务`,
            ...results
        };
    }

    // ============================================================================
    // 任务进度更新
    // ============================================================================

    /**
     * 处理任务事件并更新进度
     */
    static async processTaskEvent(ctx: any, params: {
        uid: string;
        action: string;
        actionData: any;
        gameType?: string;
        tournamentId?: string;
        matchId?: string;
    }): Promise<{ success: boolean; message: string; updatedTasks?: any[] }> {
        const { uid, action, actionData, gameType, tournamentId, matchId } = params;
        const now = getTorontoMidnight();

        // 记录任务事件
        await ctx.db.insert("task_events", {
            uid,
            action,
            actionData,
            gameType,
            tournamentId,
            matchId,
            processed: false,
            createdAt: now.iso,
            updatedAt: now.iso
        });

        // 获取玩家活跃任务
        const activeTasks = await this.getPlayerActiveTasks(ctx, uid);
        const updatedTasks: any[] = [];

        for (const task of activeTasks) {
            // 检查任务是否匹配当前事件
            if (this.isTaskActionMatch(task, action, actionData, gameType)) {
                // 更新任务进度
                const newProgress = this.updateTaskProgress(task, action, actionData);

                // 检查任务是否完成
                const isCompleted = this.checkTaskCompletion(task, newProgress);

                // 更新任务记录
                const taskRecord = await ctx.db.query("player_tasks")
                    .withIndex("by_uid_taskId", (q: any) => q.eq("uid", uid).eq("taskId", task.taskId))
                    .unique();

                if (taskRecord) {
                    await ctx.db.patch(taskRecord._id, {
                        progress: newProgress,
                        updatedAt: now.iso
                    });

                    updatedTasks.push({
                        taskId: task.taskId,
                        progress: newProgress,
                        isCompleted
                    });

                    // 如果任务完成，移动到已完成任务表
                    if (isCompleted) {
                        await this.completeTask(ctx, uid, task.taskId);
                    }
                }
            }
        }

        // 标记事件为已处理
        const eventRecord = await ctx.db.query("task_events")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .filter((q: any) => q.eq(q.field("action"), action))
            .order("desc")
            .first();

        if (eventRecord) {
            await ctx.db.patch(eventRecord._id, {
                processed: true,
                updatedAt: now.iso
            });
        }

        return {
            success: true,
            message: `处理了 ${updatedTasks.length} 个任务`,
            updatedTasks
        };
    }

    // ============================================================================
    // 任务奖励领取
    // ============================================================================

    /**
     * 领取任务奖励 - 主要用于处理历史数据或特殊情况
     */
    static async claimTaskRewards(ctx: any, params: {
        uid: string;
        taskId: string;
    }): Promise<{ success: boolean; message: string; rewards?: TaskRewards }> {
        const { uid, taskId } = params;
        const now = getTorontoMidnight();

        // 查找已完成但未领取奖励的任务
        const completedTask = await ctx.db.query("task_completed")
            .withIndex("by_uid_taskId", (q: any) => q.eq("uid", uid).eq("taskId", taskId))
            .unique();

        if (!completedTask) {
            return { success: false, message: "任务不存在或未完成" };
        }

        if (completedTask.rewardsClaimed) {
            return { success: false, message: "奖励已领取" };
        }

        // 发放奖励
        const rewardResult = await this.grantRewards(ctx, uid, completedTask.rewards);

        // 更新任务状态
        await ctx.db.patch(completedTask._id, {
            rewardsClaimed: true,
            claimedAt: now.iso
        });

        return {
            success: true,
            message: "奖励领取成功",
            rewards: completedTask.rewards
        };
    }

    // ============================================================================
    // 工具方法
    // ============================================================================

    /**
     * 检查分配规则
     */
    private static checkAllocationRules(rules: TaskAllocationRules | undefined, player: any): boolean {
        if (!rules) return true;

        // 检查玩家等级
        if (rules.playerLevel) {
            const playerLevel = player.level || 1;
            if (rules.playerLevel.min && playerLevel < rules.playerLevel.min) return false;
            if (rules.playerLevel.max && playerLevel > rules.playerLevel.max) return false;
        }

        // 检查段位
        if (rules.segmentName && rules.segmentName.length > 0) {
            if (!rules.segmentName.includes(player.segmentName || "bronze")) return false;
        }

        // 检查订阅要求
        if (rules.subscriptionRequired && !player.isSubscribed) return false;

        return true;
    }

    /**
     * 检查模板任务是否已完成且在有效期内
     */
    private static async isTemplateCompletedInValidPeriod(ctx: any, uid: string, templateId: string, template: TaskTemplate): Promise<boolean> {
        const completedTasks = await ctx.db.query("task_completed")
            .withIndex("by_uid_templateId", (q: any) => q.eq("uid", uid).eq("templateId", templateId))
            .collect();

        if (completedTasks.length === 0) return false;

        // 检查是否有在有效期内的已完成任务
        const now = getTorontoMidnight();
        for (const task of completedTasks) {
            const completedAt = new Date(task.completedAt);
            const taskAge = now.localDate.getTime() - completedAt.getTime();
            const daysDiff = taskAge / (1000 * 60 * 60 * 24);

            // 根据任务类型判断是否在有效期内
            let isValidPeriod = false;
            switch (template.type) {
                case "daily":
                    isValidPeriod = daysDiff < 1; // 1天内有效
                    break;
                case "weekly":
                    isValidPeriod = daysDiff < 7; // 7天内有效
                    break;
                case "monthly":
                    isValidPeriod = daysDiff < 30; // 30天内有效
                    break;
                case "season":
                    // 赛季任务需要检查是否在当前赛季内完成过
                    // 这里需要获取当前赛季ID，暂时使用简单的日期判断
                    const currentSeasonStart = new Date(now.localDate.getFullYear(), Math.floor(now.localDate.getMonth() / 3) * 3, 1);
                    const completedAt = new Date(task.completedAt);
                    isValidPeriod = completedAt >= currentSeasonStart;
                    break;
                default:
                    // one_time, achievement 等任务一旦完成就永久有效，不能重复完成
                    return true;
            }

            if (isValidPeriod) return true;
        }

        return false;
    }

    /**
     * 获取初始进度
     */
    private static getInitialProgress(condition: TaskCondition): TaskProgress {
        switch (condition.type) {
            case "simple":
                return { currentValue: 0 };
            case "multi_stage":
                return {
                    currentValue: 0,
                    stageProgress: new Array(condition.stages?.length || 0).fill(0)
                };
            case "conditional":
                return {
                    currentValue: 0,
                    subProgress: {}
                };
            case "time_based":
                return {
                    currentValue: 0,
                    timeProgress: {
                        startTime: new Date().toISOString(),
                        endTime: new Date(Date.now() + (condition.withinDays || 1) * 24 * 60 * 60 * 1000).toISOString(),
                        currentTime: new Date().toISOString()
                    }
                };
            default:
                return { currentValue: 0 };
        }
    }

    /**
     * 计算任务过期时间
     */
    private static calculateTaskDueTime(taskType: string, now: any): string | undefined {
        const dueTime = new Date(now.localDate);

        switch (taskType) {
            case "daily":
                dueTime.setDate(dueTime.getDate() + 1); // 每日任务，过期时间为明天
                break;
            case "weekly":
                dueTime.setDate(dueTime.getDate() + 7); // 每周任务，过期时间为7天后
                break;
            case "monthly":
                dueTime.setMonth(dueTime.getMonth() + 1); // 每月任务，过期时间为下个月
                dueTime.setDate(1); // 设置为下个月1日
                break;
            case "one_time":
            case "achievement":
            case "season":
            case "multi_stage":
            case "conditional":
            case "time_based":
                // 一次性任务和成就任务没有固定过期时间
                return undefined;
            default:
                return undefined;
        }

        return dueTime.toISOString();
    }

    /**
     * 检查任务动作是否匹配
     */
    private static isTaskActionMatch(task: PlayerTask, action: string, actionData: any, gameType?: string): boolean {
        const condition = task.condition;

        // 检查动作是否匹配
        if (condition.action && condition.action !== action) {
            return false;
        }

        // 检查游戏类型是否匹配
        if (condition.gameType && gameType && condition.gameType !== gameType) {
            return false;
        }

        return true;
    }

    /**
     * 更新任务进度
     */
    private static updateTaskProgress(task: PlayerTask, action: string, actionData: any): TaskProgress {
        const condition = task.condition;
        const currentProgress = task.progress;

        switch (condition.type) {
            case "simple":
                return {
                    ...currentProgress,
                    currentValue: (currentProgress.currentValue || 0) + (actionData.increment || 1)
                };

            case "multi_stage":
                return this.updateMultiStageProgress(currentProgress, action, actionData, condition);

            case "conditional":
                return this.updateConditionalProgress(currentProgress, action, actionData, condition);

            case "time_based":
                return this.updateTimeBasedProgress(currentProgress, action, actionData, condition);

            default:
                return currentProgress;
        }
    }

    /**
     * 更新多阶段进度
     */
    private static updateMultiStageProgress(progress: TaskProgress, action: string, actionData: any, taskCondition: TaskCondition): TaskProgress {
        const stageProgress = progress.stageProgress || [];

        if (!taskCondition.stages || taskCondition.stages.length === 0) {
            return progress;
        }

        // 找到当前应该处理的阶段（第一个未完成的阶段）
        let currentStageIndex = -1;
        for (let i = 0; i < taskCondition.stages.length; i++) {
            const stageProgressValue = stageProgress[i] || 0;
            const stageTarget = taskCondition.stages[i].targetValue;

            if (stageProgressValue < stageTarget) {
                currentStageIndex = i;
                break;
            }
        }

        // 如果所有阶段都完成了，不更新进度
        if (currentStageIndex === -1) {
            return progress;
        }

        // 检查当前事件是否匹配当前阶段需要的action
        const currentStage = taskCondition.stages[currentStageIndex];
        if (currentStage.action !== action) {
            return progress;
        }

        console.log("updateMultiStageProgress", currentStageIndex, action, actionData);

        // 更新当前阶段的进度
        const newStageProgress = [...stageProgress];
        newStageProgress[currentStageIndex] = (newStageProgress[currentStageIndex] || 0) + (actionData.increment || 1);

        return {
            ...progress,
            stageProgress: newStageProgress,
            currentValue: newStageProgress.reduce((sum, value) => sum + value, 0)
        };
    }

    /**
     * 更新条件进度
     */
    private static updateConditionalProgress(progress: TaskProgress, action: string, actionData: any, taskCondition: TaskCondition): TaskProgress {
        const subProgress = progress.subProgress || {};

        // 检查当前action是否匹配任何子条件
        if (!taskCondition.subConditions) {
            return progress;
        }

        const matchingSubCondition = taskCondition.subConditions.find(subCondition =>
            subCondition.action === action
        );

        if (!matchingSubCondition) {
            return progress;
        }

        // 更新匹配的子条件进度
        const newSubProgress = {
            ...subProgress,
            [action]: (subProgress[action] || 0) + (actionData.increment || 1)
        };

        // 计算总的currentValue（所有子条件进度的总和）
        const totalProgress = Object.values(newSubProgress).reduce((sum, value) => sum + (value || 0), 0);

        return {
            ...progress,
            subProgress: newSubProgress,
            currentValue: totalProgress
        };
    }

    /**
     * 更新时间进度
     */
    private static updateTimeBasedProgress(progress: TaskProgress, action: string, actionData: any, taskCondition: TaskCondition): TaskProgress {
        // 检查当前action是否匹配任务条件
        if (taskCondition.action && taskCondition.action !== action) {
            return progress;
        }

        // 检查时间窗口
        const now = new Date();
        const timeProgress = progress.timeProgress;

        if (timeProgress) {
            const startTime = new Date(timeProgress.startTime);
            const endTime = new Date(timeProgress.endTime);

            // 如果当前时间超出时间窗口，不更新进度
            if (now < startTime || now > endTime) {
                return progress;
            }
        }

        return {
            ...progress,
            currentValue: (progress.currentValue || 0) + (actionData.increment || 1),
            timeProgress: {
                startTime: progress.timeProgress?.startTime || new Date().toISOString(),
                endTime: progress.timeProgress?.endTime || new Date().toISOString(),
                currentTime: now.toISOString()
            }
        };
    }

    /**
     * 检查任务是否完成
     */
    private static checkTaskCompletion(task: PlayerTask, progress: TaskProgress): boolean {
        const condition = task.condition;

        switch (condition.type) {
            case "simple":
                return (progress.currentValue || 0) >= (condition.targetValue || 0);

            case "multi_stage":
                return this.checkMultiStageCompletion(progress, condition);

            case "conditional":
                return this.checkConditionalCompletion(progress, condition);

            case "time_based":
                return this.checkTimeBasedCompletion(progress, condition);

            default:
                return false;
        }
    }

    /**
     * 检查多阶段任务完成
     */
    private static checkMultiStageCompletion(progress: TaskProgress, condition: TaskCondition): boolean {
        if (!condition.stages || !progress.stageProgress) return false;

        return condition.stages.every((stage, index) => {
            const stageProgress = progress.stageProgress![index] || 0;
            return stageProgress >= stage.targetValue;
        });
    }

    /**
     * 检查条件任务完成
     */
    private static checkConditionalCompletion(progress: TaskProgress, condition: TaskCondition): boolean {
        if (!condition.subConditions || !progress.subProgress) return false;

        if (condition.logic === "and") {
            return condition.subConditions.every(subCondition => {
                const subProgress = progress.subProgress![subCondition.action || ""] || 0;
                return subProgress >= (subCondition.targetValue || 0);
            });
        } else {
            // "or" logic
            return condition.subConditions.some(subCondition => {
                const subProgress = progress.subProgress![subCondition.action || ""] || 0;
                return subProgress >= (subCondition.targetValue || 0);
            });
        }
    }

    /**
     * 检查时间任务完成
     */
    private static checkTimeBasedCompletion(progress: TaskProgress, condition: TaskCondition): boolean {
        const currentValue = progress.currentValue || 0;
        const targetValue = condition.targetValue || 0;

        if (currentValue >= targetValue) return true;

        // 检查是否超时
        if (progress.timeProgress) {
            const currentTime = new Date(progress.timeProgress.currentTime);
            const endTime = new Date(progress.timeProgress.endTime);
            return currentTime > endTime;
        }

        return false;
    }

    /**
     * 发放奖励
     */
    private static async grantRewards(ctx: any, uid: string, rewards: TaskRewards): Promise<{ success: boolean; message: string }> {
        const now = getTorontoMidnight();

        // 发放金币
        if (rewards.coins && rewards.coins > 0) {
            const player = await ctx.db.query("players")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .unique();

            if (player) {
                await ctx.db.patch(player._id, {
                    coins: player.coins + rewards.coins
                });
            }
        }

        // 发放道具
        if (rewards.props && rewards.props.length > 0) {
            for (const prop of rewards.props) {
                // 这里应该调用道具系统的发放接口
                console.log(`发放道具: ${prop.propType} x${prop.quantity}`);
            }
        }

        // 发放门票
        if (rewards.tickets && rewards.tickets.length > 0) {
            for (const ticket of rewards.tickets) {
                try {
                    await TicketSystem.grantTicketReward(ctx, {
                        uid,
                        type: ticket.type,
                        quantity: ticket.quantity
                    });
                    console.log(`成功发放门票: ${ticket.type} x${ticket.quantity}`);
                } catch (error) {
                    console.error(`发放门票失败: ${ticket.type}`, error);
                }
            }
        }

        // 发放赛季点
        if (rewards.seasonPoints && rewards.seasonPoints > 0) {
            // 这里应该调用赛季系统的发放接口
            console.log(`发放赛季点: ${rewards.seasonPoints}`);
        }

        // 发放游戏积分
        // if (rewards.gamePoints) {
        //     // 这里应该调用积分系统的发放接口
        //     console.log(`发放游戏积分: ${rewards.gamePoints.general}`);
        // }

        return {
            success: true,
            message: "奖励发放成功"
        };
    }
    static async loadConfig(ctx: any) {
        const preconfigs = await ctx.db.query("task_templates").collect();

        preconfigs.forEach(async (preconfig: any) => {
            await ctx.db.delete(preconfig._id);
        });

        console.log("loadConfig,TASK_TEMPLATES", TASK_TEMPLATES.length)
        TASK_TEMPLATES.forEach(async (taskTemplate) => {
            await ctx.db.insert("task_templates", { ...taskTemplate, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        });

    }
}

export const loadConfig = (internalMutation as any)({
    args: {},
    handler: async (ctx: any, args: any) => {
        const result = await TaskSystem.loadConfig(ctx);
        return result;
    },
});