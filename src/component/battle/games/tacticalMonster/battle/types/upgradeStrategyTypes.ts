/**
 * Monster 升级和升星策略配置
 * 集中管理所有升级和升星相关的策略配置
 */

/**
 * 稀有度类型
 */
export type Rarity = "Common" | "Rare" | "Epic" | "Legendary";

/**
 * 升级策略配置
 */
export interface LevelUpStrategy {
    /** 基础费用 */
    baseCost: number;
    /** 每级递增倍率（指数增长） */
    costMultiplier: number;
    /** 最大等级 */
    maxLevel: number;
    /** 经验值转等级：每多少经验值 = 1级 */
    expPerLevel: number;
}

/**
 * 升星策略配置
 */
export interface StarUpStrategy {
    /** 基础费用 */
    baseCost: number;
    /** 稀有度费用倍率 */
    rarityMultipliers: Record<Rarity, number>;
    /** 星级费用倍率（星级越高费用越高） */
    starCostMultiplier: number; // 每星增加的费用倍率
    /** 最大星级 */
    maxStars: number;
    /** 升星碎片需求（按稀有度和当前星级） */
    shardRequirements: Record<Rarity, Record<number, number>>;
}

/**
 * 属性成长策略配置
 */
export interface GrowthStrategy {
    /** 默认成长率 */
    defaultGrowthRates: {
        hp: number;        // HP成长率
        damage: number;   // 攻击成长率
        defense: number;  // 防御成长率
        speed: number;    // 速度成长率
    };
    /** 星级属性倍率（每星增加的属性倍率） */
    starMultiplierPerStar: number; // 每星增加10% = 0.1
}



/**
 * 策略配置说明
 * 
 * ## 升级策略 (LevelUpStrategy)
 * - **baseCost**: 1级升2级的基础费用
 * - **costMultiplier**: 每级费用递增倍率（指数增长）
 *   - 公式：levelCost = baseCost * (costMultiplier ^ (level - 1))
 * - **maxLevel**: 最大等级限制
 * - **expPerLevel**: 经验值转等级的比率
 * 
 * ## 升星策略 (StarUpStrategy)
 * - **baseCost**: 升星的基础费用
 * - **rarityMultipliers**: 不同稀有度的费用倍率
 * - **starCostMultiplier**: 星级费用倍率（星级越高费用越高）
 *   - 公式：starMultiplier = 1 + (currentStar - 1) * starCostMultiplier
 * - **maxStars**: 最大星级限制
 * - **shardRequirements**: 升星所需碎片数量（按稀有度和当前星级）
 * 
 * ## 成长策略 (GrowthStrategy)
 * - **defaultGrowthRates**: 默认属性成长率（如果怪物配置中没有指定）
 * - **starMultiplierPerStar**: 每星增加的属性倍率
 *   - 公式：starMultiplier = 1 + (stars - 1) * starMultiplierPerStar
 */

