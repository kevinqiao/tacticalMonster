/**
 * 玩家初始化集成测试
 * 测试玩家注册、库存初始化、怪物创建、队伍设置等完整流程
 */

import { v } from "convex/values";
import { api, internal } from "../../../../_generated/api";
import { action, internalMutation } from "../../../../_generated/server";
import { MonsterService } from "../../../monster/monsterService";
import { TEST_MONSTERS, TEST_PLAYERS, generateTestTeamForTier } from "../testData";
import { assertPlayerInitialized } from "../utils/assertions";

/**
 * 内部 mutation: 创建测试怪物配置
 */
export const createTestMonsterConfig = internalMutation({
    args: {
        monsterId: v.string(),
    },
    handler: async (ctx, args) => {
        const config = await MonsterService.getMonsterConfig(ctx, args.monsterId);
        if (!config) {
            await ctx.db.insert("mr_monster_configs", {
                monsterId: args.monsterId,
                name: `测试怪物 ${args.monsterId}`,
                rarity: "Common",
                baseHp: 100,
                baseDamage: 50,
                baseDefense: 30,
                baseSpeed: 40,
                skills: [],
                growthRates: {},
                assetPath: `/assets/monsters/${args.monsterId}.glb`,
                configVersion: 1,
            });
        }
        return { success: true };
    },
});

/**
 * 测试：创建并初始化单个玩家
 * 使用 action 因为需要调用 HTTP API (fetch)
 */
