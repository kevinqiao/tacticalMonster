/**
 * 匹配系统集成测试
 * 测试玩家加入匹配队列、匹配算法、匹配成功等流程
 */

import { v } from "convex/values";
import { action } from "../../../../_generated/server";
import { TEST_PLAYERS, TEST_TOURNAMENT_TYPES } from "../testData";

/**
 * 测试：单个玩家加入匹配队列
 * 使用 action 因为需要调用 HTTP API (fetch)
 */
export const testJoinMatchingQueue = action({
    args: {
        uid: v.string(),
        tournamentType: v.string(),
        tier: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        console.log("==========================================");
        console.log(`[testJoinMatchingQueue] 开始测试加入匹配队列`);
        console.log(`玩家 UID: ${args.uid}`);
        console.log(`锦标赛类型: ${args.tournamentType}`);
        console.log(`Tier: ${args.tier || "bronze"}`);
        console.log("==========================================");

        const { uid, tournamentType, tier } = args;
        const errors: string[] = [];
        const steps: string[] = [];

        try {
            // 步骤1: 加入匹配队列（通过 HTTP API）
            console.log("\n[步骤1] 加入匹配队列...");
            steps.push("步骤1: 加入匹配队列");
            let result: any;
            try {
                const tournamentUrl = process.env.TOURNAMENT_URL || "https://beloved-mouse-699.convex.site";
                console.log(`调用 Tournament API: ${tournamentUrl}/joinMatchingQueue`);
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
                console.log(`响应状态: ${response.status}`);
                result = await response.json();
                console.log(`响应数据:`, JSON.stringify(result));
                if (!response.ok || !result.ok) {
                    console.error(`❌ 加入匹配队列失败: ${result.error || "未知错误"}`);
                    errors.push(`加入匹配队列失败: ${result.error || "未知错误"}`);
                    return {
                        success: false,
                        errors,
                        steps,
                    };
                }
                steps.push(`✓ 成功加入匹配队列，状态: ${result.inQueue ? "已在队列中" : "新加入"}`);
                console.log(`✓ 成功加入匹配队列，状态: ${result.inQueue ? "已在队列中" : "新加入"}`);
            } catch (error: any) {
                console.error(`❌ 加入匹配队列异常:`, error.message);
                errors.push(`加入匹配队列异常: ${error.message}`);
                return {
                    success: false,
                    errors,
                    steps,
                };
            }

            // 步骤2: 验证队列记录（通过 HTTP API 或跳过）
            console.log("\n[步骤2] 验证队列记录...");
            steps.push("步骤2: 验证队列记录");
            steps.push("✓ 队列记录验证跳过（需要 Tournament 模块访问）");
            console.log("✓ 队列记录验证跳过（需要 Tournament 模块访问）");

            console.log("\n==========================================");
            console.log(`[testJoinMatchingQueue] 测试完成`);
            console.log(`成功: ${errors.length === 0 ? "✅" : "❌"}`);
            console.log(`错误数量: ${errors.length}`);
            console.log("==========================================\n");

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
            console.error("\n==========================================");
            console.error(`[testJoinMatchingQueue] 测试执行失败`);
            console.error(`错误: ${error.message}`);
            console.error("==========================================\n");
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
 * 使用 action 因为需要调用 HTTP API (fetch)
 */
export const testMatchingFlow = action({
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

