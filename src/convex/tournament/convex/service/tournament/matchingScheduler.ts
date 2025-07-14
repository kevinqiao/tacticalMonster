import { v } from "convex/values";
import { internalMutation, internalQuery } from "../../_generated/server";
import { getTorontoDate } from "../utils";
import { TournamentMatchingService } from "./tournamentMatchingService";

/**
 * 匹配任务调度器
 * 负责管理和执行后台匹配任务
 */
export class MatchingScheduler {

    /**
     * 执行匹配任务
     * 由定时任务调用
     */
    static async runMatchingTask(ctx: any, params: {
        taskId?: string;
        batchSize?: number;
        maxProcessingTime?: number;
    }) {
        const { taskId = `task_${Date.now()}`, batchSize = 50, maxProcessingTime = 30000 } = params;
        const now = getTorontoDate();
        let taskRecordId: string | undefined;

        console.log(`开始执行匹配任务 ${taskId}`);

        try {
            // 1. 记录任务开始
            taskRecordId = await ctx.db.insert("matching_tasks", {
                taskId,
                status: "running",
                batchSize,
                maxProcessingTime,
                startedAt: now.iso,
                createdAt: now.iso,
                updatedAt: now.iso
            });

            // 2. 执行匹配任务
            const result = await TournamentMatchingService.executeMatchingTask(ctx, {
                batchSize,
                maxProcessingTime
            });

            // 3. 更新任务状态
            await ctx.db.patch(taskRecordId, {
                status: "completed",
                result: {
                    success: result.success,
                    processedCount: result.processedCount,
                    matchedCount: result.matchedCount,
                    errorCount: result.errorCount,
                    processingTime: result.processingTime
                },
                completedAt: now.iso,
                updatedAt: now.iso
            });

            console.log(`匹配任务 ${taskId} 完成:`, result);

            return {
                success: true,
                taskId,
                result
            };

        } catch (error) {
            console.error(`匹配任务 ${taskId} 失败:`, error);

            // 记录任务失败
            if (taskRecordId) {
                await ctx.db.patch(taskRecordId, {
                    status: "failed",
                    error: error instanceof Error ? error.message : "未知错误",
                    failedAt: now.iso,
                    updatedAt: now.iso
                });
            }

            throw error;
        }
    }

    /**
     * 清理过期队列
     * 由定时任务调用
     */
    static async runCleanupTask(ctx: any, params: {
        taskId?: string;
    }) {
        const { taskId = `cleanup_${Date.now()}` } = params;
        const now = getTorontoDate();
        let taskRecordId: string | undefined;

        console.log(`开始执行清理任务 ${taskId}`);

        try {
            // 1. 记录任务开始
            taskRecordId = await ctx.db.insert("matching_tasks", {
                taskId,
                status: "running",
                taskType: "cleanup",
                startedAt: now.iso,
                createdAt: now.iso,
                updatedAt: now.iso
            });

            // 2. 执行清理任务
            const result = await TournamentMatchingService.cleanupExpiredQueue(ctx);

            // 3. 更新任务状态
            await ctx.db.patch(taskRecordId, {
                status: "completed",
                result: {
                    success: result.success,
                    cleanedCount: result.cleanedCount,
                    message: result.message
                },
                completedAt: now.iso,
                updatedAt: now.iso
            });

            console.log(`清理任务 ${taskId} 完成:`, result);

            return {
                success: true,
                taskId,
                result
            };

        } catch (error) {
            console.error(`清理任务 ${taskId} 失败:`, error);

            // 记录任务失败
            if (taskRecordId) {
                await ctx.db.patch(taskRecordId, {
                    status: "failed",
                    error: error instanceof Error ? error.message : "未知错误",
                    failedAt: now.iso,
                    updatedAt: now.iso
                });
            }

            throw error;
        }
    }

    /**
     * 获取任务状态
     */
    static async getTaskStatus(ctx: any, taskId: string) {
        const task = await ctx.db
            .query("matching_tasks")
            .withIndex("by_taskId", (q: any) => q.eq("taskId", taskId))
            .order("desc")
            .first();

        if (!task) {
            return {
                found: false,
                message: "任务不存在"
            };
        }

        return {
            found: true,
            taskId: task.taskId,
            status: task.status,
            taskType: task.taskType || "matching",
            startedAt: task.startedAt,
            completedAt: task.completedAt,
            failedAt: task.failedAt,
            result: task.result,
            error: task.error
        };
    }

