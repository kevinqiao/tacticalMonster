/**
 * 挑战关卡测试数据设置（Tournament模块）
 * 主协调函数，创建所有测试数据
 */

import { v } from "convex/values";
import { internalMutation } from "../../../../_generated/server";
import * as tournamentTestData from "./testData";

/**
 * Create challenge level test data (Tournament module only).
 * Use playerIds to create players with existing SSO uids (e.g. "0_"+md5("kevin1@gmail.com")).
 */
export const setupChallengeLevelTestData = internalMutation({
    args: {
        playerIds: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        const playerIds = await tournamentTestData.createTestPlayers(ctx, args.playerIds);
        await tournamentTestData.createTestResources(ctx, playerIds);

        // 2. Tournament模块：创建挑战关卡配置
        const tournamentTypeId = await tournamentTestData.createTestChallengeLevel(
            ctx,
            "monster_rumble_challenge_bronze_boss_1"
        );

        // 注意：TacticalMonster模块的数据创建需要通过action进行HTTP调用
        // 参见 runTest.ts 中的 setupChallengeLevelTestData action

        return {
            tournament: {
                playerIds,
                tournamentTypeId,
            },
            tacticalMonster: {
                note: "游戏数据需要通过TacticalMonster模块的setupGameTestData手动创建，或使用runTest.ts中的action",
            },
        };
    },
});

