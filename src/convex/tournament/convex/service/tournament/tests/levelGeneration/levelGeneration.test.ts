/**
 * 关卡生成集成测试
 * 测试从生成规则到数据库注册的完整流程
 */

import { v } from "convex/values";
import { internal } from "../../../../_generated/api";
import { internalMutation } from "../../../../_generated/server";
import { SoloChallengeLevelService } from "../../SoloChallengeLevelService";
import { EXPECTED_BRONZE_LEVELS, TEST_RULE_IDS, validateLevelConfig } from "./testData";
import {
    cleanupTestLevels,
    getLevelSummary,
    validateDifficultyProgression,
    validateLevelChain,
    validateLevelConfigCompleteness,
} from "./testUtils";

/**
 * 测试1: 生成关卡配置（不保存到数据库）
 */
export const testGenerateLevels = internalMutation({
    args: {
        ruleId: v.string(),
    },
    handler: async (ctx, { ruleId }) => {
        console.log("==========================================");
        console.log(`[testGenerateLevels] 开始测试关卡生成`);
        console.log(`规则ID: ${ruleId}`);
        console.log("==========================================");

        const errors: string[] = [];
        const steps: string[] = [];

        try {
            // 步骤1: 生成关卡配置
            console.log("\n[步骤1] 生成关卡配置...");
            steps.push("步骤1: 生成关卡配置");
            const levels = SoloChallengeLevelService.generateLevels(ruleId);

            console.log(`✓ 成功生成 ${levels.length} 个关卡`);
            steps.push(`✓ 成功生成 ${levels.length} 个关卡`);

            // 步骤2: 验证关卡数量
            console.log("\n[步骤2] 验证关卡数量...");
            steps.push("步骤2: 验证关卡数量");
            if (ruleId === TEST_RULE_IDS.BRONZE) {
                if (levels.length !== EXPECTED_BRONZE_LEVELS.length) {
                    const error = `关卡数量不匹配: 期望 ${EXPECTED_BRONZE_LEVELS.length}，实际 ${levels.length}`;
                    console.error(`❌ ${error}`);
                    errors.push(error);
                } else {
                    console.log(`✓ 关卡数量正确: ${levels.length}`);
                    steps.push(`✓ 关卡数量正确: ${levels.length}`);
                }
            }

            // 步骤3: 验证每个关卡的配置完整性
            console.log("\n[步骤3] 验证关卡配置完整性...");
            steps.push("步骤3: 验证关卡配置完整性");
            for (const level of levels) {
                const validation = validateLevelConfigCompleteness(level);
                if (!validation.valid) {
                    console.error(`❌ 关卡 ${level.typeId} 配置不完整:`);
                    validation.errors.forEach(err => console.error(`   - ${err}`));
                    errors.push(...validation.errors.map(err => `${level.typeId}: ${err}`));
                } else {
                    console.log(`✓ 关卡 ${level.typeId} 配置完整`);
                }
            }

            // 步骤4: 验证关卡配置是否符合预期（仅针对 Bronze）
            if (ruleId === TEST_RULE_IDS.BRONZE) {
                console.log("\n[步骤4] 验证关卡配置是否符合预期...");
                steps.push("步骤4: 验证关卡配置是否符合预期");
                for (let i = 0; i < levels.length && i < EXPECTED_BRONZE_LEVELS.length; i++) {
                    const level = levels[i];
                    const expected = EXPECTED_BRONZE_LEVELS[i];
                    const validation = validateLevelConfig(level, expected);
                    if (!validation.valid) {
                        console.error(`❌ 关卡 ${level.typeId} 不符合预期:`);
                        validation.errors.forEach(err => console.error(`   - ${err}`));
                        errors.push(...validation.errors.map(err => `${level.typeId}: ${err}`));
                    } else {
                        console.log(`✓ 关卡 ${level.typeId} 符合预期`);
                    }
                }
            }

            // 步骤5: 验证关卡链关系
            console.log("\n[步骤5] 验证关卡链关系...");
            steps.push("步骤5: 验证关卡链关系");
            const chainValidation = validateLevelChain(levels);
            if (!chainValidation.valid) {
                console.error("❌ 关卡链关系验证失败:");
                chainValidation.errors.forEach(err => console.error(`   - ${err}`));
                errors.push(...chainValidation.errors);
            } else {
                console.log("✓ 关卡链关系正确");
                steps.push("✓ 关卡链关系正确");
            }

            // 步骤6: 验证难度递增
            console.log("\n[步骤6] 验证难度递增...");
            steps.push("步骤6: 验证难度递增");
            const difficultyValidation = validateDifficultyProgression(levels);
            if (!difficultyValidation.valid) {
                console.error("❌ 难度递增验证失败:");
                difficultyValidation.errors.forEach(err => console.error(`   - ${err}`));
                errors.push(...difficultyValidation.errors);
            } else {
                console.log("✓ 难度递增正确");
                steps.push("✓ 难度递增正确");
            }

            // 输出关卡摘要
            console.log("\n[关卡摘要]");
            levels.forEach(level => {
                console.log(getLevelSummary(level));
            });

            console.log("\n==========================================");
            console.log(`[testGenerateLevels] 测试完成`);
            console.log(`成功: ${errors.length === 0 ? "✅" : "❌"}`);
            console.log(`错误数量: ${errors.length}`);
            console.log("==========================================\n");

            return {
                success: errors.length === 0,
                errors,
                steps,
                levelCount: levels.length,
                levels: levels.map(level => ({
                    typeId: level.typeId,
                    name: level.name,
                    levelNumber: level.soloChallenge?.levelNumber,
                })),
            };
        } catch (error: any) {
            console.error("❌ 测试异常:", error);
            return {
                success: false,
                errors: [error.message],
                steps,
                levelCount: 0,
                levels: [],
            };
        }
    },
});

