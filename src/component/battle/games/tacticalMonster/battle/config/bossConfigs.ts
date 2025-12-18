import { MONSTER_CONFIGS } from "./monsterConfigs";

/**
 * Boss 配置数据
 * 支持Boss角色组合（Boss本体 + 小怪/护卫）
 * 
 * 设计说明：
 * - BossConfig 的主体通过 characterId 引用角色配置（monsterId）
 * - 基础属性（HP、攻击、防御、速度、技能、资源路径等）从角色配置继承
 * - BossConfig 只定义 Boss 特有的属性（行为树、阶段、难度等）
 * - 可选覆盖属性可以覆盖继承的属性（提供时优先使用）
 */
export interface Boss {
    monsterId: string;
    name: string;
    hp: number;
    damage: number;
    defense: number;
    speed: number;
    skills?: any[];
    assetPath: string;
    position?: {
        q: number;
        r: number;
    };
    minions: Array<{  // 小怪数据
        minionId: string;
        monsterId: string;
        hp: number;
        damage: number;
        defense: number;
        speed: number;
        skills?: any[];
        assetPath: string;
        position: {
            q: number;
            r: number;
        };
    }>;
}
export interface BossConfig {
    bossId: string;

    // 主体角色配置ID（引用 mr_monster_configs 或自定义角色配置）
    // 基础属性（HP、攻击、防御、速度、技能等）从引用的角色配置继承
    monsterId: string;

    // Boss 特有属性
    difficulty: "easy" | "medium" | "hard" | "expert";

    // Boss 专属配置
    behaviorTree: any;  // AI行为树配置

    // 可选覆盖属性（如果提供，将覆盖从 characterId 继承的属性）
    name?: string;           // 如果提供，覆盖角色配置的 name
    baseHp?: number;         // 如果提供，覆盖角色配置的 baseHp
    baseDamage?: number;     // 如果提供，覆盖角色配置的 baseDamage
    baseDefense?: number;    // 如果提供，覆盖角色配置的 baseDefense
    baseSpeed?: number;      // 如果提供，覆盖角色配置的 baseSpeed
    skills?: any[];          // 如果提供，覆盖或合并角色配置的 skills
    assetPath?: string;      // 如果提供，覆盖角色配置的 assetPath
    position?: {
        q: number;
        r: number;
    };

    // 新增：小怪/护卫配置（可选）
    // 如果不配置minions，则表示单个Boss
    minions?: MinionConfig[];

    // 新增：阶段配置（支持阶段化行为）
    phases?: BossPhase[];

    configVersion: number;
}
// export interface MergedBossConfig {
//     bossId: string;
//     monsterId: string;
//     difficulty?: "easy" | "medium" | "hard" | "expert";

//     // 从角色配置继承或覆盖的属性
//     name: string;
//     baseHp: number;
//     baseDamage: number;
//     baseDefense: number;
//     baseSpeed: number;
//     skills: any[];
//     assetPath: string;
//     position?: {
//         q: number;
//         r: number;
//     };
//     // Boss 特有属性
//     behaviorTree: any;
//     minions?: Array<{
//         minionId: string;
//         monsterId: string;
//         name?: string;
//         baseHp?: number;
//         baseDamage?: number;
//         baseDefense?: number;
//         baseSpeed?: number;
//         skills?: any[];
//         assetPath?: string;
//     }>;
//     phases?: Array<{
//         phaseName: string;
//         hpThreshold: number;
//         behaviorPattern: any;
//         skillPriorities: any[];
//         minionBehavior?: any;
//     }>;

//     configVersion: number;
// }

/**
 * 小怪配置接口
 * 
 * 设计说明：
 * - characterId 引用角色配置（monsterId）
 * - 基础属性从角色配置继承
 * - 可选覆盖属性可以覆盖继承的属性
 */
export interface MinionConfig {
    minionId: string;          // 小怪唯一标识（如 "minion_guard_1"）
    monsterId: string;       // 角色配置ID（引用mr_monster_configs或自定义）  

    // 可选覆盖属性（如果提供，将覆盖从 characterId 继承的属性）
    name?: string;             // 如果提供，覆盖角色配置的 name
    baseHp?: number;           // 如果提供，覆盖角色配置的 baseHp
    baseDamage?: number;       // 如果提供，覆盖角色配置的 baseDamage
    baseDefense?: number;      // 如果提供，覆盖角色配置的 baseDefense
    baseSpeed?: number;        // 如果提供，覆盖角色配置的 baseSpeed
    skills?: any[];            // 如果提供，覆盖或合并角色配置的 skills
    assetPath?: string;        // 如果提供，覆盖角色配置的 assetPath
    position?: {
        q: number;
        r: number;
    };
}

