import { mutation, v } from "../_generated/server";
import { getTorontoMidnight } from "../service/simpleTimezoneUtils";

// ============================================================================
// 门票系统初始化脚本
// ============================================================================

/**
 * 初始化门票系统
 * 清理旧数据并设置基础配置
 */
export const initTicketSystem = mutation({
    args: {},
    handler: async (ctx) => {
        const now = getTorontoMidnight();

        try {
            // 清理旧的门票数据
            const oldPlayerTickets = await ctx.db.query("player_tickets").collect();
            for (const ticket of oldPlayerTickets) {
                await ctx.db.delete(ticket._id);
            }

            const oldUsageStats = await ctx.db.query("ticket_usage_stats").collect();
            for (const stat of oldUsageStats) {
                await ctx.db.delete(stat._id);
            }

            console.log("门票系统初始化完成");
            return {
                success: true,
                message: "门票系统初始化完成",
                cleanedRecords: oldPlayerTickets.length + oldUsageStats.length
            };
        } catch (error) {
            console.error("门票系统初始化失败:", error);
            return {
                success: false,
                message: error instanceof Error ? error.message : "门票系统初始化失败"
            };
        }
    },
});

/**
 * 为指定玩家初始化门票数据
 */
export const initPlayerTickets = mutation({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        const { uid } = args;
        const now = getTorontoMidnight();

        try {
            // 检查玩家是否已存在门票数据
            const existingTickets = await ctx.db.query("player_tickets")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .collect();

            if (existingTickets.length > 0) {
                return {
                    success: false,
                    message: "玩家门票数据已存在"
                };
            }

            // 为玩家创建初始门票记录（可选，用于测试）
            const initialTickets = [
                { type: "bronze", quantity: 5 },
                { type: "silver", quantity: 2 },
                { type: "gold", quantity: 1 }
            ];

            const createdTickets = [];
            for (const ticket of initialTickets) {
                const ticketId = await ctx.db.insert("player_tickets", {
                    uid,
                    type: ticket.type,
                    quantity: ticket.quantity,
                    createdAt: now.iso,
                    updatedAt: now.iso
                });
                createdTickets.push({ ...ticket, _id: ticketId });
            }

            console.log(`为玩家 ${uid} 初始化门票数据完成`);
            return {
                success: true,
                message: `为玩家 ${uid} 初始化门票数据完成`,
                createdTickets
            };
        } catch (error) {
            console.error(`为玩家 ${uid} 初始化门票数据失败:`, error);
            return {
                success: false,
                message: error instanceof Error ? error.message : "初始化门票数据失败"
            };
        }
    },
});

/**
 * 清理过期的门票使用统计
 */
export const cleanupTicketStats = mutation({
    args: { daysToKeep: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const daysToKeep = args.daysToKeep || 30;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        try {
            const oldStats = await ctx.db.query("ticket_usage_stats")
                .filter((q: any) => q.lt(q.field("lastUsedAt"), cutoffDate.toISOString()))
                .collect();

            let deletedCount = 0;
            for (const stat of oldStats) {
                await ctx.db.delete(stat._id);
                deletedCount++;
            }

            console.log(`清理了 ${deletedCount} 条过期的门票使用统计`);
            return {
                success: true,
                message: `清理了 ${deletedCount} 条过期的门票使用统计`,
                deletedCount
            };
        } catch (error) {
            console.error("清理门票使用统计失败:", error);
            return {
                success: false,
                message: error instanceof Error ? error.message : "清理门票使用统计失败"
            };
        }
    },
}); 