import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { TicketSystem } from "./ticketSystem";

// ============================================================================
// 门票系统API接口 - 支持跨赛季保留
// ============================================================================

// 查询接口

/**
 * 获取玩家门票
 */
export const getPlayerTickets = query({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        return await TicketSystem.getPlayerTickets(ctx, args.uid);
    },
});

/**
 * 获取玩家特定类型门票
 */
export const getPlayerTicketByType = query({
    args: {
        uid: v.string(),
        type: v.string()
    },
    handler: async (ctx, args) => {
        return await TicketSystem.getPlayerTicketByType(ctx, args.uid, args.type as any);
    },
});

/**
 * 获取玩家门票使用统计
 */
export const getPlayerTicketStats = query({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        return await TicketSystem.getPlayerTicketStats(ctx, args.uid);
    },
});

/**
 * 获取门票赛季统计
 */
export const getTicketSeasonalStats = query({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        return await TicketSystem.getSeasonalStats(ctx, args.uid);
    },
});

// 修改接口

/**
 * 购买门票
 */
export const purchaseTicket = mutation({
    args: {
        uid: v.string(),
        type: v.string(),
        quantity: v.number()
    },
    handler: async (ctx, args) => {
        return await TicketSystem.purchaseTicket(ctx, args);
    },
});

/**
 * 使用门票
 */
export const useTicket = mutation({
    args: {
        uid: v.string(),
        type: v.string()
    },
    handler: async (ctx, args) => {
        return await TicketSystem.useTicket(ctx, args);
    },
});

/**
 * 发放门票奖励
 */
export const grantTicketReward = mutation({
    args: {
        uid: v.string(),
        type: v.string(),
        quantity: v.number()
    },
    handler: async (ctx, args) => {
        return await TicketSystem.grantTicketReward(ctx, args);
    },
});

// ============================================================================
// 赛季管理接口
// ============================================================================

/**
 * 处理赛季重置时的门票保留
 */
export const resetSeasonTickets = mutation({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        return await TicketSystem.handleSeasonalReset(ctx, args.uid);
    },
});

/**
 * 批量处理赛季重置
 */
export const batchResetSeasonTickets = mutation({
    args: { uids: v.array(v.string()) },
    handler: async (ctx, args) => {
        const results = [];

        for (const uid of args.uids) {
            const result = await TicketSystem.handleSeasonalReset(ctx, uid);
            results.push({ uid, ...result });
        }

        const successCount = results.filter(r => r.success).length;
        const totalReset = results.reduce((sum, r) => {
            if (r.resetResults) {
                return sum + Object.keys(r.resetResults).length;
            }
            return sum;
        }, 0);

        return {
            success: true,
            message: `成功为 ${successCount}/${args.uids.length} 个玩家重置门票`,
            totalReset,
            results
        };
    },
});

// ============================================================================
// 管理接口
// ============================================================================

/**
 * 获取门票配置
 */
export const getTicketConfigs = query({
    args: {},
    handler: async (ctx, args) => {
        return TicketSystem.getAllTicketConfigs();
    },
});

/**
 * 获取门票使用分析
 */
export const getTicketUsageAnalytics = query({
    args: {
        startDate: v.optional(v.string()),
        endDate: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const startDate = args.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const endDate = args.endDate || new Date().toISOString();

        // 获取门票使用统计
        const usageStats = await ctx.db.query("ticket_usage_stats")
            .filter((q: any) => q.gte(q.field("lastUsedAt"), startDate))
            .filter((q: any) => q.lte(q.field("lastUsedAt"), endDate))
            .collect();

        // 按类型分组统计
        const analytics: any = {
            bronze: { totalUsed: 0, totalWon: 0, totalLost: 0, winRate: 0 },
            silver: { totalUsed: 0, totalWon: 0, totalLost: 0, winRate: 0 },
            gold: { totalUsed: 0, totalWon: 0, totalLost: 0, winRate: 0 }
        };

        for (const stat of usageStats) {
            const type = stat.type;
            if (analytics[type]) {
                analytics[type].totalUsed += stat.totalUsed;
                analytics[type].totalWon += stat.totalWon;
                analytics[type].totalLost += stat.totalLost;
            }
        }

        // 计算胜率
        for (const type in analytics) {
            const stat = analytics[type];
            stat.winRate = stat.totalUsed > 0 ? stat.totalWon / stat.totalUsed : 0;
        }

        return {
            period: { startDate, endDate },
            analytics,
            totalStats: {
                totalUsed: usageStats.reduce((sum, stat) => sum + stat.totalUsed, 0),
                totalWon: usageStats.reduce((sum, stat) => sum + stat.totalWon, 0),
                totalLost: usageStats.reduce((sum, stat) => sum + stat.totalLost, 0)
            }
        };
    },
});

/**
 * 获取门票库存分析
 */
export const getTicketInventoryAnalytics = query({
    args: {},
    handler: async (ctx, args) => {
        // 获取所有玩家门票
        const allTickets = await ctx.db.query("player_tickets")
            .filter((q: any) => q.gt(q.field("quantity"), 0))
            .collect();

        // 按类型统计
        const inventory: any = {
            bronze: { totalQuantity: 0, playerCount: 0, averageQuantity: 0 },
            silver: { totalQuantity: 0, playerCount: 0, averageQuantity: 0 },
            gold: { totalQuantity: 0, playerCount: 0, averageQuantity: 0 }
        };

        const playerCounts: any = {};

        for (const ticket of allTickets) {
            const type = ticket.type;
            if (inventory[type]) {
                inventory[type].totalQuantity += ticket.quantity;

                if (!playerCounts[ticket.uid]) {
                    playerCounts[ticket.uid] = new Set();
                }
                playerCounts[ticket.uid].add(type);
            }
        }

        // 计算玩家数量和平均数量
        for (const type in inventory) {
            const stat = inventory[type];
            stat.playerCount = Object.values(playerCounts).filter((types: any) => types.has(type)).length;
            stat.averageQuantity = stat.playerCount > 0 ? stat.totalQuantity / stat.playerCount : 0;
        }

        return {
            inventory,
            summary: {
                totalPlayers: Object.keys(playerCounts).length,
                totalTickets: allTickets.reduce((sum, ticket) => sum + ticket.quantity, 0)
            }
        };
    },
}); 