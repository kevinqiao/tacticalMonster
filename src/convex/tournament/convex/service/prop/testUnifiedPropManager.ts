// @ts-nocheck
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { mutation } from "../../_generated/server";

// 测试统一道具管理器
export const testUnifiedPropManager = (mutation as any)({
    args: {},
    handler: async (ctx: any) => {
        console.log("开始测试统一道具管理器...");

        const testUid = "unified_test_player_123";
        const results: any[] = [];

        try {
            // 1. 创建玩家库存
            console.log("1. 创建玩家库存...");
            const createResult = await ctx.runMutation((internal as any)["service/inventoryManager"].createPlayerInventory, {
                uid: testUid
            });
            results.push({ step: "create_inventory", success: true, result: createResult });

            // 2. 添加道具到库存
            console.log("2. 添加道具到库存...");
            const addPropsResult = await ctx.runMutation((internal as any)["service/inventoryManager"].addProps, {
                uid: testUid,
                props: [
                    { gameType: "solitaire", propType: "hint", quantity: 10 },
                    { gameType: "solitaire", propType: "undo", quantity: 5 },
                    { gameType: "solitaire", propType: "shuffle", quantity: 3 },
                    { gameType: "ludo", propType: "dice_boost", quantity: 8 },
                    { gameType: "ludo", propType: "shield", quantity: 4 }
                ]
            });
            results.push({ step: "add_props", success: true, result: addPropsResult });

            // 3. 测试游戏模式适配器
            console.log("3. 测试游戏模式适配器...");
            const gameModeResult = await ctx.runQuery((internal as any)["service/prop/gameModeAdapter"].getAllGameTypes, {});
            results.push({ step: "game_mode_adapter", success: true, result: gameModeResult });

            // 4. 测试纸牌游戏延迟扣除模式
            console.log("4. 测试纸牌游戏延迟扣除模式...");
            const solitaireGameId = "solitaire_game_001";
            const solitaireGameState = {
                moves: [1, 2, 3],
                remainingCards: [4, 5, 6, 7, 8, 9, 10],
                isCompleted: false,
                timeRemaining: 200
            };

            // 使用提示道具（延迟扣除）
            const useHintResult = await ctx.runMutation((internal as any)["service/prop/unifiedPropManager"].useProp, {
                uid: testUid,
                gameType: "solitaire",
                propType: "hint",
                gameState: solitaireGameState,
                mode: "delayed",
                gameId: solitaireGameId
            });
            results.push({ step: "use_hint_delayed", success: true, result: useHintResult });

            // 使用撤销道具（延迟扣除）
            const useUndoResult = await ctx.runMutation((internal as any)["service/prop/unifiedPropManager"].useProp, {
                uid: testUid,
                gameType: "solitaire",
                propType: "undo",
                gameState: useHintResult.newGameState,
                mode: "delayed",
                gameId: solitaireGameId
            });
            results.push({ step: "use_undo_delayed", success: true, result: useUndoResult });

            // 5. 测试飞行棋游戏实时扣除模式
            console.log("5. 测试飞行棋游戏实时扣除模式...");
            const ludoGameState = {
                currentPlayer: "player1",
                playerId: "player1",
                diceValue: 3,
                hasShield: false,
                shieldDuration: 0
            };

            // 使用骰子增强道具（实时扣除）
            const useDiceBoostResult = await ctx.runMutation((internal as any)["service/prop/unifiedPropManager"].useProp, {
                uid: testUid,
                gameType: "ludo",
                propType: "dice_boost",
                gameState: ludoGameState,
                mode: "immediate"
            });
            results.push({ step: "use_dice_boost_immediate", success: true, result: useDiceBoostResult });

            // 6. 测试批量使用道具
            console.log("6. 测试批量使用道具...");
            const batchUseResult = await ctx.runMutation((internal as any)["service/prop/unifiedPropManager"].useMultipleProps, {
                uid: testUid,
                gameType: "solitaire",
                props: [
                    { propType: "shuffle" },
                    { propType: "hint" }
                ],
                gameState: {
                    moves: [1, 2, 3, 4],
                    remainingCards: [5, 6, 7, 8],
                    isCompleted: false
                },
                mode: "delayed",
                gameId: "batch_game_001"
            });
            results.push({ step: "batch_use_props", success: true, result: batchUseResult });

            // 7. 测试执行延迟扣除
            console.log("7. 测试执行延迟扣除...");
            const executeDeductionResult = await ctx.runMutation((internal as any)["service/prop/unifiedPropManager"].executeDelayedDeduction, {
                gameId: solitaireGameId,
                uid: testUid,
                gameResult: {
                    score: 1500,
                    gameData: { moves: 50, timeTaken: 180 },
                    propsUsed: ["hint", "undo"],
                    completed: true
                }
            });
            results.push({ step: "execute_delayed_deduction", success: true, result: executeDeductionResult });

            // 8. 测试取消延迟扣除
            console.log("8. 测试取消延迟扣除...");
            const cancelDeductionResult = await ctx.runMutation((internal as any)["service/prop/unifiedPropManager"].cancelDelayedDeduction, {
                gameId: "batch_game_001",
                uid: testUid,
                reason: "游戏中断测试"
            });
            results.push({ step: "cancel_delayed_deduction", success: true, result: cancelDeductionResult });

            // 9. 获取道具使用历史
            console.log("9. 获取道具使用历史...");
            const historyResult = await ctx.runQuery((internal as any)["service/prop/unifiedPropManager"].getPropUsageHistory, {
                uid: testUid,
                limit: 10
            });
            results.push({ step: "get_prop_history", success: true, result: historyResult });

            // 10. 获取延迟扣除记录
            console.log("10. 获取延迟扣除记录...");
            const delayedDeductionsResult = await ctx.runQuery((internal as any)["service/prop/unifiedPropManager"].getDelayedPropDeductions, {
                uid: testUid
            });
            results.push({ step: "get_delayed_deductions", success: true, result: delayedDeductionsResult });

            // 11. 测试游戏模式自动适配
            console.log("11. 测试游戏模式自动适配...");
            const solitaireModeResult = await ctx.runQuery((internal as any)["service/prop/gameModeAdapter"].determineDeductionMode, {
                gameType: "solitaire"
            });
            results.push({ step: "solitaire_mode_determination", success: true, result: solitaireModeResult });

            const ludoModeResult = await ctx.runQuery((internal as any)["service/prop/gameModeAdapter"].determineDeductionMode, {
                gameType: "ludo"
            });
            results.push({ step: "ludo_mode_determination", success: true, result: ludoModeResult });

            // 12. 获取最终库存状态
            console.log("12. 获取最终库存状态...");
            const finalInventoryResult = await ctx.runQuery((internal as any)["service/inventoryManager"].getInventoryStats, {
                uid: testUid
            });
            results.push({ step: "final_inventory", success: true, result: finalInventoryResult });

            return {
                success: true,
                message: "统一道具管理器测试完成",
                testUid,
                results,
                summary: {
                    totalSteps: results.length,
                    successfulSteps: results.filter((r: any) => r.success).length,
                    failedSteps: results.filter((r: any) => !r.success).length
                }
            };

        } catch (error: any) {
            console.error("统一道具管理器测试失败:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                testUid,
                results,
                summary: {
                    totalSteps: results.length,
                    successfulSteps: results.filter((r: any) => r.success).length,
                    failedSteps: results.filter((r: any) => !r.success).length
                }
            };
        }
    }
});