/**
 * 测试2: 验证关卡配置
 */
export const testValidateLevelConfigs = internalMutation({
    args: {
        ruleId: v.string(),
    },
    handler: async (ctx, { ruleId }) => {
        console.log("==========================================");
        console.log(`[testValidateLevelConfigs] 开始测试关卡配置验证`);
        console.log(`规则ID: ${ruleId}`);
        console.log("==========================================");

        const errors: string[] = [];
        const steps: string[] = [];

        try {
            // 生成关卡
            const levels = SoloChallengeLevelService.generateLevels(ruleId);
            steps.push(`生成了 ${levels.length} 个关卡`);

            // 验证每个关卡
            for (const level of levels) {
                console.log(`\n验证关卡: ${level.typeId}`);

                // 验证单人关卡必须配置 performanceRewards
                const isSinglePlayer = level.matchRules.minPlayers === 1 && level.matchRules.maxPlayers === 1;
                if (isSinglePlayer) {
                    if (!level.rewards.performanceRewards) {
                        const error = `单人关卡 ${level.typeId} 缺少 performanceRewards`;
                        console.error(`❌ ${error}`);
                        errors.push(error);
                    } else {
                        console.log(`✓ 单人关卡配置了 performanceRewards`);
                    }

                    if (level.rewards.rankRewards && level.rewards.rankRewards.length > 0) {
                        const error = `单人关卡 ${level.typeId} 不应配置 rankRewards`;
                        console.error(`❌ ${error}`);
                        errors.push(error);
                    } else {
                        console.log(`✓ 单人关卡未配置 rankRewards（正确）`);
                    }
                }

                // 验证 soloChallenge 配置完整性
                if (isSinglePlayer && level.soloChallenge) {
                    if (!level.soloChallenge.levelType) {
                        errors.push(`关卡 ${level.typeId} 缺少 levelType`);
                    }
                    if (level.soloChallenge.levelNumber === undefined) {
                        errors.push(`关卡 ${level.typeId} 缺少 levelNumber`);
                    }
                    if (!level.soloChallenge.levelContent?.bossConfig) {
                        errors.push(`关卡 ${level.typeId} 缺少 bossConfig`);
                    }
                    if (!level.soloChallenge.levelContent?.difficultyAdjustment) {
                        errors.push(`关卡 ${level.typeId} 缺少 difficultyAdjustment`);
                    } else {
                        const multiplier = level.soloChallenge.levelContent.difficultyAdjustment.difficultyMultiplier;
                        if (multiplier === undefined) {
                            errors.push(`关卡 ${level.typeId} 缺少 difficultyMultiplier`);
                        } else {
                            console.log(`✓ 难度倍数: ${multiplier}`);
                        }
                    }
                }
            }

            console.log("\n==========================================");
            console.log(`[testValidateLevelConfigs] 测试完成`);
            console.log(`成功: ${errors.length === 0 ? "✅" : "❌"}`);
            console.log(`错误数量: ${errors.length}`);
            console.log("==========================================\n");

            return {
                success: errors.length === 0,
                errors,
                steps,
                validatedCount: levels.length,
            };
        } catch (error: any) {
            console.error("❌ 测试异常:", error);
            return {
                success: false,
                errors: [error.message],
                steps,
                validatedCount: 0,
            };
        }
    },
});

