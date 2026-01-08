/**
 * 关卡规则配置
 * 定义 TacticalMonster 游戏特定的关卡规则配置，通过 ruleId 与 TournamentConfig 关联
 */

/**
 * 游戏类型
 */
export type GameName =
    | "solitaire"       // 单人纸牌
    | "rummy"           // 拉米纸牌
    | "uno"             // UNO
    | "ludo"            // 飞行棋
    | "chess"           // 国际象棋
    | "checkers"        // 跳棋
    | "puzzle"          // 益智游戏
    | "arcade"          // 街机游戏
    | "tacticalMonster"; // 战术怪物（Monster Rumble）

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
 * 宝箱奖励规则配置
 * 仅包含权重分配配置，掉落概率和排名调整逻辑在其他地方处理
 */
export interface ChestRewardRules {
    // 宝箱类型权重分布（总和应为 1.0）
    chestTypeWeights: ChestTypeWeights;
}

/**
 * 关卡规则配置
 * 定义关卡内容、难度、奖励等游戏特定规则
 */
export interface StageRuleConfig {
    // ============================================
    // 基础信息
    // ============================================
    ruleId: string;
    gameName: GameName;
    // ============================================
    // 关卡类型和进度
    // ============================================
    stageType?: "story" | "challenge" | "boss_rush" | "endless" | "arena";  // 关卡类型
    chapter?: number;                    // 章节编号（故事模式使用）
    stageNumber?: number;                 // 章节内关卡编号
    // ============================================
    // 连续关卡配置（支持关卡链和关卡树）
    // ============================================
    stageChain?: {
        // 下一关卡（线性关卡链）
        nextLevels?: string[];           // 下一关卡的 typeId 列表（支持分支）

        // 前置关卡（用于验证和自动解锁）
        previousLevels?: string[];       // 前置关卡的 typeId 列表

        // 解锁模式
        unlockMode?: "sequential" | "parallel" | "any";  // 顺序解锁 | 并行解锁 | 任意完成即可
        // sequential: 必须按顺序完成前置关卡
        // parallel: 前置关卡可以并行完成
        // any: 完成任意一个前置关卡即可解锁

        // 自动解锁（完成当前关卡后自动解锁下一关卡）
        autoUnlockNext?: boolean;        // 是否自动解锁下一关卡（默认 true）

        // 关卡链元数据
        chainId?: string;                 // 关卡链ID（用于标识整个关卡链）
        chainOrder?: number;              // 在关卡链中的顺序（用于排序）
    };

    // ============================================
    // 关卡内容配置（TacticalMonster 特定）
    // ============================================
    stageContent?: {
        // Boss 配置
        bossConfig?: {
            bossId?: string;              // Boss ID（固定 Boss）
            bossPool?: string[];          // Boss ID 列表（随机选择）
        };
        // 地图配置（可选，如果不使用 levelConfigId）
        mapConfig?: {
            mapSize: { rows: number; cols: number };
            templateId?: string;
        };

        // 难度调整
        difficultyAdjustment?: {
            powerBasedScaling?: boolean;   // 是否基于玩家 Power 调整难度 
            // 例如：1.0 表示Boss Power = Player Team Power（平衡）
            //       1.2 表示Boss Power = 1.2 × Player Team Power（Boss更强）
            difficultyMultiplier?: number;  // Boss Power / Player Team Power 的比率
            minMultiplier?: number;        // 最低难度倍数
            maxMultiplier?: number;        // 最高难度倍数
        };
    };


    // ============================================
    // 显示和排序
    // ============================================
    isVisible?: boolean;                 // 是否在关卡列表中显示（默认 true）
    sortOrder?: number;                  // 排序顺序
}


/**
 * 关卡规则配置集合
 * 通过 ruleId 查询对应的配置
 * 
 * 注意：
 * - 配置需要手动添加静态配置
 * - 不再支持自动生成
 */
