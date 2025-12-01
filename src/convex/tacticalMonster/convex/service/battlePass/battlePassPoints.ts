/**
 * Battle Pass 积分计算规则
 * TacticalMonster 游戏特定的积分计算逻辑
 * 
 * 注意：此文件保持向后兼容，内部使用新的计算模块
 */

// 从新的计算模块导入函数
import {
    calculateMonsterRumblePoints as calculateMonsterRumblePointsNew,
    calculateUpgradePoints as calculateUpgradePointsNew,
    calculateStarUpPoints as calculateStarUpPointsNew,
    calculateChestPoints as calculateChestPointsNew,
    calculateBossDefeatPoints as calculateBossDefeatPointsNew,
} from "../calculation/seasonPoints";

/**
 * 计算 Monster Rumble 积分
 * @deprecated 建议直接使用 calculation/seasonPoints/gameExpCalculation 中的函数
 * 此函数保持向后兼容，内部调用新模块
 */
export function calculateMonsterRumblePoints(
    rank: number,
    score: number,
    tier: string
): number {
    return calculateMonsterRumblePointsNew(rank, score, tier);
}

/**
 * 计算怪物升级积分
 * @deprecated 建议直接使用 calculation/seasonPoints/upgradeExpCalculation 中的函数
 * 此函数保持向后兼容，内部调用新模块
 */
export function calculateUpgradePoints(rarity: string, level: number): number {
    return calculateUpgradePointsNew(rarity, level);
}

/**
 * 计算怪物升星积分
 * @deprecated 建议直接使用 calculation/seasonPoints/upgradeExpCalculation 中的函数
 * 此函数保持向后兼容，内部调用新模块
 */
export function calculateStarUpPoints(rarity: string, stars: number): number {
    return calculateStarUpPointsNew(rarity, stars);
}

/**
 * 计算宝箱开启积分
 * @deprecated 建议直接使用 calculation/seasonPoints/upgradeExpCalculation 中的函数
 * 此函数保持向后兼容，内部调用新模块
 */
export function calculateChestPoints(chestType: string): number {
    return calculateChestPointsNew(chestType);
}

/**
 * 计算 Boss 击败积分
 * @deprecated 建议直接使用 calculation/seasonPoints/upgradeExpCalculation 中的函数
 * 此函数保持向后兼容，内部调用新模块
 */
export function calculateBossDefeatPoints(bossDifficulty: string): number {
    return calculateBossDefeatPointsNew(bossDifficulty);
}

// 重新导出新模块的函数（推荐使用）
export {
    calculateMonsterRumblePointsNew as calculateMonsterRumblePointsV2,
    calculateUpgradePointsNew as calculateUpgradePointsV2,
    calculateStarUpPointsNew as calculateStarUpPointsV2,
    calculateChestPointsNew as calculateChestPointsV2,
    calculateBossDefeatPointsNew as calculateBossDefeatPointsV2,
};

