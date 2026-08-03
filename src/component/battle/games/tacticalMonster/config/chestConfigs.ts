/**
 * 宝箱配置
 * 定义不同关卡和宝箱类型的奖励配置
 * 
 * 设计说明：
 * - 每个配置记录对应一个 (chestType, stageRuleId) 组合
 * - stageRuleId 为 undefined 表示通用配置（所有未配置特定关卡的都使用此配置）
 * - 查询优先级：特定关卡配置 > 通用配置
 */

import { ChestConfig, ChestType } from "../types/chestTypes";

/**
 * 宝箱配置集合
 * 通过 (chestType, stageRuleId) 组合键查询对应的配置
 */
export const CHEST_CONFIGS: ChestConfig[] = [
    // ============================================
    // 通用配置（stageRuleId 为 undefined）
    // ============================================

    // 通用 Silver 宝箱
    {
        chestType: "silver",
        stageRuleId: undefined,
        name: "白银宝箱（通用）",
        unlockTimeSeconds: 1800,  // 30分钟
        gemAccelerateCost: 5,
        rewardsConfig: {
            baseRewards: {
                coins: { min: 100, max: 200 },
                energy: { min: 5, max: 10 },
            },
            monsterShards: {
                rarityDistribution: {
                    Common: {
                        weight: 0.80,      // 80%
                        minShards: 3,
                        maxShards: 8,
                        guarantee: false,
                    },
                    Rare: {
                        weight: 0.20,      // 20%
                        minShards: 2,
                        maxShards: 5,
                        guarantee: false,
                    },
                },
                totalShardsRange: {
                    min: 3,
                    max: 10,
                },
            },
        },
    },

    // 通用 Gold 宝箱
    {
        chestType: "gold",
        stageRuleId: undefined,
        name: "黄金宝箱（通用）",
        unlockTimeSeconds: 3600,  // 1小时
        gemAccelerateCost: 10,
        rewardsConfig: {
            baseRewards: {
                coins: { min: 200, max: 400 },
                energy: { min: 10, max: 20 },
            },
            monsterShards: {
                rarityDistribution: {
                    Common: {
                        weight: 0.70,      // 70%
                        minShards: 5,
                        maxShards: 10,
                        guarantee: false,
                    },
                    Rare: {
                        weight: 0.25,      // 25%
                        minShards: 3,
                        maxShards: 8,
                        guarantee: true,   // 保底：至少获得一次
                    },
                    Epic: {
                        weight: 0.04,      // 4%
                        minShards: 2,
                        maxShards: 5,
                        guarantee: false,
                    },
                    Legendary: {
                        weight: 0.01,      // 1%
                        minShards: 1,
                        maxShards: 3,
                        guarantee: false,
                    },
                },
                totalShardsRange: {
                    min: 5,
                    max: 20,
                },
            },
            guarantees: {
                guaranteedRarity: "Rare",
                guaranteedShardCount: 5,
            },
        },
    },

    // 通用 Purple 宝箱
    {
        chestType: "purple",
        stageRuleId: undefined,
        name: "紫金宝箱（通用）",
        unlockTimeSeconds: 7200,  // 2小时
        gemAccelerateCost: 20,
        rewardsConfig: {
            baseRewards: {
                coins: { min: 400, max: 800 },
                energy: { min: 20, max: 40 },
            },
            monsterShards: {
                rarityDistribution: {
                    Common: {
                        weight: 0.50,      // 50%
                        minShards: 5,
                        maxShards: 10,
                        guarantee: false,
                    },
                    Rare: {
                        weight: 0.30,      // 30%
                        minShards: 5,
                        maxShards: 10,
                        guarantee: true,
                    },
                    Epic: {
                        weight: 0.15,      // 15%
                        minShards: 3,
                        maxShards: 8,
                        guarantee: true,   // 保底：至少获得一次
                    },
                    Legendary: {
                        weight: 0.05,      // 5%
                        minShards: 1,
                        maxShards: 5,
                        guarantee: false,
                    },
                },
                totalShardsRange: {
                    min: 10,
                    max: 30,
                },
            },
            guarantees: {
                guaranteedRarity: "Epic",
                guaranteedShardCount: 10,
            },
        },
    },

    // 通用 Orange 宝箱
    {
        chestType: "orange",
        stageRuleId: undefined,
        name: "橙金宝箱（通用）",
        unlockTimeSeconds: 14400,  // 4小时
        gemAccelerateCost: 50,
        rewardsConfig: {
            baseRewards: {
                coins: { min: 800, max: 1600 },
                energy: { min: 40, max: 80 },
            },
            monsterShards: {
                rarityDistribution: {
                    Common: {
                        weight: 0.30,      // 30%
                        minShards: 5,
                        maxShards: 10,
                        guarantee: false,
                    },
                    Rare: {
                        weight: 0.35,      // 35%
                        minShards: 5,
                        maxShards: 10,
                        guarantee: true,
                    },
                    Epic: {
                        weight: 0.25,      // 25%
                        minShards: 5,
                        maxShards: 10,
                        guarantee: true,
                    },
                    Legendary: {
                        weight: 0.10,      // 10%
                        minShards: 3,
                        maxShards: 8,
                        guarantee: true,   // 保底：至少获得一次
                    },
                },
                totalShardsRange: {
                    min: 15,
                    max: 40,
                },
            },
            guarantees: {
                guaranteedRarity: "Legendary",
                guaranteedShardCount: 15,
            },
        },
    },

    // ============================================
    // 青铜关卡特定配置
    // ============================================

    // 青铜关卡 1 - Gold 宝箱（奖励较少，适合新手）
    {
        chestType: "gold",
        stageRuleId: "monster_rumble_challenge_bronze_boss_1",
        name: "黄金宝箱（青铜关卡1）",
        unlockTimeSeconds: 3600,
        gemAccelerateCost: 10,
        rewardsConfig: {
            baseRewards: {
                coins: { min: 150, max: 300 },  // 比通用配置少
                energy: { min: 8, max: 15 },
            },
            monsterShards: {
                rarityDistribution: {
                    Common: {
                        weight: 0.80,      // 更多 Common
                        minShards: 3,
                        maxShards: 8,
                        guarantee: false,
                    },
                    Rare: {
                        weight: 0.20,      // 较少 Rare
                        minShards: 2,
                        maxShards: 5,
                        guarantee: true,
                    },
                },
                monsterPools: {
                    // 限制为低级怪物
                    Common: ["monster_014", "monster_015", "monster_016", "monster_017", "monster_018"],
                    Rare: ["monster_010", "monster_011", "monster_012", "monster_013"],
                },
                totalShardsRange: {
                    min: 3,
                    max: 12,
                },
            },
            guarantees: {
                guaranteedRarity: "Rare",
                guaranteedShardCount: 3,
            },
        },
    },

    // 青铜关卡 2 - Gold 宝箱
    {
        chestType: "gold",
        stageRuleId: "monster_rumble_challenge_bronze_boss_2",
        name: "黄金宝箱（青铜关卡2）",
        unlockTimeSeconds: 3600,
        gemAccelerateCost: 10,
        rewardsConfig: {
            baseRewards: {
                coins: { min: 160, max: 320 },
                energy: { min: 9, max: 16 },
            },
            monsterShards: {
                rarityDistribution: {
                    Common: {
                        weight: 0.75,
                        minShards: 4,
                        maxShards: 9,
                        guarantee: false,
                    },
                    Rare: {
                        weight: 0.25,
                        minShards: 3,
                        maxShards: 6,
                        guarantee: true,
                    },
                },
                monsterPools: {
                    Common: ["monster_014", "monster_015", "monster_016", "monster_017", "monster_018"],
                    Rare: ["monster_010", "monster_011", "monster_012", "monster_013"],
                },
                totalShardsRange: {
                    min: 4,
                    max: 14,
                },
            },
            guarantees: {
                guaranteedRarity: "Rare",
                guaranteedShardCount: 4,
            },
        },
    },

    // 青铜关卡 3 - Gold 宝箱
    {
        chestType: "gold",
        stageRuleId: "monster_rumble_challenge_bronze_boss_3",
        name: "黄金宝箱（青铜关卡3）",
        unlockTimeSeconds: 3600,
        gemAccelerateCost: 10,
        rewardsConfig: {
            baseRewards: {
                coins: { min: 170, max: 340 },
                energy: { min: 10, max: 17 },
            },
            monsterShards: {
                rarityDistribution: {
                    Common: {
                        weight: 0.70,
                        minShards: 5,
                        maxShards: 10,
                        guarantee: false,
                    },
                    Rare: {
                        weight: 0.28,
                        minShards: 3,
                        maxShards: 7,
                        guarantee: true,
                    },
                    Epic: {
                        weight: 0.02,      // 开始出现 Epic
                        minShards: 1,
                        maxShards: 3,
                        guarantee: false,
                    },
                },
                monsterPools: {
                    Common: ["monster_014", "monster_015", "monster_016", "monster_017", "monster_018"],
                    Rare: ["monster_010", "monster_011", "monster_012", "monster_013"],
                    Epic: ["monster_005", "monster_006", "monster_007"],
                },
                totalShardsRange: {
                    min: 5,
                    max: 18,
                },
            },
            guarantees: {
                guaranteedRarity: "Rare",
                guaranteedShardCount: 5,
            },
        },
    },

    // 青铜关卡 4 - Gold 宝箱
    {
        chestType: "gold",
        stageRuleId: "monster_rumble_challenge_bronze_boss_4",
        name: "黄金宝箱（青铜关卡4）",
        unlockTimeSeconds: 3600,
        gemAccelerateCost: 10,
        rewardsConfig: {
            baseRewards: {
                coins: { min: 180, max: 360 },
                energy: { min: 11, max: 18 },
            },
            monsterShards: {
                rarityDistribution: {
                    Common: {
                        weight: 0.65,
                        minShards: 5,
                        maxShards: 10,
                        guarantee: false,
                    },
                    Rare: {
                        weight: 0.30,
                        minShards: 4,
                        maxShards: 8,
                        guarantee: true,
                    },
                    Epic: {
                        weight: 0.05,
                        minShards: 2,
                        maxShards: 4,
                        guarantee: false,
                    },
                },
                monsterPools: {
                    Common: ["monster_014", "monster_015", "monster_016", "monster_017", "monster_018"],
                    Rare: ["monster_010", "monster_011", "monster_012", "monster_013"],
                    Epic: ["monster_005", "monster_006", "monster_007", "monster_008"],
                },
                totalShardsRange: {
                    min: 6,
                    max: 20,
                },
            },
            guarantees: {
                guaranteedRarity: "Rare",
                guaranteedShardCount: 6,
            },
        },
    },

    // 青铜关卡 5 - Gold 宝箱（最后一关，奖励更好）
    {
        chestType: "gold",
        stageRuleId: "monster_rumble_challenge_bronze_boss_5",
        name: "黄金宝箱（青铜关卡5）",
        unlockTimeSeconds: 3600,
        gemAccelerateCost: 10,
        rewardsConfig: {
            baseRewards: {
                coins: { min: 200, max: 400 },  // 与通用配置相同
                energy: { min: 12, max: 20 },
            },
            monsterShards: {
                rarityDistribution: {
                    Common: {
                        weight: 0.60,
                        minShards: 5,
                        maxShards: 10,
                        guarantee: false,
                    },
                    Rare: {
                        weight: 0.30,
                        minShards: 5,
                        maxShards: 10,
                        guarantee: true,
                    },
                    Epic: {
                        weight: 0.08,
                        minShards: 3,
                        maxShards: 6,
                        guarantee: false,
                    },
                    Legendary: {
                        weight: 0.02,      // 开始出现 Legendary
                        minShards: 1,
                        maxShards: 3,
                        guarantee: false,
                    },
                },
                monsterPools: {
                    Common: ["monster_014", "monster_015", "monster_016", "monster_017", "monster_018"],
                    Rare: ["monster_010", "monster_011", "monster_012", "monster_013"],
                    Epic: ["monster_005", "monster_006", "monster_007", "monster_008", "monster_009"],
                    Legendary: ["monster_001", "monster_002"],  // 限制为低级 Legendary
                },
                totalShardsRange: {
                    min: 8,
                    max: 25,
                },
            },
            guarantees: {
                guaranteedRarity: "Rare",
                guaranteedShardCount: 8,
            },
        },
    },

    // 青铜竞技场 - Purple 宝箱（竞技场奖励更好）
    {
        chestType: "purple",
        stageRuleId: "monster_rumble_arena_bronze",
        name: "紫金宝箱（青铜竞技场）",
        unlockTimeSeconds: 7200,
        gemAccelerateCost: 20,
        rewardsConfig: {
            baseRewards: {
                coins: { min: 500, max: 1000 },  // 比通用配置好
                energy: { min: 25, max: 50 },
            },
            monsterShards: {
                rarityDistribution: {
                    Common: {
                        weight: 0.40,
                        minShards: 5,
                        maxShards: 10,
                        guarantee: false,
                    },
                    Rare: {
                        weight: 0.35,
                        minShards: 5,
                        maxShards: 10,
                        guarantee: true,
                    },
                    Epic: {
                        weight: 0.20,
                        minShards: 4,
                        maxShards: 8,
                        guarantee: true,
                    },
                    Legendary: {
                        weight: 0.05,
                        minShards: 2,
                        maxShards: 5,
                        guarantee: false,
                    },
                },
                monsterPools: {
                    Common: ["monster_014", "monster_015", "monster_016", "monster_017", "monster_018"],
                    Rare: ["monster_010", "monster_011", "monster_012", "monster_013"],
                    Epic: ["monster_005", "monster_006", "monster_007", "monster_008", "monster_009"],
                    Legendary: ["monster_001", "monster_002", "monster_003"],
                },
                totalShardsRange: {
                    min: 12,
                    max: 35,
                },
            },
            guarantees: {
                guaranteedRarity: "Epic",
                guaranteedShardCount: 12,
            },
        },
    },
];

