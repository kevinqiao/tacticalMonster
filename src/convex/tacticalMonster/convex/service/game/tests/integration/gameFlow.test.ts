/**
 * 游戏流程集成测试
 * 测试游戏创建、玩家完成、游戏结束、排名计算等流程
 */

import { v } from "convex/values";
import { mutation } from "../../../../_generated/server";
import { GameInstanceService } from "../../gameInstanceService";
import { TEST_GAME_SCENARIOS } from "../testData";
import { assertGameRankings } from "../utils/assertions";
import { simulateGameEnd, simulateMultiplePlayersFinish } from "../utils/simulators";

/**
 * 测试：创建游戏实例
 */
export const testCreateGameInstance = mutation({
    args: {
        matchId: v.string(),
        tier: v.string(),
        bossId: v.optional(v.string()),
        maxPlayers: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        console.log("==========================================");
        console.log(`[testCreateGameInstance] 开始测试创建游戏实例`);
        console.log(`Match ID: ${args.matchId}`);
        console.log(`Tier: ${args.tier}`);
        console.log(`Boss ID: ${args.bossId || "未指定"}`);
        console.log(`最大玩家数: ${args.maxPlayers || 10}`);
        console.log("==========================================");

        const { matchId, tier, bossId, maxPlayers = 10 } = args;
        const errors: string[] = [];
        const steps: string[] = [];

        try {
            // 步骤1: 创建游戏实例
            console.log("\n[步骤1] 创建游戏实例...");
            steps.push("步骤1: 创建游戏实例");
            const result = await GameInstanceService.createMonsterRumbleGame(ctx, {
                matchId,
                tier,
                bossId,
                maxPlayers,
            });

            steps.push(`✓ 游戏实例创建成功，gameId: ${result.gameId}`);
            console.log(`✓ 游戏实例创建成功，gameId: ${result.gameId}`);

            // 步骤2: 验证游戏记录
            console.log("\n[步骤2] 验证游戏记录...");
            steps.push("步骤2: 验证游戏记录");
            const game = await ctx.db
                .query("tacticalMonster_game")
                .withIndex("by_gameId", (q: any) => q.eq("gameId", result.gameId))
                .first();

            if (!game) {
                console.error("❌ 游戏记录不存在");
                errors.push("游戏记录不存在");
            } else {
                console.log(`游戏记录找到:`, {
                    gameId: game.gameId,
                    tier: game.tier,
                    maxPlayers: game.maxPlayers,
                    status: game.status,
                });
                if (game.tier !== tier) {
                    console.error(`❌ Tier 不正确，期望 ${tier}，实际 ${game.tier}`);
                    errors.push(`Tier 不正确，期望 ${tier}，实际 ${game.tier}`);
                }
                if (game.maxPlayers !== maxPlayers) {
                    console.error(`❌ 最大玩家数不正确，期望 ${maxPlayers}，实际 ${game.maxPlayers}`);
                    errors.push(`最大玩家数不正确，期望 ${maxPlayers}，实际 ${game.maxPlayers}`);
                }
                if (game.status !== "waiting") {
                    console.error(`❌ 游戏状态不正确，期望 waiting，实际 ${game.status}`);
                    errors.push(`游戏状态不正确，期望 waiting，实际 ${game.status}`);
                }
                if (errors.length === 0) {
                    steps.push("✓ 游戏记录验证成功");
                    console.log("✓ 游戏记录验证成功");
                }
            }

            console.log("\n==========================================");
            console.log(`[testCreateGameInstance] 测试完成`);
            console.log(`成功: ${errors.length === 0 ? "✅" : "❌"}`);
            console.log(`错误数量: ${errors.length}`);
            console.log("==========================================\n");

            return {
                success: errors.length === 0,
                errors,
                steps,
                gameId: result.gameId,
                data: {
                    game,
                    level: result.level,
                },
            };
        } catch (error: any) {
            console.error("\n==========================================");
            console.error(`[testCreateGameInstance] 测试执行失败`);
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
 * 测试：完整的游戏流程（创建游戏、玩家完成、游戏结束）
 */
export const testCompleteGameFlow = mutation({
    args: {
        matchId: v.string(),
        tier: v.string(),
        playerScores: v.array(v.object({
            uid: v.string(),
            score: v.number(),
        })),
        bossId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { matchId, tier, playerScores, bossId } = args;
        const errors: string[] = [];
        const steps: string[] = [];

        try {
            // 步骤1: 创建游戏实例（直接调用服务类方法）
            steps.push("步骤1: 创建游戏实例");
            let createResult: any;
            try {
                const gameResult = await GameInstanceService.createMonsterRumbleGame(ctx, {
                    matchId,
                    tier,
                    bossId,
                    maxPlayers: playerScores.length,
                });
                createResult = {
                    success: true,
                    errors: [],
                    steps: [],
                    gameId: gameResult.gameId,
                    data: { game: null, level: gameResult.level },
                };
            } catch (error: any) {
                createResult = {
                    success: false,
                    errors: [error.message],
                    steps: [],
                };
            }

            if (!createResult.success) {
                errors.push(...createResult.errors);
                return {
                    success: false,
                    errors,
                    steps,
                };
            }

            const gameId = createResult.gameId!;

            // 步骤2: 创建参与者记录
            steps.push("步骤2: 创建参与者记录");
            for (const { uid } of playerScores) {
                const existing = await ctx.db
                    .query("mr_game_participants")
                    .withIndex("by_gameId", (q: any) => q.eq("gameId", gameId).eq("uid", uid))
                    .first();

                if (!existing) {
                    await ctx.db.insert("mr_game_participants", {
                        gameId,
                        uid,
                        position: 0,
                        teamPower: 200,
                        monsters: [],
                        status: "playing",
                        finalScore: undefined,
                        rank: undefined,
                        finishedAt: undefined,
                        rewardedAt: undefined,
                        joinedAt: new Date().toISOString(),
                    });
                }
            }
            steps.push(`✓ 创建了 ${playerScores.length} 个参与者记录`);

            // 步骤3: 更新游戏状态为 playing
            steps.push("步骤3: 更新游戏状态");
            const game = await ctx.db
                .query("tacticalMonster_game")
                .withIndex("by_gameId", (q: any) => q.eq("gameId", gameId))
                .first();
            if (game) {
                await ctx.db.patch(game._id, {
                    status: "playing",
                    currentPlayers: playerScores.length,
                    startedAt: new Date().toISOString(),
                });
                steps.push("✓ 游戏状态更新为 playing");
            }

            // 步骤4: 模拟所有玩家完成游戏
            steps.push("步骤4: 模拟玩家完成游戏");
            const finishResult = await simulateMultiplePlayersFinish(ctx, gameId, playerScores);

            if (!finishResult.success) {
                errors.push(...finishResult.errors);
            } else {
                steps.push(`✓ ${finishResult.results.filter((r) => r.success).length}/${playerScores.length} 个玩家完成游戏`);
            }

            // 步骤5: 触发游戏结束
            steps.push("步骤5: 触发游戏结束");
            const endResult = await simulateGameEnd(ctx, gameId);

            if (!endResult.success) {
                errors.push(`游戏结束失败: ${endResult.error}`);
            } else {
                steps.push("✓ 游戏结束成功");
            }

            // 步骤6: 验证最终排名
            steps.push("步骤6: 验证最终排名");
            const expectedRankings = playerScores
                .sort((a, b) => b.score - a.score)
                .map((p, index) => ({
                    uid: p.uid,
                    rank: index + 1,
                    score: p.score,
                }));

            const rankingResult = await assertGameRankings(ctx, gameId, expectedRankings);

            if (!rankingResult.success) {
                errors.push(...rankingResult.errors);
            } else {
                steps.push("✓ 排名验证成功");
            }

            // 步骤7: 验证游戏状态
            steps.push("步骤7: 验证游戏状态");
            const finalGame = await ctx.db
                .query("tacticalMonster_game")
                .withIndex("by_gameId", (q: any) => q.eq("gameId", gameId))
                .first();

            if (finalGame?.status !== "ended") {
                errors.push(`游戏状态不正确，期望 ended，实际 ${finalGame?.status}`);
            } else {
                steps.push("✓ 游戏状态验证成功");
            }

            return {
                success: errors.length === 0,
                errors,
                steps,
                gameId,
                data: {
                    rankings: rankingResult.data,
                    finalGame,
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
 * 测试：使用测试场景进行游戏流程测试
 */
export const testGameFlowWithScenario = mutation({
    args: {
        scenarioIndex: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { scenarioIndex = 0 } = args;
        const scenario = TEST_GAME_SCENARIOS[scenarioIndex];

        if (!scenario) {
            return {
                success: false,
                errors: [`测试场景 ${scenarioIndex} 不存在`],
            };
        }

        // 生成测试玩家 UIDs
        const playerUids = Array.from({ length: scenario.playerCount }, (_, i) => `test_player_${i + 1}`);
        const playerScores = playerUids.map((uid, index) => ({
            uid,
            score: scenario.scores[index] || 0,
        }));

        const matchId = `test_match_${Date.now()}`;

        return await (async () => {
            const errors: string[] = [];
            const steps: string[] = [];
            try {
                // 创建游戏实例
                const gameResult = await GameInstanceService.createMonsterRumbleGame(ctx, {
                    matchId,
                    tier: scenario.tier,
                    bossId: scenario.bossId,
                    maxPlayers: scenario.playerCount,
                });
                const gameId = gameResult.gameId;

                for (const { uid } of playerScores) {
                    await ctx.db.insert("mr_game_participants", {
                        gameId,
                        uid,
                        position: 0,
                        teamPower: 200,
                        monsters: [],
                        status: "playing",
                        finalScore: undefined,
                        rank: undefined,
                        finishedAt: undefined,
                        rewardedAt: undefined,
                        joinedAt: new Date().toISOString(),
                    });
                }

                // 更新游戏状态
                const game = await ctx.db
                    .query("tacticalMonster_game")
                    .withIndex("by_gameId", (q: any) => q.eq("gameId", gameId))
                    .first();
                if (game) {
                    await ctx.db.patch(game._id, {
                        status: "playing",
                        currentPlayers: playerScores.length,
                        startedAt: new Date().toISOString(),
                    });
                }

                // 模拟玩家完成
                const finishResult = await simulateMultiplePlayersFinish(ctx, gameId, playerScores);
                if (!finishResult.success) {
                    errors.push(...finishResult.errors);
                }

                // 触发游戏结束
                const endResult = await simulateGameEnd(ctx, gameId);
                if (!endResult.success) {
                    errors.push(`游戏结束失败: ${endResult.error}`);
                }

                return {
                    success: errors.length === 0,
                    errors,
                    steps,
                    gameId,
                };
            } catch (error: any) {
                errors.push(`测试执行失败: ${error.message}`);
                return {
                    success: false,
                    errors,
                    steps,
                };
            }
        })();
    },
});