// 测试特定游戏场景
export const testGameScenarios = (mutation as any)({
    args: {},
    handler: async (ctx: any) => {
        console.log("开始测试游戏场景...");

        const testUid = "scenario_test_player";
        const results: any[] = [];

        try {
            // 1. 创建玩家库存
            await ctx.runMutation((internal as any)["service/inventoryManager"].createPlayerInventory, {
                uid: testUid
            });

            // 2. 添加测试道具
            await ctx.runMutation((internal as any)["service/inventoryManager"].addProps, {
                uid: testUid,
                props: [
                    { gameType: "solitaire", propType: "hint", quantity: 5 },
                    { gameType: "solitaire", propType: "undo", quantity: 3 },
                    { gameType: "ludo", propType: "dice_boost", quantity: 4 },
                    { gameType: "rummy", propType: "peek", quantity: 2 }
                ]
            });

            // 3. 测试纸牌游戏完整流程
            console.log("3. 测试纸牌游戏完整流程...");
            const solitaireScenario = await testSolitaireScenario(ctx, testUid);
            results.push({ scenario: "solitaire", success: true, result: solitaireScenario });

            // 4. 测试飞行棋游戏完整流程
            console.log("4. 测试飞行棋游戏完整流程...");
            const ludoScenario = await testLudoScenario(ctx, testUid);
            results.push({ scenario: "ludo", success: true, result: ludoScenario });

            // 5. 测试错误处理场景
            console.log("5. 测试错误处理场景...");
            const errorScenario = await testErrorScenarios(ctx, testUid);
            results.push({ scenario: "error_handling", success: true, result: errorScenario });

            return {
                success: true,
                message: "游戏场景测试完成",
                results
            };

        } catch (error: any) {
            console.error("游戏场景测试失败:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                results
            };
        }
    }
});