/**
 * 获取宝箱配置
 * 
 * @param chestType 宝箱类型
 * @param stageRuleId 关卡规则ID（可选）
 * @returns 宝箱配置，如果未找到则返回 undefined
 */
export function getChestConfig(
    chestType: ChestType,
    stageRuleId?: string
): ChestConfig | undefined {
    // 1. 优先查询特定关卡的配置
    if (stageRuleId) {
        const specificConfig = CHEST_CONFIGS.find(
            config => config.chestType === chestType && config.stageRuleId === stageRuleId
        );
        if (specificConfig) {
            return specificConfig;
        }
    }

    // 2. 查询通用配置（stageRuleId 为 undefined）
    return CHEST_CONFIGS.find(
        config => config.chestType === chestType && config.stageRuleId === undefined
    );
}

/**
 * 获取所有宝箱配置
 * 
 * @param chestType 宝箱类型（可选）
 * @param stageRuleId 关卡规则ID（可选）
 * @returns 匹配的宝箱配置列表
 */
export function getChestConfigs(
    chestType?: ChestType,
    stageRuleId?: string
): ChestConfig[] {
    return CHEST_CONFIGS.filter(config => {
        if (chestType && config.chestType !== chestType) {
            return false;
        }
        if (stageRuleId !== undefined && config.stageRuleId !== stageRuleId) {
            return false;
        }
        return true;
    });
}

