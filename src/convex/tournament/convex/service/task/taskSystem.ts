import { getTorontoMidnight } from "../simpleTimezoneUtils";

// ============================================================================
// 任务系统核心服务 - 支持多种奖励类型
// ============================================================================

export interface TaskTemplate {
    templateId: string;
    name: string;
    description: string;
    type: "daily" | "weekly" | "one_time" | "achievement" | "season" | "monthly" | "multi_stage" | "conditional" | "time_based";
    category: "gameplay" | "social" | "collection" | "challenge" | "tournament" | "achievement";
    gameType?: string; // 特定游戏类型
    condition: TaskCondition;
    rewards: TaskRewards;
    resetInterval?: string; // "daily", "weekly", "monthly", "never"
    maxCompletions?: number; // 最大完成次数
    isActive: boolean;
    validFrom?: string;
    validUntil?: string;
    allocationRules?: TaskAllocationRules;
    version?: string; // 任务模板版本
    lastUpdated?: string; // 最后更新时间
}

export interface TaskCondition {
    type: "simple" | "multi_stage" | "conditional" | "time_based";
    action?: string; // "login", "complete_match", "win_match", "use_prop", etc.
    targetValue?: number;
    gameType?: string;
    consecutive?: boolean; // 连续完成
    withinDays?: number; // 在指定天数内完成
    subConditions?: TaskCondition[]; // 用于条件组合
    logic?: "and" | "or"; // 条件组合逻辑
    stages?: TaskStage[]; // 多阶段任务
}

export interface TaskStage {
    action: string;
    targetValue: number;
    reward: Partial<TaskRewards>; // 阶段性奖励
    gameType?: string;
}

export interface TaskRewards {
    coins: number;
    props: TaskProp[];
    tickets: TaskTicket[];
    seasonPoints: number;
    gamePoints: {
        general: number;
        specific?: { gameType: string; points: number };
    };
}

export interface TaskProp {
    gameType: string;
    propType: string;
    quantity: number;
    propId?: string;
}

export interface TaskTicket {
    gameType: string;
    tournamentType: string;
    quantity: number;
    templateId?: string;
}

export interface TaskAllocationRules {
    playerLevel?: { min: number; max: number };
    segmentName?: string[]; // 段位限制
    gamePreferences?: string[]; // 游戏偏好
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
    isCompleted: boolean;
    completedAt?: string;
    rewardsClaimed: boolean;
    claimedAt?: string;
    completions: number; // 完成次数
    lastReset?: string;
    rewards: TaskRewards;
    version?: string; // 任务模板版本
    createdAt: string;
    updatedAt: string;
}

export interface TaskProgress {
    currentValue: number;
    stageProgress?: number[]; // 多阶段进度
    subProgress?: { [key: string]: number }; // 子条件进度
    consecutiveDays?: number; // 连续天数
    lastActionDate?: string; // 最后行动日期
    timeProgress?: { [key: string]: number }; // 时间相关进度
}