export const STAGE_RULE_CONFIGS: Record<string, StageRuleConfig> = {
    // ============================================
    // Bronze Tier 挑战关卡配置（5个顺序关卡）
    // ============================================

    // 关卡 1
    "monster_rumble_challenge_bronze_boss_1": {
        ruleId: "monster_rumble_challenge_bronze_boss_1",
        gameName: "tacticalMonster",
        stageType: "challenge",
        stageNumber: 1,
        stageChain: {
            chainId: "challenge_bronze",
            chainOrder: 1,
            nextLevels: ["monster_rumble_challenge_bronze_boss_2"],
            unlockMode: "sequential",
            autoUnlockNext: true,
        },

        stageContent: {
            bossConfig: {
                bossId: "boss_bronze_1",
            },
            mapConfig: {
                mapSize: { rows: 10, cols: 10 },
            },
            difficultyAdjustment: {
                powerBasedScaling: true,
                difficultyMultiplier: 1.0,
                minMultiplier: 0.5,
                maxMultiplier: 2.0,
            },
        },

        isVisible: true,
        sortOrder: 1,
    },

    // 关卡 2
    "monster_rumble_challenge_bronze_boss_2": {
        ruleId: "monster_rumble_challenge_bronze_boss_2",
        gameName: "tacticalMonster",
        stageType: "challenge",
        stageNumber: 2,

        stageChain: {
            chainId: "challenge_bronze",
            chainOrder: 2,
            previousLevels: ["monster_rumble_challenge_bronze_boss_1"],
            nextLevels: ["monster_rumble_challenge_bronze_boss_3"],
            unlockMode: "sequential",
            autoUnlockNext: true,
        },

        stageContent: {
            bossConfig: {
                bossId: "boss_bronze_2",
            },
            difficultyAdjustment: {
                powerBasedScaling: true,
                difficultyMultiplier: 1.1,
                minMultiplier: 0.5,
                maxMultiplier: 2.0,
            },
        },

        isVisible: true,
        sortOrder: 2,
    },

    // 关卡 3
    "monster_rumble_challenge_bronze_boss_3": {
        ruleId: "monster_rumble_challenge_bronze_boss_3",
        gameName: "tacticalMonster",
        stageType: "challenge",
        stageNumber: 3,

        stageChain: {
            chainId: "challenge_bronze",
            chainOrder: 3,
            previousLevels: ["monster_rumble_challenge_bronze_boss_2"],
            nextLevels: ["monster_rumble_challenge_bronze_boss_4"],
            unlockMode: "sequential",
            autoUnlockNext: true,
        },

        stageContent: {
            bossConfig: {
                bossId: "boss_bronze_1",
            },
            difficultyAdjustment: {
                powerBasedScaling: true,
                difficultyMultiplier: 1.2,
                minMultiplier: 0.5,
                maxMultiplier: 2.0,
            },
        },

        isVisible: true,
        sortOrder: 3,
    },

    // 关卡 4
    "monster_rumble_challenge_bronze_boss_4": {
        ruleId: "monster_rumble_challenge_bronze_boss_4",
        gameName: "tacticalMonster",
        stageType: "challenge",
        stageNumber: 4,

        stageChain: {
            chainId: "challenge_bronze",
            chainOrder: 4,
            previousLevels: ["monster_rumble_challenge_bronze_boss_3"],
            nextLevels: ["monster_rumble_challenge_bronze_boss_5"],
            unlockMode: "sequential",
            autoUnlockNext: true,
        },

        stageContent: {
            bossConfig: {
                bossId: "boss_bronze_2",
            },
            difficultyAdjustment: {
                powerBasedScaling: true,
                difficultyMultiplier: 1.3,
                minMultiplier: 0.5,
                maxMultiplier: 2.0,
            },
        },

        isVisible: true,
        sortOrder: 4,
    },

    // 关卡 5（最后一关）
    "monster_rumble_challenge_bronze_boss_5": {
        ruleId: "monster_rumble_challenge_bronze_boss_5",
        gameName: "tacticalMonster",
        stageType: "challenge",
        stageNumber: 5,

        stageChain: {
            chainId: "challenge_bronze",
            chainOrder: 5,
            previousLevels: ["monster_rumble_challenge_bronze_boss_4"],
            unlockMode: "sequential",
            autoUnlockNext: false,
        },

        stageContent: {
            bossConfig: {
                bossId: "boss_bronze_1",
            },
            difficultyAdjustment: {
                powerBasedScaling: true,
                difficultyMultiplier: 1.5,
                minMultiplier: 0.5,
                maxMultiplier: 2.0,
            },
        },

        isVisible: true,
        sortOrder: 5,
    },
    "monster_rumble_arena_bronze": {
        ruleId: "monster_rumble_arena_bronze",
        gameName: "tacticalMonster",
        stageType: "arena",
        stageContent: {
            bossConfig: {
                bossId: "boss_bronze_1",
            },
            mapConfig: {
                mapSize: { rows: 10, cols: 10 },
            },
            difficultyAdjustment: {
                powerBasedScaling: true,
                difficultyMultiplier: 1.5,
                minMultiplier: 0.5,
                maxMultiplier: 2.0,
            },
        },

        isVisible: true,
        sortOrder: 5,
    },
};

/**
 * 添加或更新关卡规则配置
 * 用于手动注册配置
 */
export function registerStageRuleConfig(config: StageRuleConfig): void {
    STAGE_RULE_CONFIGS[config.ruleId] = config;
}

/**
 * 批量添加关卡规则配置
 * 用于手动注册配置
 */
export function registerStageRuleConfigs(configs: StageRuleConfig[]): void {
    for (const config of configs) {
        STAGE_RULE_CONFIGS[config.ruleId] = config;
    }
}

/**
 * 获取关卡规则配置
 */
export function getStageRuleConfig(ruleId: string): StageRuleConfig | undefined {
    return STAGE_RULE_CONFIGS[ruleId];
}


