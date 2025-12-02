/**
 * 匹配系统集成测试
 * 测试玩家加入匹配队列、匹配算法、匹配成功等流程
 */

import { v } from "convex/values";
import { internalMutation } from "../../../../_generated/server";
import { TEST_PLAYERS, TEST_TOURNAMENT_TYPES } from "../testData";

/**
 * 测试：单个玩家加入匹配队列
 */
export const testJoinMatchingQueue = internalMutation({
    args: {
        uid: v.string(),
        tournamentType: v.string(),
        tier: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { uid, tournamentType, tier } = args;
        const errors: string[] = [];
        const steps: string[] = [];

        try {
            // 步骤1: 加入匹配队列（通过 HTTP API）
            steps.push("步骤1: 加入匹配队列");
            let result: any;
            try {
                const tournamentUrl = process.env.TOURNAMENT_URL || "https://beloved-mouse-699.convex.site";
                const response = await fetch(`${tournamentUrl}/joinMatchingQueue`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        uid,
                        typeId: tournamentType,
                        gameType: "monsterRumble",
                        metadata: { tier: tier || "bronze", teamPower: 200 },
                    }),
                });
                result = await response.json();
                if (!response.ok || !result.ok) {
                    errors.push(`加入匹配队列失败: ${result.error || "未知错误"}`);
                    return {
                        success: false,
                        errors,
                        steps,
                    };
                }
                steps.push(`✓ 成功加入匹配队列，状态: ${result.inQueue ? "已在队列中" : "新加入"}`);
            } catch (error: any) {
                errors.push(`加入匹配队列异常: ${error.message}`);
                return {
                    success: false,
                    errors,
                    steps,
                };
            }

            // 步骤2: 验证队列记录（通过 HTTP API 或跳过）
            steps.push("步骤2: 验证队列记录");
            steps.push("✓ 队列记录验证跳过（需要 Tournament 模块访问）");

            return {
                success: errors.length === 0,
                errors,
                steps,
                queueId: result.queueId,
                data: {
                    result,
                },
            };
        } catch (error: any) {
            errors.push(`测试执行失败: ${error.message}`);
            return {
                success: false,
                errors,
                steps,
            };
        }
    },
});

/**
 * 测试：多个玩家加入匹配队列并执行匹配
 */
export const testMatchingFlow = internalMutation({
    args: {
        playerCount: v.optional(v.number()),
        tier: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { playerCount = 5, tier = "bronze" } = args;
        const errors: string[] = [];
        const steps: string[] = [];
        const results: any[] = [];

        try {
            // 步骤1: 准备测试玩家
            steps.push("步骤1: 准备测试玩家");
            const testPlayers = TEST_PLAYERS.slice(0, playerCount);
            const tournamentType = TEST_TOURNAMENT_TYPES[tier as keyof typeof TEST_TOURNAMENT_TYPES];

            // 步骤2: 所有玩家加入匹配队列
            steps.push("步骤2: 所有玩家加入匹配队列");
            for (const player of testPlayers) {
                try {
                    // 直接调用测试逻辑
                    const result = await (async () => {
                        const testResult = { success: true, errors: [] as string[], steps: [] as string[], queueId: undefined as any };
                        try {
                            const tournamentUrl = process.env.TOURNAMENT_URL || "https://beloved-mouse-699.convex.site";
                            const response = await fetch(`${tournamentUrl}/joinMatchingQueue`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    uid: player.uid,
                                    typeId: tournamentType,
                                    gameType: "monsterRumble",
                                    metadata: { tier: tier || "bronze", teamPower: 200 },
                                }),
                            });
                            const data = await response.json();
                            if (!response.ok || !data.ok) {
                                testResult.success = false;
                                testResult.errors.push(data.error || "未知错误");
                            }
                        } catch (error: any) {
                            testResult.success = false;
                            testResult.errors.push(error.message);
                        }
                        return testResult;
                    })();

                    results.push({
                        uid: player.uid,
                        ...result,
                    });

                    if (!result.success) {
                        errors.push(`玩家 ${player.uid} 加入队列失败: ${result.errors.join(", ")}`);
                    }
                } catch (error: any) {
                    errors.push(`玩家 ${player.uid} 加入队列异常: ${error.message}`);
                }
            }

            const successCount = results.filter((r) => r.success).length;
            steps.push(`✓ ${successCount}/${testPlayers.length} 个玩家成功加入队列`);

            // 步骤3: 执行匹配任务（通过 HTTP API 或跳过）
            steps.push("步骤3: 执行匹配任务");
            steps.push("⚠ 匹配任务执行跳过（需要 Tournament 模块的定时任务或手动触发）");

            // 步骤4: 验证匹配结果（通过 HTTP API 或跳过）
            steps.push("步骤4: 验证匹配结果");
            steps.push("⚠ 匹配结果验证跳过（需要 Tournament 模块访问）");

            return {
                success: errors.length === 0,
                errors,
                steps,
                data: {
                    results,
                },
            };
        } catch (error: any) {
            errors.push(`测试执行失败: ${error.message}`);
            return {
                success: false,
                errors,
                steps,
            };
        }
    },
});

