/**
 * 关卡规则配置
 * 定义 TacticalMonster 游戏特定的关卡规则配置，通过 ruleId 与 TournamentConfig 关联
 */

import { ChestTypeWeights } from "../types/chestTypes";
import { StageRuleConfig } from "../types/stageRuleTypes";
import { PEDAGOGY_BY_RULE_ID } from "./pedagogyByRuleId";

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
                mapSize: { rows: 7, cols: 8 },
                templateId: "template_bronze_basic",
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
            mapConfig: {
                mapSize: { rows: 7, cols: 8 },
                templateId: "template_bronze_basic",
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
            mapConfig: {
                mapSize: { rows: 7, cols: 8 },
                templateId: "template_bronze_basic",
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
            mapConfig: {
                mapSize: { rows: 7, cols: 8 },
                templateId: "template_bronze_basic",
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
            mapConfig: {
                mapSize: { rows: 7, cols: 8 },
                templateId: "template_bronze_basic",
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
                mapSize: { rows: 7, cols: 8 },
                templateId: "template_bronze_basic",
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

    "monster_rumble_farm_bronze_boss_1": {
        ruleId: "monster_rumble_farm_bronze_boss_1",
        gameName: "tacticalMonster",
        stageType: "challenge",
        stageChain: {
            chainId: "farm_bronze",
            chainOrder: 1,
            previousLevels: ["monster_rumble_challenge_bronze_boss_3"],
            unlockMode: "sequential",
            autoUnlockNext: true,
        },
        stageContent: {
            bossConfig: { bossId: "boss_bronze_1" },
            mapConfig: {
                mapSize: { rows: 7, cols: 8 },
                templateId: "template_bronze_basic",
            },
            difficultyAdjustment: {
                powerBasedScaling: true,
                difficultyMultiplier: 1.0,
                minMultiplier: 0.5,
                maxMultiplier: 2.0,
            },
        },
        isVisible: true,
        sortOrder: 100,
    },

    "monster_rumble_daily_boss": {
        ruleId: "monster_rumble_daily_boss",
        gameName: "tacticalMonster",
        stageType: "challenge",
        stageChain: {
            chainId: "daily",
            chainOrder: 1,
            previousLevels: [],
            unlockMode: "sequential",
            autoUnlockNext: false,
        },
        stageContent: {
            bossConfig: { bossId: "boss_bronze_1" },
            mapConfig: {
                mapSize: { rows: 7, cols: 8 },
                templateId: "template_bronze_basic",
            },
            difficultyAdjustment: {
                powerBasedScaling: true,
                difficultyMultiplier: 1.2,
                minMultiplier: 0.5,
                maxMultiplier: 2.0,
            },
        },
        isVisible: true,
        sortOrder: 101,
    },

    "monster_rumble_weekly_boss": {
        ruleId: "monster_rumble_weekly_boss",
        gameName: "tacticalMonster",
        stageType: "challenge",
        stageChain: {
            chainId: "weekly",
            chainOrder: 1,
            previousLevels: ["monster_rumble_challenge_bronze_boss_5"],
            unlockMode: "sequential",
            autoUnlockNext: false,
        },
        stageContent: {
            bossConfig: { bossId: "boss_silver_1" },
            mapConfig: {
                mapSize: { rows: 7, cols: 8 },
                templateId: "template_bronze_basic",
            },
            difficultyAdjustment: {
                powerBasedScaling: true,
                difficultyMultiplier: 1.3,
                minMultiplier: 0.5,
                maxMultiplier: 2.0,
            },
        },
        isVisible: true,
        sortOrder: 102,
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
export function getStageRuleConfigs(ruleIds: string[]): StageRuleConfig[] {
    return ruleIds.map(ruleId => getStageRuleConfig(ruleId)).filter(Boolean) as StageRuleConfig[];
}
/**
 * 获取关卡规则配置（合并 pedagogyByRuleId 教学元数据）
 */
export function getStageRuleConfig(ruleId: string): StageRuleConfig | undefined {
    const base = STAGE_RULE_CONFIGS[ruleId];
    if (!base) return undefined;
    const pedagogy = PEDAGOGY_BY_RULE_ID[ruleId];
    return pedagogy ? { ...base, pedagogy } : base;
}

/**
 * 获取宝箱类型权重配置
 * 
 * 注意：根据新设计，宝箱类型权重应该从 TournamentConfig.RewardConfig 中获取
 * 此函数保留用于向后兼容，返回默认权重
 * 
 * @param ruleId 规则ID（当前未使用，保留用于向后兼容）
 * @param tier Tier（已废弃，不再使用）
 * @returns 宝箱类型权重配置（默认值）
 */
export function getChestTypeWeights(ruleId: string, tier?: string): ChestTypeWeights {
    // 注意：根据新设计，宝箱类型权重应该从 TournamentConfig.RewardConfig 中获取
    // 此函数返回默认权重以保持向后兼容
    // 实际使用中，应该从 TournamentConfig 的 rankRewards 或 performanceRewards 中获取 chestTypeWeights

    // 返回默认权重配置
    return {
        silver: 0.7,
        gold: 0.25,
        purple: 0.04,
        orange: 0.01
    };
}