// 测试纸牌游戏场景
async function testSolitaireScenario(ctx: any, uid: string) {
    const gameId = "solitaire_scenario_001";
    const results: any[] = [];

    // 游戏开始状态
    let gameState = {
        moves: [],
        remainingCards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        isCompleted: false,
        timeRemaining: 300
    };

    // 使用提示道具
    const hintResult = await ctx.runMutation((internal as any)["service/prop/unifiedPropManager"].useProp, {
        uid,
        gameType: "solitaire",
        propType: "hint",
        gameState,
        mode: "delayed",
        gameId
    });
    results.push({ step: "use_hint", result: hintResult });

    // 更新游戏状态
    gameState = hintResult.newGameState;
    gameState.moves = [1, 2, 3];

    // 使用撤销道具
    const undoResult = await ctx.runMutation((internal as any)["service/prop/unifiedPropManager"].useProp, {
        uid,
        gameType: "solitaire",
        propType: "undo",
        gameState,
        mode: "delayed",
        gameId
    });
    results.push({ step: "use_undo", result: undoResult });

    // 游戏完成，执行延迟扣除
    const deductionResult = await ctx.runMutation((internal as any)["service/prop/unifiedPropManager"].executeDelayedDeduction, {
        gameId,
        uid,
        gameResult: {
            score: 1200,
            gameData: { moves: 45, timeTaken: 250 },
            propsUsed: ["hint", "undo"],
            completed: true
        }
    });
    results.push({ step: "execute_deduction", result: deductionResult });

    return results;
}

// 测试飞行棋游戏场景
async function testLudoScenario(ctx: any, uid: string) {
    const results: any[] = [];

    // 游戏状态
    const gameState = {
        currentPlayer: "player1",
        playerId: "player1",
        diceValue: 2,
        hasShield: false,
        shieldDuration: 0
    };

    // 使用骰子增强道具（实时扣除）
    const diceBoostResult = await ctx.runMutation((internal as any)["service/prop/unifiedPropManager"].useProp, {
        uid,
        gameType: "ludo",
        propType: "dice_boost",
        gameState,
        mode: "immediate"
    });
    results.push({ step: "use_dice_boost", result: diceBoostResult });

    // 使用护盾道具（实时扣除）
    const shieldResult = await ctx.runMutation((internal as any)["service/prop/unifiedPropManager"].useProp, {
        uid,
        gameType: "ludo",
        propType: "shield",
        gameState: diceBoostResult.newGameState,
        mode: "immediate"
    });
    results.push({ step: "use_shield", result: shieldResult });

    return results;
}

