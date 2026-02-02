/**
 * 宝箱配置
 * 定义不同关卡和宝箱类型的奖励配置
 * 
 * 设计说明：
 * - 每个配置记录对应一个 (chestType, stageRuleId) 组合
 * - stageRuleId 为 undefined 表示通用配置（所有未配置特定关卡的都使用此配置）
 * - 查询优先级：特定关卡配置 > 通用配置
 */

/**
 * 宝箱类型
 */
export type ChestType = "silver" | "gold" | "purple" | "orange";

/**
 * 稀有度类型
 */
export type Rarity = "Common" | "Rare" | "Epic" | "Legendary";
/**
 * 宝箱类型权重配置
 */
export interface ChestTypeWeights {
    silver?: number;
    gold?: number;
    purple?: number;
    orange?: number;
}

/**
 * 稀有度分布配置
 */
export interface RarityDistribution {
    weight: number;        // 权重（例如：0.70 = 70%）
    minShards: number;     // 该稀有度最少碎片数
    maxShards: number;     // 该稀有度最多碎片数
    guarantee?: boolean;   // 是否保底（至少获得一次）
}

/**
 * 宝箱奖励配置
 * 参考皇室战争的卡牌池系统设计
 */
export interface ChestRewardsConfig {
    // ============================================
    // 基础奖励（固定奖励）
    // ============================================
    baseRewards: {
        coins: {
            min: number;      // 最小金币数
            max: number;      // 最大金币数
        };
        energy?: {
            min: number;
            max: number;
        };
    };

    // ============================================
    // 怪物碎片奖励（基于稀有度池系统）
    // ============================================
    monsterShards: {
        // 稀有度分布（类似皇室战争的卡牌稀有度分布）
        rarityDistribution: {
            Common?: RarityDistribution;
            Rare?: RarityDistribution;
            Epic?: RarityDistribution;
            Legendary?: RarityDistribution;
        };

        // 怪物池配置（可选：限制可获得的怪物）
        // 如果为空，则从所有该稀有度的怪物中随机选择
        monsterPools?: {
            Common?: string[];      // 可获得的 Common 怪物 ID 列表
            Rare?: string[];        // 可获得的 Rare 怪物 ID 列表
            Epic?: string[];        // 可获得的 Epic 怪物 ID 列表
            Legendary?: string[];   // 可获得的 Legendary 怪物 ID 列表
        };

        // 总碎片数范围（用于验证和平衡）
        totalShardsRange: {
            min: number;
            max: number;
        };
    };

    // ============================================
    // 保底机制（可选）
    // ============================================
    guarantees?: {
        // 保证至少包含一个特定稀有度的怪物碎片
        guaranteedRarity?: "Rare" | "Epic" | "Legendary";
        // 保证至少包含特定数量的碎片
        guaranteedShardCount?: number;
    };
}

/**
 * 宝箱配置
 */
export interface ChestConfig {
    chestType: ChestType;
    stageRuleId?: string;           // 关卡规则ID（undefined 表示通用配置）
    name: string;
    unlockTimeSeconds: number;      // 解锁时间（秒）
    rewardsConfig: ChestRewardsConfig;
    gemAccelerateCost: number;      // 宝石加速费用
}