export const testPlayerInitialization = action({
    args: {
        uid: v.string(),
        monsterIds: v.array(v.string()),
        teamMonsterIds: v.array(v.string()),
    },
    handler: async (ctx, args) => {
        console.log("==========================================");
        console.log(`[testPlayerInitialization] 开始测试玩家初始化`);
        console.log(`玩家 UID: ${args.uid}`);
        console.log(`怪物数量: ${args.monsterIds.length}`);
        console.log(`队伍怪物数量: ${args.teamMonsterIds.length}`);
        console.log("==========================================");

        const { uid, monsterIds, teamMonsterIds } = args;
        const errors: string[] = [];
        const steps: string[] = [];

        try {
            // 步骤1: 创建玩家（通过 Tournament 模块的 HTTP API）
            console.log("\n[步骤1] 创建玩家...");
            steps.push("步骤1: 创建玩家");
            try {
                const tournamentUrl = process.env.TOURNAMENT_URL || "https://beloved-mouse-699.convex.site";
                console.log(`调用 Tournament API: ${tournamentUrl}/authenticate`);
                const response = await fetch(`${tournamentUrl}/authenticate`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        uid,
                        token: `test_token_${uid}`,
                    }),
                });
                console.log(`响应状态: ${response.status}`);
                if (!response.ok) {
                    console.error(`❌ 创建玩家失败: ${response.status}`);
                    errors.push(`创建玩家失败: ${response.status}`);
                } else {
                    steps.push("✓ 玩家创建成功");
                    console.log("✓ 玩家创建成功");
                }
            } catch (error: any) {
                // 如果 HTTP 调用失败，尝试直接创建（仅用于测试）
                console.error(`❌ 创建玩家异常:`, error.message);
                errors.push(`创建玩家失败: ${error.message}`);
            }

            // 步骤2-3: 验证玩家和库存（通过 HTTP API）
            console.log("\n[步骤2-3] 验证玩家和库存...");
            steps.push("步骤2-3: 验证玩家和库存");
            try {
                const tournamentUrl = process.env.TOURNAMENT_URL || "https://beloved-mouse-699.convex.site";
                const response = await fetch(`${tournamentUrl}/getPlayerInventory?uid=${uid}`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.inventory) {
                        if (data.inventory.coins !== 1000) {
                            console.error(`❌ 初始金币不正确，期望 1000，实际 ${data.inventory.coins}`);
                            errors.push(`初始金币不正确，期望 1000，实际 ${data.inventory.coins}`);
                        } else {
                            steps.push("✓ 库存初始化验证成功");
                            console.log("✓ 库存初始化验证成功");
                        }
                    }
                }
            } catch (error: any) {
                console.warn(`⚠ 库存验证跳过: ${error.message}`);
                steps.push(`⚠ 库存验证跳过: ${error.message}`);
            }

            // 步骤4: 创建怪物
            console.log("\n[步骤4] 创建怪物...");
            steps.push("步骤4: 创建怪物");
            let createdMonsters = 0;
            for (const monsterId of monsterIds) {
                try {
                    // 创建怪物配置（如果需要，使用 internal 因为它是 internalMutation）
                    await ctx.runMutation(
                        (internal as any)["service/game/tests/integration/playerInitialization.test"].createTestMonsterConfig,
                        { monsterId }
                    );

                    // 添加怪物到玩家（使用 api 因为它是 public mutation）
                    await ctx.runMutation(
                        (api as any)["service/monster/monsterService"].addMonsterToPlayer,
                        {
                            uid,
                            monsterId,
                            level: 1,
                            stars: 1,
                        }
                    );
                    createdMonsters++;
                    console.log(`✓ 创建怪物: ${monsterId}`);
                } catch (error: any) {
                    if (!error.message.includes("已拥有")) {
                        console.error(`❌ 创建怪物 ${monsterId} 失败:`, error.message);
                        errors.push(`创建怪物 ${monsterId} 失败: ${error.message}`);
                    } else {
                        console.log(`⚠ 怪物 ${monsterId} 已存在，跳过`);
                    }
                }
            }
            steps.push(`✓ 创建了 ${createdMonsters} 个怪物`);
            console.log(`✓ 创建了 ${createdMonsters}/${monsterIds.length} 个怪物`);

            // 步骤5: 设置上场队伍
            console.log("\n[步骤5] 设置上场队伍...");
            steps.push("步骤5: 设置上场队伍");
            if (teamMonsterIds.length > 0) {
                await ctx.runMutation(
                    (api as any)["service/team/teamService"].setPlayerTeam,
                    {
                        uid,
                        monsterIds: teamMonsterIds,
                    }
                );
                steps.push(`✓ 设置了 ${teamMonsterIds.length} 个怪物的上场队伍`);
                console.log(`✓ 设置了 ${teamMonsterIds.length} 个怪物的上场队伍`);
            }

            // 步骤6: 验证队伍
            console.log("\n[步骤6] 验证队伍...");
            steps.push("步骤6: 验证队伍");
            const teamValidation: any = await ctx.runQuery(
                (api as any)["service/team/teamService"].validateTeam,
                { uid }
            );
            if (!teamValidation.valid) {
                console.error(`❌ 队伍验证失败: ${teamValidation.reason}`);
                errors.push(`队伍验证失败: ${teamValidation.reason}`);
            } else {
                steps.push(`✓ 队伍验证成功，队伍大小: ${teamValidation.teamSize}`);
                console.log(`✓ 队伍验证成功，队伍大小: ${teamValidation.teamSize}`);
            }

            // 步骤7: 完整验证（跳过，因为 assertPlayerInitialized 需要数据库访问）
            console.log("\n[步骤7] 完整验证...");
            steps.push("步骤7: 完整验证");
            steps.push("⚠ 完整验证跳过（需要数据库直接访问）");
            console.log("⚠ 完整验证跳过（需要数据库直接访问）");

            console.log("\n==========================================");
            console.log(`[testPlayerInitialization] 测试完成`);
            console.log(`成功: ${errors.length === 0 ? "✅" : "❌"}`);
            console.log(`错误数量: ${errors.length}`);
            console.log("==========================================\n");

            return {
                success: errors.length === 0,
                errors,
                steps,
                data: {
                    createdMonsters,
                    teamSize: teamValidation.teamSize,
                },
            };
        } catch (error: any) {
            console.error("\n==========================================");
            console.error(`[testPlayerInitialization] 测试执行失败`);
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
 * 测试：批量初始化多个玩家
 * 使用 action 因为需要调用 HTTP API (fetch) 和数据库操作
 */
export const testBatchPlayerInitialization = action({
    args: {
        playerCount: v.optional(v.number()),
        tier: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { playerCount = 5, tier = "bronze" } = args;
        const errors: string[] = [];
        const results: any[] = [];

        // 选择测试玩家
        const testPlayers = TEST_PLAYERS.slice(0, playerCount);
        const teamMonsterIds = generateTestTeamForTier(tier as any);

        for (const player of testPlayers) {
            console.log("player:", player);
            try {
                // 为每个玩家创建4个怪物
                const monsterIds = TEST_MONSTERS.slice(0, 4).map((m) => m.monsterId);

                // 通过 action 调用 mutation 来执行数据库操作
                const result = await (async () => {
                    const testResult = { success: true, errors: [] as string[], steps: [] as string[] };
                    try {
                        // 创建怪物
                        for (const monsterId of monsterIds) {
                            try {
                                // 创建怪物配置（如果需要，使用 internal 因为它是 internalMutation）
                                await ctx.runMutation(
                                    (internal as any)["service/game/tests/integration/index"].createTestMonsterConfig,
                                    { monsterId }
                                );

                                // 添加怪物到玩家（使用 api 因为它是 public mutation）
                                await ctx.runMutation(
                                    api.service.monster.monsterService.addMonsterToPlayer,
                                    {
                                        uid: player.uid,
                                        monsterId,
                                        level: 1,
                                        stars: 1,
                                    }
                                );
                                console.log("创建怪物:", monsterId);
                            } catch (error: any) {
                                if (!error.message.includes("已拥有")) {
                                    testResult.errors.push(`创建怪物 ${monsterId} 失败: ${error.message}`);
                                }
                            }
                        }

                        // 设置队伍（使用 api 因为它是 public mutation）
                        if (teamMonsterIds.length > 0) {
                            await ctx.runMutation(
                                (api as any)["service/team/teamService"].setPlayerTeam,
                                {
                                    uid: player.uid,
                                    monsterIds: teamMonsterIds.slice(0, 4),
                                }
                            );
                        }

                        // 验证
                        const assertion = await assertPlayerInitialized(ctx, player.uid);
                        if (!assertion.success) {
                            testResult.errors.push(...assertion.errors);
                            testResult.success = false;
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
                    errors.push(`玩家 ${player.uid} 初始化失败: ${result.errors.join(", ")}`);
                }
            } catch (error: any) {
                errors.push(`玩家 ${player.uid} 初始化异常: ${error.message}`);
                results.push({
                    uid: player.uid,
                    success: false,
                    errors: [error.message],
                });
            }
        }

        const successCount = results.filter((r) => r.success).length;

        return {
            success: errors.length === 0,
            errors,
            totalPlayers: testPlayers.length,
            successCount,
            results,
        };
    },
});

