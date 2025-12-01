/**
 * Tier 完整配置（游戏特定逻辑）
 * 
 * 包含：
 * - Tier 解锁等级
 * - Power 范围
 * - 入场费用
 * - Boss 难度映射
 */

export const TIER_CONFIGS = {
    bronze: {
        tier: "bronze",
        unlockLevel: 1,
        powerMin: 0,
        powerMax: 2000,
        entryCostCoins: 0,
        entryCostEnergy: 6,
        bossDifficulty: "easy",
        bossIds: ["boss_bronze_1", "boss_bronze_2"],
    },
    silver: {
        tier: "silver",
        unlockLevel: 11,
        powerMin: 2000,
        powerMax: 5000,
        entryCostCoins: 500,
        entryCostEnergy: 7,
        bossDifficulty: "medium",
        bossIds: ["boss_silver_1", "boss_silver_2"],
    },
    gold: {
        tier: "gold",
        unlockLevel: 31,
        powerMin: 5000,
        powerMax: 10000,
        entryCostCoins: 2000,
        entryCostEnergy: 8,
        bossDifficulty: "hard",
        bossIds: ["boss_gold_1", "boss_gold_2"],
    },
    platinum: {
        tier: "platinum",
        unlockLevel: 51,
        powerMin: 10000,
        powerMax: Infinity,
        entryCostCoins: 5000,
        entryCostEnergy: 10,
        bossDifficulty: "expert",
        bossIds: ["boss_platinum_1", "boss_platinum_2"],
    },
} as const;

export type TierKey = keyof typeof TIER_CONFIGS;

/**
 * 获取 Tier 配置
 */
export function getTierConfig(tier: string) {
    return TIER_CONFIGS[tier as TierKey];
}

/**
 * 验证 Tier 是否存在
 */
export function isValidTier(tier: string): tier is TierKey {
    return tier in TIER_CONFIGS;
}

