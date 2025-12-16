/**
 * 挑战关卡测试数据设置（Tournament模块）
 * 主协调函数，创建所有测试数据
 */

import { internalMutation } from "../../../../_generated/server";
import * as tournamentTestData from "./testData";

/**
 * 创建完整的挑战关卡测试数据（仅Tournament模块数据）
 * 注意：HTTP调用需要在action中处理，不能在此mutation中使用fetch
 */
export const setupChallengeLevelTestData = internalMutation({
    args: {},
    handler: async (ctx) => {
        // 1. Tournament模块：创建玩家和资源
        const playerIds = await tournamentTestData.createTestPlayers(ctx);
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

