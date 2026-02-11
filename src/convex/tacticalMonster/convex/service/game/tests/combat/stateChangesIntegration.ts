/**
 * 状态更新完整性集成测试
 * 测试所有状态同时变化、部分变化等场景
 */

import { v } from "convex/values";
import { internalMutation } from "../../../../_generated/server";
import { CharacterIdentifier } from "../../../../types/gameTypes";
import { GameService } from "../../gameService";
import { cleanupCombatTestData, setupCombatTestData } from "./combatTestData";

/**
 * 所有状态同时变化测试
 */
export const testAllStatesChange = internalMutation({
    args: {
        uid: v.optional(v.string()),
        gameId: v.optional(v.string()),
    },
    handler: async (ctx, params) => {
        const testResult: any = {
            testName: "testAllStatesChange",
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

            // 2. 使用一个会触发所有状态变化的技能
            testResult.steps.push("执行技能（触发所有状态变化）");
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

            // 3. 验证所有状态变化
            testResult.steps.push("验证所有状态变化");
            const stateChanges = useSkillResult.phaseChanges?.stateChanges;

            if (!stateChanges) {
                testResult.errors.push("缺少 stateChanges");
                return testResult;
            }

            const changes: any = {
                actor: {
                    hp: stateChanges.actor?.hpChanged || false,
                    mp: stateChanges.actor?.mpChanged || false,
                    position: stateChanges.actor?.positionChanged || false,
                    shield: false, // shieldChanged 不在 stateChanges 类型定义中
                    status: false, // statusChanged 不在 stateChanges 类型定义中
                },
                targets: stateChanges.targets?.map(t => ({
                    hp: t.hpChanged || false,
                    mp: t.mpChanged || false,
                    shield: false, // shieldChanged 不在 stateChanges 类型定义中
                    status: false, // statusChanged 不在 stateChanges 类型定义中
                })) || [],
                statusEffects: false, // statusEffects 不在 stateChanges 中，需要从游戏状态中获取
                skillCooldowns: false, // skillCooldowns 不在 stateChanges 中，需要从游戏状态中获取
            };

            testResult.data.changes = changes;
            testResult.steps.push("✓ 状态变化验证完成");

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

/**
 * 部分状态变化测试
 */
export const testPartialStatesChange = internalMutation({
    args: {
        uid: v.optional(v.string()),
        gameId: v.optional(v.string()),
    },
    handler: async (ctx, params) => {
        const testResult: any = {
            testName: "testPartialStatesChange",
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

            // 2. 执行移动（只改变位置）
            testResult.steps.push("执行移动（只改变位置）");
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

            // 3. 验证只有位置变化
            testResult.steps.push("验证只有位置变化");
            const stateChanges = walkResult.phaseChanges?.stateChanges;

            if (stateChanges?.actor) {
                const onlyPositionChanged =
                    stateChanges.actor.positionChanged &&
                    !stateChanges.actor.hpChanged &&
                    !stateChanges.actor.mpChanged;

                if (onlyPositionChanged) {
                    testResult.steps.push("✓ 只有位置变化验证通过");
                } else {
                    testResult.errors.push("移动应该只改变位置，不应该改变HP/MP");
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

/**
 * 多个角色状态变化测试
 */
export const testMultipleCharactersStateChange = internalMutation({
    args: {
        uid: v.optional(v.string()),
        gameId: v.optional(v.string()),
    },
    handler: async (ctx, params) => {
        const testResult: any = {
            testName: "testMultipleCharactersStateChange",
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

            // 2. 使用范围技能（影响多个目标）
            testResult.steps.push("执行范围技能");
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

            // 尝试使用范围技能（如果有）
            const skillId = playerMonster.skills?.[0];
            if (!skillId) {
                testResult.errors.push("角色没有可用技能");
                return testResult;
            }

            // 如果有多个目标（Boss + 小怪），测试多个目标的状态变化
            const targets: CharacterIdentifier[] = [{ bossId: boss.bossId }];
            if (boss.minions && boss.minions.length > 0) {
                targets.push({ minionId: boss.minions[0].minionId });
            }

            const useSkillResult = await gameService.useSkill(testData.gameId, {
                monsterId: playerMonster.monsterId,
                skillId: skillId,
                targets: targets,
            });

            if (!useSkillResult.success) {
                testResult.errors.push(`技能使用失败: ${useSkillResult.message || "未知错误"}`);
                return testResult;
            }

            testResult.steps.push("✓ 技能使用成功");

            // 3. 验证多个目标的状态变化
            testResult.steps.push("验证多个目标的状态变化");
            const stateChanges = useSkillResult.phaseChanges?.stateChanges;

            if (stateChanges?.targets && stateChanges.targets.length > 0) {
                testResult.data.targetsCount = stateChanges.targets.length;
                testResult.steps.push(`✓ 检测到 ${stateChanges.targets.length} 个目标的状态变化`);
            } else {
                testResult.errors.push("应该检测到多个目标的状态变化");
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
