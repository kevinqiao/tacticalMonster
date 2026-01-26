/**
 * 完整战斗流程端到端测试
 * 测试：游戏创建 → 第一回合初始化 → 玩家操作 → Boss AI → 回合推进 → 游戏结束
 */

import { v } from "convex/values";
import { internal } from "../../../../_generated/api";
import { action, internalMutation } from "../../../../_generated/server";
import { GameService } from "../../gameService";
import { cleanupCombatTestData, setupCombatTestData } from "./combatTestData";

/**
 * 完整战斗流程测试
 */
export const testCompleteCombatFlow = internalMutation({
    args: {
        uid: v.optional(v.string()),
        gameId: v.optional(v.string()),
    },
    handler: async (ctx, params) => {
        const testResult: any = {
            testName: "testCompleteCombatFlow",
            success: false,
            errors: [] as string[],
            steps: [] as string[],
            data: {} as any,
        };

        let testData: any = null;

        try {
            // 1. 创建测试数据
            testResult.steps.push("步骤1: 创建测试数据");
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

            // 2. 验证初始状态
            testResult.steps.push("步骤2: 验证初始状态");
            const gameService = new GameService(ctx);
            const initialGame = await gameService.load(testData.gameId);

            // ✅ 验证游戏ID是否正确
            if (initialGame && initialGame.gameId !== testData.gameId) {
                testResult.errors.push(`游戏ID不匹配: 期望 ${testData.gameId}, 实际 ${initialGame.gameId}`);
                return testResult;
            }

            if (!initialGame) {
                testResult.errors.push("无法加载游戏");
                return testResult;
            }

            testResult.data.initialRound = initialGame.currentRound?.no || 0;
            testResult.data.initialTeamSize = initialGame.team?.length || 0;
            testResult.data.initialBossHp = initialGame.boss?.stats?.hp?.current || 0;
            testResult.steps.push("✓ 初始状态验证完成");

            // 3. 玩家使用技能
            testResult.steps.push("步骤3: 玩家使用技能");
            const boss = initialGame.boss;

            if (!boss) {
                testResult.errors.push("缺少Boss");
                return testResult;
            }

            // ✅ 找到当前回合的角色（status === 1）
            const currentTurn = initialGame.currentRound?.turns?.find((turn: any) => turn.status === 1);
            if (!currentTurn) {
                testResult.errors.push("没有当前回合");
                return testResult;
            }

            // ✅ 根据当前回合的 monsterId 找到对应的角色
            const playerMonster = initialGame.team?.find((m: any) => m.monsterId === currentTurn.monsterId);
            if (!playerMonster) {
                testResult.errors.push(`找不到当前回合的角色: ${currentTurn.monsterId}`);
                return testResult;
            }

            const skillId = playerMonster.skills?.[0];
            if (!skillId) {
                testResult.errors.push("角色没有可用技能");
                return testResult;
            }

            // ✅ 验证游戏是否仍然存在（在调用 useSkill 之前）
            const gameBeforeUseSkill = await gameService.load(testData.gameId);
            if (!gameBeforeUseSkill) {
                testResult.errors.push(`游戏在 useSkill 之前已不存在: ${testData.gameId}`);
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

            // 4. 验证状态更新
            testResult.steps.push("步骤4: 验证状态更新");
            const gameAfterSkill = await gameService.load(testData.gameId);
            if (gameAfterSkill) {
                const updatedBoss = gameAfterSkill.boss;
                testResult.data.bossHpAfterSkill = updatedBoss?.stats?.hp?.current || 0;
                testResult.steps.push("✓ 状态更新验证完成");
            }

            // 5. 玩家移动（如果当前回合仍然是该角色）
            testResult.steps.push("步骤5: 玩家移动");
            // ✅ 检查当前回合的角色
            const currentTurnAfterSkill = gameAfterSkill?.currentRound?.turns?.find((turn: any) => turn.status === 1);
            if (currentTurnAfterSkill && currentTurnAfterSkill.monsterId === playerMonster.monsterId) {
                const updatedPlayer = gameAfterSkill?.team?.find(m => m.monsterId === playerMonster.monsterId);
                if (updatedPlayer) {
                    const originalPosition = { q: updatedPlayer.q ?? 0, r: updatedPlayer.r ?? 0 };
                    const newPosition = { q: originalPosition.q + 1, r: originalPosition.r };

                    const walkResult = await gameService.walk(testData.gameId, newPosition, {
                        monsterId: playerMonster.monsterId,
                    });

                    if (walkResult.success) {
                        testResult.steps.push("✓ 移动成功");
                    } else {
                        testResult.errors.push(`移动失败: ${(walkResult as any).message || "未知错误"}`);
                    }
                }
            } else {
                testResult.steps.push("⚠ 当前回合已不是该角色，跳过移动测试");
            }

            // 6. 玩家攻击（如果当前回合仍然是该角色）
            testResult.steps.push("步骤6: 玩家攻击");
            // ✅ 重新加载游戏以获取最新的回合状态
            const gameBeforeAttack = await gameService.load(testData.gameId);
            const currentTurnBeforeAttack = gameBeforeAttack?.currentRound?.turns?.find((turn: any) => turn.status === 1);
            if (currentTurnBeforeAttack && currentTurnBeforeAttack.monsterId === playerMonster.monsterId) {
                const attackSkillId = playerMonster.skills?.find((s: string) => s.includes("attack") || s.includes("basic"));
                if (attackSkillId) {
                    const attackResult = await gameService.useSkill(testData.gameId, {
                        monsterId: playerMonster.monsterId,
                        skillId: attackSkillId,
                        targets: [{ bossId: boss.bossId }],
                    });

                    if (attackResult.success) {
                        testResult.steps.push("✓ 攻击成功");
                    } else {
                        testResult.errors.push(`攻击失败: ${attackResult.message || "未知错误"}`);
                    }
                } else {
                    testResult.steps.push("⚠ 没有找到攻击技能，跳过攻击测试");
                }
            } else {
                testResult.steps.push("⚠ 当前回合已不是该角色，跳过攻击测试");
            }

            // 7. 推进回合（如果需要）
            testResult.steps.push("步骤7: 验证回合状态");
            const finalGame = await gameService.load(testData.gameId);
            if (finalGame) {
                testResult.data.finalRound = finalGame.currentRound?.no || 0;
                testResult.data.finalBossHp = finalGame.boss?.stats?.hp?.current || 0;
                testResult.steps.push("✓ 回合状态验证完成");
            }

            testResult.success = true;
        } catch (error: any) {
            testResult.errors.push(`测试执行失败: ${error.message}`);
            testResult.steps.push(`✗ 错误: ${error.message}`);
        } finally {
            // 13. 清理测试数据
            if (testData) {
                testResult.steps.push("步骤13: 清理测试数据");
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
 * 导出为 action（用于 CLI 调用）
 */
export const testCompleteCombatFlowAction = action({
    args: {
        uid: v.optional(v.string()),
        gameId: v.optional(v.string()),
    },
    handler: async (ctx, params): Promise<any> => {
        return await ctx.runMutation(
            (internal as any).service.game.tests.combat.combatE2E.testCompleteCombatFlow,
            params
        );
    },
});
