import { mutation } from "../_generated/server";

// 验证error_logs表是否正常工作
export const validateErrorLogs = mutation({
    args: {},
    handler: async (ctx) => {
        const now = new Date().toISOString();
        const results = {
            schemaExists: false,
            canInsert: false,
            canQuery: false,
            canDelete: false,
            errors: [] as string[]
        };

        try {
            // 1. 测试插入
            const testLog = {
                error: `测试错误日志 ${Date.now()}`,
                context: "validateErrorLogs",
                uid: "test_user",
                createdAt: now
            };

            const insertId = await ctx.db.insert("error_logs", testLog);
            results.canInsert = true;

            // 2. 测试查询
            const queriedLog = await ctx.db.get(insertId);
            if (queriedLog) {
                results.canQuery = true;
            }

            // 3. 测试按上下文查询
            const contextLogs = await ctx.db
                .query("error_logs")
                .withIndex("by_context", (q) => q.eq("context", "validateErrorLogs"))
                .collect();

            if (contextLogs.length > 0) {
                results.canQuery = true;
            }

            // 4. 测试按用户ID查询
            const userLogs = await ctx.db
                .query("error_logs")
                .withIndex("by_uid", (q) => q.eq("uid", "test_user"))
                .collect();

            if (userLogs.length > 0) {
                results.canQuery = true;
            }

            // 5. 测试删除
            await ctx.db.delete(insertId);
            results.canDelete = true;

            // 6. 验证schema存在
            results.schemaExists = true;

            return {
                success: true,
                results,
                message: "error_logs表验证成功"
            };

        } catch (error: any) {
            results.errors.push(error.message);
            return {
                success: false,
                results,
                error: error.message,
                message: "error_logs表验证失败"
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

// 获取错误统计信息
export const getErrorStatistics = mutation({
    args: {},
    handler: async (ctx) => {
        try {
            const allLogs = await ctx.db.query("error_logs").collect();

            // 按上下文统计
            const contextStats: { [key: string]: number } = {};
            const userStats: { [key: string]: number } = {};

            allLogs.forEach(log => {
                // 上下文统计
                contextStats[log.context] = (contextStats[log.context] || 0) + 1;

                // 用户统计（如果有uid）
                if (log.uid) {
                    userStats[log.uid] = (userStats[log.uid] || 0) + 1;
                }
            });

            // 获取最近的错误
            const recentErrors = allLogs
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 10);

            return {
                success: true,
                statistics: {
                    totalErrors: allLogs.length,
                    contextStats,
                    userStats,
                    recentErrors
                },
                message: "错误统计信息获取成功"
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message,
                message: "获取错误统计信息失败"
            };
        }
    }
}); 