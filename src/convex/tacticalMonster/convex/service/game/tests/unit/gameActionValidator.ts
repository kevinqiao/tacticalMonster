/**
 * GameActionValidator 单元测试
 * 测试游戏操作验证器的各个验证方法
 */

import { v } from "convex/values";
import { internalMutation } from "../../../../_generated/server";
import { GameActionValidator } from "../../gameActionValidator";
import {
    createMockGameModel,
    createMockGameMonster,
    createMockCharacterGetter,
    createTestResult,
    TestResult,
} from "./testUtils";

/**
 * 测试 validateGameStatus 方法
 */
export const testGameActionValidatorValidateGameStatus = internalMutation({
    args: {},
    handler: async (ctx): Promise<TestResult> => {
        const testResult = createTestResult("testGameActionValidatorValidateGameStatus");

        try {
            // 1. 测试游戏不存在的情况
            testResult.steps.push("测试1: 游戏不存在");
            const validator1 = new GameActionValidator(
                ctx,
                null,
                createMockCharacterGetter(null)
            );
            const result1 = validator1.validateGameStatus();
            if (result1.valid || result1.message !== "游戏不存在") {
                testResult.errors.push(`测试1失败: 期望 invalid, 实际 ${result1.valid}`);
            } else {
                testResult.steps.push("✓ 测试1通过: 游戏不存在时返回错误");
            }

            // 2. 测试游戏已结束的情况
            testResult.steps.push("测试2: 游戏已结束");
            const gameEnded = createMockGameModel({ status: 1 }); // won
            const validator2 = new GameActionValidator(
                ctx,
                gameEnded,
                createMockCharacterGetter(gameEnded)
            );
            const result2 = validator2.validateGameStatus();
            if (result2.valid || result2.message !== "游戏已结束，无法执行操作") {
                testResult.errors.push(`测试2失败: 期望 invalid, 实际 ${result2.valid}`);
            } else {
                testResult.steps.push("✓ 测试2通过: 游戏已结束时返回错误");
            }

            // 3. 测试游戏进行中的情况
            testResult.steps.push("测试3: 游戏进行中");
            const gameInProgress = createMockGameModel({ status: 0 }); // waiting
            const validator3 = new GameActionValidator(
                ctx,
                gameInProgress,
                createMockCharacterGetter(gameInProgress)
            );
            const result3 = validator3.validateGameStatus();
            if (!result3.valid) {
                testResult.errors.push(`测试3失败: 期望 valid, 实际 ${result3.valid}`);
            } else {
                testResult.steps.push("✓ 测试3通过: 游戏进行中时返回有效");
            }

            testResult.success = testResult.errors.length === 0;
        } catch (error: any) {
            testResult.errors.push(`测试异常: ${error.message}`);
        }

        return testResult;
    },
});

/**
 * 测试 validateTurn 方法
 */
