import { Boss, BossConfig } from "../types/bossTypes";
import { computeBossStatScale, type BossScalingTuning } from "../../../../../convex/tacticalMonster/convex/data/adaptiveBossScaling";
import { calculatePower, MONSTER_CONFIGS, MONSTER_CONFIGS_MAP } from "./monsterConfigs";

export type CalculateScaleBossParams = {
    bossId: string;
    playerPower: number;
    difficultyMultiplier: number;
    tuning?: BossScalingTuning;
};

export type { BossScalingTuning };
export {
    bossScalingTuningFromDifficultyAdjustment,
    computeBossStatScale,
    DEFAULT_BOSS_SCALING_TUNING,
    mergeBossScalingTuning,
} from "../../../../../convex/tacticalMonster/convex/data/adaptiveBossScaling";

/**
 * Boss 配置示例
 * 
 * 注意：
 * - monsterId 引用 monsterConfigs.ts 配置文件中的怪物配置
 * - 基础属性（HP、攻击、防御等）从角色配置继承
 * - 可选覆盖属性可以覆盖继承的属性
 * - Boss 特有属性（behaviorTree、phases）只在此定义
 * - Monster 配置直接从配置文件读取，不存数据库
 */
export const BOSS_CONFIGS: Record<string, BossConfig> = {
    boss_bronze_1: {
        bossId: "boss_bronze_1",
        monsterId: "monster_001",  // 引用怪物配置ID（示例，需要根据实际怪物ID调整）
        difficulty: "easy",
        behaviorTree: {},
        // 可选：覆盖基础属性（方案 A：首关友好，约 20-25 回合可结束）
        baseHp: 3500,
        baseDamage: 80,
        baseDefense: 40,
        baseSpeed: 10,
        position: { q: 6, r: 1 },  // Boss 默认位置（地图右上角区域）
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
        position: { q: 7, r: 1 },  // Boss 默认位置（地图右上角区域）
        minions: [],
        phases: [],
        configVersion: 1,
    },
    boss_silver_1: {
        bossId: "boss_silver_1",
        monsterId: "monster_003",
        difficulty: "medium",
        behaviorTree: {},
        baseHp: 28000,
        baseDamage: 280,
        baseDefense: 140,
        baseSpeed: 12,
        position: { q: 8, r: 1 },  // Boss 默认位置（地图右上角区域）
        minions: [
            { minionId: "silver_escort_1", monsterId: "monster_037", position: { q: 6, r: 2 } },
        ],
        phases: [],
        configVersion: 1,
    },
    boss_silver_2: {
        bossId: "boss_silver_2",
        monsterId: "monster_004",
        difficulty: "medium",
        behaviorTree: {},
        baseHp: 33600,
        baseDamage: 336,
        baseDefense: 168,
        baseSpeed: 12,
        position: { q: 8, r: 1 },  // Boss 默认位置（地图右上角区域）
        minions: [],
        phases: [],
        configVersion: 1,
    },
    boss_gold_1: {
        bossId: "boss_gold_1",
        monsterId: "monster_005",
        difficulty: "hard",
        behaviorTree: {},
        baseHp: 56000,
        baseDamage: 560,
        baseDefense: 280,
        baseSpeed: 15,
        position: { q: 8, r: 1 },  // Boss 默认位置（地图右上角区域）
        minions: [
            { minionId: "gold_escort_1", monsterId: "monster_037", position: { q: 5, r: 2 } },
            { minionId: "gold_escort_2", monsterId: "monster_038", position: { q: 7, r: 3 } },
        ],
        phases: [],
        configVersion: 1,
    },
    boss_gold_2: {
        bossId: "boss_gold_2",
        monsterId: "monster_006",
        difficulty: "hard",
        behaviorTree: {},
        baseHp: 67200,
        baseDamage: 672,
        baseDefense: 336,
        baseSpeed: 15,
        position: { q: 8, r: 1 },  // Boss 默认位置（地图右上角区域）
        minions: [
            { minionId: "gold2_escort_1", monsterId: "monster_037", position: { q: 5, r: 1 } },
            { minionId: "gold2_escort_2", monsterId: "monster_038", position: { q: 6, r: 3 } },
        ],
        phases: [
            { phaseName: "enrage", hpThreshold: 0.55, behaviorPattern: {}, skillPriorities: [] },
        ],
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
        position: { q: 8, r: 1 },  // Boss 默认位置（地图右上角区域）
        minions: [{ minionId: "plat_escort_1", monsterId: "monster_037", position: { q: 5, r: 2 } }],
        phases: [
            { phaseName: "secondWind", hpThreshold: 0.5, behaviorPattern: {}, skillPriorities: [] },
        ],
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
        position: { q: 8, r: 1 },  // Boss 默认位置（地图右上角区域）
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
        skills: bossConfig.skills || [],
        assetPath: bossConfig.assetPath || monsterConfig.assetPath || "",

        // Boss 特有属性
        behaviorTree: bossConfig.behaviorTree,
        minions: bossConfig.minions,
        phases: bossConfig.phases,
        position: bossConfig.position,
        configVersion: bossConfig.configVersion,
    };

    return merged;
}
export const calculateScaleBoss = (params: CalculateScaleBossParams): Boss | undefined => {
    const { bossId, playerPower, difficultyMultiplier, tuning } = params;
    const bossConfig = getMergedBossConfig(bossId);
    if (!bossConfig || !bossConfig.baseHp || !bossConfig.baseDamage || !bossConfig.baseDefense || !bossConfig.baseSpeed || !bossConfig.name || !bossConfig.assetPath || !bossConfig.position || !bossConfig.minions) {
        throw new Error(`Boss配置不存在: ${bossId}`);
    }
    const baseBossPower = calculatePower(bossConfig.baseDamage, bossConfig.baseDefense, bossConfig.baseHp);
    const scale = computeBossStatScale(playerPower, baseBossPower, difficultyMultiplier, tuning);
    const powerBoss: Boss = {
        bossId: bossConfig.bossId,
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
            // 小怪配置使用 monsterId 引用角色配置（从 monsterConfigs.ts 读取）
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



/**
 * 计算Boss基础Power（用于单人关卡的自适应缩放）
 * 包含Boss本体和小怪的总Power
 * 使用与玩家Power相同的公式：HP + Attack * 2 + Defense * 1.5
 * 
 * @param bossConfig Boss合并后的配置
 * @returns Boss总Power（Boss本体 + 所有小怪）
 */
export function calculateBossPower(bossConfig: BossConfig): number {
    // 1. 计算 Boss 本体 Power
    // const bossPower = (bossConfig.baseHp ?? 0) + (bossConfig.baseDamage ?? 0) * 2 + (bossConfig.baseDefense ?? 0) * 1.5;
    const bossPower = calculatePower(bossConfig.baseDamage ?? 0, bossConfig.baseDefense ?? 0, bossConfig.baseHp ?? 0);
    // 2. 计算所有小怪的 Power
    let minionsPower = 0;
    if (bossConfig.minions && bossConfig.minions.length > 0) {
        for (const minion of bossConfig.minions) {
            // 获取小怪的基础属性（优先使用覆盖值，否则从 monsterId 获取）
            let minionHp: number;
            let minionDamage: number;
            let minionDefense: number;

            // 尝试从 MONSTER_CONFIGS_MAP 获取小怪配置
            const minionMonsterConfig = MONSTER_CONFIGS_MAP[minion.monsterId];

            if (minionMonsterConfig) {
                // 使用角色配置的基础值，minion 的覆盖值优先
                minionHp = minion.baseHp ?? minionMonsterConfig.baseHp;
                minionDamage = minion.baseDamage ?? minionMonsterConfig.baseDamage;
                minionDefense = minion.baseDefense ?? minionMonsterConfig.baseDefense;
            } else {
                // 如果没有角色配置，使用 minion 的覆盖值或默认值
                minionHp = minion.baseHp ?? 100;
                minionDamage = minion.baseDamage ?? 10;
                minionDefense = minion.baseDefense ?? 5;
            }

            // 计算小怪 Power（使用与玩家Power相同的公式）
            const minionPower = minionHp + minionDamage * 2 + minionDefense * 1.5;
            minionsPower += minionPower;
        }
    }

    // 3. 返回 Boss + 小怪的总 Power
    return Math.floor(bossPower + minionsPower);
}




