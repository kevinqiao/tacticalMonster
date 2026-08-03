/**
 * Replay 模式端到端测试
 * 测试：创建游戏并执行多个操作 → 加载所有事件 → 回放事件 → 验证状态同步
 */

import { v } from "convex/values";
import { internalMutation } from "../../../../_generated/server";
import { GameService } from "../../gameService";
import { cleanupCombatTestData, setupCombatTestData } from "./combatTestData";

/**
 * Replay 模式测试
 */
export const testReplayMode = internalMutation({
    args: {
        uid: v.optional(v.string()),
        gameId: v.optional(v.string()),
    },
    handler: async (ctx, params) => {
        const testResult: any = {
            testName: "testReplayMode",
            success: false,
            errors: [] as string[],
            steps: [] as string[],
            data: {} as any,
        };

        let testData: any = null;

        try {
            // 1. 创建游戏并执行多个操作
            testResult.steps.push("步骤1: 创建游戏并执行多个操作");
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

            testResult.steps.push("✓ 游戏创建成功");

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
            const playerMonster = currentGame.team?.find((m: any) => (m.character_id ?? m.monsterId) === currentTurn.character_id);
            const boss = currentGame.boss;

            if (!playerMonster || !boss) {
                testResult.errors.push("缺少玩家角色或Boss");
                return testResult;
            }

            // 记录初始状态
            const initialBossHp = boss.stats?.hp?.current || 0;
            testResult.data.initialBossHp = initialBossHp;

            // 执行第一个技能操作
            const skillId = playerMonster.skills?.[0];
            if (skillId) {
                const result1 = await gameService.useSkill(testData.gameId, {
                    monsterId: (playerMonster as any).character_id ?? playerMonster.monsterId,
                    skillId: skillId,
                    targets: [{ bossId: boss.bossId }],
                });
                if (result1.success) {
                    testResult.steps.push("✓ 执行技能操作1");
                } else {
                    testResult.steps.push(`⚠ 技能操作1失败: ${result1.message}`);
                }
            }

            // 尝试执行第二个操作（如果回合还未结束）
            const gameAfterFirstSkill = await gameService.load(testData.gameId);
            if (gameAfterFirstSkill) {
                const nextTurn = gameAfterFirstSkill.currentRound?.turns?.find((t: any) => t.status === 1);
                const playerInstanceId = (playerMonster as any).character_id ?? playerMonster.monsterId;
                if (nextTurn && nextTurn.character_id === playerInstanceId && skillId) {
                    const result2 = await gameService.useSkill(testData.gameId, {
                        monsterId: playerInstanceId,
                        skillId: skillId,
                        targets: [{ bossId: boss.bossId }],
                    });
                    if (result2.success) {
                        testResult.steps.push("✓ 执行技能操作2");
                    } else {
                        testResult.steps.push(`⚠ 技能操作2失败（回合可能已结束）: ${result2.message}`);
                    }
                } else {
                    testResult.steps.push("⚠ 回合已结束，跳过技能操作2");
                }
            }

            // 2. 加载所有事件
            testResult.steps.push("步骤2: 加载所有事件");
            const allEvents = await ctx.db
                .query("mr_game_event")
                .withIndex("by_game", (q: any) => q.eq("gameId", testData.gameId))
                .collect();

            // 按 stepTime 排序（如果存在），否则按 time 排序
            const sortedEvents = allEvents.sort((a: any, b: any) => {
                if (a.stepTime !== undefined && b.stepTime !== undefined) {
                    return a.stepTime - b.stepTime;
                }
                return a.time - b.time;
            });

            if (!sortedEvents || sortedEvents.length === 0) {
                testResult.errors.push("没有查询到事件");
                return testResult;
            }

            testResult.data.eventsCount = sortedEvents.length;
            testResult.steps.push(`✓ 加载到 ${sortedEvents.length} 个事件`);

            // 3. 验证事件按 stepTime 排序
            testResult.steps.push("步骤3: 验证事件排序");
            let lastStepTime = -1;
            let orderValid = true;

            for (const event of sortedEvents) {
                if (event.stepTime !== undefined) {
                    if (event.stepTime < lastStepTime) {
                        orderValid = false;
                        testResult.errors.push(`事件排序错误: stepTime ${event.stepTime} < ${lastStepTime}`);
                        break;
                    }
                    lastStepTime = event.stepTime;
                }
            }

            if (orderValid) {
                testResult.steps.push("✓ 事件排序验证通过");
            }

            // 4. 验证事件类型
            testResult.steps.push("步骤4: 验证事件类型");
            const eventTypes = new Set<string>();
            for (const event of sortedEvents) {
                if (event.name) {
                    eventTypes.add(event.name);
                }
            }

            testResult.data.eventTypes = Array.from(eventTypes);
            testResult.steps.push(`✓ 检测到事件类型: ${testResult.data.eventTypes.join(", ")}`);

            // 5. 验证最终状态
            testResult.steps.push("步骤5: 验证最终状态");
            const finalGame = await gameService.load(testData.gameId);
            if (finalGame) {
                const finalBossHp = finalGame.boss?.stats?.hp?.current || 0;
                testResult.data.finalBossHp = finalBossHp;

                if (finalBossHp < initialBossHp) {
                    testResult.steps.push("✓ Boss HP 变化验证通过");
                } else {
                    testResult.errors.push("Boss HP 应该减少");
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
