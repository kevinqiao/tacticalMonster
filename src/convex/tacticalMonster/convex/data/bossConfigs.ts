import { Boss, BossConfig } from "../types/bossTypes";
import { computeBossStatScale, type BossScalingTuning } from "./adaptiveBossScaling";
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
} from "./adaptiveBossScaling";

/**
 * Boss 配置（战斗内表现 + 与掉落经济的衔接）
 *
 * ## 与 `monsterConfigs`（必配）
 * - **`monsterId`**：必须存在于 [`monsterConfigs.ts`](./monsterConfigs.ts)。Boss 外观、技能、**稀有度**（Common/Rare/Epic/Legendary）均来自该怪；**升星碎片需求**见 [`upgradeStrategyConfig`](../service/monster/config/upgradeStrategyConfig.ts)，与稀有度绑定。
 * - **`minions[].monsterId`**：仅战斗单位，**不参与** Solo 结算直发碎片（结算只认关卡 `bossConfig.bossId` → 本表 **主 Boss** `monsterId`）。
 *
 * ## 与 Solo「分数档直掉碎片」（[`soloRewardResolve.ts`](./soloRewardResolve.ts)）
 * - 关卡 `stageContent.bossConfig.bossId` 指向本表某 `boss_*`。
 * - 未设置 `StageRuleConfig.soloDirectRewardMonsterId` 时，**直发碎片目标怪** = 本条 **`monsterId`**（与 Boss 战一致）。
 * - 若策划希望「本关掉落碎片 ≠ 关底 Boss 模型」（例如剧情 Boss 与卡池怪不同），在 **关卡规则** 上设 `soloDirectRewardMonsterId`，**不要**在本表硬拆两条 bossId，除非确需两套 Boss 战斗。
 * - **正式 Boss 轮换与碎片节奏** 以 [`stageRuleConfigsSoloMain.ts`](./stageRuleConfigsSoloMain.ts)（4×5 主线）为准。[`stageRuleConfigsSoloChallenge.ts`](./stageRuleConfigsSoloChallenge.ts) 的 `solo_lab` **仅测试/锦标赛管线**，不作产品节奏依据。
 *
 * ## 与「分数档宝箱类型」（[`stageRuleConstants.ts`](./stageRuleConstants.ts) `DEFAULT_SOLO_SCORE_TIERS`）
 * - 每档有 **`chestType`**（silver/gold/purple…）；**开箱池**在 [`chestConfigs.ts`](./chestConfigs.ts) 的 `(chestType, stageRuleId?)`，**不在**本文件配置。
 * - 若某关需要「高分档才出某池」，改 **score_tiers** / `chestConfigs` 行；Boss 本体不负责箱内随机池。
 *
 * ## 与「章节通章整卡」（[`chapterRewards.ts`](./chapterRewards.ts)）
 * - 通章 **`CHAPTER_CLEAR_CHEST_BY_CHAPTER`** 宝箱池（`chestConfigs` 的 `chapter_clear_*`）与 **小关 Boss 定向碎片** 按设计应 **不同 monsterId**；填表前核对本表主 Boss `monsterId` 是否与通章池冲突。
 *
 * ## 与多人 / 锦标赛宝箱
 * - 排名宝箱、`gameSpecificRewards` 在 Tournament 与 `chestService` 侧配置；本表仅影响 **局内 Boss 单位**。
 *
 * ## 配置顺序建议（对齐掉落设计）
 * 1. 在 `monsterConfigs` 定好图鉴与稀有度。
 * 2. 本表为每个 **`bossId`** 绑定 **`monsterId`** 与数值/minions/phases。
 * 3. 关卡里引用 `bossId`；检查 `soloRewardResolve`、通章表、`chestConfigs` 行是否一致。
 * 4. 改 `monsterId` 后跑 `npm run verify:tm-config-shims`（若动到前端 shim）及项目内 chest 校验。
 *
 * ## Solo 主线 20 Boss（`boss_main_ch{1-4}_s{1-5}`）
 * - 由 `buildSoloMainBossConfigs()` 生成并合并进 `BOSS_CONFIGS`。
 * - `monsterId` 与 [`chapterRewards.ts`](./chapterRewards.ts) 通章整卡错开（每章通章怪不出现在本章五关 Boss 上）。
 */