// 测试错误处理场景
async function testErrorScenarios(ctx: any, uid: string) {
    const results: any[] = [];

    // 1. 测试使用不存在的道具
    try {
        await ctx.runMutation((internal as any)["service/prop/unifiedPropManager"].useProp, {
            uid,
            gameType: "solitaire",
            propType: "nonexistent_prop",
            gameState: {},
            mode: "delayed"
        });
        results.push({ test: "nonexistent_prop", success: false, expected: "应该失败" });
    } catch (error: any) {
        results.push({ test: "nonexistent_prop", success: true, error: error instanceof Error ? error.message : String(error) });
    }

    // 2. 测试道具数量不足
    try {
        // 先使用所有提示道具
        for (let i = 0; i < 6; i++) {
            await ctx.runMutation((internal as any)["service/prop/unifiedPropManager"].useProp, {
                uid,
                gameType: "solitaire",
                propType: "hint",
                gameState: { moves: [i], isCompleted: false },
                mode: "immediate"
            });
        }
        results.push({ test: "insufficient_props", success: false, expected: "应该失败" });
    } catch (error: any) {
        results.push({ test: "insufficient_props", success: true, error: error instanceof Error ? error.message : String(error) });
    }

    // 3. 测试无效的游戏模式
    try {
        await ctx.runMutation((internal as any)["service/prop/unifiedPropManager"].useProp, {
            uid,
            gameType: "ludo",
            propType: "dice_boost",
            gameState: {},
            mode: "invalid_mode"
        });
        results.push({ test: "invalid_mode", success: false, expected: "应该失败" });
    } catch (error: any) {
        results.push({ test: "invalid_mode", success: true, error: error instanceof Error ? error.message : String(error) });
    }

    return results;
}

