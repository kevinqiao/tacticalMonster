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

export interface BossConfig {
    bossId: string;

    // 主体角色配置ID（引用 mr_monster_configs 或自定义角色配置）
    // 基础属性（HP、攻击、防御、速度、技能等）从引用的角色配置继承
    characterId: string;

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

    // 新增：小怪/护卫配置（可选）
    // 如果不配置minions，则表示单个Boss
    minions?: MinionConfig[];

    // 新增：阶段配置（支持阶段化行为）
    phases?: BossPhase[];

    configVersion: number;
}

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
    characterId: string;       // 角色配置ID（引用mr_monster_configs或自定义）
    quantity: number;          // 该类型小怪的数量（如2个守卫）

    // 可选覆盖属性（如果提供，将覆盖从 characterId 继承的属性）
    name?: string;             // 如果提供，覆盖角色配置的 name
    baseHp?: number;           // 如果提供，覆盖角色配置的 baseHp
    baseDamage?: number;       // 如果提供，覆盖角色配置的 baseDamage
    baseDefense?: number;      // 如果提供，覆盖角色配置的 baseDefense
    baseSpeed?: number;        // 如果提供，覆盖角色配置的 baseSpeed
    skills?: any[];            // 如果提供，覆盖或合并角色配置的 skills
    assetPath?: string;        // 如果提供，覆盖角色配置的 assetPath
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
        characterId: "monster_001",  // 引用怪物配置ID（示例，需要根据实际怪物ID调整）
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
        characterId: "monster_002",  // 引用怪物配置ID
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
        characterId: "monster_003",
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
        characterId: "monster_004",
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
        characterId: "monster_005",
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
        characterId: "monster_006",
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
        characterId: "monster_007",
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
        characterId: "monster_008",
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

