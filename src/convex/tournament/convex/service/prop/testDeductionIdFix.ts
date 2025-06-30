import { internal } from "../../_generated/api";
import { mutation } from "../../_generated/server";

// 测试 deductionId 修复
export const testDeductionIdFix = (mutation as any)({
    args: {},
    handler: async (ctx: any) => {
        console.log("开始测试 deductionId 修复...");

        const testUid = "deduction_test_player";
        const results: any[] = [];

        try {
            // 1. 创建玩家库存
            console.log("1. 创建玩家库存...");
            await ctx.runMutation((internal as any)["service/prop/inventoryManager"].createPlayerInventory, {
                uid: testUid
            });

            // 2. 添加道具
            console.log("2. 添加道具...");
            await ctx.runMutation((internal as any)["service/prop/inventoryManager"].addProps, {
                uid: testUid,
                props: [
                    { gameType: "solitaire", propType: "hint", quantity: 2 },
                    { gameType: "ludo", propType: "dice_boost", quantity: 2 }
                ]
            });

            // 3. 测试实时扣除（应该不包含 deductionId）
            console.log("3. 测试实时扣除...");
            const immediateResult = await ctx.runMutation((internal as any)["service/prop/unifiedPropManager"].useProp, {
                uid: testUid,
                gameType: "ludo",
                propType: "dice_boost",
                gameState: { currentPlayer: "player1", diceValue: 3 },
                mode: "immediate"
            });
            results.push({ test: "immediate_deduction", success: true, result: immediateResult });

            // 4. 测试延迟扣除（应该包含 deductionId）
            console.log("4. 测试延迟扣除...");
            const delayedResult = await ctx.runMutation((internal as any)["service/prop/unifiedPropManager"].useProp, {
                uid: testUid,
                gameType: "solitaire",
                propType: "hint",
                gameState: { moves: [1, 2], isCompleted: false },
                mode: "delayed",
                gameId: "test_deduction_001"
            });
            results.push({ test: "delayed_deduction", success: true, result: delayedResult });

            // 5. 验证日志记录
            console.log("5. 验证日志记录...");
            const usageLogs = await ctx.runQuery((internal as any)["service/prop/unifiedPropManager"].getPropUsageHistory, {
                uid: testUid,
                limit: 10
            });
            results.push({ test: "usage_logs", success: true, result: usageLogs });

            // 6. 执行延迟扣除
            console.log("6. 执行延迟扣除...");
            const executeResult = await ctx.runMutation((internal as any)["service/prop/unifiedPropManager"].executeDelayedDeduction, {
                gameId: "test_deduction_001",
                uid: testUid,
                gameResult: { score: 1000, completed: true }
            });
            results.push({ test: "execute_deduction", success: true, result: executeResult });

            // 7. 清理测试数据
            console.log("7. 清理测试数据...");
            await ctx.runMutation((internal as any)["service/prop/testUnifiedPropManager"].cleanupTestData, {
                uid: testUid
            });

            return {
                success: true,
                message: "deductionId 修复测试完成",
                testUid,
                results,
                summary: {
                    totalTests: results.length,
                    successfulTests: results.filter((r: any) => r.success).length,
                    usageLogsCount: usageLogs.length,
                    immediateLogs: usageLogs.filter((log: any) => log.deductionMode === "immediate").length,
                    delayedLogs: usageLogs.filter((log: any) => log.deductionMode === "delayed").length
                }
            };

        } catch (error: any) {
            console.error("deductionId 修复测试失败:", error);

            // 尝试清理测试数据
            try {
                await ctx.runMutation((internal as any)["service/prop/testUnifiedPropManager"].cleanupTestData, {
                    uid: testUid
                });
            } catch (cleanupError) {
                console.error("清理测试数据失败:", cleanupError);
            }

            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                testUid,
                results
            };
        }
    }
});

// 简单测试 - 只测试实时扣除
export const testImmediateDeductionOnly = (mutation as any)({
    args: {},
    handler: async (ctx: any) => {
        console.log("开始测试实时扣除...");

        const testUid = "immediate_test_player";

        try {
            // 1. 创建玩家库存
            await ctx.runMutation((internal as any)["service/prop/inventoryManager"].createPlayerInventory, {
                uid: testUid
            });

            // 2. 添加道具
            await ctx.runMutation((internal as any)["service/prop/inventoryManager"].addProps, {
                uid: testUid,
                props: [
                    { gameType: "ludo", propType: "dice_boost", quantity: 4 }
                ]
            });

            // // 3. 测试实时扣除
            const result = await ctx.runMutation((internal as any)["service/prop/unifiedPropManager"].useProp, {
                uid: testUid,
                gameType: "ludo",
                propType: "dice_boost",
                gameState: { currentPlayer: "player1", diceValue: 3 },
                mode: "immediate"
            });

            // 4. 验证日志记录
            const usageLogs = await ctx.runQuery((internal as any)["service/prop/unifiedPropManager"].getPropUsageHistory, {
                uid: testUid,
                limit: 5
            });

            // 5. 清理测试数据
            // await ctx.runMutation((internal as any)["service/prop/testUnifiedPropManager"].cleanupTestData, {
            //     uid: testUid
            // });

            return {
                success: true,
                message: "实时扣除测试完成",
                // result,
                usageLogs,
                hasDeductionId: usageLogs?.some((log: any) => log.deductionId !== undefined)
            };

        } catch (error: any) {
            console.error("实时扣除测试失败:", error);

            // 尝试清理测试数据
            try {
                await ctx.runMutation((internal as any)["service/prop/testUnifiedPropManager"].cleanupTestData, {
                    uid: testUid
                });
            } catch (cleanupError) {
                console.error("清理测试数据失败:", cleanupError);
            }

            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
}); 