// 清理测试数据
export const cleanupTestData = (mutation as any)({
    args: { uid: v.string() },
    handler: async (ctx: any, args: any) => {
        const { uid } = args;

        try {
            // 删除玩家库存
            const inventory = await ctx.db
                .query("player_inventory")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .first();

            if (inventory) {
                await ctx.db.delete(inventory._id);
            }

            // 删除道具使用日志
            const usageLogs = await ctx.db
                .query("prop_usage_logs")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .collect();

            for (const log of usageLogs) {
                await ctx.db.delete(log._id);
            }

            // 删除延迟扣除记录
            const delayedDeductions = await ctx.db
                .query("delayed_prop_deductions")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .collect();

            for (const deduction of delayedDeductions) {
                await ctx.db.delete(deduction._id);
            }

            // 删除道具扣除日志
            const deductionLogs = await ctx.db
                .query("prop_deduction_logs")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .collect();

            for (const log of deductionLogs) {
                await ctx.db.delete(log._id);
            }

            return {
                success: true,
                message: `测试数据清理完成 (${uid})`,
                deleted: {
                    inventory: inventory ? 1 : 0,
                    usageLogs: usageLogs.length,
                    delayedDeductions: delayedDeductions.length,
                    deductionLogs: deductionLogs.length
                }
            };

        } catch (error: any) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
});

// 简化测试函数 - 测试核心功能
export const testUnifiedPropManagerSimple = (mutation as any)({
    args: {},
    handler: async (ctx: any) => {
        console.log("开始简化测试统一道具管理器...");

        const testUid = "simple_test_player";
        const results: any[] = [];

        try {
            // 1. 创建玩家库存
            console.log("1. 创建玩家库存...");
            await ctx.runMutation((internal as any)["service/prop/inventoryManager"].createPlayerInventory, {
                uid: testUid
            });

            // 2. 添加基础道具
            console.log("2. 添加基础道具...");
            await ctx.runMutation((internal as any)["service/prop/inventoryManager"].addProps, {
                uid: testUid,
                props: [
                    { gameType: "solitaire", propType: "hint", quantity: 3 },
                    { gameType: "ludo", propType: "dice_boost", quantity: 2 }
                ]
            });

            // 3. 测试纸牌游戏延迟扣除
            console.log("3. 测试纸牌游戏延迟扣除...");
            const solitaireResult = await ctx.runMutation((internal as any)["service/prop/unifiedPropManager"].useProp, {
                uid: testUid,
                gameType: "solitaire",
                propType: "hint",
                gameState: { moves: [1, 2], isCompleted: false },
                mode: "delayed",
                gameId: "test_solitaire_001"
            });
            results.push({ test: "solitaire_delayed", success: true, result: solitaireResult });

            // 4. 测试飞行棋实时扣除
            console.log("4. 测试飞行棋实时扣除...");
            const ludoResult = await ctx.runMutation((internal as any)["service/prop/unifiedPropManager"].useProp, {
                uid: testUid,
                gameType: "ludo",
                propType: "dice_boost",
                gameState: { currentPlayer: "player1", diceValue: 3 },
                mode: "immediate"
            });
            results.push({ test: "ludo_immediate", success: true, result: ludoResult });

            // 5. 执行延迟扣除
            console.log("5. 执行延迟扣除...");
            const deductionResult = await ctx.runMutation((internal as any)["service/prop/unifiedPropManager"].executeDelayedDeduction, {
                gameId: "test_solitaire_001",
                uid: testUid,
                gameResult: { score: 1000, completed: true }
            });
            results.push({ test: "execute_deduction", success: true, result: deductionResult });

            // 6. 获取最终库存
            console.log("6. 获取最终库存...");
            const finalInventory = await ctx.runQuery((internal as any)["service/prop/inventoryManager"].getInventoryStats, {
                uid: testUid
            });
            results.push({ test: "final_inventory", success: true, result: finalInventory });

            return {
                success: true,
                message: "简化测试完成",
                testUid,
                results,
                summary: {
                    totalTests: results.length,
                    successfulTests: results.filter((r: any) => r.success).length
                }
            };

        } catch (error: any) {
            console.error("简化测试失败:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                testUid,
                results
            };
        }
    }
});

// 测试游戏模式适配器
export const testGameModeAdapter = (mutation as any)({
    args: {},
    handler: async (ctx: any) => {
        console.log("开始测试游戏模式适配器...");

        const results: any[] = [];

        try {
            // 1. 获取所有游戏类型
            const allGameTypes = await ctx.runQuery((internal as any)["service/prop/gameModeAdapter"].getAllGameTypes, {});
            results.push({ test: "get_all_game_types", success: true, result: allGameTypes });

            // 2. 测试纸牌游戏模式
            const solitaireMode = await ctx.runQuery((internal as any)["service/prop/gameModeAdapter"].determineDeductionMode, {
                gameType: "solitaire"
            });
            results.push({ test: "solitaire_mode", success: true, result: solitaireMode });

            // 3. 测试飞行棋游戏模式
            const ludoMode = await ctx.runQuery((internal as any)["service/prop/gameModeAdapter"].determineDeductionMode, {
                gameType: "ludo"
            });
            results.push({ test: "ludo_mode", success: true, result: ludoMode });

            // 4. 获取统计信息
            const statistics = await ctx.runQuery((internal as any)["service/prop/gameModeAdapter"].getGameTypeStatistics, {});
            results.push({ test: "statistics", success: true, result: statistics });

            return {
                success: true,
                message: "游戏模式适配器测试完成",
                results
            };

        } catch (error: any) {
            console.error("游戏模式适配器测试失败:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                results
            };
        }
    }
});

// 测试 deductionId 修复
export const testDeductionIdFix = (mutation as any)({
    args: {},
    handler: async (ctx: any) => {
        console.log("开始测试 deductionId 修复...");

        const testUid = "deduction_test_player";
        const results: any[] = [];

        try {
            // 1. 创建玩家库存
            await ctx.runMutation((internal as any)["service/prop/inventoryManager"].createPlayerInventory, {
                uid: testUid
            });

            // 2. 添加道具
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

            return {
                success: true,
                message: "deductionId 修复测试完成",
                testUid,
                results,
                summary: {
                    totalTests: results.length,
                    successfulTests: results.filter((r: any) => r.success).length
                }
            };

        } catch (error: any) {
            console.error("deductionId 修复测试失败:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                testUid,
                results
            };
        }
    }
}); 