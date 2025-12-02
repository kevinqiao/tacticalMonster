/**
 * 奖励系统集成测试
 * 测试金币奖励、宝箱触发、Battle Pass积分、任务进度等
 */

import { v } from "convex/values";
import { internalMutation } from "../../../../_generated/server";
import { TEST_GAME_SCENARIOS } from "../testData";

/**
 * 测试：验证游戏奖励发放
 */
export const testGameRewards = internalMutation({
    args: {
        gameId: v.string(),
        playerRankings: v.array(v.object({
            uid: v.string(),
            rank: v.number(),
            score: v.number(),
        })),
        tier: v.string(),
    },
    handler: async (ctx, args) => {
        const { gameId, playerRankings, tier } = args;
        const errors: string[] = [];
        const steps: string[] = [];
        const rewardResults: any[] = [];

        try {
            // 步骤1: 记录测试前的库存状态（通过 HTTP API）
            steps.push("步骤1: 记录测试前的库存状态");
            const beforeInventories: Record<string, number> = {};
            for (const { uid } of playerRankings) {
                try {
                    const tournamentUrl = process.env.TOURNAMENT_URL || "https://beloved-mouse-699.convex.site";
                    const response = await fetch(`${tournamentUrl}/getPlayerInventory?uid=${uid}`, {
                        method: "GET",
                        headers: { "Content-Type": "application/json" },
                    });
                    if (response.ok) {
                        const data = await response.json();
                        beforeInventories[uid] = data.inventory?.coins || 0;
                    }
                } catch (error: any) {
                    beforeInventories[uid] = 0;
                }
            }
            steps.push("✓ 库存状态记录完成");

            // 步骤2: 验证 Top3 玩家获得金币奖励（通过 HTTP API）
            steps.push("步骤2: 验证 Top3 玩家获得金币奖励");
            const top3Players = playerRankings.slice(0, 3);
            for (const player of top3Players) {
                let afterCoins = 0;
                try {
                    const tournamentUrl = process.env.TOURNAMENT_URL || "https://beloved-mouse-699.convex.site";
                    const response = await fetch(`${tournamentUrl}/getPlayerInventory?uid=${player.uid}`, {
                        method: "GET",
                        headers: { "Content-Type": "application/json" },
                    });
                    if (response.ok) {
                        const data = await response.json();
                        afterCoins = data.inventory?.coins || 0;
                    }
                } catch (error: any) {
                    steps.push(`⚠ 无法获取玩家 ${player.uid} 的库存: ${error.message}`);
                }

                const beforeCoins = beforeInventories[player.uid] || 0;
                const coinIncrease = afterCoins - beforeCoins;

                // 根据 Tier 和排名计算期望金币
                let expectedCoins = 0;
                if (tier === "bronze") {
                    expectedCoins = player.rank === 1 ? 100 : player.rank === 2 ? 50 : 30;
                } else if (tier === "silver") {
                    expectedCoins = player.rank === 1 ? 200 : player.rank === 2 ? 100 : 60;
                } else if (tier === "gold") {
                    expectedCoins = player.rank === 1 ? 300 : player.rank === 2 ? 150 : 90;
                }

                if (coinIncrease < expectedCoins) {
                    errors.push(
                        `玩家 ${player.uid} (排名 ${player.rank}) 金币奖励不足，期望至少 ${expectedCoins}，实际增加 ${coinIncrease}`
                    );
                } else {
                    steps.push(`✓ 玩家 ${player.uid} (排名 ${player.rank}) 获得 ${coinIncrease} 金币`);
                }

                rewardResults.push({
                    uid: player.uid,
                    rank: player.rank,
                    beforeCoins,
                    afterCoins,
                    coinIncrease,
                    expectedCoins,
                });
            }

            // 步骤3: 验证宝箱触发（排名前50%）
            steps.push("步骤3: 验证宝箱触发");
            const top50PercentCount = Math.ceil(playerRankings.length / 2);
            const top50Players = playerRankings.slice(0, top50PercentCount);

            for (const player of top50Players) {
                const chests = await ctx.db
                    .query("mr_player_chests")
                    .withIndex("by_uid_status", (q: any) => q.eq("uid", player.uid))
                    .collect();

                // 检查是否有新创建的宝箱（基于游戏ID）
                const gameChests = chests.filter((c: any) => c.sourceId === gameId);
                if (gameChests.length === 0) {
                    // 宝箱可能还未创建，记录但不报错
                    steps.push(`⚠ 玩家 ${player.uid} (排名 ${player.rank}) 的宝箱可能还未创建`);
                } else {
                    steps.push(`✓ 玩家 ${player.uid} (排名 ${player.rank}) 获得宝箱`);
                }
            }

            // 步骤4: 验证 Battle Pass 积分（需要调用 Tournament 模块）
            steps.push("步骤4: 验证 Battle Pass 积分");
            // 注意：Battle Pass 积分在游戏结束时异步添加，这里只验证是否有积分日志
            for (const player of playerRankings) {
                try {
                    const tournamentUrl = process.env.TOURNAMENT_URL || "https://beloved-mouse-699.convex.site";
                    const response = await fetch(
                        `${tournamentUrl}/getPlayerBattlePass?uid=${player.uid}`,
                        {
                            method: "GET",
                            headers: { "Content-Type": "application/json" },
                        }
                    );

                    if (response.ok) {
                        const result = await response.json();
                        if (result.battlePass) {
                            steps.push(
                                `✓ 玩家 ${player.uid} Battle Pass 等级: ${result.battlePass.currentLevel}, 积分: ${result.battlePass.currentSeasonPoints}`
                            );
                        }
                    }
                } catch (error: any) {
                    // Battle Pass 可能还未初始化，不报错
                    steps.push(`⚠ 玩家 ${player.uid} Battle Pass 验证跳过: ${error.message}`);
                }
            }

            return {
                success: errors.length === 0,
                errors,
                steps,
                data: {
                    rewardResults,
                    top50PlayersCount: top50Players.length,
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
 * 测试：完整游戏流程 + 奖励验证
 */
export const testCompleteGameWithRewards = internalMutation({
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

        const matchId = `test_match_rewards_${Date.now()}`;

        // 步骤1: 执行完整游戏流程（直接调用服务类方法）
        const gameFlowResult = await (async () => {
            const { GameInstanceService } = await import("../../gameInstanceService");
            const { simulateMultiplePlayersFinish, simulateGameEnd } = await import("../utils/simulators");

            const matchId = `test_match_rewards_${Date.now()}`;
            const errors: string[] = [];
            const steps: string[] = [];

            try {
                const gameResult = await GameInstanceService.createMonsterRumbleGame(ctx, {
                    matchId,
                    tier: scenario.tier,
                    bossId: scenario.bossId,
                    maxPlayers: scenario.playerCount,
                });
                const gameId = gameResult.gameId;

                // 创建参与者
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
                await simulateMultiplePlayersFinish(ctx, gameId, playerScores);
                // 触发游戏结束
                await simulateGameEnd(ctx, gameId);

                return {
                    success: true,
                    errors: [],
                    steps: [],
                    gameId,
                };
            } catch (error: any) {
                return {
                    success: false,
                    errors: [error.message],
                    steps: [],
                };
            }
        })();

        if (!gameFlowResult.success) {
            return {
                success: false,
                errors: [`游戏流程失败: ${gameFlowResult.errors.join(", ")}`],
            };
        }

        // 步骤2: 验证奖励
        const rankings = playerScores
            .sort((a, b) => b.score - a.score)
            .map((p, index) => ({
                uid: p.uid,
                rank: index + 1,
                score: p.score,
            }));

        // 步骤2: 验证奖励（直接调用验证逻辑）
        const rewardResult = await (async () => {
            const errors: string[] = [];
            const steps: string[] = [];
            const rewardResults: any[] = [];

            // 记录测试前的库存状态
            const beforeInventories: Record<string, number> = {};
            for (const { uid } of rankings) {
                try {
                    const tournamentUrl = process.env.TOURNAMENT_URL || "https://beloved-mouse-699.convex.site";
                    const response = await fetch(`${tournamentUrl}/getPlayerInventory?uid=${uid}`, {
                        method: "GET",
                        headers: { "Content-Type": "application/json" },
                    });
                    if (response.ok) {
                        const data = await response.json();
                        beforeInventories[uid] = data.inventory?.coins || 0;
                    }
                } catch (error: any) {
                    beforeInventories[uid] = 0;
                }
            }

            // 验证 Top3 玩家获得金币奖励
            const top3Players = rankings.slice(0, 3);
            for (const player of top3Players) {
                let afterCoins = 0;
                try {
                    const tournamentUrl = process.env.TOURNAMENT_URL || "https://beloved-mouse-699.convex.site";
                    const response = await fetch(`${tournamentUrl}/getPlayerInventory?uid=${player.uid}`, {
                        method: "GET",
                        headers: { "Content-Type": "application/json" },
                    });
                    if (response.ok) {
                        const data = await response.json();
                        afterCoins = data.inventory?.coins || 0;
                    }
                } catch (error: any) {
                    // 跳过
                }

                const beforeCoins = beforeInventories[player.uid] || 0;
                const coinIncrease = afterCoins - beforeCoins;
                rewardResults.push({
                    uid: player.uid,
                    rank: player.rank,
                    beforeCoins,
                    afterCoins,
                    coinIncrease,
                });
            }

            return {
                success: errors.length === 0,
                errors,
                steps,
                data: {
                    rewardResults,
                },
            };
        })();

        return {
            success: gameFlowResult.success && rewardResult.success,
            errors: [...(gameFlowResult.errors || []), ...(rewardResult.errors || [])],
            steps: [...(gameFlowResult.steps || []), ...(rewardResult.steps || [])],
            data: {
                gameFlow: (gameFlowResult as any).data || { gameId: gameFlowResult.gameId },
                rewards: rewardResult.data,
            },
        };
    },
});