/**
 * 测试3: 数据库注册测试
 */
export const testRegisterLevels = internalMutation({
    args: {
        ruleId: v.string(),
        replaceExisting: v.optional(v.boolean()),
        cleanupAfter: v.optional(v.boolean()),  // 测试后是否清理
    },
    handler: async (ctx, { ruleId, replaceExisting = false, cleanupAfter = true }): Promise<{
        success: boolean;
        errors: string[];
        steps: string[];
        result: {
            success: boolean;
            generatedCount: number;
            savedCount: number;
            skippedCount: number;
            levelTypeIds: string[];
            error?: string;
        } | null;
    }> => {
        console.log("==========================================");
        console.log(`[testRegisterLevels] 开始测试数据库注册`);
        console.log(`规则ID: ${ruleId}`);
        console.log(`替换已存在: ${replaceExisting}`);
        console.log(`测试后清理: ${cleanupAfter}`);
        console.log("==========================================");

        const errors: string[] = [];
        const steps: string[] = [];
        const generatedTypeIds: string[] = [];

        try {
            // 步骤1: 生成关卡配置
            console.log("\n[步骤1] 生成关卡配置...");
            steps.push("步骤1: 生成关卡配置");
            const levels = SoloChallengeLevelService.generateLevels(ruleId);
            generatedTypeIds.push(...levels.map(l => l.typeId));
            console.log(`✓ 生成了 ${levels.length} 个关卡`);

            // 步骤2: 检查已存在的关卡
            console.log("\n[步骤2] 检查已存在的关卡...");
            steps.push("步骤2: 检查已存在的关卡");
            const { existing } = await SoloChallengeLevelService.checkLevelsExist(ctx, generatedTypeIds);
            console.log(`✓ 已存在 ${existing.length} 个关卡`);

            // 步骤3: 注册关卡到数据库
            console.log("\n[步骤3] 注册关卡到数据库...");
            steps.push("步骤3: 注册关卡到数据库");
            const result = await ctx.runMutation(internal.service.tournament.SoloChallengeLevelService.generateAndRegisterLevels, {
                ruleId,
                replaceExisting,
            }) as {
                success: boolean;
                generatedCount?: number;
                savedCount?: number;
                skippedCount?: number;
                levelTypeIds?: string[];
                error?: string;
            };

            if (!result.success) {
                errors.push(result.error || "注册失败");
                console.error(`❌ 注册失败: ${result.error}`);
            } else {
                const generatedCount = result.generatedCount || 0;
                const savedCount = result.savedCount || 0;
                console.log(`✓ 注册成功: 生成 ${generatedCount} 个，保存 ${savedCount} 个`);
                steps.push(`✓ 注册成功: 生成 ${generatedCount} 个，保存 ${savedCount} 个`);
            }

            // 步骤4: 验证数据库中的关卡记录
            console.log("\n[步骤4] 验证数据库中的关卡记录...");
            steps.push("步骤4: 验证数据库中的关卡记录");
            const levelTypeIds = result.levelTypeIds || [];
            for (const typeId of levelTypeIds) {
                const exists = await SoloChallengeLevelService.checkLevelExists(ctx, typeId);
                if (!exists) {
                    const error = `关卡 ${typeId} 未在数据库中找到`;
                    console.error(`❌ ${error}`);
                    errors.push(error);
                } else {
                    console.log(`✓ 关卡 ${typeId} 已存在于数据库`);
                }
            }

            // 步骤5: 清理测试数据（如果需要）
            if (cleanupAfter) {
                console.log("\n[步骤5] 清理测试数据...");
                steps.push("步骤5: 清理测试数据");
                const cleanupResult = await cleanupTestLevels(ctx, generatedTypeIds);
                console.log(`✓ 清理完成: 删除 ${cleanupResult.deleted} 个关卡`);
                if (cleanupResult.errors.length > 0) {
                    console.warn(`⚠ 清理警告: ${cleanupResult.errors.join(", ")}`);
                }
            }

            console.log("\n==========================================");
            console.log(`[testRegisterLevels] 测试完成`);
            console.log(`成功: ${errors.length === 0 ? "✅" : "❌"}`);
            console.log(`错误数量: ${errors.length}`);
            console.log("==========================================\n");

            return {
                success: errors.length === 0,
                errors,
                steps,
                result: result.success ? {
                    success: result.success,
                    generatedCount: result.generatedCount || 0,
                    savedCount: result.savedCount || 0,
                    skippedCount: result.skippedCount || 0,
                    levelTypeIds: result.levelTypeIds || [],
                    error: result.error,
                } : {
                    success: result.success,
                    generatedCount: 0,
                    savedCount: 0,
                    skippedCount: 0,
                    levelTypeIds: [],
                    error: result.error,
                },
            };
        } catch (error: any) {
            // 确保清理测试数据
            if (cleanupAfter && generatedTypeIds.length > 0) {
                await cleanupTestLevels(ctx, generatedTypeIds);
            }

            console.error("❌ 测试异常:", error);
            return {
                success: false,
                errors: [error.message],
                steps,
                result: null,
            };
        }
    },
});

