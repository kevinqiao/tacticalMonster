/**
 * 挑战关卡端到端测试
 * 测试从加入关卡到奖励结算的完整流程
 * 
 * 注意：此测试应该在 TacticalMonster 模块中，因为：
 * 1. 前端通过 TacticalMonster 模块的 joinTournamentMatching 加入
 * 2. 完整的游戏流程（加入、加载、战斗、提交分数）都在 TacticalMonster 模块
 * 3. 可以直接调用模块内的函数，无需跨模块 HTTP 调用
 */

import { v } from "convex/values";
import { api } from "../../../../_generated/api";
import { action } from "../../../../_generated/server";
import { getTournamentUrl, TOURNAMENT_CONFIG } from "../../../../config/tournamentConfig";

/**
 * 端到端测试：完整的挑战关卡流程
 * 1. 加入挑战关卡 (joinTournamentMatching)
 * 2. 加载游戏 (loadGame)
 * 3. 提交分数 (submitScore)
 * 4. 验证奖励
 */
export const testChallengeLevelEndToEnd = action({
    args: {
        uid: v.optional(v.string()),
        tournamentType: v.optional(v.string()),
    },
    handler: async (ctx, args): Promise<{
        success: boolean;
        steps: string[];
        errors: string[];
        data: any;
    }> => {
        const uid = args.uid || "test_player_bronze";
        const tournamentType = args.tournamentType || "monster_rumble_challenge_bronze_boss_1";
        const steps: string[] = [];
        const errors: string[] = [];
        const testData: any = {};

        console.log("==========================================");
        console.log("[testChallengeLevelEndToEnd] 开始端到端测试");
        console.log(`玩家: ${uid}, 关卡: ${tournamentType}`);
        console.log("==========================================");

        try {
            // 步骤1: 验证测试数据存在
            steps.push("步骤1: 验证测试数据");
            console.log("\n[步骤1] 验证测试数据...");

            // 验证玩家存在（需要通过HTTP查询Tournament模块，或使用共享的players表）
            // 这里我们只验证TacticalMonster模块的数据
            // 通过 runQuery 调用内部的 getPlayerTeam query
            const teamMonsters = await ctx.runQuery(
                api.service.team.teamService.getPlayerTeam,
                { uid }
            );

            if (!teamMonsters || teamMonsters.length === 0) {
                errors.push(`玩家 ${uid} 没有配置队伍`);
                return { success: false, steps, errors, data: testData };
            }

            steps.push(`✓ 玩家队伍存在: ${teamMonsters.length} 个怪物`);
            testData.team = {
                size: teamMonsters.length,
                monsters: teamMonsters.map((m: any) => m.monsterId),
            };

            // 步骤2: 加入挑战关卡
            steps.push("步骤2: 加入挑战关卡");
            console.log("\n[步骤2] 加入挑战关卡...");

            try {
                // 注意：joinTournamentMatching 是 action，需要使用 runAction
                const joinResult = await ctx.runAction(
                    api.service.game.gameMatchingService.joinTournamentMatching,
                    {
                        uid,
                        tournamentType,
                        tournamentId: undefined,
                        tier: undefined,
                    }
                );

                if (!joinResult.ok) {
                    errors.push(`加入失败: ${joinResult.error || "未知错误"}`);
                    if (joinResult.inQueue) {
                        steps.push(`⚠ 玩家在队列中: ${joinResult.error}`);
                    } else {
                        steps.push(`❌ 加入失败: ${joinResult.error}`);
                    }
                } else {
                    steps.push(`✓ 成功加入，gameId: ${joinResult.gameId}, matchId: ${joinResult.matchId}`);
                    testData.match = {
                        gameId: joinResult.gameId,
                        matchId: joinResult.matchId,
                    };
                }
            } catch (error: any) {
                errors.push(`加入失败: ${error.message}`);
                steps.push(`❌ 加入异常: ${error.message}`);
                return { success: false, steps, errors, data: testData };
            }

            // 步骤3: 加载游戏
            if (testData.match?.gameId) {
                steps.push("步骤3: 加载游戏");
                console.log("\n[步骤3] 加载游戏...");

                try {
                    const loadResult = await ctx.runAction(
                        api.proxy.controller.loadGame,
                        {
                            gameId: testData.match.gameId,
                        }
                    );

                    if (!loadResult.ok || !loadResult.game) {
                        errors.push("加载游戏失败");
                        steps.push("❌ 加载游戏失败");
                    } else {
                        steps.push(`✓ 游戏加载成功，状态: ${loadResult.game.status}`);
                        testData.game = {
                            gameId: loadResult.game.gameId,
                            status: loadResult.game.status,
                            round: loadResult.game.round,
                            score: loadResult.game.score,
                        };
                    }
                } catch (error: any) {
                    errors.push(`加载游戏失败: ${error.message}`);
                    steps.push(`❌ 加载游戏异常: ${error.message}`);
                }
            }

            // 步骤4: 提交分数（模拟）
            if (testData.game?.gameId) {
                steps.push("步骤4: 提交分数");
                console.log("\n[步骤4] 提交分数...");

                try {
                    const testScore = 1000; // 测试分数
                    const submitResult = await ctx.runAction(
                        api.proxy.controller.submitScore,
                        {
                            gameId: testData.game.gameId,
                            score: testScore,
                        }
                    );

                    if (!submitResult.ok) {
                        errors.push("提交分数失败");
                        steps.push("❌ 提交分数失败");
                    } else {
                        steps.push(`✓ 分数提交成功: ${testScore}`);
                        testData.score = {
                            submitted: testScore,
                            result: submitResult.res,
                        };
                    }
                } catch (error: any) {
                    errors.push(`提交分数失败: ${error.message}`);
                    steps.push(`❌ 提交分数异常: ${error.message}`);
                }
            }

            // 步骤5: 验证奖励（需要通过HTTP查询Tournament模块）
            steps.push("步骤5: 验证奖励");
            console.log("\n[步骤5] 验证奖励...");
            steps.push("⚠ 奖励验证需要在Tournament模块进行（通过HTTP查询）");

            console.log("\n==========================================");
            console.log("[testChallengeLevelEndToEnd] 测试完成");
            console.log(`成功步骤: ${steps.filter((s) => s.startsWith("✓")).length}`);
            console.log(`警告: ${steps.filter((s) => s.startsWith("⚠")).length}`);
            console.log(`错误: ${errors.length}`);
            console.log("==========================================");

            return {
                success: errors.length === 0,
                steps,
                errors,
                data: testData,
            };
        } catch (error: any) {
            console.error("❌ 端到端测试失败:", error.message);
            errors.push(error.message);
            return {
                success: false,
                steps,
                errors,
                data: testData,
            };
        }
    },
});

