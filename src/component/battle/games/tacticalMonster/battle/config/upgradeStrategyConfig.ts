/**
 * Monster 升级和升星策略配置（前端版本）
 * 与后端配置保持一致
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
 * 升级策略配置
 */
export const LEVEL_UP_STRATEGY: LevelUpStrategy = {
    baseCost: 100,
    costMultiplier: 1.15, // 每级递增15%
    maxLevel: 60,
    expPerLevel: 100, // 每100经验 = 1级
};

/**
 * 升星策略配置
 */
export const STAR_UP_STRATEGY: StarUpStrategy = {
    baseCost: 500,
    rarityMultipliers: {
        Common: 1.0,
        Rare: 1.2,
        Epic: 1.5,
        Legendary: 2.0,
    },
    starCostMultiplier: 0.2, // 每星增加20%费用
    maxStars: 7,
    shardRequirements: {
        Common: {
            1: 10,   // 1→2星
            2: 20,   // 2→3星
            3: 30,   // 3→4星
            4: 50,   // 4→5星
            5: 80,   // 5→6星
            6: 120,  // 6→7星
        },
        Rare: {
            1: 10,
            2: 30,
            3: 50,
            4: 80,
            5: 120,
            6: 180,
        },
        Epic: {
            1: 15,
            2: 40,
            3: 70,
            4: 110,
            5: 160,
            6: 230,
        },
        Legendary: {
            1: 20,
            2: 50,
            3: 90,
            4: 140,
            5: 200,
            6: 300,
        },
    },
};

/**
 * 属性成长策略配置
 */
export const GROWTH_STRATEGY: GrowthStrategy = {
    defaultGrowthRates: {
        hp: 0.15,      // 每级增加15%基础HP
        damage: 0.10,  // 每级增加10%基础攻击
        defense: 0.12, // 每级增加12%基础防御
        speed: 0.05,   // 每级增加5%基础速度
    },
    starMultiplierPerStar: 0.1, // 每星增加10%属性
};

/**
 * 完整的升级升星策略配置
 */
export interface MonsterUpgradeStrategyConfig {
    levelUp: LevelUpStrategy;
    starUp: StarUpStrategy;
    growth: GrowthStrategy;
}

/**
 * 导出完整策略配置
 */
export const MONSTER_UPGRADE_STRATEGY_CONFIG: MonsterUpgradeStrategyConfig = {
    levelUp: LEVEL_UP_STRATEGY,
    starUp: STAR_UP_STRATEGY,
    growth: GROWTH_STRATEGY,
};

