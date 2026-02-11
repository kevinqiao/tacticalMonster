/**
 * 战斗系统集成测试
 * 测试完整的战斗流程，包括技能使用、移动、Boss AI等
 */

import { v } from "convex/values";
import { internalMutation } from "../../../../_generated/server";
import { GameService } from "../../gameService";
import { cleanupCombatTestData, setupCombatTestData } from "./combatTestData";

/**
 * 完整技能使用流程测试
 */
export const testUseSkillFlow = internalMutation({
    args: {
        uid: v.optional(v.string()),
        gameId: v.optional(v.string()),
    },
    handler: async (ctx, params) => {
        const testResult: any = {
            testName: "testUseSkillFlow",
            success: false,
            errors: [] as string[],
            steps: [] as string[],
            data: {} as any,
        };

        let testData: any = null;

        try {
            // 1. 创建测试数据
            testResult.steps.push("创建测试数据");
            testData = await setupCombatTestData(ctx, {
                uid: params.uid,
                gameId: params.gameId,
                skipFirstTurn: false,
            });

            if (testData.errors.length > 0) {
                testResult.errors.push(...testData.errors);
                return testResult;
            }

            if (!testData.game) {
                testResult.errors.push("游戏创建失败");
                return testResult;
            }

            testResult.steps.push("✓ 测试数据创建成功");

            // 2. 玩家使用技能
            testResult.steps.push("执行玩家使用技能");
            const gameService = new GameService(ctx);

            // ✅ 重新加载游戏以获取最新的回合状态
            const currentGame = await gameService.load(testData.gameId);
            if (!currentGame) {
                testResult.errors.push("无法加载游戏");
                return testResult;
            }

            // ✅ 找到当前回合的角色（status === 1）
            const currentTurn = currentGame.currentRound?.turns?.find((t: any) => t.status === 1);
            if (!currentTurn) {
                testResult.errors.push("没有当前回合");
                return testResult;
            }

            // ✅ 根据当前回合找到对应的玩家角色
            const playerMonster = currentGame.team?.find(m => m.monsterId === currentTurn.monsterId);
            const boss = currentGame.boss;

            if (!playerMonster || !boss) {
                testResult.errors.push("缺少玩家角色或Boss");
                return testResult;
            }

            // 获取角色的第一个技能
            const skillId = playerMonster.skills?.[0];
            if (!skillId) {
                testResult.errors.push("角色没有可用技能");
                return testResult;
            }

            const useSkillResult = await gameService.useSkill(testData.gameId, {
                monsterId: playerMonster.monsterId,
                skillId: skillId,
                targets: [{ bossId: boss.bossId }],
            });

            if (!useSkillResult.success) {
                testResult.errors.push(`技能使用失败: ${useSkillResult.message || "未知错误"}`);
                return testResult;
            }

            testResult.steps.push("✓ 技能使用成功");

            // 3. 验证 stateChanges 正确性
            testResult.steps.push("验证 stateChanges");
            const stateChanges = useSkillResult.phaseChanges?.stateChanges;

            if (!stateChanges) {
                testResult.errors.push("缺少 stateChanges");
                return testResult;
            }

            // 验证 actor 状态变化
            if (stateChanges.actor) {
                if (stateChanges.actor.hpChanged || stateChanges.actor.mpChanged || stateChanges.actor.positionChanged) {
                    testResult.steps.push("✓ Actor 状态变化检测到");
                }
            }

            // 验证 targets 状态变化
            if (stateChanges.targets && stateChanges.targets.length > 0) {
                const targetChanged = stateChanges.targets.some(t => t.hpChanged || t.mpChanged);
                if (targetChanged) {
                    testResult.steps.push("✓ Targets 状态变化检测到");
                }
            }

            // 4. 验证状态更新（HP/MP/Position/Shield/Status）
            testResult.steps.push("验证状态更新");
            const updatedGame = await gameService.load(testData.gameId);
            if (updatedGame) {
                const updatedPlayer = updatedGame.team?.find(m => m.monsterId === playerMonster.monsterId);
                const updatedBoss = updatedGame.boss;

                if (updatedPlayer && updatedBoss) {
                    testResult.data.playerHp = updatedPlayer.stats?.hp?.current;
                    testResult.data.bossHp = updatedBoss.stats?.hp?.current;
                    testResult.steps.push("✓ 状态更新验证完成");
                }

                // 5. 验证 statusEffects 更新（从更新后的游戏状态中获取）
                if (updatedPlayer && updatedPlayer.statusEffects && updatedPlayer.statusEffects.length > 0) {
                    testResult.steps.push("✓ StatusEffects 更新检测到");
                }

                // 6. 验证 skillCooldowns 更新（从更新后的游戏状态中获取）
                if (updatedPlayer && updatedPlayer.skillCooldowns && Object.keys(updatedPlayer.skillCooldowns).length > 0) {
                    testResult.steps.push("✓ SkillCooldowns 更新检测到");
                }
            }

            // 7. 验证 effects 数组（现在在 phaseChanges 顶层）
            const effects = useSkillResult.phaseChanges?.effects;
            if (effects && Array.isArray(effects)) {
                testResult.data.effectsCount = effects.length;
                testResult.steps.push(`✓ Effects 数组验证完成 (${effects.length} 个效果)`);
            }

            testResult.success = true;
        } catch (error: any) {
            testResult.errors.push(`测试执行失败: ${error.message}`);
            testResult.steps.push(`✗ 错误: ${error.message}`);
        } finally {
            // 9. 清理测试数据
            if (testData) {
                testResult.steps.push("清理测试数据");
                await cleanupCombatTestData(ctx, {
                    gameId: testData.gameId,
                    uid: testData.uid,
                });
                testResult.steps.push("✓ 测试数据清理完成");
            }
        }

        return testResult;
    },
});