    /**
     * 获取最近的任务列表
     */
    static async getRecentTasks(ctx: any, params: {
        limit?: number;
        taskType?: string;
    }) {
        const { limit = 20, taskType } = params;

        let query = ctx.db.query("matching_tasks");

        if (taskType) {
            query = query.filter((q: any) => q.eq(q.field("taskType"), taskType));
        }

        const tasks = await query
            .order("desc")
            .take(limit);

        return tasks.map((task: any) => ({
            taskId: task.taskId,
            status: task.status,
            taskType: task.taskType || "matching",
            startedAt: task.startedAt,
            completedAt: task.completedAt,
            failedAt: task.failedAt,
            result: task.result,
            error: task.error
        }));
    }

    /**
     * 获取任务统计
     */
    static async getTaskStats(ctx: any, params: {
        hours?: number;
    }) {
        const { hours = 24 } = params;
        const now = getTorontoDate();
        const cutoffTime = new Date(now.localDate.getTime() - hours * 60 * 60 * 1000);

        // 获取指定时间范围内的任务
        const tasks = await ctx.db
            .query("matching_tasks")
            .filter((q: any) => q.gte(q.field("createdAt"), cutoffTime.toISOString()))
            .collect();

        // 计算统计信息
        const stats = {
            totalTasks: tasks.length,
            completedTasks: 0,
            failedTasks: 0,
            runningTasks: 0,
            totalProcessingTime: 0,
            totalProcessedCount: 0,
            totalMatchedCount: 0,
            totalErrorCount: 0,
            totalCleanedCount: 0,
            averageProcessingTime: 0,
            successRate: 0
        };

        for (const task of tasks) {
            if (task.status === "completed") {
                stats.completedTasks++;
                if (task.result) {
                    stats.totalProcessingTime += task.result.processingTime || 0;
                    stats.totalProcessedCount += task.result.processedCount || 0;
                    stats.totalMatchedCount += task.result.matchedCount || 0;
                    stats.totalErrorCount += task.result.errorCount || 0;
                    stats.totalCleanedCount += task.result.cleanedCount || 0;
                }
            } else if (task.status === "failed") {
                stats.failedTasks++;
            } else if (task.status === "running") {
                stats.runningTasks++;
            }
        }

        // 计算平均值
        if (stats.completedTasks > 0) {
            stats.averageProcessingTime = Math.floor(stats.totalProcessingTime / stats.completedTasks);
            stats.successRate = (stats.completedTasks / (stats.completedTasks + stats.failedTasks)) * 100;
        }

        return stats;
    }
}

// Convex 函数接口
export const runMatchingTask = (internalMutation as any)({
    args: {
        taskId: v.optional(v.string()),
        batchSize: v.optional(v.number()),
        maxProcessingTime: v.optional(v.number())
    },
    handler: async (ctx: any, args: any) => {
        return await MatchingScheduler.runMatchingTask(ctx, args);
    },
});

export const runCleanupTask = (internalMutation as any)({
    args: {
        taskId: v.optional(v.string())
    },
    handler: async (ctx: any, args: any) => {
        return await MatchingScheduler.runCleanupTask(ctx, args);
    },
});

export const getTaskStatus = (internalQuery as any)({
    args: {
        taskId: v.string()
    },
    handler: async (ctx: any, args: any) => {
        return await MatchingScheduler.getTaskStatus(ctx, args.taskId);
    },
});

export const getRecentTasks = (internalQuery as any)({
    args: {
        limit: v.optional(v.number()),
        taskType: v.optional(v.string())
    },
    handler: async (ctx: any, args: any) => {
        return await MatchingScheduler.getRecentTasks(ctx, args);
    },
});

export const getTaskStats = (internalQuery as any)({
    args: {
        hours: v.optional(v.number())
    },
    handler: async (ctx: any, args: any) => {
        return await MatchingScheduler.getTaskStats(ctx, args);
    },
}); 