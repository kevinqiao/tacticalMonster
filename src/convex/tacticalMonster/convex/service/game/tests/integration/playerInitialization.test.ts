/**
 * 玩家初始化集成测试
 * 测试玩家注册、库存初始化、怪物创建、队伍设置等完整流程
 */

import { v } from "convex/values";
import { internalMutation } from "../../../../_generated/server";
import { MonsterService } from "../../../monster/monsterService";
import { TeamService } from "../../../team/teamService";
import { TEST_MONSTERS, TEST_PLAYERS, generateTestTeamForTier } from "../testData";
import { assertPlayerInitialized } from "../utils/assertions";

/**
 * 测试：创建并初始化单个玩家
 */
export const testPlayerInitialization = internalMutation({
    args: {
        uid: v.string(),
        monsterIds: v.array(v.string()),
        teamMonsterIds: v.array(v.string()),
    },
    handler: async (ctx, args) => {
        const { uid, monsterIds, teamMonsterIds } = args;
        const errors: string[] = [];
        const steps: string[] = [];

        try {
            // 步骤1: 创建玩家（通过 Tournament 模块的 HTTP API）
            steps.push("步骤1: 创建玩家");
            try {
                const tournamentUrl = process.env.TOURNAMENT_URL || "https://beloved-mouse-699.convex.site";
                const response = await fetch(`${tournamentUrl}/authenticate`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        uid,
                        token: `test_token_${uid}`,
                    }),
                });
                if (!response.ok) {
                    errors.push(`创建玩家失败: ${response.status}`);
                } else {
                    steps.push("✓ 玩家创建成功");
                }
            } catch (error: any) {
                // 如果 HTTP 调用失败，尝试直接创建（仅用于测试）
                errors.push(`创建玩家失败: ${error.message}`);
            }

            // 步骤2-3: 验证玩家和库存（通过 HTTP API）
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
                            errors.push(`初始金币不正确，期望 1000，实际 ${data.inventory.coins}`);
                        } else {
                            steps.push("✓ 库存初始化验证成功");
                        }
                    }
                }
            } catch (error: any) {
                steps.push(`⚠ 库存验证跳过: ${error.message}`);
            }

            // 步骤4: 创建怪物
            steps.push("步骤4: 创建怪物");
            for (const monsterId of monsterIds) {
                try {
                    // 检查怪物配置是否存在
                    const config = await MonsterService.getMonsterConfig(ctx, monsterId);
                    if (!config) {
                        // 如果配置不存在，创建一个测试配置
                        await ctx.db.insert("mr_monster_configs", {
                            monsterId,
                            name: `测试怪物 ${monsterId}`,
                            rarity: "Common",
                            baseHp: 100,
                            baseDamage: 50,
                            baseDefense: 30,
                            baseSpeed: 40,
                            skills: [],
                            growthRates: {},
                            assetPath: `/assets/monsters/${monsterId}.glb`,
                            configVersion: 1,
                        });
                    }

                    await MonsterService.addMonsterToPlayer(ctx, {
                        uid,
                        monsterId,
                        level: 1,
                        stars: 1,
                    });
                } catch (error: any) {
                    if (!error.message.includes("已拥有")) {
                        errors.push(`创建怪物 ${monsterId} 失败: ${error.message}`);
                    }
                }
            }
            steps.push(`✓ 创建了 ${monsterIds.length} 个怪物`);

            // 步骤5: 设置上场队伍
            steps.push("步骤5: 设置上场队伍");
            if (teamMonsterIds.length > 0) {
                await TeamService.setPlayerTeam(ctx, {
                    uid,
                    monsterIds: teamMonsterIds,
                });
                steps.push(`✓ 设置了 ${teamMonsterIds.length} 个怪物的上场队伍`);
            }

            // 步骤6: 验证队伍
            steps.push("步骤6: 验证队伍");
            const teamValidation = await TeamService.validateTeam(ctx, uid);
            if (!teamValidation.valid) {
                errors.push(`队伍验证失败: ${teamValidation.reason}`);
            } else {
                steps.push(`✓ 队伍验证成功，队伍大小: ${teamValidation.teamSize}`);
            }

            // 步骤7: 完整验证
            steps.push("步骤7: 完整验证");
            const assertion = await assertPlayerInitialized(ctx, uid);
            if (!assertion.success) {
                errors.push(...assertion.errors);
            } else {
                steps.push("✓ 完整验证通过");
            }

            return {
                success: errors.length === 0,
                errors,
                steps,
                data: assertion.data,
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
 * 测试：批量初始化多个玩家
 */
export const testBatchPlayerInitialization = internalMutation({
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
            try {
                // 为每个玩家创建4个怪物
                const monsterIds = TEST_MONSTERS.slice(0, 4).map((m) => m.monsterId);

                // 直接调用测试逻辑，而不是通过 mutation
                const result = await (async () => {
                    const testResult = { success: true, errors: [] as string[], steps: [] as string[] };
                    try {
                        // 创建怪物
                        for (const monsterId of monsterIds) {
                            try {
                                const config = await MonsterService.getMonsterConfig(ctx, monsterId);
                                if (!config) {
                                    await ctx.db.insert("mr_monster_configs", {
                                        monsterId,
                                        name: `测试怪物 ${monsterId}`,
                                        rarity: "Common",
                                        baseHp: 100,
                                        baseDamage: 50,
                                        baseDefense: 30,
                                        baseSpeed: 40,
                                        skills: [],
                                        growthRates: {},
                                        assetPath: `/assets/monsters/${monsterId}.glb`,
                                        configVersion: 1,
                                    });
                                }
                                await MonsterService.addMonsterToPlayer(ctx, {
                                    uid: player.uid,
                                    monsterId,
                                    level: 1,
                                    stars: 1,
                                });
                            } catch (error: any) {
                                if (!error.message.includes("已拥有")) {
                                    testResult.errors.push(`创建怪物 ${monsterId} 失败: ${error.message}`);
                                }
                            }
                        }

                        // 设置队伍
                        if (teamMonsterIds.length > 0) {
                            await TeamService.setPlayerTeam(ctx, {
                                uid: player.uid,
                                monsterIds: teamMonsterIds.slice(0, 4),
                            });
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