/**
 * 测试4: 错误处理测试
 */
export const testErrorHandling = internalMutation({
    args: {},
    handler: async (ctx) => {
        console.log("==========================================");
        console.log(`[testErrorHandling] 开始测试错误处理`);
        console.log("==========================================");

        const errors: string[] = [];
        const steps: string[] = [];
        const testResults: Array<{ test: string; passed: boolean; error?: string }> = [];

        // 测试1: 无效规则ID
        console.log("\n[测试1] 无效规则ID...");
        steps.push("测试1: 无效规则ID");
        try {
            SoloChallengeLevelService.generateLevels(TEST_RULE_IDS.INVALID);
            const error = "应该抛出错误但没有抛出";
            console.error(`❌ ${error}`);
            errors.push(error);
            testResults.push({ test: "无效规则ID", passed: false, error });
        } catch (error: any) {
            console.log(`✓ 正确抛出错误: ${error.message}`);
            testResults.push({ test: "无效规则ID", passed: true });
        }

        // 测试2: 检查不存在的关卡
        console.log("\n[测试2] 检查不存在的关卡...");
        steps.push("测试2: 检查不存在的关卡");
        try {
            const exists = await SoloChallengeLevelService.checkLevelExists(ctx, "non_existent_level_id");
            if (exists) {
                errors.push("不存在的关卡应该返回 false");
                testResults.push({ test: "检查不存在的关卡", passed: false, error: "返回了 true" });
            } else {
                console.log("✓ 正确返回 false");
                testResults.push({ test: "检查不存在的关卡", passed: true });
            }
        } catch (error: any) {
            console.error(`❌ 异常: ${error.message}`);
            errors.push(error.message);
            testResults.push({ test: "检查不存在的关卡", passed: false, error: error.message });
        }

        console.log("\n==========================================");
        console.log(`[testErrorHandling] 测试完成`);
        console.log(`成功: ${errors.length === 0 ? "✅" : "❌"}`);
        console.log(`错误数量: ${errors.length}`);
        console.log("==========================================\n");

        return {
            success: errors.length === 0,
            errors,
            steps,
            testResults,
        };
    },
});

