import { mutation, v } from "../_generated/server";
import { TicketSystem } from "../service/ticket/ticketSystem";

// ============================================================================
// 门票系统测试脚本
// ============================================================================

/**
 * 测试门票系统的统一性
 */
export const testTicketSystem = mutation({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        const { uid } = args;
        const results = [];

        try {
            // 测试1: 获取门票配置
            const configs = TicketSystem.getAllTicketConfigs();
            results.push({
                test: "获取门票配置",
                success: true,
                data: configs
            });

            // 测试2: 购买门票
            const purchaseResult = await TicketSystem.purchaseTicket(ctx, {
                uid,
                type: "bronze",
                quantity: 5
            });
            results.push({
                test: "购买门票",
                success: purchaseResult.success,
                data: purchaseResult
            });

            // 测试3: 获取玩家门票
            const playerTickets = await TicketSystem.getPlayerTickets(ctx, uid);
            results.push({
                test: "获取玩家门票",
                success: true,
                data: playerTickets
            });

            // 测试4: 使用门票
            const useResult = await TicketSystem.useTicket(ctx, {
                uid,
                type: "bronze"
            });
            results.push({
                test: "使用门票",
                success: useResult.success,
                data: useResult
            });

            // 测试5: 发放门票奖励
            const grantResult = await TicketSystem.grantTicketReward(ctx, {
                uid,
                type: "silver",
                quantity: 2
            });
            results.push({
                test: "发放门票奖励",
                success: grantResult.success,
                data: grantResult
            });

            return {
                success: true,
                message: "门票系统测试完成",
                results
            };

        } catch (error) {
            console.error("门票系统测试失败:", error);
            return {
                success: false,
                message: error instanceof Error ? error.message : "测试失败",
                results
            };
        }
    },
});

/**
 * 测试门票的统一性（无游戏类型限制）
 */
export const testTicketUnified = mutation({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        const { uid } = args;
        const testCases = [
            { type: "bronze", gameType: "ludo" },
            { type: "bronze", gameType: "solitaire" },
            { type: "silver", gameType: "ludo" },
            { type: "silver", gameType: "solitaire" },
            { type: "gold", gameType: "ludo" },
            { type: "gold", gameType: "solitaire" }
        ];

        const results = [];

        for (const testCase of testCases) {
            try {
                // 测试门票使用（应该对所有游戏类型都有效）
                const useResult = await TicketSystem.useTicket(ctx, {
                    uid,
                    type: testCase.type
                });

                results.push({
                    test: `${testCase.type} 门票用于 ${testCase.gameType}`,
                    success: useResult.success,
                    data: {
                        type: testCase.type,
                        gameType: testCase.gameType,
                        success: useResult.success,
                        message: useResult.message,
                        remainingQuantity: useResult.remainingQuantity
                    }
                });

            } catch (error) {
                results.push({
                    test: `${testCase.type} 门票用于 ${testCase.gameType}`,
                    success: false,
                    error: error instanceof Error ? error.message : "未知错误"
                });
            }
        }

        return {
            success: true,
            message: "门票统一性测试完成",
            results
        };
    },
}); 