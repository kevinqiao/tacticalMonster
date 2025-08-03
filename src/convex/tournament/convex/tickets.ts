import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { TicketSystem } from "./service/ticket/ticketSystem";

// ============================================================================
// 门票系统API接口
// ============================================================================

// 查询接口

/**
 * 获取玩家特定类型门票
 */
export const getPlayerTicketByType = query({
    args: {
        uid: v.string(),
        type: v.string() // "bronze", "silver", "gold"
    },
    handler: async (ctx, args) => {
        return await TicketSystem.getPlayerTicketByType(ctx, args.uid, args.type as any);
    },
});

/**
 * 获取玩家门票（只返回数量大于0的有效门票）
 */
export const getPlayerTickets = query({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        return await TicketSystem.getPlayerTickets(ctx, args.uid);
    },
});

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
 * 获取玩家门票使用统计
 */
export const getPlayerTicketStats = query({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        return await TicketSystem.getPlayerTicketStats(ctx, args.uid);
    },
});

// 修改接口

/**
 * 购买门票
 */
export const purchaseTicket = mutation({
    args: {
        uid: v.string(),
        type: v.string(), // "bronze", "silver", "gold"
        quantity: v.number(),
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
        type: v.string(), // "bronze", "silver", "gold"
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
        type: v.string(), // "bronze", "silver", "gold"
        quantity: v.number(),
    },
    handler: async (ctx, args) => {
        return await TicketSystem.grantTicketReward(ctx, args);
    },
});

/**
 * 更新门票使用统计
 */
export const updateTicketUsageStats = mutation({
    args: {
        uid: v.string(),
        type: v.string(),
        isWin: v.boolean(),
    },
    handler: async (ctx, args) => {
        await TicketSystem.updateTicketUsageStats(ctx, args);
        return { success: true, message: "门票使用统计更新成功" };
    },
});



// ============================================================================
// 批量操作接口
// ============================================================================

/**
 * 批量发放门票奖励
 */
export const batchGrantTicketRewards = mutation({
    args: {
        rewards: v.array(v.object({
            uid: v.string(),
            type: v.string(),
            quantity: v.number(),
        })),
    },
    handler: async (ctx, args) => {
        const results = [];
        const successCount = 0;

        for (const reward of args.rewards) {
            const result = await TicketSystem.grantTicketReward(ctx, reward);
            results.push(result);
            if (result.success) {
                successCount++;
            }
        }

        return {
            success: true,
            message: `成功发放 ${successCount}/${args.rewards.length} 个门票奖励`,
            results,
            successCount,
        };
    },
});

/**
 * 批量购买门票
 */
export const batchPurchaseTickets = mutation({
    args: {
        purchases: v.array(v.object({
            uid: v.string(),
            type: v.string(),
            quantity: v.number(),
        })),
    },
    handler: async (ctx, args) => {
        const results = [];
        const successCount = 0;

        for (const purchase of args.purchases) {
            const result = await TicketSystem.purchaseTicket(ctx, purchase);
            results.push(result);
            if (result.success) {
                successCount++;
            }
        }

        return {
            success: true,
            message: `成功购买 ${successCount}/${args.purchases.length} 个门票`,
            results,
            successCount,
        };
    },
}); 