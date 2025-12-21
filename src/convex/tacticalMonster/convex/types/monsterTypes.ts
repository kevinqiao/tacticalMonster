/**
 * Monster 类型定义
 * 定义 Monster 相关的所有类型接口
 */

import { Monster } from "../data/monsterConfigs";
import { MonsterSkill, SkillEffect } from "../data/skillConfigs";
import { GROWTH_STRATEGY } from "../service/monster/config/upgradeStrategyConfig";

/**
 * StatusEffect - 运行时状态效果
 * 基于 SkillEffect，但包含运行时字段（如剩余持续时间）
 */
export interface StatusEffect extends SkillEffect {
    remaining_duration: number;  // 剩余持续时间（回合数，运行时更新）
}

/**
 * PlayerMonster - 玩家拥有的怪物实例（数据库存储）
 * 存储在 mr_player_monsters 表中
 * 通过 monsterId 关联到 Monster 配置，保存实际的 level, stars 等实例数据
 */
export interface PlayerMonster {
    _id?: string;                  // Convex 文档 ID（数据库自动生成）
    uid: string;                   // 玩家UID
    monsterId: string;             // 怪物配置ID（关联到 Monster.monsterId）
    level: number;                 // 当前等级（实例数据）
    stars: number;                 // 星级（实例数据）
    experience: number;            // 经验值（实例数据）
    shards: number;                // 碎片数量（实例数据）
    isUnlocked: boolean;           // 是否已解锁（拥有）：false=只有碎片，true=已解锁
    unlockedSkills: string[];     // 已解锁的技能ID列表（实例数据）
    inTeam: number;                // 0: 不在队伍中，1: 在队伍中
    teamPosition?: {               // 队伍位置坐标（Hex坐标）
        q: number;
        r: number;
    };
    obtainedAt: string;            // 获得时间（ISO 字符串）
    updatedAt: string;             // 更新时间（ISO 字符串）
}

/**
 * GameMonster - 游戏中的怪物实例（运行时计算出的数据）
 * 通过 PlayerMonster + Monster 实时计算得出
 * 不继承 Monster，而是组合 Monster 的配置数据 + 运行时计算的属性
 */
export interface GameMonster {
    // ========== 基础标识 ==========
    uid: string;                   // 玩家UID或"boss"
    monsterId: string;             // 怪物配置ID（引用 Monster）

    // ========== 从 Monster 配置组合的字段（不是继承关系，是组合）==========
    name: string;                  // 从 Monster.name
    rarity: "Common" | "Rare" | "Epic" | "Legendary";  // 从 Monster.rarity
    class?: string;                 // 从 Monster.class
    race?: string;                  // 从 Monster.race
    assetPath: string;              // 从 Monster.assetPath

    // ========== 从 PlayerMonster 组合的字段 ==========
    level: number;                  // 从 PlayerMonster.level
    stars: number;                  // 从 PlayerMonster.stars
    experience?: number;            // 从 PlayerMonster.experience
    unlockSkills?: string[];        // 从 PlayerMonster.unlockedSkills

    // ========== 实时计算的属性（基于 Monster 基础属性 + PlayerMonster.level + PlayerMonster.stars）==========
    stats: {
        hp: { current: number; max: number };  // 计算：baseHp * levelGrowth * starMultiplier
        mp?: { current: number; max: number };
        stamina?: number;
        attack: number;              // 计算：baseDamage * levelGrowth * starMultiplier
        defense: number;            // 计算：baseDefense * levelGrowth * starMultiplier
        speed: number;              // 计算：baseSpeed * levelGrowth * starMultiplier
        crit_rate?: number;
        evasion?: number;
        shield?: { current: number; max: number };
        intelligence?: number;
        status_resistance?: number;
    };

    // ========== 位置信息（战斗中）==========
    q?: number;                     // Hex坐标 q
    r?: number;                     // Hex坐标 r

    // ========== 技能系统（运行时数据）==========
    skills?: MonsterSkill[] | string[];  // 可用技能列表（MonsterSkill[] 用于玩家角色，string[] 用于Boss）
    skillCooldowns?: Record<string, number>;  // 技能冷却时间

    // ========== 状态效果（运行时数据）==========
    statusEffects?: StatusEffect[];  // 当前激活的状态效果列表（统一命名：与GameBoss保持一致）
    status?: 'normal' | 'stunned' | 'dead';  // 角色状态

    // ========== 移动和战斗 ==========
    move_range?: number;             // 移动范围
    attack_range?: { min: number; max: number };  // 攻击范围

    // ========== 特殊属性（从 Monster.race 推断或配置）==========
    isFlying?: boolean;             // 是否为飞行单位（从 race 判断）
    flightHeight?: number;          // 飞行高度
    canIgnoreObstacles?: boolean;   // 是否可以忽略障碍物
}

/**
 * 从 PlayerMonster + Monster 计算 GameMonster
 * 这是组合关系，不是继承关系
 */
