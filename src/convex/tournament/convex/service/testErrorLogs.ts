import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

// 测试创建错误日志
export const testCreateErrorLog = mutation({
    args: {
        error: v.string(),
        context: v.string(),
        uid: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const now = new Date().toISOString();

        try {
            const logId = await ctx.db.insert("error_logs", {
                error: args.error,
                context: args.context,
                uid: args.uid,
                createdAt: now,
            });

            return {
                success: true,
                logId,
                message: "错误日志创建成功"
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message,
                message: "错误日志创建失败"
            };
        }
    }
});

// 测试查询错误日志
export const testGetErrorLogs = query({
    args: {
        context: v.optional(v.string()),
        uid: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        try {
            let query = ctx.db.query("error_logs");

            // 按上下文过滤
            if (args.context) {
                query = query.withIndex("by_context", (q) => q.eq("context", args.context));
            }

            // 按用户ID过滤
            if (args.uid) {
                query = query.withIndex("by_uid", (q) => q.eq("uid", args.uid));
            }

            const logs = await query.order("desc").take(args.limit || 50);

            return {
                success: true,
                logs,
                count: logs.length,
                message: "错误日志查询成功"
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message,
                message: "错误日志查询失败"
            };
        }
    }
});

// 测试按上下文查询错误日志
export const testGetErrorLogsByContext = query({
    args: { context: v.string() },
    handler: async (ctx, args) => {
        try {
            const logs = await ctx.db
                .query("error_logs")
                .withIndex("by_context", (q) => q.eq("context", args.context))
                .order("desc")
                .collect();

            return {
                success: true,
                logs,
                count: logs.length,
                message: `查询上下文为 ${args.context} 的错误日志成功`
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message,
                message: "错误日志查询失败"
            };
        }
    }
});

// 测试按用户ID查询错误日志
export const testGetErrorLogsByUser = query({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        try {
            const logs = await ctx.db
                .query("error_logs")
                .withIndex("by_uid", (q) => q.eq("uid", args.uid))
                .first();

            return {
                success: true,
                logs,
                count: logs.length,
                message: `查询用户 ${args.uid} 的错误日志成功`
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message,
                message: "错误日志查询失败"
            };
        }
    }
});

// 测试清理错误日志
export const testCleanupErrorLogs = mutation({
    args: {
        daysOld: v.number(), // 删除多少天前的日志
    },
    handler: async (ctx, args) => {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - args.daysOld);
            const cutoffISO = cutoffDate.toISOString();

            // 获取需要删除的日志
            const logsToDelete = await ctx.db
                .query("error_logs")
                .filter((q) => q.lt(q.field("createdAt"), cutoffISO))
                .collect();

            // 删除旧日志
            let deletedCount = 0;
            for (const log of logsToDelete) {
                await ctx.db.delete(log._id);
                deletedCount++;
            }

            return {
                success: true,
                deletedCount,
                message: `成功删除 ${deletedCount} 条错误日志`
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message,
                message: "清理错误日志失败"
            };
        }
    }
});

// 创建示例错误日志
export const createSampleErrorLogs = mutation({
    args: {},
    handler: async (ctx) => {
        const now = new Date().toISOString();
        const sampleLogs = [
            {
                error: "任务分配失败：玩家不存在",
                context: "assignTasks",
                uid: "user123",
                createdAt: now,
            },
            {
                error: "门票验证失败：门票已过期",
                context: "validateTicket",
                uid: "user456",
                createdAt: now,
            },
            {
                error: "数据库连接超时",
                context: "database",
                uid: undefined,
                createdAt: now,
            },
            {
                error: "段位计算错误：积分异常",
                context: "segmentCalculation",
                uid: "user789",
                createdAt: now,
            },
            {
                error: "道具使用失败：库存不足",
                context: "propUsage",
                uid: "user101",
                createdAt: now,
            }
        ];

        const results = [];
        for (const log of sampleLogs) {
            try {
                const id = await ctx.db.insert("error_logs", log);
                results.push({
                    error: log.error,
                    success: true,
                    id
                });
            } catch (error: any) {
                results.push({
                    error: log.error,
                    success: false,
                    reason: error.message
                });
            }
        }

        return {
            success: true,
            results,
            message: "示例错误日志创建完成"
        };
    }
}); 