/**
 * 测试5: 批量生成测试
 */
export const testBatchGeneration = internalMutation({
    args: {
        ruleIds: v.array(v.string()),
        replaceExisting: v.optional(v.boolean()),
        cleanupAfter: v.optional(v.boolean()),
    },
    handler: async (ctx, { ruleIds, replaceExisting = false, cleanupAfter = true }) => {
        console.log("==========================================");
        console.log(`[testBatchGeneration] 开始测试批量生成`);
        console.log(`规则ID列表: ${ruleIds.join(", ")}`);
        console.log(`替换已存在: ${replaceExisting}`);
        console.log("==========================================");

        const errors: string[] = [];
        const steps: string[] = [];
        const allGeneratedTypeIds: string[] = [];
        const results: Array<{ ruleId: string; success: boolean; count?: number; error?: string }> = [];

        try {
            for (const ruleId of ruleIds) {
                console.log(`\n处理规则: ${ruleId}`);
                try {
                    // 生成关卡
                    const levels = SoloChallengeLevelService.generateLevels(ruleId);
                    const typeIds = levels.map(l => l.typeId);
                    allGeneratedTypeIds.push(...typeIds);

                    // 注册关卡
                    const result = await ctx.runMutation(internal.service.tournament.SoloChallengeLevelService.generateAndRegisterLevels, {
                        ruleId,
                        replaceExisting,
                    });

                    results.push({
                        ruleId,
                        success: result.success,
                        count: result.savedCount,
                        error: result.error,
                    });

                    if (result.success) {
                        console.log(`✓ 规则 ${ruleId}: 成功生成并保存 ${result.savedCount} 个关卡`);
                    } else {
                        console.error(`❌ 规则 ${ruleId}: ${result.error}`);
                        errors.push(`规则 ${ruleId}: ${result.error}`);
                    }
                } catch (error: any) {
                    console.error(`❌ 规则 ${ruleId} 处理失败: ${error.message}`);
                    errors.push(`规则 ${ruleId}: ${error.message}`);
                    results.push({
                        ruleId,
                        success: false,
                        error: error.message,
                    });
                }
            }

            // 清理测试数据（如果需要）
            if (cleanupAfter && allGeneratedTypeIds.length > 0) {
                console.log("\n清理测试数据...");
                const cleanupResult = await cleanupTestLevels(ctx, allGeneratedTypeIds);
                console.log(`✓ 清理完成: 删除 ${cleanupResult.deleted} 个关卡`);
            }

            const successCount = results.filter(r => r.success).length;
            const totalGenerated = results.reduce((sum, r) => sum + (r.count || 0), 0);

            console.log("\n==========================================");
            console.log(`[testBatchGeneration] 测试完成`);
            console.log(`成功规则数: ${successCount}/${ruleIds.length}`);
            console.log(`总生成关卡数: ${totalGenerated}`);
            console.log(`成功: ${errors.length === 0 ? "✅" : "❌"}`);
            console.log("==========================================\n");

            return {
                success: errors.length === 0,
                errors,
                steps,
                results,
                totalGenerated,
            };
        } catch (error: any) {
            // 确保清理测试数据
            if (cleanupAfter && allGeneratedTypeIds.length > 0) {
                await cleanupTestLevels(ctx, allGeneratedTypeIds);
            }

            console.error("❌ 测试异常:", error);
            return {
                success: false,
                errors: [error.message],
                steps,
                results: [],
                totalGenerated: 0,
            };
        }
    },
});

/**
 * 完整集成测试：从生成到注册的完整流程
 */