export function calculateGameMonster(
    playerMonster: PlayerMonster,
    monsterConfig: Monster,
    position?: { q: number; r: number }
): GameMonster {
    const level = playerMonster.level;
    const stars = playerMonster.stars;

    // 从策略配置获取默认成长率和星级倍率
    const { defaultGrowthRates, starMultiplierPerStar: defaultStarMultiplier } = GROWTH_STRATEGY;

    // 成长率（从配置或使用策略配置的默认值）
    const hpGrowthRate = monsterConfig.growthRates?.hp ?? defaultGrowthRates.hp;
    const damageGrowthRate = monsterConfig.growthRates?.damage ?? defaultGrowthRates.damage;
    const defenseGrowthRate = monsterConfig.growthRates?.defense ?? defaultGrowthRates.defense;
    const speedGrowthRate = monsterConfig.growthRates?.speed ?? defaultGrowthRates.speed;

    // 星级倍数（优先使用怪物配置的，否则使用全局默认值）
    const starMultiplierPerStar = monsterConfig.growthRates?.starMultiplierPerStar ?? defaultStarMultiplier;
    const starMultiplier = 1 + (stars - 1) * starMultiplierPerStar;

    // 计算实际属性
    const baseHp = monsterConfig.baseHp * (1 + (level - 1) * hpGrowthRate) * starMultiplier;
    const baseAttack = monsterConfig.baseDamage * (1 + (level - 1) * damageGrowthRate) * starMultiplier;
    const baseDefense = monsterConfig.baseDefense * (1 + (level - 1) * defenseGrowthRate) * starMultiplier;
    const baseSpeed = monsterConfig.baseSpeed * (1 + (level - 1) * speedGrowthRate) * starMultiplier;

    // 组合 Monster 配置 + PlayerMonster 实例 + 计算的属性
    return {
        // 基础标识
        uid: playerMonster.uid,
        monsterId: playerMonster.monsterId,
        // 从 Monster 配置组合的字段
        name: monsterConfig.name,
        rarity: monsterConfig.rarity,
        class: monsterConfig.class,
        race: monsterConfig.race,
        assetPath: monsterConfig.assetPath,

        // 从 PlayerMonster 组合的字段
        level: playerMonster.level,
        stars: playerMonster.stars,
        experience: playerMonster.experience,
        unlockSkills: playerMonster.unlockedSkills,

        // 实时计算的属性
        stats: {
            hp: { current: Math.floor(baseHp), max: Math.floor(baseHp) },
            mp: { current: 100, max: 100 },  // 默认值
            attack: Math.floor(baseAttack),
            defense: Math.floor(baseDefense),
            speed: Math.floor(baseSpeed)
        },

        // 位置信息
        q: position?.q,
        r: position?.r,

        // 技能系统（需要从 skillConfigs.ts 获取完整技能配置）
        skills: [],  // 将在运行时根据 unlockSkills 填充
        skillCooldowns: {},

        // 状态效果
        statusEffects: [],
        status: "normal",

        // 移动和战斗（从配置读取，如果没有配置则使用默认值）
        move_range: monsterConfig.moveRange ?? 3,
        attack_range: monsterConfig.attackRange ?? { min: 1, max: 2 },

        // 特殊属性
        isFlying: monsterConfig.race === "Flying",
        flightHeight: monsterConfig.race === "Flying" ? 1.5 : undefined,
        canIgnoreObstacles: monsterConfig.race === "Flying"
    };
}

/**
 * GameMinion - 游戏中的小怪实例（Boss的护卫）
 * 继承 GameMonster，统一角色接口
 * 小怪数据在 Boss 配置中定义，运行时计算属性
 */
export interface GameMinion extends GameMonster {
    // ========== Minion 特有字段 ==========
    minionId: string;              // 小怪运行时唯一标识（如 "minion_guard_1"），用于在游戏中唯一标识小怪实例
    // 注意：
    // - minionId: 运行时唯一标识，用于区分不同的小怪实例（即使它们使用相同的 monsterId）
    // - monsterId: 角色配置ID（引用 monsterConfigs.ts），继承自 GameMonster，用于查找角色配置
}

/**
 * GameBoss - 游戏中的Boss实例（运行时计算出的数据）
 * 继承 GameMonster，统一角色接口
 * 通过 BossConfig + Monster 实时计算得出
 * 包含Boss本体和小怪（minions）的完整数据
 */
export interface GameBoss extends Omit<GameMonster, 'skills'> {
    // ========== Boss 特有字段 ==========
    bossId: string;                // Boss运行时唯一标识（如 "boss_bronze_1"），用于在游戏中唯一标识Boss实例
    minions: GameMinion[];         // 小怪数组（Boss特有）
    currentPhase?: string;         // 当前阶段（phase1, phase2, ...）
    behaviorSeed?: string;         // 行为随机种子（用于AI决策）
    skills?: string[];              // Boss技能ID列表（覆盖 GameMonster 的 MonsterSkill[] 类型）

    // 注意：所有其他字段从 GameMonster 继承：
    // - bossId: 运行时唯一标识，用于在游戏中唯一标识Boss实例
    // - monsterId: 角色配置ID（引用 monsterConfigs.ts），继承自 GameMonster，用于查找角色配置
    // - uid, name, rarity, assetPath, level, stars 等基础字段
    // - q, r: 位置信息
    // - stats: 属性数据
    // - statusEffects: 状态效果
    // - skillCooldowns: 技能冷却
}
