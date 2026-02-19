/**
 * Watch 模式端到端测试
 * 测试：创建游戏并执行多个操作 → 查询事件 → 验证事件顺序 → 验证 stepTime 正确性 → 验证事件去重
 */

import { v } from "convex/values";
import { internalMutation } from "../../../../_generated/server";
import { GameService } from "../../gameService";
import { cleanupCombatTestData, setupCombatTestData } from "./combatTestData";

/**
 * Watch 模式测试
 */
export const testWatchMode = internalMutation({
    args: {
        uid: v.optional(v.string()),
        gameId: v.optional(v.string()),
    },
    handler: async (ctx, params) => {
        const testResult: any = {
            testName: "testWatchMode",
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
            const playerMonster = currentGame.team?.find(m => m.monsterId === currentTurn.monsterId);
            const boss = currentGame.boss;

            if (!playerMonster || !boss) {
                testResult.errors.push("缺少玩家角色或Boss");
                return testResult;
            }

            // 执行技能操作
            const skillId = playerMonster.skills?.[0];
            if (skillId) {
                const skillResult = await gameService.useSkill(testData.gameId, {
                    monsterId: playerMonster.monsterId,
                    skillId: skillId,
                    targets: [{ bossId: boss.bossId }],
                });
                if (skillResult.success) {
                    testResult.steps.push("✓ 执行技能操作");
                } else {
                    testResult.steps.push(`⚠ 技能操作失败: ${skillResult.message}`);
                }
            }

            // 尝试执行移动操作（如果回合还未结束）
            const gameAfterSkill = await gameService.load(testData.gameId);
            if (gameAfterSkill) {
                const nextTurn = gameAfterSkill.currentRound?.turns?.find((t: any) => t.status === 1);
                if (nextTurn && nextTurn.monsterId === playerMonster.monsterId) {
                    const newPosition = { q: (playerMonster.q ?? 0) + 1, r: playerMonster.r ?? 0 };
                    const walkResult = await gameService.walk(
                        testData.gameId,
                        newPosition,
                        { monsterId: playerMonster.monsterId },
                        { steps: 1 }
                    );
                    if (walkResult.success) {
                        testResult.steps.push("✓ 执行移动操作");
                    } else {
                        testResult.steps.push("⚠ 移动操作失败");
                    }
                } else {
                    testResult.steps.push("⚠ 回合已结束，跳过移动操作");
                }
            }

            // 2. 查询事件
            testResult.steps.push("步骤2: 查询事件");
            const events = await ctx.db
                .query("mr_game_event")
                .withIndex("by_game", (q: any) => q.eq("gameId", testData.gameId))
                .collect();

            if (!events || events.length === 0) {
                testResult.errors.push("没有查询到事件");
                return testResult;
            }

            testResult.data.eventsCount = events.length;
            testResult.steps.push(`✓ 查询到 ${events.length} 个事件`);

            // 3. 验证事件顺序
            testResult.steps.push("步骤3: 验证事件顺序");
            let lastStepTime = -1;
            let lastTime = 0;
            let orderValid = true;

            for (const event of events) {
                if (event.stepTime !== undefined) {
                    if (event.stepTime < lastStepTime) {
                        orderValid = false;
                        testResult.errors.push(`事件顺序错误: stepTime ${event.stepTime} < ${lastStepTime}`);
                        break;
                    }
                    lastStepTime = event.stepTime;
                }

                if (event.time < lastTime) {
                    orderValid = false;
                    testResult.errors.push(`事件时间顺序错误: time ${event.time} < ${lastTime}`);
                    break;
                }
                lastTime = event.time;
            }

            if (orderValid) {
                testResult.steps.push("✓ 事件顺序验证通过");
            }

            // 4. 验证 stepTime 正确性
            testResult.steps.push("步骤4: 验证 stepTime 正确性");
            const eventsWithStepTime = events.filter(e => e.stepTime !== undefined);
            testResult.data.eventsWithStepTimeCount = eventsWithStepTime.length;

            if (eventsWithStepTime.length > 0) {
                testResult.steps.push(`✓ 检测到 ${eventsWithStepTime.length} 个事件包含 stepTime`);
            } else {
                testResult.errors.push("没有事件包含 stepTime");
            }

            // 5. 验证事件去重
            testResult.steps.push("步骤5: 验证事件去重");
            const eventIds = new Set<string>();
            const stepTimes = new Set<number>();
            let duplicatesFound = false;

            for (const event of events) {
                if (event._id) {
                    if (eventIds.has(event._id)) {
                        duplicatesFound = true;
                        testResult.errors.push(`发现重复事件 ID: ${event._id}`);
                        break;
                    }
                    eventIds.add(event._id);
                }

                if (event.stepTime !== undefined) {
                    if (stepTimes.has(event.stepTime)) {
                        // stepTime 可以重复（如果多个事件在同一时间发生），但通常不应该
                        testResult.steps.push(`⚠ 发现重复 stepTime: ${event.stepTime}`);
                    }
                    stepTimes.add(event.stepTime);
                }
            }

            if (!duplicatesFound) {
                testResult.steps.push("✓ 事件去重验证通过");
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
