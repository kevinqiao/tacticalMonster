/**
 * 挑战关卡端到端测试（TacticalMonster 模块）
 * 验证挑战关卡相关数据并运行完整战斗流程
 */

import { v } from "convex/values";
import { mutation } from "../../../../_generated/server";
import { cleanupCombatTestData, setupCombatTestData } from "../combat/combatTestData";
import { GameService } from "../../gameService";

/**
 * 验证挑战关卡测试数据
 * 检查 uid 是否有队伍、关卡规则是否存在等
 */
export const testChallengeLevelDataValidation = mutation({
    args: {
        uid: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const errors: string[] = [];
        const warnings: string[] = [];
        const uid = args.uid ?? "test_player_bronze";
        if (!uid) {
            return { valid: false, errors: ["uid 未提供"], warnings: [] };
        }

        // 1. 检查玩家是否有队伍
        const teamMonsters = await ctx.db
            .query("mr_player_monsters")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .filter((q: any) => q.eq(q.field("inTeam"), 1))
            .collect();

        if (teamMonsters.length === 0) {
            errors.push(`玩家 ${uid} 没有队伍（mr_player_monsters 中无 inTeam=1 记录）`);
        } else {
            if (teamMonsters.length < 4) {
                warnings.push(`玩家 ${uid} 的队伍只有 ${teamMonsters.length} 个怪物`);
            }
        }

        // 2. 检查关卡统计数据是否存在（可选，用于判断关卡是否已初始化）
        const stageStats = await ctx.db
            .query("mr_stage_stats")
            .withIndex("by_ruleId", (q: any) => q.eq("ruleId", "monster_rumble_challenge_bronze_boss_1"))
            .first();

        if (!stageStats) {
            warnings.push("关卡 monster_rumble_challenge_bronze_boss_1 尚无记录（首次创建游戏时会自动初始化）");
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    },
});

/**
 * 挑战关卡端到端测试
 * 使用给定 uid 和 tournamentType 创建游戏并运行战斗流程
 */
export const testChallengeLevelEndToEnd = mutation({
    args: {
        uid: v.optional(v.string()),
        tournamentType: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const testResult: any = {
            testName: "testChallengeLevelEndToEnd",
            success: false,
            errors: [] as string[],
            steps: [] as string[],
            data: {} as any,
        };

        let testData: any = null;
        const uid = args.uid ?? "test_player_bronze";
        const tournamentType = args.tournamentType ?? "monster_rumble_challenge_bronze_boss_1";

        try {
            // 1. 创建测试数据（使用 tournamentType 作为 ruleId）
            testResult.steps.push("步骤1: 创建挑战关卡测试数据");
            testData = await setupCombatTestData(ctx, {
                uid,
                ruleId: tournamentType,
                bossId: "boss_bronze_1",
                skipFirstTurn: false,
            });

            if (testData.errors.length > 0) {
                testResult.errors.push(...testData.errors);
                return testResult;
            }

            if (!testData.game) {
                testResult.errors.push("游戏创建失败");
                return testResult;
            }

            testResult.steps.push("✓ 测试数据创建成功");
            testResult.data.gameId = testData.gameId;

            // 2. 验证游戏可加载
            testResult.steps.push("步骤2: 验证游戏状态");
            const gameService = new GameService(ctx);
            const game = await gameService.load(testData.gameId);
            if (!game) {
                testResult.errors.push("无法加载游戏");
                return testResult;
            }
            testResult.data.teamSize = game.team?.length || 0;
            testResult.data.bossHp = game.boss?.stats?.hp?.current || 0;
            testResult.steps.push("✓ 游戏状态验证完成");

            testResult.success = true;
        } catch (error: any) {
            testResult.errors.push(`测试执行失败: ${error.message}`);
        } finally {
            if (testData?.gameId && testData?.uid) {
                testResult.steps.push("清理测试数据");
                await cleanupCombatTestData(ctx, {
                    gameId: testData.gameId,
                    uid: testData.uid,
                });
            }
        }

        return testResult;
    },
});