/**
 * Boss阶段配置
 */
export interface BossPhase {
    phaseName: string;         // "phase1", "phase2", "phase3"
    hpThreshold: number;       // HP百分比阈值（1.0 = 100%, 0.6 = 60%）
    behaviorPattern: any;
    skillPriorities: any[];
    minionBehavior?: any;      // 小怪在此阶段的行为模式
}

/**
 * Boss 配置示例
 * 
 * 注意：
 * - characterId 引用 mr_monster_configs 中的怪物配置
 * - 基础属性（HP、攻击、防御等）从角色配置继承
 * - 可选覆盖属性可以覆盖继承的属性
 * - Boss 特有属性（behaviorTree、phases）只在此定义
 */
export const BOSS_CONFIGS: Record<string, BossConfig> = {
    boss_bronze_1: {
        bossId: "boss_bronze_1",
        monsterId: "monster_001",  // 引用怪物配置ID（示例，需要根据实际怪物ID调整）
        difficulty: "easy",
        behaviorTree: {},
        // 可选：覆盖基础属性
        baseHp: 10000,  // 如果提供，覆盖角色配置的 baseHp
        baseDamage: 100,
        baseDefense: 50,
        baseSpeed: 10,
        minions: [],
        phases: [],
        configVersion: 1,
    },
    boss_bronze_2: {
        bossId: "boss_bronze_2",
        monsterId: "monster_002",  // 引用怪物配置ID
        difficulty: "easy",
        behaviorTree: {},
        baseHp: 12000,
        baseDamage: 120,
        baseDefense: 60,
        baseSpeed: 10,
        minions: [],
        phases: [],
        configVersion: 1,
    },
    boss_silver_1: {
        bossId: "boss_silver_1",
        monsterId: "monster_003",
        difficulty: "medium",
        behaviorTree: {},
        baseHp: 20000,
        baseDamage: 200,
        baseDefense: 100,
        baseSpeed: 12,
        minions: [],
        phases: [],
        configVersion: 1,
    },
    boss_silver_2: {
        bossId: "boss_silver_2",
        monsterId: "monster_004",
        difficulty: "medium",
        behaviorTree: {},
        baseHp: 24000,
        baseDamage: 240,
        baseDefense: 120,
        baseSpeed: 12,
        minions: [],
        phases: [],
        configVersion: 1,
    },
    boss_gold_1: {
        bossId: "boss_gold_1",
        monsterId: "monster_005",
        difficulty: "hard",
        behaviorTree: {},
        baseHp: 40000,
        baseDamage: 400,
        baseDefense: 200,
        baseSpeed: 15,
        minions: [],
        phases: [],
        configVersion: 1,
    },
    boss_gold_2: {
        bossId: "boss_gold_2",
        monsterId: "monster_006",
        difficulty: "hard",
        behaviorTree: {},
        baseHp: 48000,
        baseDamage: 480,
        baseDefense: 240,
        baseSpeed: 15,
        minions: [],
        phases: [],
        configVersion: 1,
    },
    boss_platinum_1: {
        bossId: "boss_platinum_1",
        monsterId: "monster_007",
        difficulty: "expert",
        behaviorTree: {},
        baseHp: 80000,
        baseDamage: 800,
        baseDefense: 400,
        baseSpeed: 18,
        minions: [],
        phases: [],
        configVersion: 1,
    },
    boss_platinum_2: {
        bossId: "boss_platinum_2",
        monsterId: "monster_008",
        difficulty: "expert",
        behaviorTree: {},
        baseHp: 96000,
        baseDamage: 960,
        baseDefense: 480,
        baseSpeed: 18,
        minions: [],
        phases: [],
        configVersion: 1,
    },
};

/**
 * 获取 Boss 配置
 */
export function getBossConfig(bossId: string): BossConfig | undefined {
    return BOSS_CONFIGS[bossId];
}

/**
 * 根据难度获取 Boss ID 列表
 */
export function getBossIdsByDifficulty(difficulty: string): string[] {
    return Object.values(BOSS_CONFIGS)
        .filter(boss => boss.difficulty === difficulty)
        .map(boss => boss.bossId);
}