export interface TaskEvent {
    uid: string;
    action: string;
    actionData: any;
    gameType?: string;
    tournamentId?: string;
    matchId?: string;
    processed: boolean;
    createdAt: string;
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
     * 根据类型获取任务模板
     */
    static async getTaskTemplatesByType(ctx: any, type: string): Promise<TaskTemplate[]> {
        const templates = await ctx.db.query("task_templates")
            .filter((q: any) => q.eq(q.field("type"), type))
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
            .filter((q: any) => q.eq(q.field("isActive"), true))
            .collect();

        return templates.filter((template: any) =>
            !template.gameType || template.gameType === gameType
        ).map((template: any) => ({
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
    // 玩家任务管理
    // ============================================================================

    /**
     * 获取玩家所有任务
     */
    static async getPlayerTasks(ctx: any, uid: string): Promise<PlayerTask[]> {
        const playerTasks = await ctx.db.query("player_tasks")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .collect();

        return playerTasks.map((task: any) => ({
            uid: task.uid,
            taskId: task.taskId,
            templateId: task.templateId,
            name: task.name,
            description: task.description,
            type: task.type,
            category: task.category,
            condition: task.condition,
            progress: task.progress,
            isCompleted: task.isCompleted,
            completedAt: task.completedAt,
            rewardsClaimed: task.rewardsClaimed,
            claimedAt: task.claimedAt,
            completions: task.completions,
            lastReset: task.lastReset,
            rewards: task.rewards,
            version: task.version,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt
        }));
    }

    /**
     * 获取玩家特定任务
     */
    static async getPlayerTask(ctx: any, uid: string, taskId: string): Promise<PlayerTask | null> {
        const playerTasks = await ctx.db.query("player_tasks")
            .withIndex("by_uid_taskId", (q: any) => q.eq("uid", uid).eq("taskId", taskId))
            .collect();

        if (playerTasks.length === 0) return null;

        const task = playerTasks[0];
        return {
            uid: task.uid,
            taskId: task.taskId,
            templateId: task.templateId,
            name: task.name,
            description: task.description,
            type: task.type,
            category: task.category,
            condition: task.condition,
            progress: task.progress,
            isCompleted: task.isCompleted,
            completedAt: task.completedAt,
            rewardsClaimed: task.rewardsClaimed,
            claimedAt: task.claimedAt,
            completions: task.completions,
            lastReset: task.lastReset,
            rewards: task.rewards,
            version: task.version,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt
        };
    }

    /**
     * 获取玩家未完成任务
     */
    static async getPlayerIncompleteTasks(ctx: any, uid: string): Promise<PlayerTask[]> {
        const playerTasks = await ctx.db.query("player_tasks")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .filter((q: any) => q.eq(q.field("isCompleted"), false))
            .collect();

        return playerTasks.map((task: any) => ({
            uid: task.uid,
            taskId: task.taskId,
            templateId: task.templateId,
            name: task.name,
            description: task.description,
            type: task.type,
            category: task.category,
            condition: task.condition,
            progress: task.progress,
            isCompleted: task.isCompleted,
            completedAt: task.completedAt,
            rewardsClaimed: task.rewardsClaimed,
            claimedAt: task.claimedAt,
            completions: task.completions,
            lastReset: task.lastReset,
            rewards: task.rewards,
            version: task.version,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt
        }));
    }

    /**
     * 获取玩家已完成但未领取奖励的任务
     */
    static async getPlayerCompletedUnclaimedTasks(ctx: any, uid: string): Promise<PlayerTask[]> {
        const playerTasks = await ctx.db.query("player_tasks")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .filter((q: any) => q.eq(q.field("isCompleted"), true))
            .filter((q: any) => q.eq(q.field("rewardsClaimed"), false))
            .collect();

        return playerTasks.map((task: any) => ({
            uid: task.uid,
            taskId: task.taskId,
            templateId: task.templateId,
            name: task.name,
            description: task.description,
            type: task.type,
            category: task.category,
            condition: task.condition,
            progress: task.progress,
            isCompleted: task.isCompleted,
            completedAt: task.completedAt,
            rewardsClaimed: task.rewardsClaimed,
            claimedAt: task.claimedAt,
            completions: task.completions,
            lastReset: task.lastReset,
            rewards: task.rewards,
            version: task.version,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt
        }));
    }

    /**
     * 根据模板ID获取玩家任务
     */
    static async getPlayerTaskByTemplateId(ctx: any, uid: string, templateId: string): Promise<PlayerTask | null> {
        const playerTasks = await ctx.db.query("player_tasks")
            .withIndex("by_uid_templateId", (q: any) => q.eq("uid", uid).eq("templateId", templateId))
            .collect();

        if (playerTasks.length === 0) return null;

        const task = playerTasks[0];
        return {
            uid: task.uid,
            taskId: task.taskId,
            templateId: task.templateId,
            name: task.name,
            description: task.description,
            type: task.type,
            category: task.category,
            condition: task.condition,
            progress: task.progress,
            isCompleted: task.isCompleted,
            completedAt: task.completedAt,
            rewardsClaimed: task.rewardsClaimed,
            claimedAt: task.claimedAt,
            completions: task.completions,
            lastReset: task.lastReset,
            rewards: task.rewards,
            version: task.version,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt
        };
    }

    // ============================================================================
    // 任务分配和创建
    // ============================================================================

    /**
     * 为玩家分配任务
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

            // 使用智能分配检查
            const allocationCheck = await this.shouldAllocateTask(ctx, uid, template);
            if (!allocationCheck.shouldAllocate) {
                continue;
            }

            // 创建任务
            const taskId = `${uid}_${template.templateId}_${now.iso}`;
            const initialProgress = this.getInitialProgress(template.condition);

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
                isCompleted: false,
                rewardsClaimed: false,
                completions: 0,
                rewards: template.rewards,
                createdAt: now.iso,
                updatedAt: now.iso
            });

            allocatedTasks.push(taskId);
        }

        return {
            success: true,
            message: `成功分配 ${allocatedTasks.length} 个任务`,
            allocatedTasks
        };
    }

    /**
     * 重新分配每日和每周任务
     */
    static async reallocatePeriodicTasks(ctx: any, uid: string): Promise<{ success: boolean; message: string; reallocatedTasks?: string[] }> {
        const now = getTorontoMidnight();
        const reallocatedTasks: string[] = [];

        // 获取玩家的现有任务
        const existingTasks = await this.getPlayerTasks(ctx, uid);

        // 按模板ID分组，找出需要重新分配的任务
        const tasksByTemplate = new Map<string, PlayerTask>();
        for (const task of existingTasks) {
            if (task.type === "daily" || task.type === "weekly") {
                tasksByTemplate.set(task.templateId, task);
            }
        }

        // 获取所有活跃任务模板
        const templates = await this.getAllTaskTemplates(ctx);

        for (const template of templates) {
            // 只处理 daily 和 weekly 任务
            if (template.type !== "daily" && template.type !== "weekly") {
                continue;
            }

            // 检查分配规则
            const player = await ctx.db.query("players")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .unique();

            if (!player || !this.checkAllocationRules(template.allocationRules, player)) {
                continue;
            }

            // 检查有效期
            if (template.validFrom && now.iso < template.validFrom) {
                continue;
            }
            if (template.validUntil && now.iso > template.validUntil) {
                continue;
            }

            const existingTask = tasksByTemplate.get(template.templateId);

            if (existingTask) {
                // 检查是否需要重新分配
                const shouldReallocate = await this.shouldReallocateTask(ctx, existingTask, template.type);
                if (!shouldReallocate) {
                    continue;
                }
            }

            // 创建新的玩家任务
            const taskId = `${uid}_${template.templateId}_${now.iso}`;
            await ctx.db.insert("player_tasks", {
                uid,
                taskId,
                templateId: template.templateId,
                name: template.name,
                description: template.description,
                type: template.type,
                category: template.category,
                condition: template.condition,
                progress: this.getInitialProgress(template.condition),
                isCompleted: false,
                rewardsClaimed: false,
                completions: 0,
                rewards: template.rewards,
                createdAt: now.iso,
                updatedAt: now.iso
            });

            reallocatedTasks.push(taskId);
        }

        return {
            success: true,
            message: `重新分配了 ${reallocatedTasks.length} 个周期性任务`,
            reallocatedTasks
        };
    }

    /**
     * 检查分配规则
     */
    private static checkAllocationRules(rules: TaskAllocationRules | undefined, player: any): boolean {
        if (!rules) return true;

        // 检查段位限制
        if (rules.segmentName && !rules.segmentName.includes(player.segmentName)) {
            return false;
        }

        // 检查订阅要求
        if (rules.subscriptionRequired && !player.isSubscribed) {
            return false;
        }

        // 检查游戏偏好
        if (rules.gamePreferences && player.gamePreferences) {
            const hasMatchingPreference = rules.gamePreferences.some(pref =>
                player.gamePreferences.includes(pref)
            );
            if (!hasMatchingPreference) {
                return false;
            }
        }

        return true;
    }

    /**
     * 获取初始进度
     */
    private static getInitialProgress(condition: TaskCondition): TaskProgress {
        const progress: TaskProgress = {
            currentValue: 0
        };

        if (condition.type === "multi_stage" && condition.stages) {
            progress.stageProgress = new Array(condition.stages.length).fill(0);
        }

        if (condition.type === "conditional" && condition.subConditions) {
            progress.subProgress = {};
            condition.subConditions.forEach((_, index) => {
                progress.subProgress![`sub_${index}`] = 0;
            });
        }

        if (condition.type === "time_based") {
            progress.timeProgress = {};
            progress.consecutiveDays = 0;
        }

        return progress;
    }

    /**
     * 检查是否需要重新分配任务
     */
    private static async shouldReallocateTask(ctx: any, existingTask: PlayerTask, taskType: string): Promise<boolean> {
        const now = getTorontoMidnight();

        // 如果任务未完成，不需要重新分配
        if (!existingTask.isCompleted) {
            return false;
        }

        // 检查重置间隔
        if (existingTask.lastReset) {
            const lastReset = new Date(existingTask.lastReset);
            const timeDiff = now.localDate.getTime() - lastReset.getTime();
            const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

            switch (taskType) {
                case "daily":
                    return daysDiff >= 1; // 每日任务，1天后重新分配
                case "weekly":
                    return daysDiff >= 7; // 每周任务，7天后重新分配
                default:
                    return false;
            }
        }

        // 如果没有重置记录，说明是首次重置，允许重新分配
        return true;
    }

    /**
     * 根据时间范围获取任务开始时间
     * 参考 tournament 的 getPlayerAttempts 机制
     */
    private static getTaskStartTime(taskType: string): string {
        const now = getTorontoMidnight();

        switch (taskType) {
            case "daily":
                return now.localDate.toISOString().split("T")[0] + "T00:00:00.000Z";
            case "weekly":
                const weekStart = new Date(now.localDate);
                weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                weekStart.setHours(0, 0, 0, 0);
                return weekStart.toISOString();
            case "season":
                // 获取当前赛季开始时间，这里简化处理
                const seasonStart = new Date(now.localDate);
                seasonStart.setMonth(0, 1); // 1月1日
                seasonStart.setHours(0, 0, 0, 0);
                return seasonStart.toISOString();
            case "monthly":
                const monthStart = new Date(now.localDate);
                monthStart.setDate(1);
                monthStart.setHours(0, 0, 0, 0);
                return monthStart.toISOString();
            default:
                return "1970-01-01T00:00:00.000Z"; // 一次性任务
        }
    }

    /**
     * 检查任务是否在当前周期内已存在
     * 参考 tournament 的机制
     */
    private static async checkTaskExistsInCurrentPeriod(ctx: any, uid: string, templateId: string, taskType: string): Promise<boolean> {
        const startTime = this.getTaskStartTime(taskType);

        // 查询当前周期内的任务
        const existingTasks = await ctx.db.query("player_tasks")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .filter((q: any) => q.eq(q.field("templateId"), templateId))
            .filter((q: any) => q.eq(q.field("type"), taskType))
            .filter((q: any) => q.gte(q.field("createdAt"), startTime))
            .collect();

        return existingTasks.length > 0;
    }

    /**
     * 智能任务分配检查
     * 参考 tournament 的机制处理不同类型的任务
     */
    private static async shouldAllocateTask(ctx: any, uid: string, template: TaskTemplate): Promise<{ shouldAllocate: boolean; reason: string }> {
        // 一次性任务：检查是否已存在
        if (template.type === "one_time" || template.type === "achievement") {
            const existingTask = await this.getPlayerTaskByTemplateId(ctx, uid, template.templateId);
            if (existingTask) {
                return { shouldAllocate: false, reason: "一次性任务已存在" };
            }
            return { shouldAllocate: true, reason: "一次性任务需要分配" };
        }

        // 周期性任务：检查当前周期是否已存在
        if (template.type === "daily" || template.type === "weekly" || template.type === "season" || template.type === "monthly") {
            const existsInCurrentPeriod = await this.checkTaskExistsInCurrentPeriod(ctx, uid, template.templateId, template.type);
            if (existsInCurrentPeriod) {
                return { shouldAllocate: false, reason: `${template.type}任务在当前周期已存在` };
            }
            return { shouldAllocate: true, reason: `${template.type}任务需要分配` };
        }

        // 其他类型任务：默认分配
        return { shouldAllocate: true, reason: "默认分配" };
    }

    // ============================================================================
    // 任务进度更新
    // ============================================================================

    /**
     * 处理任务事件
     */
    static async processTaskEvent(ctx: any, params: {
        uid: string;
        action: string;
        actionData: any;
        gameType?: string;
        tournamentId?: string;
        matchId?: string;
    }): Promise<{ success: boolean; message: string; updatedTasks?: string[] }> {
        const { uid, action, actionData, gameType, tournamentId, matchId } = params;
        const now = getTorontoMidnight();
        const updatedTasks: string[] = [];

        // 记录事件
        const eventRecord = await ctx.db.insert("task_events", {
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

        try {
            // 获取玩家未完成任务
            const incompleteTasks = await this.getPlayerIncompleteTasks(ctx, uid);

            for (const task of incompleteTasks) {
                // 检查事件是否适用于任务
                if (!this.isEventApplicableToTask(task, action, actionData, gameType)) {
                    continue;
                }

                // 更新任务进度
                const newProgress = await this.updateTaskProgress(ctx, task, action, actionData, gameType);

                // 检查任务是否完成
                const isCompleted = this.checkTaskCompletion(task, newProgress);

                if (isCompleted) {
                    // 记录完成前的状态
                    const oldState = {
                        isCompleted: task.isCompleted,
                        completedAt: task.completedAt,
                        progress: task.progress,
                        completions: task.completions
                    };

                    // 标记任务完成
                    const taskRecord = await ctx.db.query("player_tasks")
                        .withIndex("by_uid_taskId", (q: any) => q.eq("uid", uid).eq("taskId", task.taskId))
                        .unique();

                    const newState = {
                        isCompleted: true,
                        completedAt: now.iso,
                        progress: newProgress,
                        completions: task.completions + 1, // 增加完成次数
                        updatedAt: now.iso
                    };

                    await ctx.db.patch(taskRecord._id, newState);

                    // 记录任务完成历史
                    await this.recordTaskHistory(ctx, {
                        uid,
                        taskId: task.taskId,
                        templateId: task.templateId,
                        action: "completed",
                        oldState,
                        newState,
                        metadata: {
                            completedAt: now.iso,
                            action,
                            actionData
                        }
                    });

                    updatedTasks.push(task.taskId);
                } else {
                    // 更新进度
                    const taskRecord = await ctx.db.query("player_tasks")
                        .withIndex("by_uid_taskId", (q: any) => q.eq("uid", uid).eq("taskId", task.taskId))
                        .unique();

                    const oldState = { progress: task.progress };
                    const newState = { progress: newProgress, updatedAt: now.iso };

                    await ctx.db.patch(taskRecord._id, newState);

                    // 记录进度更新历史
                    await this.recordTaskHistory(ctx, {
                        uid,
                        taskId: task.taskId,
                        templateId: task.templateId,
                        action: "progress_updated",
                        oldState,
                        newState,
                        metadata: {
                            action,
                            actionData,
                            updatedAt: now.iso
                        }
                    });
                }
            }

            // 标记事件为已处理
            await ctx.db.patch(eventRecord, {
                processed: true,
                updatedAt: now.iso
            });

            return {
                success: true,
                message: `事件处理完成，更新了 ${updatedTasks.length} 个任务`,
                updatedTasks
            };

        } catch (error) {
            // 如果处理失败，记录错误信息
            await ctx.db.patch(eventRecord, {
                processed: false,
                error: error instanceof Error ? error.message : String(error),
                updatedAt: now.iso
            });

            throw error;
        }
    }

    /**
     * 批量处理未处理的事件
     */
    static async processUnprocessedEvents(ctx: any, uid?: string): Promise<{
        success: boolean;
        message: string;
        processedCount?: number;
        errorCount?: number;
        errors?: any[];
    }> {
        const now = getTorontoMidnight();
        let processedCount = 0;
        let errorCount = 0;
        const errors: any[] = [];

        // 查询未处理的事件
        let query = ctx.db.query("task_events")
            .withIndex("by_processed", (q: any) => q.eq("processed", false));

        if (uid) {
            query = query.withIndex("by_uid", (q: any) => q.eq("uid", uid));
        }

        const unprocessedEvents = await query.collect();

        for (const event of unprocessedEvents) {
            try {
                // 处理单个事件
                const result = await this.processTaskEvent(ctx, {
                    uid: event.uid,
                    action: event.action,
                    actionData: event.actionData,
                    gameType: event.gameType,
                    tournamentId: event.tournamentId,
                    matchId: event.matchId
                });

                if (result.success) {
                    processedCount++;
                } else {
                    errorCount++;
                    errors.push({
                        eventId: event._id,
                        error: result.message
                    });
                }

            } catch (error) {
                errorCount++;
                errors.push({
                    eventId: event._id,
                    error: error instanceof Error ? error.message : String(error)
                });

                // 标记事件为处理失败
                await ctx.db.patch(event._id, {
                    processed: false,
                    error: error instanceof Error ? error.message : String(error),
                    updatedAt: now.iso
                });
            }
        }

        return {
            success: true,
            message: `批量处理完成，成功处理 ${processedCount} 个事件，失败 ${errorCount} 个事件`,
            processedCount,
            errorCount,
            errors
        };
    }

    /**
     * 获取未处理事件统计
     */
    static async getUnprocessedEventsStats(ctx: any): Promise<{
        totalCount: number;
        byAction: { [key: string]: number };
        byUid: { [key: string]: number };
    }> {
        const unprocessedEvents = await ctx.db.query("task_events")
            .withIndex("by_processed", (q: any) => q.eq("processed", false))
            .collect();

        const byAction: { [key: string]: number } = {};
        const byUid: { [key: string]: number } = {};

        for (const event of unprocessedEvents) {
            // 按动作统计
            byAction[event.action] = (byAction[event.action] || 0) + 1;

            // 按用户统计
            byUid[event.uid] = (byUid[event.uid] || 0) + 1;
        }

        return {
            totalCount: unprocessedEvents.length,
            byAction,
            byUid
        };
    }

    /**
     * 检查事件是否适用于任务
     */
    private static isEventApplicableToTask(task: PlayerTask, action: string, actionData: any, gameType?: string): boolean {
        const condition = task.condition;

        // 检查游戏类型匹配
        if (condition.gameType && gameType && condition.gameType !== gameType) {
            return false;
        }

        // 检查动作匹配
        if (condition.action && condition.action !== action) {
            return false;
        }

        return true;
    }

    /**
     * 更新任务进度
     */
    private static async updateTaskProgress(ctx: any, task: PlayerTask, action: string, actionData: any, gameType?: string): Promise<TaskProgress> {
        const condition = task.condition;
        const progress = task.progress;

        switch (condition.type) {
            case "simple":
                return this.updateSimpleProgress(progress, actionData);
            case "multi_stage":
                return this.updateMultiStageProgress(progress, condition, action, actionData);
            case "conditional":
                return this.updateConditionalProgress(progress, condition, action, actionData);
            case "time_based":
                return this.updateTimeBasedProgress(progress, condition, action, actionData);
            default:
                return progress;
        }
    }

    /**
     * 更新简单任务进度
     */
    private static updateSimpleProgress(progress: TaskProgress, actionData: any): TaskProgress {
        const increment = this.calculateIncrement(actionData);
        return {
            ...progress,
            currentValue: progress.currentValue + increment
        };
    }

    /**
     * 更新多阶段任务进度
     */
    private static updateMultiStageProgress(progress: TaskProgress, condition: TaskCondition, action: string, actionData: any): TaskProgress {
        if (!condition.stages || !progress.stageProgress) {
            return progress;
        }

        // 修复：正确判断当前阶段
        const currentStage = progress.stageProgress.findIndex((p, index) =>
            p < condition.stages![index].targetValue
        );

        if (currentStage === -1) {
            return progress; // 所有阶段都已完成
        }

        const stage = condition.stages![currentStage];
        if (stage.action === action) {
            const newStageProgress = [...progress.stageProgress];
            const oldValue = newStageProgress[currentStage];
            newStageProgress[currentStage] += this.calculateIncrement(actionData);

            // 检查是否完成当前阶段
            if (oldValue < stage.targetValue && newStageProgress[currentStage] >= stage.targetValue) {
                // 阶段性奖励发放逻辑可以在这里添加
                console.log(`阶段 ${currentStage + 1} 完成！`);
            }

            return {
                ...progress,
                stageProgress: newStageProgress
            };
        }

        return progress;
    }

    /**
     * 更新条件组合任务进度
     */
    private static updateConditionalProgress(progress: TaskProgress, condition: TaskCondition, action: string, actionData: any): TaskProgress {
        if (!condition.subConditions || !progress.subProgress) {
            return progress;
        }

        const newSubProgress = { ...progress.subProgress };

        condition.subConditions.forEach((subCondition, index) => {
            if (subCondition.action && subCondition.action === action) {
                const key = `sub_${index}`;
                newSubProgress[key] = (newSubProgress[key] || 0) + this.calculateIncrement(actionData);
            }
        });

        return {
            ...progress,
            subProgress: newSubProgress
        };
    }

    /**
     * 更新时间相关任务进度
     */
    private static updateTimeBasedProgress(progress: TaskProgress, condition: TaskCondition, action: string, actionData: any): TaskProgress {
        const now = getTorontoMidnight();
        const today = now.localDate.toISOString().split('T')[0];

        let newProgress = { ...progress };
        newProgress.timeProgress = newProgress.timeProgress || {};
        newProgress.lastActionDate = today;

        // 更新连续天数
        if (condition.consecutive) {
            const lastDate = progress.lastActionDate;
            if (lastDate) {
                const lastDateObj = new Date(lastDate);
                const todayObj = new Date(today);
                const diffDays = Math.floor((todayObj.getTime() - lastDateObj.getTime()) / (1000 * 60 * 60 * 24));

                if (diffDays === 1) {
                    newProgress.consecutiveDays = (progress.consecutiveDays || 0) + 1;
                } else if (diffDays > 1) {
                    newProgress.consecutiveDays = 1;
                } else {
                    newProgress.consecutiveDays = progress.consecutiveDays || 0;
                }
            } else {
                newProgress.consecutiveDays = 1;
            }
        }

        // 更新时间窗口内的进度
        if (condition.withinDays && condition.action) {
            const key = `${condition.action}_${condition.withinDays}`;
            newProgress.timeProgress[key] = (newProgress.timeProgress[key] || 0) + this.calculateIncrement(actionData);
        } else {
            newProgress.currentValue += this.calculateIncrement(actionData);
        }

        return newProgress;
    }

    /**
     * 计算进度增量
     */
    private static calculateIncrement(actionData: any): number {
        if (typeof actionData === 'number') {
            return actionData;
        }
        if (actionData && typeof actionData === 'object') {
            return actionData.increment || actionData.count || 1;
        }
        return 1;
    }

    /**
     * 检查任务完成状态
     */
    private static checkTaskCompletion(task: PlayerTask, newProgress: TaskProgress): boolean {
        const condition = task.condition;

        switch (condition.type) {
            case "simple":
                return newProgress.currentValue >= (condition.targetValue || 0);
            case "multi_stage":
                return this.checkMultiStageCompletion(condition, newProgress);
            case "conditional":
                return this.checkConditionalCompletion(condition, newProgress);
            case "time_based":
                return this.checkTimeBasedCompletion(condition, newProgress);
            default:
                return false;
        }
    }

    /**
     * 检查多阶段任务完成状态
     */
    private static checkMultiStageCompletion(condition: TaskCondition, progress: TaskProgress): boolean {
        if (!condition.stages || !progress.stageProgress) {
            return false;
        }

        return progress.stageProgress.every((stageProgress, index) =>
            stageProgress >= condition.stages![index].targetValue
        );
    }

    /**
     * 检查条件组合任务完成状态
     */
    private static checkConditionalCompletion(condition: TaskCondition, progress: TaskProgress): boolean {
        if (!condition.subConditions || !progress.subProgress) {
            return false;
        }

        if (condition.logic === "or") {
            return condition.subConditions.some((subCondition, index) => {
                const key = `sub_${index}`;
                return (progress.subProgress![key] || 0) >= (subCondition.targetValue || 0);
            });
        } else {
            // AND 逻辑
            return condition.subConditions.every((subCondition, index) => {
                const key = `sub_${index}`;
                return (progress.subProgress![key] || 0) >= (subCondition.targetValue || 0);
            });
        }
    }

    /**
     * 检查时间相关任务完成状态
     */
    private static checkTimeBasedCompletion(condition: TaskCondition, progress: TaskProgress): boolean {
        if (condition.consecutive) {
            return (progress.consecutiveDays || 0) >= (condition.targetValue || 0);
        }

        if (condition.withinDays && condition.action) {
            const key = `${condition.action}_${condition.withinDays}`;
            return (progress.timeProgress?.[key] || 0) >= (condition.targetValue || 0);
        }

        return progress.currentValue >= (condition.targetValue || 0);
    }

    // ============================================================================
    // 任务奖励领取
    // ============================================================================

    /**
     * 领取任务奖励
     */
    static async claimTaskRewards(ctx: any, params: {
        uid: string;
        taskId: string;
    }): Promise<{ success: boolean; message: string; rewards?: any }> {
        const { uid, taskId } = params;
        const now = getTorontoMidnight();

        // 获取任务
        const task = await this.getPlayerTask(ctx, uid, taskId);
        if (!task) {
            return { success: false, message: "任务不存在" };
        }

        if (!task.isCompleted) {
            return { success: false, message: "任务尚未完成" };
        }

        if (task.rewardsClaimed) {
            return { success: false, message: "奖励已领取" };
        }

        // 发放奖励
        const rewards = await this.grantTaskRewards(ctx, uid, task.rewards);

        // 标记奖励已领取
        const taskRecord = await ctx.db.query("player_tasks")
            .withIndex("by_uid_taskId", (q: any) => q.eq("uid", uid).eq("taskId", taskId))
            .unique();

        await ctx.db.patch(taskRecord._id, {
            rewardsClaimed: true,
            claimedAt: now.iso,
            updatedAt: now.iso
        });

        // 记录奖励领取历史
        await this.recordTaskHistory(ctx, {
            uid,
            taskId: taskId,
            templateId: task.templateId,
            action: "rewards_claimed",
            oldState: { rewardsClaimed: task.rewardsClaimed },
            newState: { rewardsClaimed: true, claimedAt: now.iso },
            metadata: {
                rewards,
                claimedAt: now.iso
            }
        });

        return {
            success: true,
            message: "奖励领取成功",
            rewards
        };
    }

    /**
     * 发放任务奖励
     */
    private static async grantTaskRewards(ctx: any, uid: string, rewards: TaskRewards): Promise<any> {
        const now = getTorontoMidnight();
        const grantedRewards: any = {};

        // 发放金币
        if (rewards.coins > 0) {
            const player = await ctx.db.query("players")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .unique();

            if (player) {
                await ctx.db.patch(player._id, {
                    coins: player.coins + rewards.coins
                });
                grantedRewards.coins = rewards.coins;
            }
        }

        // 发放道具
        if (rewards.props.length > 0) {
            for (const prop of rewards.props) {
                // 这里需要调用道具系统
                // await PropSystem.grantProp(ctx, { uid, propType: prop.propType, quantity: prop.quantity, gameType: prop.gameType });
                grantedRewards.props = grantedRewards.props || [];
                grantedRewards.props.push(prop);
            }
        }

        // 发放门票
        if (rewards.tickets.length > 0) {
            for (const ticket of rewards.tickets) {
                // 这里需要调用门票系统
                // await TicketSystem.grantTicketReward(ctx, { uid, templateId: ticket.templateId, quantity: ticket.quantity, source: "task" });
                grantedRewards.tickets = grantedRewards.tickets || [];
                grantedRewards.tickets.push(ticket);
            }
        }

        // 发放赛季点
        if (rewards.seasonPoints > 0) {
            // 这里需要调用赛季积分系统
            // await SeasonSystem.addSeasonPoints(ctx, { uid, points: rewards.seasonPoints, source: "task" });
            grantedRewards.seasonPoints = rewards.seasonPoints;
        }

        // 发放游戏积分
        if (rewards.gamePoints.general > 0 || rewards.gamePoints.specific) {
            // 这里需要调用积分转换系统
            // await ConvertPoints.convertPoints(ctx, { uid, source: "task", gamePoints: rewards.gamePoints });
            grantedRewards.gamePoints = rewards.gamePoints;
        }

        return grantedRewards;
    }

    // ============================================================================
    // 任务重置
    // ============================================================================

    /**
     * 重置玩家任务 - 基础版本（已重构为智能重置的包装）
     * @deprecated 建议直接使用 smartResetPlayerTasks
     */
    static async resetPlayerTasks(ctx: any, uid: string, resetType: "daily" | "weekly" | "monthly"): Promise<{ success: boolean; message: string; resetTasks?: string[] }> {
        // 调用智能重置方法，保持向后兼容
        const result = await this.smartResetPlayerTasks(ctx, uid, resetType);

        return {
            success: result.success,
            message: result.message,
            resetTasks: result.resetTasks
        };
    }

    /**
     * 记录任务历史
     */
    private static async recordTaskHistory(ctx: any, params: {
        uid: string;
        taskId: string;
        templateId: string;
        action: string;
        oldState?: any;
        newState?: any;
        metadata?: any;
    }): Promise<void> {
        const { uid, taskId, templateId, action, oldState, newState, metadata } = params;
        const now = getTorontoMidnight();

        await ctx.db.insert("task_history", {
            uid,
            taskId,
            templateId,
            action,
            oldState,
            newState,
            metadata,
            createdAt: now.iso
        });
    }

    /**
     * 智能重置玩家任务 - 改进版本
     */
    static async smartResetPlayerTasks(ctx: any, uid: string, resetType: "daily" | "weekly" | "monthly"): Promise<{ success: boolean; message: string; resetTasks?: string[]; skippedTasks?: string[] }> {
        const now = getTorontoMidnight();
        const resetTasks: string[] = [];
        const skippedTasks: string[] = [];

        // 获取需要重置的任务
        const playerTasks = await this.getPlayerTasks(ctx, uid);

        for (const task of playerTasks) {
            if (task.type !== resetType) continue;

            let shouldReset = false;
            let resetReason = "";

            // 情况1: 已完成的任务，检查重置间隔
            if (task.isCompleted) {
                if (task.lastReset) {
                    const lastReset = new Date(task.lastReset);
                    const timeDiff = now.localDate.getTime() - lastReset.getTime();
                    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

                    switch (resetType) {
                        case "daily":
                            shouldReset = daysDiff >= 1;
                            break;
                        case "weekly":
                            shouldReset = daysDiff >= 7;
                            break;
                        case "monthly":
                            shouldReset = daysDiff >= 30;
                            break;
                    }
                    resetReason = shouldReset ? "completed_and_interval_passed" : "completed_but_interval_not_passed";
                } else {
                    // 已完成但没有重置记录，允许重置
                    shouldReset = true;
                    resetReason = "completed_no_reset_record";
                }
            } else {
                // 情况2: 未完成的任务，检查是否需要重置
                if (task.lastReset) {
                    const lastReset = new Date(task.lastReset);
                    const timeDiff = now.localDate.getTime() - lastReset.getTime();
                    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

                    switch (resetType) {
                        case "daily":
                            shouldReset = daysDiff >= 1;
                            break;
                        case "weekly":
                            shouldReset = daysDiff >= 7;
                            break;
                        case "monthly":
                            shouldReset = daysDiff >= 30;
                            break;
                    }
                    resetReason = shouldReset ? "incomplete_and_interval_passed" : "incomplete_but_interval_not_passed";
                } else {
                    // 未完成且没有重置记录，允许重置
                    shouldReset = true;
                    resetReason = "incomplete_no_reset_record";
                }
            }

            if (shouldReset) {
                // 记录重置前的状态
                const oldState = {
                    isCompleted: task.isCompleted,
                    completedAt: task.completedAt,
                    rewardsClaimed: task.rewardsClaimed,
                    claimedAt: task.claimedAt,
                    progress: task.progress,
                    completions: task.completions,
                    lastReset: task.lastReset
                };

                // 重置任务状态
                const taskRecord = await ctx.db.query("player_tasks")
                    .withIndex("by_uid_taskId", (q: any) => q.eq("uid", uid).eq("taskId", task.taskId))
                    .unique();

                const newState = {
                    isCompleted: false,
                    completedAt: undefined,
                    rewardsClaimed: false,
                    claimedAt: undefined,
                    progress: this.getInitialProgress(task.condition),
                    lastReset: now.iso,
                    updatedAt: now.iso
                };

                await ctx.db.patch(taskRecord._id, newState);

                // 记录任务历史
                await this.recordTaskHistory(ctx, {
                    uid,
                    taskId: task.taskId,
                    templateId: task.templateId,
                    action: "reset",
                    oldState,
                    newState,
                    metadata: {
                        resetType,
                        resetReason,
                        resetAt: now.iso
                    }
                });

                resetTasks.push(task.taskId);
                console.log(`重置任务 ${task.taskId}: ${resetReason}`);
            } else {
                skippedTasks.push(task.taskId);
                console.log(`跳过任务 ${task.taskId}: ${resetReason}`);
            }
        }

        return {
            success: true,
            message: `重置了 ${resetTasks.length} 个任务，跳过了 ${skippedTasks.length} 个任务`,
            resetTasks,
            skippedTasks
        };
    }

    /**
     * 任务生命周期管理 - 统一处理周期性任务
     */
    static async managePeriodicTasks(ctx: any, uid: string, taskType: "daily" | "weekly" | "monthly"): Promise<{
        success: boolean;
        message: string;
        resetTasks?: string[];
        reallocatedTasks?: string[];
        skippedTasks?: string[];
    }> {
        const now = getTorontoMidnight();
        const resetTasks: string[] = [];
        const reallocatedTasks: string[] = [];
        const skippedTasks: string[] = [];

        // 步骤1: 重置现有任务状态
        const resetResult = await this.smartResetPlayerTasks(ctx, uid, taskType);
        if (resetResult.success) {
            resetTasks.push(...(resetResult.resetTasks || []));
            skippedTasks.push(...(resetResult.skippedTasks || []));
        }

        // 步骤2: 检查并分配新任务模板
        const reallocateResult = await this.checkAndAllocateNewTemplates(ctx, uid, taskType);
        if (reallocateResult.success) {
            reallocatedTasks.push(...(reallocateResult.reallocatedTasks || []));
        }

        return {
            success: true,
            message: `${taskType}任务管理完成，重置了 ${resetTasks.length} 个任务，重新分配了 ${reallocatedTasks.length} 个任务，跳过了 ${skippedTasks.length} 个任务`,
            resetTasks,
            reallocatedTasks,
            skippedTasks
        };
    }

    /**
     * 检查并分配新任务模板 - 优化版本
     */
    private static async checkAndAllocateNewTemplates(ctx: any, uid: string, taskType: string): Promise<{
        success: boolean;
        message: string;
        reallocatedTasks?: string[]
    }> {
        const now = getTorontoMidnight();
        const reallocatedTasks: string[] = [];

        try {
            // 1. 一次性获取所有需要的数据
            const [player, existingTasks, templates] = await Promise.all([
                ctx.db.query("players").withIndex("by_uid", (q: any) => q.eq("uid", uid)).unique(),
                this.getPlayerTasks(ctx, uid),
                this.getAllTaskTemplates(ctx)
            ]);

            if (!player) {
                return { success: false, message: "玩家不存在" };
            }

            // 2. 预处理数据，提高查找效率
            const existingTasksByTemplate = new Map<string, PlayerTask>();
            const validTemplates: TaskTemplate[] = [];

            // 构建现有任务的查找映射
            for (const task of existingTasks) {
                if (task.type === taskType) {
                    existingTasksByTemplate.set(task.templateId, task);
                }
            }

            // 过滤有效的模板
            for (const template of templates) {
                if (template.type !== taskType || !template.isActive) {
                    continue;
                }

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

                validTemplates.push(template);
            }

            // 3. 批量处理模板分配
            const tasksToCreate: any[] = [];

            for (const template of validTemplates) {
                const existingTask = existingTasksByTemplate.get(template.templateId);

                // 检查是否需要分配新模板
                const shouldAllocate = await this.shouldAllocateNewTemplate(ctx, existingTask, template, taskType);

                if (shouldAllocate) {
                    const taskId = `${uid}_${template.templateId}_${now.iso}`;

                    tasksToCreate.push({
                        uid,
                        taskId,
                        templateId: template.templateId,
                        name: template.name,
                        description: template.description,
                        type: template.type,
                        category: template.category,
                        condition: template.condition,
                        progress: this.getInitialProgress(template.condition),
                        isCompleted: false,
                        rewardsClaimed: false,
                        completions: 0,
                        rewards: template.rewards,
                        version: template.version,
                        createdAt: now.iso,
                        updatedAt: now.iso
                    });

                    reallocatedTasks.push(taskId);
                }
            }

            // 4. 批量插入新任务
            if (tasksToCreate.length > 0) {
                for (const taskData of tasksToCreate) {
                    await ctx.db.insert("player_tasks", taskData);
                }
            }

            return {
                success: true,
                message: `检查并分配了 ${reallocatedTasks.length} 个新任务模板`,
                reallocatedTasks
            };

        } catch (error) {
            console.error(`检查并分配新任务模板失败: ${error}`);
            return {
                success: false,
                message: error instanceof Error ? error.message : "分配新任务模板失败",
                reallocatedTasks: []
            };
        }
    }

    /**
     * 检查是否应该分配新任务模板 - 优化版本
     */
    private static async shouldAllocateNewTemplate(ctx: any, existingTask: PlayerTask | undefined, template: TaskTemplate, taskType: string): Promise<boolean> {
        // 1. 如果没有现有任务，需要分配
        if (!existingTask) {
            return true;
        }

        // 2. 如果现有任务未完成，不需要分配新模板
        if (!existingTask.isCompleted) {
            return false;
        }

        // 3. 检查任务模板是否发生变化
        if (this.hasTemplateChanged(existingTask, template)) {
            return true;
        }

        // 4. 检查时间间隔（只有已完成的任务才考虑重新分配）
        if (existingTask.lastReset) {
            const lastReset = new Date(existingTask.lastReset);
            const timeDiff = getTorontoMidnight().localDate.getTime() - lastReset.getTime();
            const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

            const intervalMap = {
                "daily": 1,
                "weekly": 7,
                "monthly": 30
            };

            const requiredInterval = intervalMap[taskType as keyof typeof intervalMap];
            return requiredInterval ? daysDiff >= requiredInterval : false;
        }

        // 5. 首次重置，允许分配
        return true;
    }

    /**
     * 检查任务模板是否发生变化
     */
    private static hasTemplateChanged(existingTask: PlayerTask, newTemplate: TaskTemplate): boolean {
        // 检查版本号（如果存在）
        if (newTemplate.version && existingTask.version !== newTemplate.version) {
            return true;
        }

        // 检查关键字段是否发生变化
        const nameChanged = existingTask.name !== newTemplate.name;
        const descriptionChanged = existingTask.description !== newTemplate.description;
        const conditionChanged = JSON.stringify(existingTask.condition) !== JSON.stringify(newTemplate.condition);
        const rewardsChanged = JSON.stringify(existingTask.rewards) !== JSON.stringify(newTemplate.rewards);

        // 检查任务类型是否变化
        const typeChanged = existingTask.type !== newTemplate.type;
        const categoryChanged = existingTask.category !== newTemplate.category;

        return nameChanged || descriptionChanged || conditionChanged || rewardsChanged || typeChanged || categoryChanged;
    }


    // ============================================================================
    // 任务统计和分析
    // ============================================================================

    /**
     * 获取任务历史记录
     */
    static async getTaskHistory(ctx: any, params: {
        uid?: string;
        taskId?: string;
        templateId?: string;
        action?: string;
        limit?: number;
    }): Promise<any[]> {
        const { uid, taskId, templateId, action, limit = 100 } = params;
        const now = getTorontoMidnight();

        let query = ctx.db.query("task_history");

        if (uid) {
            query = query.withIndex("by_uid", (q: any) => q.eq("uid", uid));
        }

        if (taskId) {
            query = query.withIndex("by_taskId", (q: any) => q.eq("taskId", taskId));
        }

        if (action) {
            query = query.withIndex("by_action", (q: any) => q.eq("action", action));
        }

        const history = await query
            .order("desc")
            .take(limit)
            .collect();

        return history.map((record: any) => ({
            uid: record.uid,
            taskId: record.taskId,
            templateId: record.templateId,
            action: record.action,
            oldState: record.oldState,
            newState: record.newState,
            metadata: record.metadata,
            createdAt: record.createdAt
        }));
    }

    /**
     * 获取任务完整生命周期
     */
    static async getTaskLifecycle(ctx: any, taskId: string): Promise<any[]> {
        const history = await this.getTaskHistory(ctx, { taskId });

        // 按时间排序
        return history.sort((a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
    }

    /**
     * 获取玩家任务统计（包含历史）
     */
    static async getPlayerTaskStatsWithHistory(ctx: any, uid: string): Promise<any> {
        const playerTasks = await this.getPlayerTasks(ctx, uid);
        const taskHistory = await this.getTaskHistory(ctx, { uid });

        // 按任务分组统计
        const taskStats = new Map<string, any>();

        for (const task of playerTasks) {
            taskStats.set(task.taskId, {
                taskId: task.taskId,
                templateId: task.templateId,
                name: task.name,
                type: task.type,
                currentState: {
                    isCompleted: task.isCompleted,
                    completedAt: task.completedAt,
                    rewardsClaimed: task.rewardsClaimed,
                    claimedAt: task.claimedAt,
                    completions: task.completions,
                    progress: task.progress
                },
                history: []
            });
        }

        // 添加历史记录
        for (const record of taskHistory) {
            const taskStat = taskStats.get(record.taskId);
            if (taskStat) {
                taskStat.history.push(record);
            }
        }

        return {
            totalTasks: playerTasks.length,
            completedTasks: playerTasks.filter(t => t.isCompleted).length,
            totalCompletions: playerTasks.reduce((sum, t) => sum + t.completions, 0),
            taskStats: Array.from(taskStats.values())
        };
    }

    /**
     * 获取玩家任务统计
     */
    static async getPlayerTaskStats(ctx: any, uid: string): Promise<any> {
        const playerTasks = await this.getPlayerTasks(ctx, uid);

        const stats = {
            totalTasks: playerTasks.length,
            completedTasks: playerTasks.filter(t => t.isCompleted).length,
            claimedTasks: playerTasks.filter(t => t.rewardsClaimed).length,
            totalCompletions: playerTasks.reduce((sum, t) => sum + t.completions, 0),
            byType: {} as any,
            byCategory: {} as any
        };

        // 按类型统计
        playerTasks.forEach(task => {
            stats.byType[task.type] = stats.byType[task.type] || { total: 0, completed: 0 };
            stats.byType[task.type].total++;
            if (task.isCompleted) stats.byType[task.type].completed++;
        });

        // 按分类统计
        playerTasks.forEach(task => {
            stats.byCategory[task.category] = stats.byCategory[task.category] || { total: 0, completed: 0 };
            stats.byCategory[task.category].total++;
            if (task.isCompleted) stats.byCategory[task.category].completed++;
        });

        return stats;
    }

    /**
     * 获取热门任务模板
     */
    static async getPopularTaskTemplates(ctx: any): Promise<TaskTemplate[]> {
        // 基于完成率获取热门任务
        const playerTasks = await ctx.db.query("player_tasks").collect();
        const templateStats = new Map<string, { total: number; completed: number }>();

        playerTasks.forEach((task: any) => {
            const stats = templateStats.get(task.templateId) || { total: 0, completed: 0 };
            stats.total++;
            if (task.isCompleted) stats.completed++;
            templateStats.set(task.templateId, stats);
        });

        const sortedTemplates = Array.from(templateStats.entries())
            .filter(([_, stats]) => stats.total >= 10) // 至少10个分配
            .sort((a, b) => {
                const rateA = a[1].completed / a[1].total;
                const rateB = b[1].completed / b[1].total;
                return rateB - rateA;
            })
            .slice(0, 10);

        const templates = await this.getAllTaskTemplates(ctx);
        return templates.filter(t => sortedTemplates.some(st => st[0] === t.templateId));
    }
} 