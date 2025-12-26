/**
 * openStage Challenge 类型测试
 * 测试 openStage 方法的不同场景
 */

import { v } from "convex/values";
import { mutation } from "../../../_generated/server";
import { getBossConfig } from "../../../data/bossConfigs";
import { STAGE_RULE_CONFIGS } from "../../../data/stageRuleConfigs";
import { GameRuleConfigService } from "../../game/gameRuleConfigService";
import { StageManagerService } from "../stageManagerService";
import { cleanupArenaStageTestData, cleanupChallengeStageTestData, setupArenaStageTestData, setupChallengeStageTestData } from "./testData";

/**
 * 测试 openStage Challenge 类型
 * 使用 mutation 以便在 Dashboard 中可见
 */
export const testOpenStageChallenge = mutation({
    args: {
        testScenario: v.string(), // "existing_stage", "new_stage", "no_player_stage", "create_stage", "error_no_rule", "error_no_team"
        uid: v.optional(v.string()),
        typeId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { testScenario, uid = "test_challenge_player_1", typeId = "challenge_bronze_boss_1" } = args;

        const testResult: any = {
            scenario: testScenario,
            success: false,
            errors: [] as string[],
            steps: [] as string[],
            data: {} as any,
        };

        console.log("==========================================");
        console.log(`🚀 开始测试: ${testScenario}`);
        console.log(`📊 参数: uid=${uid}, typeId=${typeId}`);
        console.log("==========================================");

        try {
            // 根据场景准备测试数据
            if (testScenario === "existing_stage") {
                // 场景1: Challenge 模式 - 已有 playerStage 和 stage
                testResult.steps.push("准备测试数据：创建 team，然后通过 openStage 创建 stage 和 playerStage");
                console.log("\n[准备数据] 创建已有 stage 场景的测试数据...");

                // 1. 创建 team
                const testData = await setupChallengeStageTestData(ctx, {
                    uid,
                    ruleId: typeId,
                });

                // 2. 通过 openStage 创建 stage 和 player_stage
                const ruleConfig = GameRuleConfigService.getGameRuleConfig(typeId);
                let createdStageId: string | undefined;
                if (!ruleConfig) {
                    testResult.errors.push(`规则配置不存在: ${typeId}`);
                } else {
                    const stage = await StageManagerService.openStage(ctx, { uid, typeId });
                    if (stage) {
                        createdStageId = stage.stageId;
                    }
                }

                // 扩展 testData 以包含 stageId
                const testDataWithStage = {
                    ...testData,
                    stageId: createdStageId,
                };

                testResult.data.testData = testDataWithStage;
                testResult.steps.push("✓ 测试数据准备完成");

                // 执行测试
                testResult.steps.push("执行 openStage 方法");
                console.log("\n[执行测试] 调用 openStage...");
                const stage = await StageManagerService.openStage(ctx, { uid, typeId });

                // 验证结果
                testResult.steps.push("验证返回结果");
                if (!stage) {
                    testResult.errors.push("返回值为 null，预期应返回 Stage 对象");
                } else {
                    // 验证 Stage 对象结构
                    if (!stage.stageId || typeof stage.stageId !== "string") {
                        testResult.errors.push("stageId 字段无效");
                    }
                    if (!stage.bossId || typeof stage.bossId !== "string") {
                        testResult.errors.push("bossId 字段无效");
                    }
                    if (!stage.map || typeof stage.map !== "object") {
                        testResult.errors.push("map 字段无效");
                    } else {
                        if (typeof stage.map.rows !== "number" || typeof stage.map.cols !== "number") {
                            testResult.errors.push("map.rows 或 map.cols 无效");
                        }
                        if (!Array.isArray(stage.map.obstacles)) {
                            testResult.errors.push("map.obstacles 不是数组");
                        }
                        if (!Array.isArray(stage.map.disables)) {
                            testResult.errors.push("map.disables 不是数组");
                        }
                    }
                    if (typeof stage.difficulty !== "number") {
                        testResult.errors.push("difficulty 字段无效");
                    }
                    if (!stage.seed || typeof stage.seed !== "string") {
                        testResult.errors.push("seed 字段无效");
                    }

                    // 验证返回的 stageId 与数据库中的一致
                    if (testDataWithStage.stageId && stage.stageId !== testDataWithStage.stageId) {
                        testResult.errors.push(`返回的 stageId (${stage.stageId}) 与预期 (${testDataWithStage.stageId}) 不一致`);
                    }

                    testResult.data.stage = {
                        stageId: stage.stageId,
                        bossId: stage.bossId,
                        mapRows: stage.map.rows,
                        mapCols: stage.map.cols,
                        obstaclesCount: stage.map.obstacles.length,
                        difficulty: stage.difficulty,
                    };
                }

                testResult.steps.push("✓ 测试执行完成");

            } else if (testScenario === "new_stage") {
                // 场景2: Challenge 模式 - 新建 stage
                testResult.steps.push("准备测试数据：创建 team（不创建 stage）");
                console.log("\n[准备数据] 创建新建 stage 场景的测试数据...");

                const testData = await setupChallengeStageTestData(ctx, {
                    uid,
                    ruleId: typeId,
                });

                testResult.data.testData = testData;
                testResult.steps.push("✓ 测试数据准备完成");

                // 执行测试
                testResult.steps.push("执行 openStage 方法");
                console.log("\n[执行测试] 调用 openStage...");
                const stage = await StageManagerService.openStage(ctx, { uid, typeId });

                // 验证结果
                testResult.steps.push("验证返回结果");
                if (!stage) {
                    testResult.errors.push("返回值为 null，预期应返回新创建的 Stage 对象");
                } else {
                    // 验证 Stage 对象结构
                    if (!stage.stageId || typeof stage.stageId !== "string") {
                        testResult.errors.push("stageId 字段无效");
                    }
                    if (!stage.bossId || typeof stage.bossId !== "string") {
                        testResult.errors.push("bossId 字段无效");
                    }
                    if (!stage.map || typeof stage.map !== "object") {
                        testResult.errors.push("map 字段无效");
                    }
                    if (typeof stage.difficulty !== "number") {
                        testResult.errors.push("difficulty 字段无效");
                    }
                    if (!stage.seed || typeof stage.seed !== "string") {
                        testResult.errors.push("seed 字段无效");
                    }

                    // 验证数据库中创建了新记录
                    const dbStage = await ctx.db
                        .query("mr_stage")
                        .withIndex("by_stageId", (q: any) => q.eq("stageId", stage.stageId))
                        .first();

                    if (!dbStage) {
                        testResult.errors.push("数据库中未找到新创建的 stage 记录");
                    } else {
                        testResult.data.createdStageId = dbStage.stageId;
                    }

                    testResult.data.stage = {
                        stageId: stage.stageId,
                        bossId: stage.bossId,
                        mapRows: stage.map.rows,
                        mapCols: stage.map.cols,
                        obstaclesCount: stage.map.obstacles.length,
                        difficulty: stage.difficulty,
                    };
                }

                testResult.steps.push("✓ 测试执行完成");

            } else if (testScenario === "no_player_stage") {
                // 场景3: Challenge 模式 - mr_player_stages 中没有数据，应该创建新 stage
                testResult.steps.push("准备测试数据：创建 team，确保没有 player_stage 和 stage");
                console.log("\n[准备数据] 创建测试数据（确保没有 player_stage）...");

                // 先清理可能存在的旧数据
                try {
                    await cleanupChallengeStageTestData(ctx, [uid]);
                } catch (error) {
                    // 忽略清理错误
                }

                // 只创建 team，不创建 player_stage 和 stage
                const testData = await setupChallengeStageTestData(ctx, {
                    uid,
                    ruleId: typeId,
                });

                // 验证 mr_player_stages 中确实没有数据
                const existingPlayerStage = await ctx.db
                    .query("mr_player_stages")
                    .withIndex("by_uid_rule", (q: any) => q.eq("uid", uid).eq("ruleId", typeId))
                    .first();

                if (existingPlayerStage) {
                    testResult.errors.push(`预期 mr_player_stages 中没有数据，但找到了: ${existingPlayerStage._id}`);
                } else {
                    testResult.steps.push("✓ 确认 mr_player_stages 中没有数据");
                }

                testResult.data.testData = testData;
                testResult.steps.push("✓ 测试数据准备完成");

                // 执行测试
                testResult.steps.push("执行 openStage 方法");
                console.log("\n[执行测试] 调用 openStage（应该创建新 stage）...");
                const stage = await StageManagerService.openStage(ctx, { uid, typeId });

                // 验证结果
                testResult.steps.push("验证返回结果");
                if (!stage) {
                    testResult.errors.push("返回值为 null，预期应返回新创建的 Stage 对象");
                } else {
                    // 验证 Stage 对象结构
                    if (!stage.stageId || typeof stage.stageId !== "string") {
                        testResult.errors.push("stageId 字段无效");
                    }
                    if (!stage.bossId || typeof stage.bossId !== "string") {
                        testResult.errors.push("bossId 字段无效");
                    }
                    if (!stage.map || typeof stage.map !== "object") {
                        testResult.errors.push("map 字段无效");
                    } else {
                        if (typeof stage.map.rows !== "number" || typeof stage.map.cols !== "number") {
                            testResult.errors.push("map.rows 或 map.cols 无效");
                        }
                        if (!Array.isArray(stage.map.obstacles)) {
                            testResult.errors.push("map.obstacles 不是数组");
                        }
                        if (!Array.isArray(stage.map.disables)) {
                            testResult.errors.push("map.disables 不是数组");
                        }
                    }
                    if (typeof stage.difficulty !== "number") {
                        testResult.errors.push("difficulty 字段无效");
                    }
                    if (!stage.seed || typeof stage.seed !== "string") {
                        testResult.errors.push("seed 字段无效");
                    }
                    if (stage.attempts !== undefined && typeof stage.attempts !== "number") {
                        testResult.errors.push("attempts 字段类型无效");
                    }

                    // 验证数据库中创建了新 stage 记录
                    const dbStage = await ctx.db
                        .query("mr_stage")
                        .withIndex("by_stageId", (q: any) => q.eq("stageId", stage.stageId))
                        .first();

                    if (!dbStage) {
                        testResult.errors.push("数据库中未找到新创建的 stage 记录");
                    } else {
                        testResult.data.createdStageId = dbStage.stageId;

                        // 验证 map 数据正确保存在 stage 中
                        if (!dbStage.map || typeof dbStage.map !== "object") {
                            testResult.errors.push("数据库中的 stage.map 字段无效");
                        } else {
                            if (dbStage.map.rows !== stage.map.rows || dbStage.map.cols !== stage.map.cols) {
                                testResult.errors.push("数据库中的 map 尺寸与返回的 stage.map 不一致");
                            }
                        }
                    }

                    testResult.data.stage = {
                        stageId: stage.stageId,
                        bossId: stage.bossId,
                        mapRows: stage.map.rows,
                        mapCols: stage.map.cols,
                        obstaclesCount: stage.map.obstacles.length,
                        disablesCount: stage.map.disables.length,
                        difficulty: stage.difficulty,
                        attempts: stage.attempts,
                    };
                }

                testResult.steps.push("✓ 测试执行完成");

            } else if (testScenario === "create_stage") {
                // 场景4: 专门测试 openStage 中调用 createStage 的完整流程
                testResult.steps.push("准备测试数据：创建 team，确保没有 player_stage 和 stage");
                console.log("\n[准备数据] 创建测试数据（测试 createStage 完整流程）...");

                // 先清理可能存在的旧数据
                try {
                    await cleanupChallengeStageTestData(ctx, [uid]);
                } catch (error) {
                    // 忽略清理错误
                }

                // 只创建 team，不创建 player_stage 和 stage
                const testData = await setupChallengeStageTestData(ctx, {
                    uid,
                    ruleId: typeId,
                });

                // 验证 mr_player_stages 中确实没有数据
                const existingPlayerStage = await ctx.db
                    .query("mr_player_stages")
                    .withIndex("by_uid_rule", (q: any) => q.eq("uid", uid).eq("ruleId", typeId))
                    .first();

                if (existingPlayerStage) {
                    testResult.errors.push(`预期 mr_player_stages 中没有数据，但找到了: ${existingPlayerStage._id}`);
                } else {
                    testResult.steps.push("✓ 确认 mr_player_stages 中没有数据");
                }

                testResult.data.testData = testData;
                testResult.steps.push("✓ 测试数据准备完成");

                // 执行测试
                testResult.steps.push("执行 openStage 方法（应该调用 createStage）");
                console.log("\n[执行测试] 调用 openStage（应该创建新 stage）...");
                const stage = await StageManagerService.openStage(ctx, { uid, typeId });

                // 验证结果
                testResult.steps.push("验证 createStage 的完整流程");
                if (!stage) {
                    testResult.errors.push("返回值为 null，预期应返回新创建的 Stage 对象");
                } else {
                    // 1. 验证 Stage 对象结构完整
                    if (!stage.stageId || typeof stage.stageId !== "string") {
                        testResult.errors.push("stageId 字段无效");
                    } else {
                        // 验证 stageId 格式：应该包含 ruleId
                        if (!stage.stageId.includes(typeId)) {
                            testResult.errors.push(`stageId 格式不正确，应包含 ruleId: ${typeId}`);
                        }
                    }

                    if (!stage.bossId || typeof stage.bossId !== "string") {
                        testResult.errors.push("bossId 字段无效");
                    } else {
                        // 验证 bossId 是否有效（应该存在于 bossConfigs 中）
                        const bossConfig = getBossConfig(stage.bossId);
                        if (!bossConfig) {
                            testResult.errors.push(`bossId 无效，Boss配置不存在: ${stage.bossId}`);
                        } else {
                            testResult.data.bossConfig = {
                                bossId: bossConfig.bossId,
                                monsterId: bossConfig.monsterId,
                                difficulty: bossConfig.difficulty,
                            };
                        }
                    }

                    // 2. 验证 map 数据完整
                    if (!stage.map || typeof stage.map !== "object") {
                        testResult.errors.push("map 字段无效");
                    } else {
                        if (typeof stage.map.rows !== "number" || stage.map.rows <= 0) {
                            testResult.errors.push("map.rows 无效");
                        }
                        if (typeof stage.map.cols !== "number" || stage.map.cols <= 0) {
                            testResult.errors.push("map.cols 无效");
                        }
                        if (!Array.isArray(stage.map.obstacles)) {
                            testResult.errors.push("map.obstacles 不是数组");
                        } else {
                            // 验证 obstacles 结构
                            for (let i = 0; i < stage.map.obstacles.length; i++) {
                                const obs = stage.map.obstacles[i];
                                if (typeof obs.q !== "number" || typeof obs.r !== "number") {
                                    testResult.errors.push(`map.obstacles[${i}] 缺少 q 或 r 坐标`);
                                }
                                if (typeof obs.type !== "number") {
                                    testResult.errors.push(`map.obstacles[${i}] 缺少 type`);
                                }
                                if (typeof obs.asset !== "string") {
                                    testResult.errors.push(`map.obstacles[${i}] 缺少 asset`);
                                }
                            }
                        }
                        if (!Array.isArray(stage.map.disables)) {
                            testResult.errors.push("map.disables 不是数组");
                        }
                    }

                    // 3. 验证 difficulty 使用了 ruleConfig 中的默认值
                    const ruleConfig = STAGE_RULE_CONFIGS[typeId];
                    if (ruleConfig) {
                        const expectedDifficulty = ruleConfig.stageContent?.difficultyAdjustment?.difficultyMultiplier || 1.0;
                        if (Math.abs(stage.difficulty - expectedDifficulty) > 0.001) {
                            testResult.errors.push(`difficulty 值不正确，预期: ${expectedDifficulty}，实际: ${stage.difficulty}`);
                        } else {
                            testResult.data.verifiedDifficulty = {
                                expected: expectedDifficulty,
                                actual: stage.difficulty,
                            };
                        }
                    }

                    // 4. 验证 seed 存在且有效
                    if (!stage.seed || typeof stage.seed !== "string" || stage.seed.length === 0) {
                        testResult.errors.push("seed 字段无效");
                    }

                    // 5. 验证 attempts 初始化为 1
                    if (stage.attempts !== undefined && stage.attempts !== 1) {
                        testResult.errors.push(`attempts 初始值不正确，预期: 1，实际: ${stage.attempts}`);
                    }

                    // 6. 验证数据库中创建了新记录
                    const dbStage = await ctx.db
                        .query("mr_stage")
                        .withIndex("by_stageId", (q: any) => q.eq("stageId", stage.stageId))
                        .first();

                    if (!dbStage) {
                        testResult.errors.push("数据库中未找到新创建的 stage 记录");
                    } else {
                        testResult.data.createdStageId = dbStage.stageId;

                        // 验证数据库中的 map 数据与返回的 stage.map 一致
                        if (!dbStage.map || typeof dbStage.map !== "object") {
                            testResult.errors.push("数据库中的 stage.map 字段无效");
                        } else {
                            if (dbStage.map.rows !== stage.map.rows || dbStage.map.cols !== stage.map.cols) {
                                testResult.errors.push("数据库中的 map 尺寸与返回的 stage.map 不一致");
                            }
                            if (dbStage.map.obstacles.length !== stage.map.obstacles.length) {
                                testResult.errors.push(`数据库中的 obstacles 数量不一致，数据库: ${dbStage.map.obstacles.length}，返回: ${stage.map.obstacles.length}`);
                            }
                        }

                        // 验证其他字段一致性
                        if (dbStage.bossId !== stage.bossId) {
                            testResult.errors.push(`数据库中的 bossId 不一致，数据库: ${dbStage.bossId}，返回: ${stage.bossId}`);
                        }
                        if (Math.abs(dbStage.difficulty - stage.difficulty) > 0.001) {
                            testResult.errors.push(`数据库中的 difficulty 不一致，数据库: ${dbStage.difficulty}，返回: ${stage.difficulty}`);
                        }
                        if (dbStage.seed !== stage.seed) {
                            testResult.errors.push(`数据库中的 seed 不一致，数据库: ${dbStage.seed}，返回: ${stage.seed}`);
                        }
                        if (dbStage.attempts !== 1) {
                            testResult.errors.push(`数据库中的 attempts 初始值不正确，预期: 1，实际: ${dbStage.attempts}`);
                        }
                    }

                    // 7. 验证 stageId 生成逻辑（应该基于 ruleId 和 seed）
                    const expectedStageIdPattern = `stage_${typeId}_`;
                    if (!stage.stageId.startsWith(expectedStageIdPattern)) {
                        testResult.errors.push(`stageId 格式不正确，应以 "${expectedStageIdPattern}" 开头`);
                    }

                    testResult.data.stage = {
                        stageId: stage.stageId,
                        bossId: stage.bossId,
                        mapRows: stage.map.rows,
                        mapCols: stage.map.cols,
                        obstaclesCount: stage.map.obstacles.length,
                        disablesCount: stage.map.disables.length,
                        difficulty: stage.difficulty,
                        seed: stage.seed.substring(0, 20) + "...", // 只显示前20个字符
                        attempts: stage.attempts,
                        createdAt: stage.createdAt,
                    };
                }

                testResult.steps.push("✓ createStage 完整流程测试完成");

            } else if (testScenario === "error_no_rule") {
                // 场景5: 错误场景 - ruleConfig 不存在
                testResult.steps.push("准备测试数据：创建 team");
                console.log("\n[准备数据] 创建 team 数据...");

                await setupChallengeStageTestData(ctx, {
                    uid,
                    ruleId: "non_existent_rule",
                });

                testResult.steps.push("✓ 测试数据准备完成");

                // 执行测试
                testResult.steps.push("执行 openStage 方法（预期抛出错误）");
                console.log("\n[执行测试] 调用 openStage（预期失败）...");
                try {
                    await StageManagerService.openStage(ctx, { uid, typeId: "non_existent_rule_id" });
                    testResult.errors.push("预期抛出错误，但方法成功执行");
                } catch (error: any) {
                    if (error.message && error.message.includes("关卡规则配置不存在")) {
                        testResult.steps.push("✓ 正确抛出预期错误");
                        testResult.data.error = error.message;
                    } else {
                        testResult.errors.push(`抛出错误，但错误信息不正确: ${error.message}`);
                    }
                }

            } else if (testScenario === "error_no_team") {
                // 场景5: 错误场景 - team 不存在
                testResult.steps.push("不创建 team 数据");
                console.log("\n[准备数据] 不创建 team（测试错误场景）...");

                // 执行测试
                testResult.steps.push("执行 openStage 方法（预期抛出错误）");
                console.log("\n[执行测试] 调用 openStage（预期失败）...");
                try {
                    await StageManagerService.openStage(ctx, { uid: "non_existent_uid", typeId });
                    testResult.errors.push("预期抛出错误，但方法成功执行");
                } catch (error: any) {
                    if (error.message && error.message.includes("队伍不存在")) {
                        testResult.steps.push("✓ 正确抛出预期错误");
                        testResult.data.error = error.message;
                    } else {
                        testResult.errors.push(`抛出错误，但错误信息不正确: ${error.message}`);
                    }
                }

            } else if (testScenario === "arena_existing_stage") {
                // 场景6: Arena 模式 - 已有 arena_stage 和 stage
                const arenaUid = uid;
                const arenaTypeId = "arena_bronze";

                testResult.steps.push("准备测试数据：创建 team，然后通过 createStage 创建 stage 和 arena_stage");
                console.log("\n[准备数据] 创建已有 arena stage 场景的测试数据...");

                // 1. 创建 team
                const testData = await setupArenaStageTestData(ctx, {
                    uid: arenaUid,
                    ruleId: arenaTypeId,
                });

                // 2. 通过 createStage 创建 stage 和 arena_stage
                const ruleConfig = GameRuleConfigService.getGameRuleConfig(arenaTypeId);
                let createdStageId: string | undefined;
                if (!ruleConfig) {
                    testResult.errors.push(`规则配置不存在: ${arenaTypeId}`);
                } else {
                    const difficulty = ruleConfig.stageContent?.difficultyAdjustment?.difficultyMultiplier || 1.0;
                    const stage = await StageManagerService.createStage(ctx, {
                        ruleId: arenaTypeId,
                        difficulty,
                    });

                    if (stage) {
                        await ctx.db.insert("mr_arena_stage", {
                            ruleId: arenaTypeId,
                            stageId: stage.stageId,
                            createdAt: new Date().toISOString(),
                        });
                        createdStageId = stage.stageId;
                    }
                }

                // 扩展 testData 以包含 stageId
                const testDataWithStage = {
                    ...testData,
                    stageId: createdStageId,
                };

                testResult.data.testData = testData;
                testResult.steps.push("✓ 测试数据准备完成");

                // 执行测试
                testResult.steps.push("执行 openStage 方法");
                console.log("\n[执行测试] 调用 openStage（Arena 模式）...");
                const stage = await StageManagerService.openStage(ctx, { uid: arenaUid, typeId: arenaTypeId });

                // 验证结果
                testResult.steps.push("验证返回结果");
                if (!stage) {
                    testResult.errors.push("返回值为 null，预期应返回 Stage 对象");
                } else {
                    // 验证 Stage 对象结构
                    if (!stage.stageId || typeof stage.stageId !== "string") {
                        testResult.errors.push("stageId 字段无效");
                    }
                    if (!stage.bossId || typeof stage.bossId !== "string") {
                        testResult.errors.push("bossId 字段无效");
                    }
                    if (!stage.map || typeof stage.map !== "object") {
                        testResult.errors.push("map 字段无效");
                    } else {
                        if (typeof stage.map.rows !== "number" || typeof stage.map.cols !== "number") {
                            testResult.errors.push("map.rows 或 map.cols 无效");
                        }
                        if (!Array.isArray(stage.map.obstacles)) {
                            testResult.errors.push("map.obstacles 不是数组");
                        }
                        if (!Array.isArray(stage.map.disables)) {
                            testResult.errors.push("map.disables 不是数组");
                        }
                    }
                    if (typeof stage.difficulty !== "number") {
                        testResult.errors.push("difficulty 字段无效");
                    }
                    if (!stage.seed || typeof stage.seed !== "string") {
                        testResult.errors.push("seed 字段无效");
                    }

                    // 验证返回的 stageId 与数据库中的一致
                    if (testDataWithStage.stageId && stage.stageId !== testDataWithStage.stageId) {
                        testResult.errors.push(`返回的 stageId (${stage.stageId}) 与预期 (${testDataWithStage.stageId}) 不一致`);
                    }

                    testResult.data.stage = {
                        stageId: stage.stageId,
                        bossId: stage.bossId,
                        mapRows: stage.map.rows,
                        mapCols: stage.map.cols,
                        obstaclesCount: stage.map.obstacles.length,
                        difficulty: stage.difficulty,
                    };
                }

                testResult.steps.push("✓ 测试执行完成");

            } else if (testScenario === "arena_new_stage") {
                // 场景7: Arena 模式 - 没有 arena_stage，应该创建新 stage
                const arenaUid = uid;
                const arenaTypeId = "arena_bronze";

                testResult.steps.push("准备测试数据：创建 team，确保没有 arena_stage 和 stage");
                console.log("\n[准备数据] 创建测试数据（确保没有 arena_stage）...");

                // 先清理可能存在的旧数据
                try {
                    await cleanupArenaStageTestData(ctx, [arenaUid], [arenaTypeId]);
                } catch (error) {
                    // 忽略清理错误
                }

                // 只创建 team，不创建 arena_stage 和 stage
                const testData = await setupArenaStageTestData(ctx, {
                    uid: arenaUid,
                    ruleId: arenaTypeId,
                });

                // 验证 mr_arena_stage 中确实没有数据
                const existingArenaStage = await ctx.db
                    .query("mr_arena_stage")
                    .withIndex("by_ruleId", (q: any) => q.eq("ruleId", arenaTypeId))
                    .first();

                if (existingArenaStage) {
                    testResult.errors.push(`预期 mr_arena_stage 中没有数据，但找到了: ${existingArenaStage._id}`);
                } else {
                    testResult.steps.push("✓ 确认 mr_arena_stage 中没有数据");
                }

                testResult.data.testData = testData;
                testResult.steps.push("✓ 测试数据准备完成");

                // 执行测试
                testResult.steps.push("执行 openStage 方法（应该创建新 stage）");
                console.log("\n[执行测试] 调用 openStage（应该创建新 arena stage）...");
                const stage = await StageManagerService.openStage(ctx, { uid: arenaUid, typeId: arenaTypeId });

                // 验证结果
                testResult.steps.push("验证返回结果");
                if (!stage) {
                    testResult.errors.push("返回值为 null，预期应返回新创建的 Stage 对象");
                } else {
                    // 验证 Stage 对象结构
                    if (!stage.stageId || typeof stage.stageId !== "string") {
                        testResult.errors.push("stageId 字段无效");
                    }
                    if (!stage.bossId || typeof stage.bossId !== "string") {
                        testResult.errors.push("bossId 字段无效");
                    }
                    if (!stage.map || typeof stage.map !== "object") {
                        testResult.errors.push("map 字段无效");
                    }
                    if (typeof stage.difficulty !== "number") {
                        testResult.errors.push("difficulty 字段无效");
                    }
                    if (!stage.seed || typeof stage.seed !== "string") {
                        testResult.errors.push("seed 字段无效");
                    }

                    // 验证数据库中创建了新记录
                    const dbStage = await ctx.db
                        .query("mr_stage")
                        .withIndex("by_stageId", (q: any) => q.eq("stageId", stage.stageId))
                        .first();

                    if (!dbStage) {
                        testResult.errors.push("数据库中未找到新创建的 stage 记录");
                    } else {
                        testResult.data.createdStageId = dbStage.stageId;
                    }

                    // 验证数据库中创建了 arena_stage 记录
                    const dbArenaStage = await ctx.db
                        .query("mr_arena_stage")
                        .withIndex("by_ruleId", (q: any) => q.eq("ruleId", arenaTypeId))
                        .first();

                    if (!dbArenaStage) {
                        testResult.errors.push("数据库中未找到新创建的 arena_stage 记录");
                    } else {
                        if (dbArenaStage.stageId !== stage.stageId) {
                            testResult.errors.push(`arena_stage.stageId (${dbArenaStage.stageId}) 与返回的 stageId (${stage.stageId}) 不一致`);
                        }
                        testResult.data.createdArenaStageId = dbArenaStage._id;
                    }

                    testResult.data.stage = {
                        stageId: stage.stageId,
                        bossId: stage.bossId,
                        mapRows: stage.map.rows,
                        mapCols: stage.map.cols,
                        obstaclesCount: stage.map.obstacles.length,
                        difficulty: stage.difficulty,
                    };
                }

                testResult.steps.push("✓ 测试执行完成");

            } else {
                testResult.errors.push(`未知的测试场景: ${testScenario}`);
            }

            // 测试完成后保留测试数据（不清理）
            // 如果需要清理数据，可以手动调用 cleanupChallengeStageTestData 或 cleanupArenaStageTestData
            testResult.steps.push("测试数据已保留（未清理）");
            testResult.data.note = "测试数据已保留在数据库中，可以手动清理或用于后续测试";

            // 判断测试是否成功
            testResult.success = testResult.errors.length === 0;

            if (testResult.success) {
                console.log("\n✅ 测试通过！");
            } else {
                console.log("\n❌ 测试失败！");
                console.log("错误:", testResult.errors);
            }

        } catch (error: any) {
            testResult.success = false;
            testResult.errors.push(`测试执行异常: ${error.message}`);
            console.error("\n❌ 测试执行异常:", error);

            // 测试异常时也保留数据，方便调试
            testResult.data.note = "测试异常，数据已保留在数据库中，可以手动清理或用于调试";
        }

        return testResult;
    },
});

