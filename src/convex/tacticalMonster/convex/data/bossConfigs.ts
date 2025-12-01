/**
 * Boss 配置数据
 * 支持Boss角色组合（Boss本体 + 小怪/护卫）
 */

export interface BossConfig {
    bossId: string;
    name: string;
    difficulty: "easy" | "medium" | "hard" | "expert";
    baseHp: number;
    baseDamage: number;
    baseDefense: number;
    baseSpeed?: number;
    skills: any[];
    behaviorTree: any;
    assetPath: string;
    
    // 新增：小怪/护卫配置（可选）
    // 如果不配置minions，则表示单个Boss
    minions?: MinionConfig[];
    
    // 新增：阶段配置（支持阶段化行为）
    phases?: BossPhase[];
    
    configVersion: number;
}

/**
 * 小怪配置接口
 */
export interface MinionConfig {
    minionId: string;          // 小怪唯一标识（如 "minion_guard_1"）
    characterId: string;       // 角色配置ID（引用mr_monster_configs或自定义）
    name: string;
    baseHp: number;
    baseDamage: number;
    baseDefense: number;
    baseSpeed: number;
    skills: any[];             // 小怪技能
    assetPath: string;
    quantity: number;          // 该类型小怪的数量（如2个守卫）
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

export const BOSS_CONFIGS: Record<string, BossConfig> = {
    boss_bronze_1: {
        bossId: "boss_bronze_1",
        name: "Bronze Boss 1",
        difficulty: "easy",
        baseHp: 10000,
        baseDamage: 100,
        baseDefense: 50,
        baseSpeed: 10,
        skills: [],
        behaviorTree: {},
        assetPath: "/assets/bosses/bronze_1.glb",
        minions: [],  // 暂时无小怪
        phases: [],
        configVersion: 1,
    },
    boss_bronze_2: {
        bossId: "boss_bronze_2",
        name: "Bronze Boss 2",
        difficulty: "easy",
        baseHp: 12000,
        baseDamage: 120,
        baseDefense: 60,
        baseSpeed: 10,
        skills: [],
        behaviorTree: {},
        assetPath: "/assets/bosses/bronze_2.glb",
        minions: [],  // 暂时无小怪
        phases: [],
        configVersion: 1,
    },
    boss_silver_1: {
        bossId: "boss_silver_1",
        name: "Silver Boss 1",
        difficulty: "medium",
        baseHp: 20000,
        baseDamage: 200,
        baseDefense: 100,
        baseSpeed: 12,
        skills: [],
        behaviorTree: {},
        assetPath: "/assets/bosses/silver_1.glb",
        minions: [],
        phases: [],
        configVersion: 1,
    },
    boss_silver_2: {
        bossId: "boss_silver_2",
        name: "Silver Boss 2",
        difficulty: "medium",
        baseHp: 24000,
        baseDamage: 240,
        baseDefense: 120,
        baseSpeed: 12,
        skills: [],
        behaviorTree: {},
        assetPath: "/assets/bosses/silver_2.glb",
        minions: [],
        phases: [],
        configVersion: 1,
    },
    boss_gold_1: {
        bossId: "boss_gold_1",
        name: "Gold Boss 1",
        difficulty: "hard",
        baseHp: 40000,
        baseDamage: 400,
        baseDefense: 200,
        baseSpeed: 15,
        skills: [],
        behaviorTree: {},
        assetPath: "/assets/bosses/gold_1.glb",
        minions: [],
        phases: [],
        configVersion: 1,
    },
    boss_gold_2: {
        bossId: "boss_gold_2",
        name: "Gold Boss 2",
        difficulty: "hard",
        baseHp: 48000,
        baseDamage: 480,
        baseDefense: 240,
        baseSpeed: 15,
        skills: [],
        behaviorTree: {},
        assetPath: "/assets/bosses/gold_2.glb",
        minions: [],
        phases: [],
        configVersion: 1,
    },
    boss_platinum_1: {
        bossId: "boss_platinum_1",
        name: "Platinum Boss 1",
        difficulty: "expert",
        baseHp: 80000,
        baseDamage: 800,
        baseDefense: 400,
        baseSpeed: 18,
        skills: [],
        behaviorTree: {},
        assetPath: "/assets/bosses/platinum_1.glb",
        minions: [],
        phases: [],
        configVersion: 1,
    },
    boss_platinum_2: {
        bossId: "boss_platinum_2",
        name: "Platinum Boss 2",
        difficulty: "expert",
        baseHp: 96000,
        baseDamage: 960,
        baseDefense: 480,
        baseSpeed: 18,
        skills: [],
        behaviorTree: {},
        assetPath: "/assets/bosses/platinum_2.glb",
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

