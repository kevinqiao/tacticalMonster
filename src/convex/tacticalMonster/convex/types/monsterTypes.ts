/**
 * Monster 类型定义
 * 定义 Monster 相关的所有类型接口
 */


import { SkillEffect } from "./skillTypes";

export enum ASSET_TYPE {
    SPINE = 0,
    FBX = 1,
    GLTF = 2,  // GLTF格式支持
    TXT = 3,
}
/**
 * StatusEffect - 运行时状态效果
 * 基于 SkillEffect，但包含运行时字段（如剩余持续时间）
 */
export interface StatusEffect extends SkillEffect {
    remaining_duration: number;  // 剩余持续时间（回合数，运行时更新）
    /** 防守：在本 defendRoundNo 对应整轮内受技能伤害降低；回合结束时清除 */
    defendRoundNo?: number;
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
        energy?: { current: number; max: number };  // 必杀技能量
    };

    // ========== 位置信息（战斗中）==========
    q?: number;                     // Hex坐标 q
    r?: number;                     // Hex坐标 r

    // ========== 技能系统（运行时数据）==========
    skills?: string[];  // 可用技能列表（MonsterSkill[] 用于玩家角色，string[] 用于Boss）
    skillCooldowns?: Record<string, number>;  // 技能冷却时间
    selectedSkill?: string;  // 选中的技能

    // ========== 状态效果（运行时数据）==========
    statusEffects?: StatusEffect[];  // 当前激活的状态效果列表（统一命名：与GameBoss保持一致）
    status?: 'normal' | 'stunned' | 'dead';  // 角色状态

    // ========== 移动和战斗 ==========
    move_range?: number;             // 移动范围
    /** Hex 攻击距离；与配表 Monster.attackRange 同步。max 为共享技能 basic_attack 的默认最远距离（技能未写 distance 时由前后端取 max） */
    attack_range?: { min: number; max: number };

    // ========== 特殊属性（从 Monster.race 推断或配置）==========
    isFlying?: boolean;             // 是否为飞行单位（从 race 判断）
    flightHeight?: number;          // 飞行高度
    canIgnoreObstacles?: boolean;   // 是否可以忽略障碍物
}
export interface Monster {
    monsterId: string;
    name: string;
    rarity: "Common" | "Rare" | "Epic" | "Legendary";
    class?: string;
    race?: string;
    baseHp: number;
    baseDamage: number;
    baseDefense: number;
    baseSpeed: number;

    // 技能配置：使用 skillIds 引用技能配置（方案二：完全独立）
    skillIds?: string[];              // 技能ID列表（引用 skillConfigs.ts 中的技能）

    growthRates?: {
        hp: number;
        damage: number;
        defense: number;
        speed: number;
        starMultiplierPerStar?: number;  // 每星增加的属性倍率（可选，默认使用 GROWTH_STRATEGY 的值）
    };

    // 移动和战斗范围配置
    moveRange?: number;               // 移动范围（Hex格子数），默认值：3
    /**
     * 普攻/走位相关 Hex 距离（写入 GameMonster.attack_range）。
     * min/max：与 PathFind、选目标等一致；其中 max 即共享技能 basic_attack 的射程来源（skillConfigs 不写 distance）。
     */
    attackRange?: {
        min: number;
        max: number;
    };

    assetPath: string;
    asset?: { type: ASSET_TYPE; resource: { [key: string]: string } };
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
export interface GameBoss extends GameMonster {
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
