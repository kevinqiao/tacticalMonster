/**
 * gameMatchingService 集成测试
 * 测试玩家加入匹配队列的完整流程，包括队伍验证、Tier 验证、Power 验证等
 */

import { v } from "convex/values";
import { api } from "../../../../_generated/api";
import { action } from "../../../../_generated/server";
import { TierMappingService } from "../../../tier/tierMappingService";
import { TEST_PLAYERS } from "../testData";

/**
 * 测试：单个玩家加入匹配队列（完整流程）
 * 测试 gameMatchingService.joinTournamentMatching 的各个验证步骤
 * 注意：玩家必须已经初始化（包括怪物和队伍），测试通过 uid 获取 teamPower
 */
export const testJoinTournamentMatching = action({
    args: {
        uid: v.string(),
        tournamentType: v.string(),
        tier: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        console.log("==========================================");
        console.log(`[testJoinTournamentMatching] 开始测试加入匹配队列`);
        console.log(`玩家 UID: ${args.uid}`);
        console.log(`锦标赛类型: ${args.tournamentType}`);
        console.log(`Tier: ${args.tier || "自动推导"}`);
        console.log("==========================================");

        const { uid, tournamentType, tier } = args;
        const errors: string[] = [];
        const steps: string[] = [];

        try {
            // 步骤1: 获取玩家队伍信息（验证玩家已初始化）
            console.log("\n[步骤1] 获取玩家队伍信息...");
            steps.push("步骤1: 获取玩家队伍信息");

            let teamPower: number | undefined;
            try {
                // 获取队伍 Power（通过验证 Tier 访问权限来获取）
                const tierMapping = TierMappingService.getTierFromTournamentType(tournamentType);
                if (tierMapping) {
                    const tierValidation: any = await ctx.runQuery(
                        (api as any)["service/tier/monsterRumbleTierService"].validateTierAccess,
                        {
                            uid,
                            tier: tierMapping,
                        }
                    );
                    teamPower = tierValidation.teamPower;
                    if (teamPower !== undefined) {
                        steps.push(`✓ 获取队伍 Power: ${teamPower}`);
                        console.log(`✓ 获取队伍 Power: ${teamPower}`);
                    }
                }
            } catch (error: any) {
                console.warn(`⚠ 获取队伍 Power 失败: ${error.message}`);
            }

            // 步骤2: 验证队伍有效性
            console.log("\n[步骤2] 验证队伍有效性...");
            steps.push("步骤2: 验证队伍有效性");
            try {
                const teamValidation: any = await ctx.runQuery(
                    (api as any)["service/team/teamService"].validateTeam,
                    { uid }
                );
                if (!teamValidation.valid) {
                    console.error(`❌ 队伍验证失败: ${teamValidation.reason}`);
                    errors.push(`队伍验证失败: ${teamValidation.reason}`);
                    return {
                        success: false,
                        errors,
                        steps,
                    };
                }
                steps.push(`✓ 队伍验证通过，队伍大小: ${teamValidation.teamSize}`);
                console.log(`✓ 队伍验证通过，队伍大小: ${teamValidation.teamSize}`);
            } catch (error: any) {
                console.error(`❌ 队伍验证异常:`, error.message);
                errors.push(`队伍验证异常: ${error.message}`);
                return {
                    success: false,
                    errors,
                    steps,
                };
            }

            // 步骤3: 调用 joinTournamentMatching mutation
            console.log("\n[步骤3] 调用 joinTournamentMatching...");
            steps.push("步骤3: 调用 joinTournamentMatching");
            if (teamPower !== undefined) {
                steps.push(`当前队伍 Power: ${teamPower}`);
            }
            let matchResult: any;
            try {
                matchResult = await ctx.runMutation(
                    (api as any)["service/game/gameMatchingService"].joinTournamentMatching,
                    {
                        uid,
                        tournamentType,
                        tier,
                    }
                );

                if (!matchResult.ok) {
                    console.error(`❌ 加入匹配队列失败: ${matchResult.error || "未知错误"}`);
                    errors.push(`加入匹配队列失败: ${matchResult.error || "未知错误"}`);
                    return {
                        success: false,
                        errors,
                        steps,
                        matchResult,
                    };
                }

                steps.push(`✓ 成功加入匹配队列`);
                if (matchResult.gameId) {
                    steps.push(`✓ 匹配成功，游戏 ID: ${matchResult.gameId}`);
                    console.log(`✓ 匹配成功，游戏 ID: ${matchResult.gameId}`);
                } else {
                    steps.push(`✓ 已加入队列，等待匹配`);
                    console.log(`✓ 已加入队列，等待匹配`);
                }
            } catch (error: any) {
                console.error(`❌ 调用 joinTournamentMatching 异常:`, error.message);
                errors.push(`调用 joinTournamentMatching 异常: ${error.message}`);
                return {
                    success: false,
                    errors,
                    steps,
                };
            }

            console.log("\n==========================================");
            console.log(`[testJoinTournamentMatching] 测试完成`);
            console.log(`成功: ${errors.length === 0 ? "✅" : "❌"}`);
            console.log(`错误数量: ${errors.length}`);
            console.log("==========================================\n");

            return {
                success: errors.length === 0,
                errors,
                steps,
                matchResult,
                teamPower,
            };
        } catch (error: any) {
            console.error("\n==========================================");
            console.error(`[testJoinTournamentMatching] 测试执行失败`);
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
 * 测试：验证 Tier 推导逻辑
 * 测试从 tournamentType 推导 Tier 是否正确
 */
export const testTierDerivation = action({
    args: {
        tournamentType: v.string(),
    },
    handler: async (ctx, args) => {
        console.log("==========================================");
        console.log(`[testTierDerivation] 测试 Tier 推导`);
        console.log(`锦标赛类型: ${args.tournamentType}`);
        console.log("==========================================");

        const errors: string[] = [];
        const steps: string[] = [];

        try {
            // 调用 TierMappingService 推导 Tier（静态方法，直接调用）
            const tierMapping = TierMappingService.getTierFromTournamentType(args.tournamentType);

            if (!tierMapping) {
                errors.push(`无法从 tournamentType 推导 Tier: ${args.tournamentType}`);
                steps.push(`❌ Tier 推导失败`);
            } else {
                steps.push(`✓ Tier 推导成功: ${tierMapping}`);
                console.log(`✓ Tier 推导成功: ${tierMapping}`);
            }

            return {
                success: errors.length === 0,
                errors,
                steps,
                tier: tierMapping,
            };
        } catch (error: any) {
            console.error(`❌ Tier 推导异常:`, error.message);
            errors.push(`Tier 推导异常: ${error.message}`);
            return {
                success: false,
                errors,
                steps,
            };
        }
    },
});

/**
 * 测试：验证 Power 验证逻辑
 * 测试不同 Power 的队伍是否能正确验证 Tier 访问权限
 * 注意：玩家必须已经初始化（包括怪物和队伍），测试通过 uid 获取 teamPower
 */
export const testPowerValidation = action({
    args: {
        uid: v.string(),
        tier: v.string(),
    },
    handler: async (ctx, args) => {
        console.log("==========================================");
        console.log(`[testPowerValidation] 测试 Power 验证`);
        console.log(`玩家 UID: ${args.uid}`);
        console.log(`Tier: ${args.tier}`);
        console.log("==========================================");

        const errors: string[] = [];
        const steps: string[] = [];

        try {
            // 步骤1: 获取玩家队伍信息
            console.log("\n[步骤1] 获取玩家队伍信息...");
            steps.push("步骤1: 获取玩家队伍信息");

            // 获取队伍信息
            const team: any = await ctx.runQuery(
                (api as any)["service/team/teamService"].getPlayerTeam,
                { uid: args.uid }
            );

            if (!team || team.length === 0) {
                errors.push("玩家没有设置上场队伍");
                steps.push(`❌ 玩家没有设置上场队伍`);
                return {
                    success: false,
                    errors,
                    steps,
                };
            }

            steps.push(`✓ 玩家队伍大小: ${team.length}`);
            console.log(`✓ 玩家队伍大小: ${team.length}`);

            // 步骤2: 验证 Tier 访问权限（这会计算并返回 teamPower）
            console.log("\n[步骤2] 验证 Tier 访问权限...");
            steps.push("步骤2: 验证 Tier 访问权限");
            try {
                const validation: any = await ctx.runQuery(
                    (api as any)["service/tier/monsterRumbleTierService"].validateTierAccess,
                    {
                        uid: args.uid,
                        tier: args.tier,
                    }
                );

                if (!validation.valid) {
                    steps.push(`❌ Tier 访问验证失败: ${validation.reason}`);
                    console.log(`❌ Tier 访问验证失败: ${validation.reason}`);
                    console.log(`当前 Power: ${validation.teamPower || "未知"}`);
                } else {
                    steps.push(`✓ Tier 访问验证通过`);
                    steps.push(`当前 Power: ${validation.teamPower}`);
                    console.log(`✓ Tier 访问验证通过，Power: ${validation.teamPower}`);
                }

                return {
                    success: validation.valid,
                    errors: validation.valid ? [] : [validation.reason || "验证失败"],
                    steps,
                    validation,
                };
            } catch (error: any) {
                console.error(`❌ Power 验证异常:`, error.message);
                errors.push(`Power 验证异常: ${error.message}`);
                return {
                    success: false,
                    errors,
                    steps,
                };
            }
        } catch (error: any) {
            console.error(`❌ 测试执行失败:`, error.message);
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
 * 测试：完整匹配流程（包含多个验证步骤）
 * 测试从队伍验证到加入队列的完整流程
 */
export const testCompleteMatchingFlow = action({
    args: {
        uid: v.string(),
        tournamentType: v.string(),
        tier: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        console.log("==========================================");
        console.log(`[testCompleteMatchingFlow] 测试完整匹配流程`);
        console.log(`玩家 UID: ${args.uid}`);
        console.log(`锦标赛类型: ${args.tournamentType}`);
        console.log("==========================================");

        const errors: string[] = [];
        const steps: string[] = [];
        const testResults: any = {};

        try {
            // 步骤1: 推导 Tier
            console.log("\n[步骤1] 推导 Tier...");
            steps.push("步骤1: 推导 Tier");
            const tierMapping = TierMappingService.getTierFromTournamentType(args.tournamentType);

            if (!tierMapping) {
                errors.push(`无法从 tournamentType 推导 Tier: ${args.tournamentType}`);
                return {
                    success: false,
                    errors,
                    steps,
                };
            }

            const authoritativeTier = tierMapping;
            steps.push(`✓ Tier 推导成功: ${authoritativeTier}`);
            console.log(`✓ Tier 推导成功: ${authoritativeTier}`);

            // 步骤2: 验证前端传入的 Tier（如果存在）
            if (args.tier) {
                console.log("\n[步骤2] 验证前端传入的 Tier...");
                steps.push("步骤2: 验证前端传入的 Tier");
                if (args.tier !== authoritativeTier) {
                    errors.push(`Tier 不一致: 前端传入 ${args.tier}，实际应为 ${authoritativeTier}`);
                    steps.push(`❌ Tier 不一致`);
                } else {
                    steps.push(`✓ Tier 一致`);
                }
            }

            // 步骤3: 验证队伍有效性
            console.log("\n[步骤3] 验证队伍有效性...");
            steps.push("步骤3: 验证队伍有效性");
            const teamValidation: any = await ctx.runQuery(
                (api as any)["service/team/teamService"].validateTeam,
                { uid: args.uid }
            );

            if (!teamValidation.valid) {
                errors.push(`队伍验证失败: ${teamValidation.reason}`);
                steps.push(`❌ 队伍验证失败: ${teamValidation.reason}`);
                return {
                    success: false,
                    errors,
                    steps,
                };
            }
            steps.push(`✓ 队伍验证通过，队伍大小: ${teamValidation.teamSize}`);

            // 步骤4: 验证 Tier 访问权限
            console.log("\n[步骤4] 验证 Tier 访问权限...");
            steps.push("步骤4: 验证 Tier 访问权限");
            const tierValidation: any = await ctx.runQuery(
                (api as any)["service/tier/monsterRumbleTierService"].validateTierAccess,
                {
                    uid: args.uid,
                    tier: authoritativeTier,
                }
            );

            if (!tierValidation.valid) {
                errors.push(`Tier 访问验证失败: ${tierValidation.reason}`);
                steps.push(`❌ Tier 访问验证失败: ${tierValidation.reason}`);
                return {
                    success: false,
                    errors,
                    steps,
                };
            }
            steps.push(`✓ Tier 访问验证通过，Power: ${tierValidation.teamPower}`);

            // 步骤5: 调用 joinTournamentMatching
            console.log("\n[步骤5] 调用 joinTournamentMatching...");
            steps.push("步骤5: 调用 joinTournamentMatching");
            const matchResult: any = await ctx.runMutation(
                (api as any)["service/game/gameMatchingService"].joinTournamentMatching,
                {
                    uid: args.uid,
                    tournamentType: args.tournamentType,
                    tier: args.tier,
                }
            );

            if (!matchResult.ok) {
                errors.push(`加入匹配队列失败: ${matchResult.error || "未知错误"}`);
                steps.push(`❌ 加入匹配队列失败`);
            } else {
                steps.push(`✓ 成功加入匹配队列`);
                if (matchResult.gameId) {
                    steps.push(`✓ 匹配成功，游戏 ID: ${matchResult.gameId}`);
                }
            }

            testResults.matchResult = matchResult;
            testResults.tier = authoritativeTier;
            testResults.teamPower = tierValidation.teamPower;

            console.log("\n==========================================");
            console.log(`[testCompleteMatchingFlow] 测试完成`);
            console.log(`成功: ${errors.length === 0 ? "✅" : "❌"}`);
            console.log(`错误数量: ${errors.length}`);
            console.log("==========================================\n");

            return {
                success: errors.length === 0,
                errors,
                steps,
                testResults,
            };
        } catch (error: any) {
            console.error("\n==========================================");
            console.error(`[testCompleteMatchingFlow] 测试执行失败`);
            console.error(`错误: ${error.message}`);
            console.error("==========================================\n");
            errors.push(`测试执行失败: ${error.message}`);
            return {
                success: false,
                errors,
                steps,
                testResults,
            };
        }
    },
});

/**
 * 测试：批量玩家加入匹配队列
 * 测试多个玩家同时加入匹配队列的场景
 */
export const testBatchJoinMatching = action({
    args: {
        playerCount: v.optional(v.number()),
        tournamentType: v.string(),
        tier: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { playerCount = 5, tournamentType, tier } = args;
        console.log("==========================================");
        console.log(`[testBatchJoinMatching] 测试批量加入匹配队列`);
        console.log(`玩家数量: ${playerCount}`);
        console.log(`锦标赛类型: ${tournamentType}`);
        console.log("==========================================");

        const errors: string[] = [];
        const steps: string[] = [];
        const results: any[] = [];

        try {
            const testPlayers = TEST_PLAYERS.slice(0, playerCount);

            // 为每个玩家加入队列（假设玩家已经初始化）
            for (const player of testPlayers) {
                console.log(`\n处理玩家: ${player.uid}`);
                steps.push(`处理玩家: ${player.uid}`);

                try {
                    // 调用完整匹配流程测试（通过 runAction，玩家必须已经初始化）
                    const result = await ctx.runAction(
                        (api as any)["service/game/tests/integration/gameMatchingService.test"].testCompleteMatchingFlow,
                        {
                            uid: player.uid,
                            tournamentType,
                            tier,
                        }
                    );

                    results.push({
                        uid: player.uid,
                        success: result.success,
                        errors: result.errors,
                        steps: result.steps,
                    });

                    if (!result.success) {
                        errors.push(`玩家 ${player.uid} 加入队列失败: ${result.errors.join(", ")}`);
                    }
                } catch (error: any) {
                    errors.push(`玩家 ${player.uid} 处理异常: ${error.message}`);
                    results.push({
                        uid: player.uid,
                        success: false,
                        errors: [error.message],
                    });
                }
            }

            const successCount = results.filter((r) => r.success).length;
            steps.push(`✓ ${successCount}/${testPlayers.length} 个玩家成功加入队列`);

            console.log("\n==========================================");
            console.log(`[testBatchJoinMatching] 测试完成`);
            console.log(`成功: ${errors.length === 0 ? "✅" : "❌"}`);
            console.log(`成功数量: ${successCount}/${testPlayers.length}`);
            console.log("==========================================\n");

            return {
                success: errors.length === 0,
                errors,
                steps,
                results,
                summary: {
                    totalPlayers: testPlayers.length,
                    successCount,
                    failureCount: testPlayers.length - successCount,
                },
            };
        } catch (error: any) {
            console.error(`❌ 批量测试失败:`, error.message);
            errors.push(`批量测试失败: ${error.message}`);
            return {
                success: false,
                errors,
                steps,
                results,
            };
        }
    },
});