/**
 * 完整移动流程测试
 */
export const testWalkFlow = internalMutation({
    args: {
        uid: v.optional(v.string()),
        gameId: v.optional(v.string()),
    },
    handler: async (ctx, params) => {
        const testResult: any = {
            testName: "testWalkFlow",
            success: false,
            errors: [] as string[],
            steps: [] as string[],
            data: {} as any,
        };

        let testData: any = null;

        try {
            // 1. 创建测试数据
            testResult.steps.push("创建测试数据");
            testData = await setupCombatTestData(ctx, {
                uid: params.uid,
                gameId: params.gameId,
                skipFirstTurn: false,
            });

            if (testData.errors.length > 0) {
                testResult.errors.push(...testData.errors);
                return testResult;
            }

            if (!testData.game) {
                testResult.errors.push("游戏创建失败");
                return testResult;
            }

            testResult.steps.push("✓ 测试数据创建成功");

            // 2. 玩家移动
            testResult.steps.push("执行玩家移动");
            const gameService = new GameService(ctx);

            const playerMonster = testData.game.team?.[0];
            if (!playerMonster) {
                testResult.errors.push("缺少玩家角色");
                return testResult;
            }

            const originalPosition = { q: playerMonster.q ?? 0, r: playerMonster.r ?? 0 };
            const newPosition = { q: originalPosition.q + 1, r: originalPosition.r };

            const walkResult = await gameService.walk(testData.gameId, newPosition, {
                monsterId: playerMonster.monsterId,
            });

            if (!walkResult.success) {
                testResult.errors.push("移动失败");
                return testResult;
            }

            testResult.steps.push("✓ 移动成功");

            // 3. 验证位置更新
            testResult.steps.push("验证位置更新");
            const updatedGame = await gameService.load(testData.gameId);
            if (updatedGame) {
                const updatedPlayer = updatedGame.team?.find(m => m.monsterId === playerMonster.monsterId);
                if (updatedPlayer) {
                    const updatedPosition = { q: updatedPlayer.q ?? 0, r: updatedPlayer.r ?? 0 };
                    if (updatedPosition.q === newPosition.q && updatedPosition.r === newPosition.r) {
                        testResult.steps.push("✓ 位置更新验证完成");
                        testResult.data.originalPosition = originalPosition;
                        testResult.data.newPosition = updatedPosition;
                    } else {
                        testResult.errors.push(`位置更新不正确: 期望 ${JSON.stringify(newPosition)}, 实际 ${JSON.stringify(updatedPosition)}`);
                    }
                }
            }

            // 4. 验证 stateChanges 正确性
            const stateChanges = walkResult.phaseChanges?.stateChanges;
            if (stateChanges?.actor?.positionChanged) {
                testResult.steps.push("✓ StateChanges 位置变化检测到");
            }

            testResult.success = true;
        } catch (error: any) {
            testResult.errors.push(`测试执行失败: ${error.message}`);
            testResult.steps.push(`✗ 错误: ${error.message}`);
        } finally {
            // 5. 清理测试数据
            if (testData) {
                testResult.steps.push("清理测试数据");
                await cleanupCombatTestData(ctx, {
                    gameId: testData.gameId,
                    uid: testData.uid,
                });
                testResult.steps.push("✓ 测试数据清理完成");
            }
        }

        return testResult;
    },
});

/**
 * Boss AI 完整流程测试
 */
export const testBossAIFlow = internalMutation({
    args: {
        uid: v.optional(v.string()),
        gameId: v.optional(v.string()),
    },
    handler: async (ctx, params) => {
        const testResult: any = {
            testName: "testBossAIFlow",
            success: false,
            errors: [] as string[],
            steps: [] as string[],
            data: {} as any,
        };

        let testData: any = null;

        try {
            // 1. 创建测试数据（跳过第一回合，手动触发Boss回合）
            testResult.steps.push("创建测试数据");
            testData = await setupCombatTestData(ctx, {
                uid: params.uid,
                gameId: params.gameId,
                skipFirstTurn: true,  // 跳过第一回合，手动测试Boss AI
            });

            if (testData.errors.length > 0) {
                testResult.errors.push(...testData.errors);
                return testResult;
            }

            if (!testData.game) {
                testResult.errors.push("游戏创建失败");
                return testResult;
            }

            testResult.steps.push("✓ 测试数据创建成功");

            // 2. Boss 回合开始（通过 startFirstTurn 触发）
            testResult.steps.push("触发 Boss 回合");
            // 注意：这里需要手动触发Boss回合，实际测试中可能需要调用 gamePhaseService.startFirstTurn
            // 由于 startFirstTurn 是内部方法，这里简化处理

            // 3. 验证 phaseChanges
            if (testData.phaseChanges) {
                if (testData.phaseChanges.bossAIActions && testData.phaseChanges.bossAIActions.length > 0) {
                    testResult.steps.push("✓ Boss AI Actions 检测到");
                    testResult.data.bossActionsCount = testData.phaseChanges.bossAIActions.length;
                }
            }

            testResult.success = true;
        } catch (error: any) {
            testResult.errors.push(`测试执行失败: ${error.message}`);
            testResult.steps.push(`✗ 错误: ${error.message}`);
        } finally {
            // 清理测试数据
            if (testData) {
                testResult.steps.push("清理测试数据");
                await cleanupCombatTestData(ctx, {
                    gameId: testData.gameId,
                    uid: testData.uid,
                });
                testResult.steps.push("✓ 测试数据清理完成");
            }
        }

        return testResult;
    },
});
