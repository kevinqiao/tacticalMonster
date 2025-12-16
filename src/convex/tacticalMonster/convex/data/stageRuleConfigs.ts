/**
 * 关卡规则配置
 * 定义 TacticalMonster 游戏特定的关卡规则配置，通过 ruleId 与 TournamentConfig 关联
 */

/**
 * 游戏类型
 * 注意：此定义应该与 Tournament 模块的 GameName 保持一致
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
    // 解锁条件
    // ============================================
    minTeamPower?: number;
    maxTeamPower?: number;

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

        // 关卡组（同一组内的关卡可以并行解锁）
        stageGroup?: string;              // 关卡组ID（如 "chapter_1_group_1"）

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
    // 首次通关奖励（单人关卡特有）
    // ============================================
    firstClearRewards?: {
        coins?: number;
        energy?: number;
        monsterShards?: Array<{ monsterId: string; quantity: number }>;
        monsters?: Array<{
            monsterId: string;
            level?: number;
            stars?: number;
        }>;
        // 解锁奖励（解锁其他 typeId）
        unlocks?: Array<{
            typeId: string;              // 解锁的锦标赛 typeId
        }>;
    };

    // ============================================
    // 重试配置（单人关卡特有）
    // ============================================
    retryConfig?: {
        maxAttempts?: number;            // 最大尝试次数（覆盖 limits.maxAttempts）
        retryCost?: {
            coins?: number;
            energy?: number;
        };
        unlimitedRetries?: boolean;      // 是否允许无限重试
    };

    // ============================================
    // 宝箱奖励规则配置（仅权重分配）
    // ============================================
    chestRewardRules?: ChestRewardRules;

    // ============================================
    // 显示和排序
    // ============================================
    isVisible?: boolean;                 // 是否在关卡列表中显示（默认 true）
    sortOrder?: number;                  // 排序顺序
}

/**
 * 默认宝箱类型权重（按 Tier）
 * 用于当 ruleId 不存在时作为后备配置
 */
const DEFAULT_CHEST_TYPE_WEIGHTS: Record<string, ChestTypeWeights> = {
    bronze: { silver: 0.8, gold: 0.2 },
    silver: { silver: 0.6, gold: 0.35, purple: 0.05 },
    gold: { gold: 0.5, purple: 0.4, orange: 0.1 },
    platinum: { purple: 0.5, orange: 0.5 },
};

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
    "challenge_bronze_boss_1": {
        ruleId: "challenge_bronze_boss_1",
        gameName: "tacticalMonster",
        stageType: "challenge",
        stageNumber: 1,

        minTeamPower: 0,
        maxTeamPower: 2000,

        stageChain: {
            chainId: "challenge_bronze",
            chainOrder: 1,
            nextLevels: ["challenge_bronze_boss_2"],
            unlockMode: "sequential",
            autoUnlockNext: true,
        },

        stageContent: {
            bossConfig: {
                bossId: "boss_bronze_1",
            },
            difficultyAdjustment: {
                powerBasedScaling: true,
                difficultyMultiplier: 1.0,
                minMultiplier: 0.5,
                maxMultiplier: 2.0,
            },
        },

        retryConfig: {
            maxAttempts: 3,
            retryCost: {
                energy: 3,
            },
        },

        chestRewardRules: {
            chestTypeWeights: {
                silver: 0.8,
                gold: 0.2,
            },
        },

        isVisible: true,
        sortOrder: 1,
    },

    // 关卡 2
    "challenge_bronze_boss_2": {
        ruleId: "challenge_bronze_boss_2",
        gameName: "tacticalMonster",
        stageType: "challenge",
        stageNumber: 2,

        minTeamPower: 400,
        maxTeamPower: 2000,

        stageChain: {
            chainId: "challenge_bronze",
            chainOrder: 2,
            previousLevels: ["challenge_bronze_boss_1"],
            nextLevels: ["challenge_bronze_boss_3"],
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

        retryConfig: {
            maxAttempts: 3,
            retryCost: {
                energy: 3,
            },
        },

        chestRewardRules: {
            chestTypeWeights: {
                silver: 0.8,
                gold: 0.2,
            },
        },

        isVisible: true,
        sortOrder: 2,
    },

    // 关卡 3
    "challenge_bronze_boss_3": {
        ruleId: "challenge_bronze_boss_3",
        gameName: "tacticalMonster",
        stageType: "challenge",
        stageNumber: 3,

        minTeamPower: 800,
        maxTeamPower: 2000,

        stageChain: {
            chainId: "challenge_bronze",
            chainOrder: 3,
            previousLevels: ["challenge_bronze_boss_2"],
            nextLevels: ["challenge_bronze_boss_4"],
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

        retryConfig: {
            maxAttempts: 3,
            retryCost: {
                energy: 3,
            },
        },

        chestRewardRules: {
            chestTypeWeights: {
                silver: 0.8,
                gold: 0.2,
            },
        },

        isVisible: true,
        sortOrder: 3,
    },

    // 关卡 4
    "challenge_bronze_boss_4": {
        ruleId: "challenge_bronze_boss_4",
        gameName: "tacticalMonster",
        stageType: "challenge",
        stageNumber: 4,

        minTeamPower: 1200,
        maxTeamPower: 2000,

        stageChain: {
            chainId: "challenge_bronze",
            chainOrder: 4,
            previousLevels: ["challenge_bronze_boss_3"],
            nextLevels: ["challenge_bronze_boss_5"],
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

        retryConfig: {
            maxAttempts: 3,
            retryCost: {
                energy: 3,
            },
        },

        chestRewardRules: {
            chestTypeWeights: {
                silver: 0.8,
                gold: 0.2,
            },
        },

        isVisible: true,
        sortOrder: 4,
    },

    // 关卡 5（最后一关）
    "challenge_bronze_boss_5": {
        ruleId: "challenge_bronze_boss_5",
        gameName: "tacticalMonster",
        stageType: "challenge",
        stageNumber: 5,

        minTeamPower: 1600,
        maxTeamPower: 2000,

        stageChain: {
            chainId: "challenge_bronze",
            chainOrder: 5,
            previousLevels: ["challenge_bronze_boss_4"],
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

        retryConfig: {
            maxAttempts: 3,
            retryCost: {
                energy: 3,
            },
        },

        chestRewardRules: {
            chestTypeWeights: {
                silver: 0.8,
                gold: 0.2,
            },
        },

        isVisible: true,
        sortOrder: 5,
    },
    "arena_bronze": {
        ruleId: "arena_bronze",
        gameName: "tacticalMonster",
        stageType: "arena",
        minTeamPower: 1600,
        maxTeamPower: 2000,
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

        retryConfig: {
            maxAttempts: 3,
            retryCost: {
                energy: 3,
            },
        },

        chestRewardRules: {
            chestTypeWeights: {
                silver: 0.8,
                gold: 0.2,
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

/**
 * 获取宝箱类型权重配置
 * 如果 ruleId 不存在，返回基于 tier 的默认权重
 */
export function getChestTypeWeights(ruleId: string, tier?: string): ChestTypeWeights {
    const config = getStageRuleConfig(ruleId);
    if (config?.chestRewardRules?.chestTypeWeights) {
        return config.chestRewardRules.chestTypeWeights;
    }

    // 使用默认配置（基于 tier）
    if (tier && DEFAULT_CHEST_TYPE_WEIGHTS[tier]) {
        return DEFAULT_CHEST_TYPE_WEIGHTS[tier];
    }

    // 最后的后备：使用 bronze 的默认配置
    return DEFAULT_CHEST_TYPE_WEIGHTS.bronze;
}