/**
 * 验证宝箱配置
 * 
 * @param config 宝箱配置
 * @returns 验证结果
 */
export function validateChestConfig(config: ChestConfig): {
    valid: boolean;
    errors: string[];
} {
    const errors: string[] = [];

    // 验证基础字段
    if (!config.chestType) {
        errors.push("chestType 是必需的");
    }
    if (!config.name) {
        errors.push("name 是必需的");
    }
    if (config.unlockTimeSeconds <= 0) {
        errors.push("unlockTimeSeconds 必须大于 0");
    }
    if (config.gemAccelerateCost < 0) {
        errors.push("gemAccelerateCost 不能为负数");
    }

    // 验证奖励配置
    if (!config.rewardsConfig) {
        errors.push("rewardsConfig 是必需的");
    } else {
        // 验证基础奖励
        if (!config.rewardsConfig.baseRewards) {
            errors.push("baseRewards 是必需的");
        } else {
            if (config.rewardsConfig.baseRewards.coins.min < 0) {
                errors.push("baseRewards.coins.min 不能为负数");
            }
            if (config.rewardsConfig.baseRewards.coins.max < config.rewardsConfig.baseRewards.coins.min) {
                errors.push("baseRewards.coins.max 必须大于等于 min");
            }
        }

        // 验证怪物碎片配置
        if (!config.rewardsConfig.monsterShards) {
            errors.push("monsterShards 是必需的");
        } else {
            const { rarityDistribution, totalShardsRange } = config.rewardsConfig.monsterShards;

            // 验证稀有度分布权重总和
            const totalWeight = (
                (rarityDistribution.Common?.weight || 0) +
                (rarityDistribution.Rare?.weight || 0) +
                (rarityDistribution.Epic?.weight || 0) +
                (rarityDistribution.Legendary?.weight || 0)
            );

            if (totalWeight < 0.99 || totalWeight > 1.01) {
                errors.push(`稀有度分布权重总和应为 1.0，当前为 ${totalWeight.toFixed(3)}`);
            }

            // 验证总碎片数范围
            if (totalShardsRange.min < 0) {
                errors.push("totalShardsRange.min 不能为负数");
            }
            if (totalShardsRange.max < totalShardsRange.min) {
                errors.push("totalShardsRange.max 必须大于等于 min");
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