export const testGameActionValidatorValidateTurn = internalMutation({
    args: {},
    handler: async (ctx): Promise<TestResult> => {
        const testResult = createTestResult("testGameActionValidatorValidateTurn");

        try {
            const game = createMockGameModel();
            const gameId = `test_unit_${Date.now()}`;
            game.gameId = gameId;

            // 1. 测试游戏不存在的情况
            testResult.steps.push("测试1: 游戏不存在");
            const validator1 = new GameActionValidator(
                ctx,
                null,
                createMockCharacterGetter(null)
            );
            const result1 = await validator1.validateTurn({ monsterId: "monster_001" });
            if (result1.valid || result1.message !== "游戏回合信息不存在") {
                testResult.errors.push(`测试1失败: 期望 invalid, 实际 ${result1.valid}`);
            } else {
                testResult.steps.push("✓ 测试1通过: 游戏不存在时返回错误");
            }

            // 2. 测试当前回合匹配的情况（需要插入真实的回合数据）
            testResult.steps.push("测试2: 当前回合匹配");
            if (game.currentRound) {
                // 插入回合数据到数据库
                await ctx.db.insert("mr_game_round", {
                    gameId,
                    no: game.currentRound.no,
                    status: 0,
                    turns: game.currentRound.turns,
                });

                const validator2 = new GameActionValidator(
                    ctx,
                    game,
                    createMockCharacterGetter(game)
                );
                const result2 = await validator2.validateTurn({ monsterId: "monster_001" });
                
                // 清理测试数据
                const roundDoc = await ctx.db
                    .query("mr_game_round")
                    .withIndex("by_game_round", (q: any) => q.eq("gameId", gameId).eq("no", game.currentRound!.no))
                    .unique();
                if (roundDoc) {
                    await ctx.db.delete(roundDoc._id);
                }

                if (!result2.valid) {
                    testResult.errors.push(`测试2失败: 期望 valid, 实际 ${result2.valid}, 消息: ${result2.message}`);
                } else {
                    testResult.steps.push("✓ 测试2通过: 当前回合匹配时返回有效");
                }
            } else {
                testResult.steps.push("⚠ 测试2跳过: 游戏没有回合数据");
            }

            // 3. 测试当前回合不匹配的情况
            testResult.steps.push("测试3: 当前回合不匹配");
            if (game.currentRound) {
                // 插入回合数据到数据库
                await ctx.db.insert("mr_game_round", {
                    gameId,
                    no: game.currentRound.no,
                    status: 0,
                    turns: game.currentRound.turns,
                });

                const validator3 = new GameActionValidator(
                    ctx,
                    game,
                    createMockCharacterGetter(game)
                );
                const result3 = await validator3.validateTurn({ monsterId: "monster_002" });
                
                // 清理测试数据
                const roundDoc = await ctx.db
                    .query("mr_game_round")
                    .withIndex("by_game_round", (q: any) => q.eq("gameId", gameId).eq("no", game.currentRound!.no))
                    .unique();
                if (roundDoc) {
                    await ctx.db.delete(roundDoc._id);
                }

                if (result3.valid || result3.message !== "不是当前回合，无法执行操作") {
                    testResult.errors.push(`测试3失败: 期望 invalid, 实际 ${result3.valid}`);
                } else {
                    testResult.steps.push("✓ 测试3通过: 当前回合不匹配时返回错误");
                }
            } else {
                testResult.steps.push("⚠ 测试3跳过: 游戏没有回合数据");
            }

            // 4. 测试回合已完成的情况
            testResult.steps.push("测试4: 回合已完成");
            const gameWithCompletedTurn = createMockGameModel();
            gameWithCompletedTurn.gameId = gameId;
            if (gameWithCompletedTurn.currentRound) {
                // 所有回合都已完成
                gameWithCompletedTurn.currentRound.turns = gameWithCompletedTurn.currentRound.turns.map(t => ({
                    ...t,
                    status: 2, // COMPLETED
                }));
                
                // 插入回合数据到数据库
                await ctx.db.insert("mr_game_round", {
                    gameId,
                    no: gameWithCompletedTurn.currentRound.no,
                    status: 0,
                    turns: gameWithCompletedTurn.currentRound.turns,
                });

                const validator4 = new GameActionValidator(
                    ctx,
                    gameWithCompletedTurn,
                    createMockCharacterGetter(gameWithCompletedTurn)
                );
                const result4 = await validator4.validateTurn({ monsterId: "monster_001" });
                
                // 清理测试数据
                const roundDoc4 = await ctx.db
                    .query("mr_game_round")
                    .withIndex("by_game_round", (q: any) => q.eq("gameId", gameId).eq("no", gameWithCompletedTurn.currentRound!.no))
                    .unique();
                if (roundDoc4) {
                    await ctx.db.delete(roundDoc4._id);
                }

                if (result4.valid || result4.message !== "当前没有进行中的回合") {
                    testResult.errors.push(`测试4失败: 期望 invalid, 实际 ${result4.valid}`);
                } else {
                    testResult.steps.push("✓ 测试4通过: 回合已完成时返回错误");
                }
            } else {
                testResult.steps.push("⚠ 测试4跳过: 游戏没有回合数据");
            }

            testResult.success = testResult.errors.length === 0;
        } catch (error: any) {
            testResult.errors.push(`测试异常: ${error.message}`);
        }

        return testResult;
    },
});

/**
 * 测试 validatePosition 方法
 */
