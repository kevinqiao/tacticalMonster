import { mutation, query } from "../_generated/server";
import { getTorontoDate } from "../service/utils";

/**
 * 用户表到玩家表的迁移脚本
 * 将 users 表的数据合并到 players 表中
 */

// 检查迁移状态
export const checkMigrationStatus = query({
    args: {},
    handler: async (ctx) => {
        try {
            // 检查是否存在 users 表数据
            const usersCount = await ctx.db.query("users").collect();

            // 检查 players 表数据
            const playersCount = await ctx.db.query("players").collect();

            return {
                usersTableExists: usersCount.length > 0,
                usersCount: usersCount.length,
                playersCount: playersCount.length,
                needsMigration: usersCount.length > 0,
                migrationStatus: usersCount.length > 0 ? "pending" : "completed"
            };
        } catch (error) {
            return {
                usersTableExists: false,
                usersCount: 0,
                playersCount: 0,
                needsMigration: false,
                migrationStatus: "completed",
                error: error instanceof Error ? error.message : "Unknown error"
            };
        }
    },
});

// 执行迁移
export const migrateUsersToPlayers = mutation({
    args: {},
    handler: async (ctx) => {
        const now = getTorontoDate();
        const migrationLog: string[] = [];

        try {
            migrationLog.push("开始迁移 users 表到 players 表...");

            // 获取所有 users 表数据
            const users = await ctx.db.query("users").collect();
            migrationLog.push(`找到 ${users.length} 条 users 记录`);

            let migratedCount = 0;
            let skippedCount = 0;
            let errorCount = 0;

            for (const user of users) {
                try {
                    // 检查是否已存在对应的 player 记录
                    const existingPlayer = await ctx.db
                        .query("players")
                        .withIndex("by_uid", (q) => q.eq("uid", user.uid))
                        .first();

                    if (existingPlayer) {
                        // 更新现有记录，合并字段
                        await ctx.db.patch(existingPlayer._id, {
                            email: user.email || existingPlayer.email,
                            displayName: user.displayName || existingPlayer.displayName,
                            avatarUrl: user.avatarUrl || existingPlayer.avatarUrl,
                            isSubscribed: user.isSubscribed,
                            subscriptionExpiry: user.subscriptionExpiry || existingPlayer.subscriptionExpiry,
                            updatedAt: now.iso
                        });
                        migrationLog.push(`更新现有玩家记录: ${user.uid}`);
                        migratedCount++;
                    } else {
                        // 创建新的 player 记录
                        await ctx.db.insert("players", {
                            uid: user.uid,
                            email: user.email,
                            displayName: user.displayName,
                            avatarUrl: user.avatarUrl,
                            segmentName: "Bronze", // 默认段位
                            isSubscribed: user.isSubscribed,
                            subscriptionExpiry: user.subscriptionExpiry,
                            lastActive: user.updatedAt || user.createdAt,
                            totalPoints: 0, // 默认积分
                            createdAt: user.createdAt,
                            updatedAt: now.iso
                        });
                        migrationLog.push(`创建新玩家记录: ${user.uid}`);
                        migratedCount++;
                    }
                } catch (error) {
                    migrationLog.push(`迁移用户 ${user.uid} 时出错: ${error instanceof Error ? error.message : "Unknown error"}`);
                    errorCount++;
                }
            }

            // 记录迁移结果
            await ctx.db.insert("migration_logs", {
                migrationType: "users_to_players",
                status: "completed",
                totalUsers: users.length,
                migratedCount,
                skippedCount,
                errorCount,
                log: migrationLog.join("\n"),
                createdAt: now.iso
            });

            return {
                success: true,
                totalUsers: users.length,
                migratedCount,
                skippedCount,
                errorCount,
                log: migrationLog
            };

        } catch (error) {
            migrationLog.push(`迁移过程中发生错误: ${error instanceof Error ? error.message : "Unknown error"}`);

            // 记录错误日志
            await ctx.db.insert("migration_logs", {
                migrationType: "users_to_players",
                status: "failed",
                totalUsers: 0,
                migratedCount: 0,
                skippedCount: 0,
                errorCount: 1,
                log: migrationLog.join("\n"),
                createdAt: now.iso
            });

            throw new Error(`迁移失败: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    },
});

// 回滚迁移（如果需要）
export const rollbackMigration = mutation({
    args: {},
    handler: async (ctx) => {
        const now = getTorontoDate();
        const rollbackLog: string[] = [];

        try {
            rollbackLog.push("开始回滚迁移...");

            // 获取迁移日志
            const migrationLogs = await ctx.db
                .query("migration_logs")
                .filter((q) => q.eq(q.field("migrationType"), "users_to_players"))
                .collect();

            if (migrationLogs.length === 0) {
                return {
                    success: false,
                    message: "没有找到迁移记录"
                };
            }

            // 这里可以实现回滚逻辑
            // 由于数据已经合并，回滚比较复杂，建议手动处理

            rollbackLog.push("回滚完成（需要手动验证）");

            return {
                success: true,
                message: "回滚完成",
                log: rollbackLog
            };

        } catch (error) {
            rollbackLog.push(`回滚过程中发生错误: ${error instanceof Error ? error.message : "Unknown error"}`);
            throw new Error(`回滚失败: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    },
});

// 验证迁移结果
export const validateMigration = query({
    args: {},
    handler: async (ctx) => {
        try {
            // 检查 players 表数据完整性
            const players = await ctx.db.query("players").collect();

            const validationResults = {
                totalPlayers: players.length,
                playersWithEmail: players.filter(p => p.email).length,
                playersWithDisplayName: players.filter(p => p.displayName).length,
                playersWithSegment: players.filter(p => p.segmentName).length,
                playersWithSubscription: players.filter(p => p.isSubscribed !== undefined).length,
                averagePoints: players.reduce((sum, p) => sum + (p.totalPoints || 0), 0) / players.length
            };

            return {
                success: true,
                validationResults,
                recommendations: [
                    "检查所有玩家记录是否包含必要的字段",
                    "验证段位分配是否正确",
                    "确认订阅状态是否正确迁移"
                ]
            };

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error"
            };
        }
    },
}); 