/**
 * Solo 主线：每关唯一 `bossId` + `monsterId`（20 个互不重复）。
 * 行 = 章，列 = 关。通章整卡见 [`chapterRewards.ts`](./chapterRewards.ts)（Rare→Epic 递进）；本章五关的 `monsterId` 均避开该章通章 id。
 *
 * **稀有度进程**（与 `monsterConfigs.rarity` 对齐）：第 1 章 **Common**；第 2 章 **以 Epic 为主** + 1 关 **Rare**（补 Assassin，因 Epic 池内无刺客）；第 3 章 **Epic + Rare** 混排；第 4 章 **四 Legendary + 美杜莎 Epic** 作终章。通章未独占的怪由池子或其它玩法承接。
 *
 * **第 2～4 章职业覆盖**：在 **20 个 `monsterId` 全局不重复** 且 **各章五关避开该章通章整卡 id** 的前提下，尽量五关 **class** 互不重复；第 4 章 **002 与 005 均为 Mage**（图鉴仅 4 只 Legendary，第五关需 Epic 补位时无法避免双法师，可后续换图鉴或接受）。
 *
 * **第 1 章**：五关 **Common**，职业 Warrior / Tank / Archer / Mage / Support。
 */
const SOLO_MAIN_BOSS_GRID: readonly (readonly { bossId: string; monsterId: string }[])[] = [
    [
        { bossId: "boss_main_ch1_s1", monsterId: "monster_036" }, // Common · Warrior
        { bossId: "boss_main_ch1_s2", monsterId: "monster_046" }, // Common · Tank
        { bossId: "boss_main_ch1_s3", monsterId: "monster_039" }, // Common · Archer
        { bossId: "boss_main_ch1_s4", monsterId: "monster_050" }, // Common · Mage
        { bossId: "boss_main_ch1_s5", monsterId: "monster_079" }, // Common · Support
    ],
    [
        { bossId: "boss_main_ch2_s1", monsterId: "monster_006" }, // Epic · Warrior
        { bossId: "boss_main_ch2_s2", monsterId: "monster_008" }, // Epic · Support
        { bossId: "boss_main_ch2_s3", monsterId: "monster_009" }, // Epic · Tank
        { bossId: "boss_main_ch2_s4", monsterId: "monster_010" }, // Epic · Mage
        { bossId: "boss_main_ch2_s5", monsterId: "monster_014" }, // Rare · Assassin
    ],
    [
        { bossId: "boss_main_ch3_s1", monsterId: "monster_011" }, // Epic · Tank
        { bossId: "boss_main_ch3_s2", monsterId: "monster_012" }, // Epic · Warrior
        { bossId: "boss_main_ch3_s3", monsterId: "monster_013" }, // Epic · Mage
        { bossId: "boss_main_ch3_s4", monsterId: "monster_016" }, // Rare · Archer
        { bossId: "boss_main_ch3_s5", monsterId: "monster_017" }, // Rare · Support
    ],
    [
        { bossId: "boss_main_ch4_s1", monsterId: "monster_001" }, // Legendary · Warrior
        { bossId: "boss_main_ch4_s2", monsterId: "monster_002" }, // Legendary · Mage
        { bossId: "boss_main_ch4_s3", monsterId: "monster_003" }, // Legendary · Assassin
        { bossId: "boss_main_ch4_s4", monsterId: "monster_004" }, // Legendary · Tank
        { bossId: "boss_main_ch4_s5", monsterId: "monster_005" }, // Epic · Mage（与 s2 同为 Mage，见上文）
    ],
];

/** 供 [`stageRuleConfigsSoloMain.ts`](./stageRuleConfigsSoloMain.ts) 引用，避免 bossId 与下表漂移 */
export const SOLO_MAIN_BOSS_ID_ROWS: readonly (readonly string[])[] = SOLO_MAIN_BOSS_GRID.map((row) =>
    row.map((c) => c.bossId)
);