export const getMergedBossConfig = (bossId: string): BossConfig | null => {
    const bossConfig = getBossConfig(bossId);
    if (!bossConfig) {
        return null;
    }

    // 1. 从角色配置获取基础属性
    const monsterConfig = MONSTER_CONFIGS.find(monster => monster.monsterId === bossConfig.monsterId);
    if (!monsterConfig) {
        throw new Error(`角色配置不存在: ${bossConfig.monsterId} (Boss: ${bossId})`);
    }

    // 2. 合并配置（BossConfig 的覆盖属性优先）
    const merged: BossConfig = {
        bossId: bossConfig.bossId,
        monsterId: bossConfig.monsterId,
        difficulty: bossConfig.difficulty,

        // 基础属性：优先使用 BossConfig 中的覆盖值，否则使用角色配置的值
        name: bossConfig.name || monsterConfig.name || "",
        baseHp: bossConfig.baseHp ?? monsterConfig.baseHp ?? 0,
        baseDamage: bossConfig.baseDamage ?? monsterConfig.baseDamage ?? 0,
        baseDefense: bossConfig.baseDefense ?? monsterConfig.baseDefense ?? 0,
        baseSpeed: bossConfig.baseSpeed ?? monsterConfig.baseSpeed ?? 0,
        skills: bossConfig.skills || monsterConfig.skills || [],
        assetPath: bossConfig.assetPath || monsterConfig.assetPath || "",

        // Boss 特有属性
        behaviorTree: bossConfig.behaviorTree,
        minions: bossConfig.minions,
        phases: bossConfig.phases,
        configVersion: bossConfig.configVersion,
    };

    return merged;
}
export const calculateScaleBoss = (bossId: string, power: number, difficulty: number): Boss | undefined => {
    const bossConfig = getMergedBossConfig(bossId);
    if (!bossConfig || !bossConfig.baseHp || !bossConfig.baseDamage || !bossConfig.baseDefense || !bossConfig.baseSpeed || !bossConfig.name || !bossConfig.skills || !bossConfig.assetPath || !bossConfig.position || !bossConfig.minions) {
        throw new Error(`Boss配置不存在: ${bossId}`);
    }
    const baseBossPower = bossConfig.baseHp + bossConfig.baseDamage * 2 + bossConfig.baseDefense * 1.5;
    // 计算缩放倍数：scale = (playerPower * difficulty) / baseBossPower
    const targetBossPower = power * difficulty;
    const scale = Math.max(0.1, Math.min(10.0, targetBossPower / baseBossPower));
    const powerBoss: Boss = {
        name: bossConfig.name || "",
        hp: Math.floor(bossConfig.baseHp * scale),
        defense: Math.floor(bossConfig.baseDefense * scale),
        speed: Math.floor(bossConfig.baseSpeed * scale),
        monsterId: bossConfig.monsterId,
        damage: Math.floor(bossConfig.baseDamage * scale),
        position: bossConfig.position,
        skills: bossConfig.skills || [],
        assetPath: bossConfig.assetPath || "",
        minions: [],
    }
    const minionsData =
        (bossConfig.minions || []).flatMap((minion: any) => {
            // 小怪也需要缩放（使用相同的缩放倍数）
            // 小怪配置使用 characterId 引用角色配置
            let minionScaledStats;

            // 从角色配置获取基础属性
            const minionMonsterConfig = MONSTER_CONFIGS[minion.monsterId];

            if (minionMonsterConfig) {
                // 使用角色配置的基础值，minion 的覆盖值优先
                const baseHp = minion.baseHp ?? minionMonsterConfig.baseHp;
                const baseDamage = minion.baseDamage ?? minionMonsterConfig.baseDamage;
                const baseDefense = minion.baseDefense ?? minionMonsterConfig.baseDefense;
                const baseSpeed = minion.baseSpeed ?? minionMonsterConfig.baseSpeed;

                // 应用缩放
                minionScaledStats = {
                    hp: Math.floor(baseHp * scale),
                    attack: Math.floor(baseDamage * scale),
                    defense: Math.floor(baseDefense * scale),
                    speed: Math.floor(baseSpeed * scale),
                };
            } else {
                // 如果没有角色配置，使用 minion 的基础值或默认值
                minionScaledStats = {
                    hp: Math.floor((minion.baseHp || 100) * scale),
                    attack: Math.floor((minion.baseDamage || 10) * scale),
                    defense: Math.floor((minion.baseDefense || 5) * scale),
                    speed: Math.floor((minion.baseSpeed || 10) * scale),
                };
            }


            return {
                minionId: minion.minionId,
                monsterId: minion.monsterId,
                hp: minionScaledStats.hp,
                damage: minionScaledStats.attack,
                defense: minionScaledStats.defense,
                speed: minionScaledStats.speed,
                skills: minion.skills || [],
                assetPath: minion.assetPath || "",
                position: minion.position || { q: 0, r: 0 },
            };

        })
    powerBoss["minions"] = minionsData;

    return powerBoss;
}