export const testFullIntegration = internalMutation({
    args: {
        ruleId: v.string(),
        cleanupAfter: v.optional(v.boolean()),
    },
    handler: async (ctx, { ruleId, cleanupAfter = true }): Promise<{
        success: boolean;
        errors: string[];
        steps: string[];
        levelCount: number;
        savedCount: number;
    }> => {
        console.log("==========================================");
        console.log(`[testFullIntegration] 开始完整集成测试`);
        console.log(`规则ID: ${ruleId}`);
        console.log("==========================================");

        const errors: string[] = [];
        const steps: string[] = [];
        const generatedTypeIds: string[] = [];

        try {
            // 步骤1: 生成关卡配置
            console.log("\n[步骤1] 生成关卡配置...");
            steps.push("步骤1: 生成关卡配置");
            const levels = SoloChallengeLevelService.generateLevels(ruleId);
            generatedTypeIds.push(...levels.map(l => l.typeId));
            console.log(`✓ 生成了 ${levels.length} 个关卡`);

            // 步骤2: 验证配置完整性
            console.log("\n[步骤2] 验证配置完整性...");
            steps.push("步骤2: 验证配置完整性");
            for (const level of levels) {
                const validation = validateLevelConfigCompleteness(level);
                if (!validation.valid) {
                    errors.push(...validation.errors.map(err => `${level.typeId}: ${err}`));
                }
            }
            if (errors.length === 0) {
                console.log("✓ 所有关卡配置完整");
            }

            // 步骤3: 验证关卡链关系
            console.log("\n[步骤3] 验证关卡链关系...");
            steps.push("步骤3: 验证关卡链关系");
            const chainValidation = validateLevelChain(levels);
            if (!chainValidation.valid) {
                errors.push(...chainValidation.errors);
            } else {
                console.log("✓ 关卡链关系正确");
            }

            // 步骤4: 注册到数据库
            console.log("\n[步骤4] 注册到数据库...");
            steps.push("步骤4: 注册到数据库");
            const registerResult = await ctx.runMutation(internal.service.tournament.SoloChallengeLevelService.generateAndRegisterLevels, {
                ruleId,
                replaceExisting: false,
            });

            if (!registerResult.success) {
                errors.push(registerResult.error || "注册失败");
            } else {
                console.log(`✓ 注册成功: 保存 ${registerResult.savedCount} 个关卡`);
            }

            // 步骤5: 验证数据库记录
            console.log("\n[步骤5] 验证数据库记录...");
            steps.push("步骤5: 验证数据库记录");
            for (const typeId of registerResult.levelTypeIds || []) {
                const exists = await SoloChallengeLevelService.checkLevelExists(ctx, typeId);
                if (!exists) {
                    errors.push(`关卡 ${typeId} 未在数据库中找到`);
                }
            }
            if (errors.length === 0) {
                console.log("✓ 所有关卡已正确保存到数据库");
            }

            // 步骤6: 清理测试数据
            if (cleanupAfter) {
                console.log("\n[步骤6] 清理测试数据...");
                steps.push("步骤6: 清理测试数据");
                const cleanupResult = await cleanupTestLevels(ctx, generatedTypeIds);
                console.log(`✓ 清理完成: 删除 ${cleanupResult.deleted} 个关卡`);
            }

            console.log("\n==========================================");
            console.log(`[testFullIntegration] 测试完成`);
            console.log(`成功: ${errors.length === 0 ? "✅" : "❌"}`);
            console.log(`错误数量: ${errors.length}`);
            console.log("==========================================\n");

            return {
                success: errors.length === 0,
                errors,
                steps,
                levelCount: levels.length,
                savedCount: registerResult.success ? (registerResult.savedCount || 0) : 0,
            };
        } catch (error: any) {
            if (cleanupAfter && generatedTypeIds.length > 0) {
                await cleanupTestLevels(ctx, generatedTypeIds);
            }

            console.error("❌ 测试异常:", error);
            return {
                success: false,
                errors: [error.message],
                steps,
                levelCount: 0,
                savedCount: 0,
            };
        }
    },
});