function soloMainDifficultyForChapter(chapter: number): BossConfig["difficulty"] {
    if (chapter <= 1) return "easy";
    if (chapter === 2) return "medium";
    if (chapter === 3) return "hard";
    return "expert";
}

function buildSoloMainBossConfigs(): Record<string, BossConfig> {
    const out: Record<string, BossConfig> = {};
    for (let ch = 1; ch <= 4; ch++) {
        for (let st = 1; st <= 5; st++) {
            const { bossId, monsterId } = SOLO_MAIN_BOSS_GRID[ch - 1][st - 1];
            const globalIdx = (ch - 1) * 5 + (st - 1);
            const t = globalIdx / 19;
            const baseHp = Math.round(3500 + (96000 - 3500) * t);
            const baseDamage = Math.round(80 + (960 - 80) * t);
            const baseDefense = Math.round(40 + (480 - 40) * t);
            const baseSpeed = Math.round(10 + (18 - 10) * t);

            const entry: BossConfig = {
                bossId,
                monsterId,
                difficulty: soloMainDifficultyForChapter(ch),
                behaviorTree: {},
                baseHp,
                baseDamage,
                baseDefense,
                baseSpeed,
                position: { q: 8, r: 1 },
                minions: [],
                phases: [],
                configVersion: 1,
            };
            if (globalIdx === 0) {
                entry.skills = [{ skillId: "summon_minion" }];
            }
            out[bossId] = entry;
        }
    }
    return out;
}

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
        skills: [{ skillId: "summon_minion" }],  // 召唤测试
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
        monsterId: "monster_003",  // 更高级怪物类型（Silver tier）
        difficulty: "medium",
        behaviorTree: {},
        baseHp: 28000,
        baseDamage: 280,
        baseDefense: 140,
        baseSpeed: 12,
        position: { q: 8, r: 1 },  // Boss 默认位置（地图右上角区域）
        minions: [
            {
                minionId: "silver_escort_1",
                monsterId: "monster_037",
                position: { q: 6, r: 2 },
            },
        ],
        phases: [],
        configVersion: 1,
    },
    boss_silver_2: {
        bossId: "boss_silver_2",
        monsterId: "monster_004",  // 更高级怪物类型（Silver tier）
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
        monsterId: "monster_005",  // 更高级怪物类型（Gold tier）
        difficulty: "hard",
        behaviorTree: {},
        baseHp: 56000,
        baseDamage: 560,
        baseDefense: 280,
        baseSpeed: 15,
        position: { q: 8, r: 1 },  // Boss 默认位置（地图右上角区域）
        minions: [
            {
                minionId: "gold_escort_1",
                monsterId: "monster_037",
                position: { q: 5, r: 2 },
            },
            {
                minionId: "gold_escort_2",
                monsterId: "monster_038",
                position: { q: 7, r: 3 },
            },
        ],
        phases: [],
        configVersion: 1,
    },
    boss_gold_2: {
        bossId: "boss_gold_2",
        monsterId: "monster_006",  // 更高级怪物类型（Gold tier）
        difficulty: "hard",
        behaviorTree: {},
        baseHp: 67200,
        baseDamage: 672,
        baseDefense: 336,
        baseSpeed: 15,
        position: { q: 8, r: 1 },  // Boss 默认位置（地图右上角区域）
        minions: [
            {
                minionId: "gold2_escort_1",
                monsterId: "monster_037",
                position: { q: 5, r: 1 },
            },
            {
                minionId: "gold2_escort_2",
                monsterId: "monster_038",
                position: { q: 6, r: 3 },
            },
        ],
        phases: [
            {
                phaseName: "enrage",
                hpThreshold: 0.55,
                behaviorPattern: {},
                skillPriorities: [],
            },
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
        minions: [
            {
                minionId: "plat_escort_1",
                monsterId: "monster_037",
                position: { q: 5, r: 2 },
            },
        ],
        phases: [
            {
                phaseName: "secondWind",
                hpThreshold: 0.5,
                behaviorPattern: {},
                skillPriorities: [],
            },
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
    ...buildSoloMainBossConfigs(),
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