export const testGameActionValidatorValidatePosition = internalMutation({
    args: {},
    handler: async (ctx): Promise<TestResult> => {
        const testResult = createTestResult("testGameActionValidatorValidatePosition");

        try {
            const game = createMockGameModel();
            const validator = new GameActionValidator(
                ctx,
                game,
                createMockCharacterGetter(game)
            );

            // 1. 测试有效位置
            testResult.steps.push("测试1: 有效位置");
            const result1 = validator.validatePosition({ q: 5, r: 5 });
            if (!result1.valid) {
                testResult.errors.push(`测试1失败: 期望 valid, 实际 ${result1.valid}`);
            } else {
                testResult.steps.push("✓ 测试1通过: 有效位置返回有效");
            }

            // 2. 测试位置超出地图范围（q 超出）
            testResult.steps.push("测试2: q 超出地图范围");
            const result2 = validator.validatePosition({ q: 25, r: 5 });
            if (result2.valid || !result2.message?.includes("位置超出地图范围")) {
                testResult.errors.push(`测试2失败: 期望 invalid, 实际 ${result2.valid}`);
            } else {
                testResult.steps.push("✓ 测试2通过: q 超出时返回错误");
            }

            // 3. 测试位置超出地图范围（r 超出）
            testResult.steps.push("测试3: r 超出地图范围");
            const result3 = validator.validatePosition({ q: 5, r: 25 });
            if (result3.valid || !result3.message?.includes("位置超出地图范围")) {
                testResult.errors.push(`测试3失败: 期望 invalid, 实际 ${result3.valid}`);
            } else {
                testResult.steps.push("✓ 测试3通过: r 超出时返回错误");
            }

            // 4. 测试位置在禁用区域
            testResult.steps.push("测试4: 位置在禁用区域");
            const gameWithDisables = createMockGameModel({
                map: {
                    rows: 20,
                    cols: 20,
                    disables: [{ q: 10, r: 10 }],
                    obstacles: [],
                },
            });
            const validator4 = new GameActionValidator(
                ctx,
                gameWithDisables,
                createMockCharacterGetter(gameWithDisables)
            );
            const result4 = validator4.validatePosition({ q: 10, r: 10 });
            if (result4.valid || result4.message !== "目标位置在禁用区域") {
                testResult.errors.push(`测试4失败: 期望 invalid, 实际 ${result4.valid}`);
            } else {
                testResult.steps.push("✓ 测试4通过: 禁用区域返回错误");
            }

            // 5. 测试位置被障碍物占用
            testResult.steps.push("测试5: 位置被障碍物占用");
            const gameWithObstacles = createMockGameModel({
                map: {
                    rows: 20,
                    cols: 20,
                    obstacles: [{ q: 15, r: 15, type: 1 }],
                    disables: [],
                },
            });
            const validator5 = new GameActionValidator(
                ctx,
                gameWithObstacles,
                createMockCharacterGetter(gameWithObstacles)
            );
            const result5 = validator5.validatePosition({ q: 15, r: 15 });
            if (result5.valid || result5.message !== "目标位置被障碍物占用") {
                testResult.errors.push(`测试5失败: 期望 invalid, 实际 ${result5.valid}`);
            } else {
                testResult.steps.push("✓ 测试5通过: 障碍物返回错误");
            }

            testResult.success = testResult.errors.length === 0;
        } catch (error: any) {
            testResult.errors.push(`测试异常: ${error.message}`);
        }

        return testResult;
    },
});

/**
 * 测试 validateWalkable 方法
 */
export const testGameActionValidatorValidateWalkable = internalMutation({
    args: {},
    handler: async (ctx): Promise<TestResult> => {
        const testResult = createTestResult("testGameActionValidatorValidateWalkable");

        try {
            const game = createMockGameModel();
            const validator = new GameActionValidator(
                ctx,
                game,
                createMockCharacterGetter(game)
            );

            const character = createMockGameMonster({
                q: 5,
                r: 5,
                move_range: 3,
            });

            // 1. 测试有效移动（距离在范围内）
            testResult.steps.push("测试1: 有效移动");
            const result1 = validator.validateWalkable(character, { q: 5, r: 5 }, { q: 6, r: 6 });
            if (!result1.valid) {
                testResult.errors.push(`测试1失败: 期望 valid, 实际 ${result1.valid}, 消息: ${result1.message}`);
            } else {
                testResult.steps.push("✓ 测试1通过: 有效移动返回有效");
            }

            // 2. 测试移动距离超出范围
            testResult.steps.push("测试2: 移动距离超出范围");
            const result2 = validator.validateWalkable(character, { q: 5, r: 5 }, { q: 10, r: 10 });
            if (result2.valid || !result2.message?.includes("移动距离")) {
                testResult.errors.push(`测试2失败: 期望 invalid, 实际 ${result2.valid}`);
            } else {
                testResult.steps.push("✓ 测试2通过: 距离超出时返回错误");
            }

            // 3. 测试目标位置被占用
            testResult.steps.push("测试3: 目标位置被占用");
            const gameWithOccupied = createMockGameModel();
            // 设置一个角色在目标位置
            if (gameWithOccupied.team[1]) {
                gameWithOccupied.team[1].q = 6;
                gameWithOccupied.team[1].r = 6;
            }
            const validator3 = new GameActionValidator(
                ctx,
                gameWithOccupied,
                createMockCharacterGetter(gameWithOccupied)
            );
            const result3 = validator3.validateWalkable(character, { q: 5, r: 5 }, { q: 6, r: 6 });
            if (result3.valid || result3.message !== "目标位置已被其他角色占用") {
                testResult.errors.push(`测试3失败: 期望 invalid, 实际 ${result3.valid}`);
            } else {
                testResult.steps.push("✓ 测试3通过: 位置被占用时返回错误");
            }

            // 4. 测试飞行单位可以忽略障碍物
            testResult.steps.push("测试4: 飞行单位忽略障碍物");
            const flyingCharacter = createMockGameMonster({
                q: 5,
                r: 5,
                move_range: 3,
                isFlying: true,
                canIgnoreObstacles: true,
            });
            const gameWithObstacles = createMockGameModel({
                map: {
                    rows: 20,
                    cols: 20,
                    obstacles: [{ q: 6, r: 6, type: 1 }],
                    disables: [],
                },
            });
            const validator4 = new GameActionValidator(
                ctx,
                gameWithObstacles,
                createMockCharacterGetter(gameWithObstacles)
            );
            const result4 = validator4.validateWalkable(flyingCharacter, { q: 5, r: 5 }, { q: 6, r: 6 });
            if (!result4.valid) {
                testResult.errors.push(`测试4失败: 期望 valid, 实际 ${result4.valid}`);
            } else {
                testResult.steps.push("✓ 测试4通过: 飞行单位可以忽略障碍物");
            }

            testResult.success = testResult.errors.length === 0;
        } catch (error: any) {
            testResult.errors.push(`测试异常: ${error.message}`);
        }

        return testResult;
    },
});

