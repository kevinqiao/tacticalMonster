/**
 * 挑战关卡测试数据设置（TacticalMonster模块）
 * 提供游戏相关数据的创建mutation
 */

import { v } from "convex/values";
import { internalMutation } from "../../../../_generated/server";
import * as testData from "./testData";

/**
 * 创建游戏相关测试数据（怪物配置、玩家怪物、地图配置）
 */
export const setupGameTestData = internalMutation({
    args: {
        playerIds: v.array(v.string()),
        tier: v.optional(v.string()),
        bossId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { playerIds, tier = "bronze", bossId = "boss_bronze_1" } = args;

        // 1. 创建怪物配置
        const monsterConfigIds = await testData.createTestMonsterConfigs(ctx);

        // 2. 创建玩家怪物和队伍
        const playerMonsters = await testData.createTestPlayerMonsters(ctx, playerIds);

        // 3. 创建地图配置（已废弃：所有配置应在 StageRuleConfig 中手动配置）
        // const levelConfigId = await testData.createTestLevelConfig(ctx, tier, bossId);
        const levelConfigId = `level_${tier}_${bossId}`;  // 仅用于兼容返回值

        // 4. 创建地图模板（可选）
        const mapTemplateId = await testData.createTestMapTemplate(ctx, tier);

        return {
            monsterConfigIds,
            playerMonsters,
            levelConfigId,
            mapTemplateId,
        };
    },
});