/**
 * 端到端测试：简化版本（仅验证数据）
 * 用于快速验证测试数据是否正确配置
 * 注意：使用 action 以便可以使用 fetch 查询 Tournament 模块
 */
export const testChallengeLevelDataValidation = action({
    args: {
        uid: v.optional(v.string()),
        tournamentType: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const uid = args.uid || "test_player_bronze";
        const tournamentType = args.tournamentType || "monster_rumble_challenge_bronze_boss_1";

        console.log("==========================================");
        console.log("[testChallengeLevelDataValidation] 验证测试数据");
        console.log("==========================================");

        const validation: any = {
            team: null,
            power: null,
            errors: [],
            warnings: [],
        };

        // 1. 验证队伍（通过 runQuery 调用 query）
        const teamMonsters = await ctx.runQuery(
            api.service.team.teamService.getPlayerTeam,
            { uid }
        );

        if (!teamMonsters || teamMonsters.length === 0) {
            validation.errors.push(`玩家 ${uid} 没有配置上场队伍`);
        } else {
            // getPlayerTeam 已经返回了排序后的队伍（最多4个）
            validation.team = {
                size: teamMonsters.length,
                monsters: teamMonsters.map((m: any) => ({
                    monsterId: m.monsterId,
                    level: m.level,
                    stars: m.stars,
                    position: m.teamPosition,
                })),
            };
            console.log(`✓ 队伍配置: ${teamMonsters.length} 个怪物`);
        }

        // 2. 验证Power（通过 runQuery 调用 query）
        // 注意：由于 action 无法直接访问 ctx.db，需要通过 runQuery 调用 query
        if (teamMonsters && teamMonsters.length > 0) {
            try {
                // 使用字符串路径访问 API（兼容 TypeScript 类型未更新的情况）
                // 根据 api.d.ts，路径格式是 "service/tier/monsterRumbleTierService"
                const calculateTeamPowerQuery = (api as any)["service/tier/monsterRumbleTierService"]?.calculateTeamPower;

                if (calculateTeamPowerQuery) {
                    const teamPower = await ctx.runQuery(calculateTeamPowerQuery, { uid });
                    validation.power = teamPower;
                    console.log(`✓ 队伍Power: ${teamPower}`);

                    // 验证Power是否在合理范围内
                    if (teamPower <= 0) {
                        validation.warnings.push(`队伍Power异常: ${teamPower}`);
                    }
                } else {
                    // 如果 query 不存在，说明 Convex 还未重新生成 API，跳过 Power 计算
                    validation.warnings.push("Power计算query未找到（请运行 npx convex dev 重新生成API）");
                }
            } catch (error: any) {
                validation.warnings.push(`Power计算失败: ${error.message}`);
            }
        }

        // 3. 验证关卡配置（通过HTTP查询Tournament模块）
        if (tournamentType) {
            try {
                const tournamentUrl = getTournamentUrl(TOURNAMENT_CONFIG.ENDPOINTS.GET_TOURNAMENT_TYPE_CONFIG);
                const response = await fetch(tournamentUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ typeId: tournamentType }),
                });

                if (!response.ok) {
                    validation.warnings.push(`关卡配置查询失败: HTTP ${response.status}`);
                } else {
                    const result = await response.json();
                    if (result.ok && result.config) {
                        validation.tournamentType = {
                            typeId: result.config.typeId,
                            entryRequirements: result.config.entryRequirements || {},
                        };
                        console.log(`✓ 关卡配置存在: ${tournamentType}`);
                    } else {
                        validation.warnings.push(`关卡配置不存在: ${tournamentType}`);
                    }
                }
            } catch (error: any) {
                validation.warnings.push(`无法通过HTTP调用Tournament模块获取关卡配置: ${error.message}`);
            }
        }

        console.log("\n验证结果:");
        console.log(`错误: ${validation.errors.length}`);
        console.log(`警告: ${validation.warnings.length}`);

        if (validation.errors.length > 0) {
            console.log("\n错误列表:");
            validation.errors.forEach((err: string) => console.error(`  - ${err}`));
        }

        if (validation.warnings.length > 0) {
            console.log("\n警告列表:");
            validation.warnings.forEach((warn: string) => console.warn(`  - ${warn}`));
        }

        return {
            valid: validation.errors.length === 0,
            ...validation,
        };
    },
});