/**
 * 测试 validateAction 方法（组合验证）
 */
export const testGameActionValidatorValidateAction = internalMutation({
    args: {},
    handler: async (ctx): Promise<TestResult> => {
        const testResult = createTestResult("testGameActionValidatorValidateAction");

        try {
            const game = createMockGameModel();
            const gameId = `test_unit_${Date.now()}`;
            game.gameId = gameId;

            // 插入回合数据到数据库（用于测试1和测试2）
            if (game.currentRound) {
                await ctx.db.insert("mr_game_round", {
                    gameId,
                    no: game.currentRound.no,
                    status: 0,
                    turns: game.currentRound.turns,
                });
            }

            try {
                const validator = new GameActionValidator(
                    ctx,
                    game,
                    createMockCharacterGetter(game)
                );

                // 1. 测试完整验证通过
                testResult.steps.push("测试1: 完整验证通过");
                const result1 = await validator.validateAction(
                    { monsterId: "monster_001" },
                    {
                        validatePosition: {
                            from: { q: 0, r: 0 },
                            to: { q: 1, r: 1 },
                        },
                    }
                );
                if (!result1.valid) {
                    testResult.errors.push(`测试1失败: 期望 valid, 实际 ${result1.valid}, 消息: ${result1.message}`);
                } else {
                    testResult.steps.push("✓ 测试1通过: 完整验证通过");
                }

                // 2. 测试跳过回合验证
                testResult.steps.push("测试2: 跳过回合验证");
                const result2 = await validator.validateAction(
                    { monsterId: "monster_002" },
                    {
                        validateTurn: false,
                        validatePosition: {
                            from: { q: 1, r: 0 },
                            to: { q: 2, r: 1 },
                        },
                    }
                );
                if (!result2.valid) {
                    testResult.errors.push(`测试2失败: 期望 valid, 实际 ${result2.valid}, 消息: ${result2.message}`);
                } else {
                    testResult.steps.push("✓ 测试2通过: 跳过回合验证后通过");
                }

                // 3. 测试游戏状态验证失败
                testResult.steps.push("测试3: 游戏状态验证失败");
                const gameEnded = createMockGameModel({ status: 1 });
                const validator3 = new GameActionValidator(
                    ctx,
                    gameEnded,
                    createMockCharacterGetter(gameEnded)
                );
                const result3 = await validator3.validateAction({ monsterId: "monster_001" });
                if (result3.valid || result3.message !== "游戏已结束，无法执行操作") {
                    testResult.errors.push(`测试3失败: 期望 invalid, 实际 ${result3.valid}`);
                } else {
                    testResult.steps.push("✓ 测试3通过: 游戏状态验证失败");
                }
            } finally {
                // 清理测试数据
                if (game.currentRound) {
                    const roundDoc = await ctx.db
                        .query("mr_game_round")
                        .withIndex("by_game_round", (q: any) => q.eq("gameId", gameId).eq("no", game.currentRound!.no))
                        .unique();
                    if (roundDoc) {
                        await ctx.db.delete(roundDoc._id);
                    }
                }
            }

            testResult.success = testResult.errors.length === 0;
        } catch (error: any) {
            testResult.errors.push(`测试异常: ${error.message}`);
        }

        return testResult;
    },
});
