/**
 * 关卡规则配置
 * 定义 TacticalMonster 游戏特定的关卡规则配置，通过 ruleId 与 TournamentConfig 关联
 *
 * 难度递进设计（每 tier 内单调递增）：
 * - Bronze (1-5): difficultyMultiplier 1.0 → 1.60, recommendedPower 300 → 700
 * - Silver (1-5): difficultyMultiplier 1.2 → 2.0,  recommendedPower 800 → 1200
 * - Gold (1-5):   difficultyMultiplier 1.4 → 2.2,  recommendedPower 1300 → 1700
 */

import { StageRuleConfig } from "../types/stageRuleTypes";
import { PEDAGOGY_BY_RULE_ID } from "./pedagogyByRuleId";

const DEFAULT_SOLO_SCORE_TIERS = [
    { minScore: 4000, rewardKey: "solo_s", chestType: "purple" },
    { minScore: 2500, rewardKey: "solo_a", chestType: "gold" },
    { minScore: 1000, rewardKey: "solo_b", chestType: "silver" },
    { minScore: 0, rewardKey: "solo_c", chestType: "bronze" },
];

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
        // P0：仅教移动/回合/普攻 —— 单人最低决策量
        teamPreset: {
            mode: "override",
            slots: [
                { monsterId: "monster_001", level: 3, stars: 2, q: 2, r: 1, unlockSkills: ["basic_attack"] },
            ],
        },
        rewardPolicy: {
            type: "one_time_clear",
            oneTimeRewardKey: "tutorial_bronze_boss_1",
        },
        uiRules: { hideTeamLayout: true },
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
            bossConfig: { bossId: "boss_bronze_1" },
            mapConfig: {
                mapSize: { rows: 7, cols: 8 },
                templateId: "template_bronze_basic",
            },
            difficultyAdjustment: {
                powerBasedScaling: false,  // 固定 Boss 数值
                difficultyMultiplier: 0.5,
            },
            bossOverrides: {
                baseHp: 500,
                baseDefense: 8,
                position: { q: 5, r: 1 },
            },
            playerOverrides: [
                { monsterId: "monster_001", hp: 1800, attack: 320, defense: 120, speed: 16 },
            ],
            summonTestTeamPreset: "default",
        },

        staminaCost: 6,
        recommendedPower: 300,
        // 教学首关强约束：尽快结束，降低首轮学习疲劳
        starRatingConfig: {
            threeStarMaxRounds: 4,
        },
        isVisible: true,
        sortOrder: 1,
    },

    // 关卡 2
    "monster_rumble_challenge_bronze_boss_2": {
        ruleId: "monster_rumble_challenge_bronze_boss_2",
        gameName: "tacticalMonster",
        teamPreset: {
            mode: "override",
            slots: [
                { monsterId: "monster_004", level: 1, stars: 1, q: 0, r: 0, unlockSkills: ["basic_attack", "shield"] },
                { monsterId: "monster_001", level: 1, stars: 1, q: 1, r: 2, unlockSkills: ["basic_attack", "griffin_claw_attack"] },
            ],
        },
        rewardPolicy: { type: "one_time_clear", oneTimeRewardKey: "tutorial_bronze_boss_2" },
        uiRules: { hideTeamLayout: true },
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
            bossConfig: { bossId: "boss_bronze_1" },
            mapConfig: {
                mapSize: { rows: 7, cols: 8 },
                templateId: "template_bronze_basic",
            },
            difficultyAdjustment: { powerBasedScaling: false, difficultyMultiplier: 0.6 },
        },
        staminaCost: 6,
        recommendedPower: 400,
        starRatingConfig: {
            threeStarMaxRounds: 6,
        },
        isVisible: true,
        sortOrder: 2,
    },

    // 关卡 3
    "monster_rumble_challenge_bronze_boss_3": {
        ruleId: "monster_rumble_challenge_bronze_boss_3",
        gameName: "tacticalMonster",
        teamPreset: {
            mode: "override",
            slots: [
                { monsterId: "monster_004", level: 1, stars: 1, q: 0, r: 0, unlockSkills: ["basic_attack", "shield"] },
                { monsterId: "monster_002", level: 1, stars: 1, q: 1, r: 2, unlockSkills: ["basic_attack", "ranged_attack", "dragon_breath"] },
                { monsterId: "monster_003", level: 1, stars: 1, q: 0, r: 3, unlockSkills: ["basic_attack", "chaos_strike"] },
            ],
        },
        rewardPolicy: { type: "one_time_clear", oneTimeRewardKey: "tutorial_bronze_boss_3" },
        uiRules: { hideTeamLayout: true },
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
            bossConfig: { bossId: "boss_bronze_2" },
            mapConfig: {
                mapSize: { rows: 7, cols: 8 },
                templateId: "template_bronze_basic",
            },
            difficultyAdjustment: { powerBasedScaling: false, difficultyMultiplier: 0.7 },
        },
        staminaCost: 6,
        recommendedPower: 500,
        starRatingConfig: {
            threeStarMaxRounds: 6,
        },
        isVisible: true,
        sortOrder: 3,
    },

    // 关卡 4
    "monster_rumble_challenge_bronze_boss_4": {
        ruleId: "monster_rumble_challenge_bronze_boss_4",
        gameName: "tacticalMonster",
        teamPreset: {
            mode: "override",
            slots: [
                { monsterId: "monster_004", level: 1, stars: 1, q: 0, r: 0, unlockSkills: ["basic_attack", "shield"] },
                { monsterId: "monster_005", level: 1, stars: 1, q: 1, r: 2, unlockSkills: ["basic_attack", "ranged_attack", "weaken"] },
                { monsterId: "monster_008", level: 1, stars: 1, q: 0, r: 3, unlockSkills: ["basic_attack", "heal"] },
            ],
        },
        rewardPolicy: { type: "one_time_clear", oneTimeRewardKey: "tutorial_bronze_boss_4" },
        uiRules: { hideTeamLayout: true },
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
            bossConfig: { bossId: "boss_bronze_2" },
            mapConfig: {
                mapSize: { rows: 7, cols: 8 },
                templateId: "template_bronze_basic",
            },
            difficultyAdjustment: { powerBasedScaling: false, difficultyMultiplier: 1.0 },
        },
        staminaCost: 6,
        recommendedPower: 600,
        starRatingConfig: {
            threeStarMaxRounds: 5,
        },
        isVisible: true,
        sortOrder: 4,
    },

    // 关卡 5（Bronze 线末关，通关解锁 Silver 1）
    "monster_rumble_challenge_bronze_boss_5": {
        ruleId: "monster_rumble_challenge_bronze_boss_5",
        gameName: "tacticalMonster",
        teamPreset: {
            mode: "override",
            slots: [
                { monsterId: "monster_004", level: 1, stars: 1, q: 0, r: 0, unlockSkills: ["basic_attack", "shield", "defense_boost"] },
                { monsterId: "monster_002", level: 1, stars: 1, q: 1, r: 2, unlockSkills: ["basic_attack", "ranged_attack", "dragon_breath"] },
                { monsterId: "monster_008", level: 1, stars: 1, q: 0, r: 3, unlockSkills: ["basic_attack", "heal", "defense_boost"] },
            ],
        },
        rewardPolicy: { type: "one_time_clear", oneTimeRewardKey: "tutorial_bronze_boss_5" },
        uiRules: { hideTeamLayout: true },
        stageType: "challenge",
        stageNumber: 5,
        stageChain: {
            chainId: "challenge_bronze",
            chainOrder: 5,
            previousLevels: ["monster_rumble_challenge_bronze_boss_4"],
            nextLevels: ["monster_rumble_challenge_silver_boss_1"],
            unlockMode: "sequential",
            autoUnlockNext: true,
        },
        stageContent: {
            bossConfig: { bossId: "boss_bronze_2" },
            mapConfig: {
                mapSize: { rows: 7, cols: 8 },
                templateId: "template_bronze_basic",
            },
            difficultyAdjustment: { powerBasedScaling: false, difficultyMultiplier: 1.1 },
        },
        staminaCost: 6,
        recommendedPower: 700,
        starRatingConfig: {
            threeStarMaxRounds: 5,
        },
        isVisible: true,
        sortOrder: 5,
    },

    // ============================================
    // Silver Tier 挑战关卡配置（5个顺序关卡）
    // ============================================
    "monster_rumble_challenge_silver_boss_1": {
        ruleId: "monster_rumble_challenge_silver_boss_1",
        gameName: "tacticalMonster",
        teamPreset: {
            mode: "override",
            slots: [
                { monsterId: "monster_004", level: 1, stars: 1, q: 0, r: 0, unlockSkills: ["basic_attack", "shield", "defense_boost"] },
                { monsterId: "monster_002", level: 1, stars: 1, q: 1, r: 2, unlockSkills: ["basic_attack", "ranged_attack", "dragon_breath"] },
                { monsterId: "monster_039", level: 1, stars: 1, q: 0, r: 3, unlockSkills: ["basic_attack", "ranged_attack"] },
            ],
        },
        rewardPolicy: { type: "one_time_clear", oneTimeRewardKey: "tutorial_silver_boss_1" },
        uiRules: { hideTeamLayout: true },
        stageType: "challenge",
        stageNumber: 1,
        stageChain: {
            chainId: "challenge_silver",
            chainOrder: 1,
            previousLevels: ["monster_rumble_challenge_bronze_boss_5"],
            nextLevels: ["monster_rumble_challenge_silver_boss_2"],
            unlockMode: "sequential",
            autoUnlockNext: true,
        },
        stageContent: {
            bossConfig: { bossId: "boss_silver_1" },
            mapConfig: {
                mapSize: { rows: 7, cols: 8 },
                templateId: "template_bronze_basic",
            },
            difficultyAdjustment: { powerBasedScaling: false, difficultyMultiplier: 0.95 },
        },
        staminaCost: 8,
        recommendedPower: 800,
        starRatingConfig: {
            threeStarMaxRounds: 5,
        },
        isVisible: true,
        sortOrder: 6,
    },
    "monster_rumble_challenge_silver_boss_2": {
        ruleId: "monster_rumble_challenge_silver_boss_2",
        gameName: "tacticalMonster",
        teamPreset: {
            mode: "override",
            slots: [
                { monsterId: "monster_004", level: 1, stars: 1, q: 0, r: 0, unlockSkills: ["basic_attack", "shield", "defense_boost"] },
                { monsterId: "monster_002", level: 1, stars: 1, q: 1, r: 2, unlockSkills: ["basic_attack", "ranged_attack", "dragon_breath"] },
                { monsterId: "monster_008", level: 1, stars: 1, q: 0, r: 3, unlockSkills: ["basic_attack", "heal", "attack_boost"] },
            ],
        },
        rewardPolicy: { type: "one_time_clear", oneTimeRewardKey: "tutorial_silver_boss_2" },
        uiRules: { hideTeamLayout: true },
        stageType: "challenge",
        stageNumber: 2,
        stageChain: {
            chainId: "challenge_silver",
            chainOrder: 2,
            previousLevels: ["monster_rumble_challenge_silver_boss_1"],
            nextLevels: ["monster_rumble_challenge_silver_boss_3"],
            unlockMode: "sequential",
            autoUnlockNext: true,
        },
        stageContent: {
            bossConfig: { bossId: "boss_silver_1" },
            mapConfig: {
                mapSize: { rows: 7, cols: 8 },
                templateId: "template_bronze_basic",
            },
            difficultyAdjustment: { powerBasedScaling: false, difficultyMultiplier: 1.0 },
        },
        staminaCost: 8,
        recommendedPower: 900,
        starRatingConfig: {
            threeStarMaxRounds: 5,
        },
        isVisible: true,
        sortOrder: 7,
    },
    "monster_rumble_challenge_silver_boss_3": {
        ruleId: "monster_rumble_challenge_silver_boss_3",
        gameName: "tacticalMonster",
        teamPreset: {
            mode: "override",
            slots: [
                { monsterId: "monster_004", level: 1, stars: 1, q: 0, r: 0, unlockSkills: ["basic_attack", "shield", "defense_boost"] },
                { monsterId: "monster_003", level: 1, stars: 1, q: 1, r: 2, unlockSkills: ["basic_attack", "chaos_strike"] },
                { monsterId: "monster_008", level: 1, stars: 1, q: 0, r: 3, unlockSkills: ["basic_attack", "heal", "attack_boost"] },
            ],
        },
        rewardPolicy: { type: "one_time_clear", oneTimeRewardKey: "tutorial_silver_boss_3" },
        uiRules: { hideTeamLayout: true },
        stageType: "challenge",
        stageNumber: 3,
        stageChain: {
            chainId: "challenge_silver",
            chainOrder: 3,
            previousLevels: ["monster_rumble_challenge_silver_boss_2"],
            nextLevels: ["monster_rumble_challenge_silver_boss_4"],
            unlockMode: "sequential",
            autoUnlockNext: true,
        },
        stageContent: {
            bossConfig: { bossId: "boss_silver_2" },
            mapConfig: {
                mapSize: { rows: 7, cols: 8 },
                templateId: "template_bronze_basic",
            },
            difficultyAdjustment: { powerBasedScaling: false, difficultyMultiplier: 1.1 },
        },
        staminaCost: 8,
        recommendedPower: 1000,
        starRatingConfig: {
            threeStarMaxRounds: 6,
        },
        isVisible: true,
        sortOrder: 8,
    },
    "monster_rumble_challenge_silver_boss_4": {
        ruleId: "monster_rumble_challenge_silver_boss_4",
        gameName: "tacticalMonster",
        teamPreset: {
            mode: "override",
            slots: [
                { monsterId: "monster_004", level: 1, stars: 1, q: 0, r: 0, unlockSkills: ["basic_attack", "shield", "defense_boost"] },
                { monsterId: "monster_002", level: 1, stars: 1, q: 1, r: 2, unlockSkills: ["basic_attack", "ranged_attack", "dragon_breath"] },
                { monsterId: "monster_008", level: 1, stars: 1, q: 0, r: 3, unlockSkills: ["basic_attack", "heal", "attack_boost"] },
            ],
        },
        rewardPolicy: { type: "one_time_clear", oneTimeRewardKey: "tutorial_silver_boss_4" },
        uiRules: { hideTeamLayout: true },
        stageType: "challenge",
        stageNumber: 4,
        stageChain: {
            chainId: "challenge_silver",
            chainOrder: 4,
            previousLevels: ["monster_rumble_challenge_silver_boss_3"],
            nextLevels: ["monster_rumble_challenge_silver_boss_5"],
            unlockMode: "sequential",
            autoUnlockNext: true,
        },
        stageContent: {
            bossConfig: { bossId: "boss_silver_2" },
            mapConfig: {
                mapSize: { rows: 7, cols: 8 },
                templateId: "template_bronze_basic",
            },
            difficultyAdjustment: { powerBasedScaling: false, difficultyMultiplier: 1.2 },
        },
        staminaCost: 8,
        recommendedPower: 1100,
        starRatingConfig: {
            threeStarMaxRounds: 6,
        },
        isVisible: true,
        sortOrder: 9,
    },
    "monster_rumble_challenge_silver_boss_5": {
        ruleId: "monster_rumble_challenge_silver_boss_5",
        gameName: "tacticalMonster",
        teamPreset: {
            mode: "override",
            slots: [
                { monsterId: "monster_004", level: 1, stars: 1, q: 0, r: 0, unlockSkills: ["basic_attack", "shield", "defense_boost"] },
                { monsterId: "monster_002", level: 1, stars: 1, q: 1, r: 2, unlockSkills: ["basic_attack", "ranged_attack", "dragon_breath"] },
                { monsterId: "monster_003", level: 1, stars: 1, q: 0, r: 3, unlockSkills: ["basic_attack", "chaos_strike"] },
                { monsterId: "monster_008", level: 1, stars: 1, q: 1, r: 5, unlockSkills: ["basic_attack", "heal", "attack_boost"] },
            ],
        },
        rewardPolicy: { type: "one_time_clear", oneTimeRewardKey: "tutorial_silver_boss_5" },
        uiRules: { hideTeamLayout: true },
        stageType: "challenge",
        stageNumber: 5,
        stageChain: {
            chainId: "challenge_silver",
            chainOrder: 5,
            previousLevels: ["monster_rumble_challenge_silver_boss_4"],
            nextLevels: ["monster_rumble_challenge_gold_boss_1"],
            unlockMode: "sequential",
            autoUnlockNext: true,
        },
        stageContent: {
            bossConfig: { bossId: "boss_silver_2" },
            mapConfig: {
                mapSize: { rows: 7, cols: 8 },
                templateId: "template_bronze_basic",
            },
            difficultyAdjustment: { powerBasedScaling: false, difficultyMultiplier: 1.3 },
        },
        staminaCost: 8,
        recommendedPower: 1200,
        starRatingConfig: {
            threeStarMaxRounds: 6,
        },
        isVisible: true,
        sortOrder: 10,
    },

    // ============================================
    // Gold Tier 挑战关卡配置（5个顺序关卡）
    // ============================================
    "monster_rumble_challenge_gold_boss_1": {
        ruleId: "monster_rumble_challenge_gold_boss_1",
        gameName: "tacticalMonster",
        teamPreset: {
            mode: "override",
            slots: [
                { monsterId: "monster_004", level: 1, stars: 1, q: 0, r: 0, unlockSkills: ["basic_attack", "shield", "defense_boost"] },
                { monsterId: "monster_005", level: 1, stars: 1, q: 1, r: 2, unlockSkills: ["basic_attack", "ranged_attack", "weaken"] },
                { monsterId: "monster_008", level: 1, stars: 1, q: 0, r: 3, unlockSkills: ["basic_attack", "heal", "defense_boost"] },
            ],
        },
        rewardPolicy: { type: "one_time_clear", oneTimeRewardKey: "tutorial_gold_boss_1" },
        uiRules: { hideTeamLayout: true },
        stageType: "challenge",
        stageNumber: 1,
        stageChain: {
            chainId: "challenge_gold",
            chainOrder: 1,
            previousLevels: ["monster_rumble_challenge_silver_boss_5"],
            nextLevels: ["monster_rumble_challenge_gold_boss_2"],
            unlockMode: "sequential",
            autoUnlockNext: true,
        },
        stageContent: {
            bossConfig: { bossId: "boss_gold_1" },
            mapConfig: {
                mapSize: { rows: 7, cols: 8 },
                templateId: "template_bronze_basic",
            },
            difficultyAdjustment: { powerBasedScaling: false, difficultyMultiplier: 1.1 },
        },
        staminaCost: 10,
        recommendedPower: 1300,
        starRatingConfig: {
            threeStarMaxRounds: 6,
        },
        isVisible: true,
        sortOrder: 11,
    },
    "monster_rumble_challenge_gold_boss_2": {
        ruleId: "monster_rumble_challenge_gold_boss_2",
        gameName: "tacticalMonster",
        teamPreset: {
            mode: "override",
            slots: [
                { monsterId: "monster_004", level: 1, stars: 1, q: 0, r: 0, unlockSkills: ["basic_attack", "shield", "defense_boost"] },
                { monsterId: "monster_002", level: 1, stars: 1, q: 1, r: 2, unlockSkills: ["basic_attack", "ranged_attack", "dragon_breath", "weaken"] },
                { monsterId: "monster_008", level: 1, stars: 1, q: 0, r: 3, unlockSkills: ["basic_attack", "heal", "group_heal", "cleanse", "defense_boost", "attack_boost"] },
            ],
        },
        rewardPolicy: { type: "one_time_clear", oneTimeRewardKey: "tutorial_gold_boss_2" },
        uiRules: { hideTeamLayout: true },
        stageType: "challenge",
        stageNumber: 2,
        stageChain: {
            chainId: "challenge_gold",
            chainOrder: 2,
            previousLevels: ["monster_rumble_challenge_gold_boss_1"],
            nextLevels: ["monster_rumble_challenge_gold_boss_3"],
            unlockMode: "sequential",
            autoUnlockNext: true,
        },
        stageContent: {
            bossConfig: { bossId: "boss_gold_1" },
            mapConfig: {
                mapSize: { rows: 7, cols: 8 },
                templateId: "template_bronze_basic",
            },
            difficultyAdjustment: { powerBasedScaling: false, difficultyMultiplier: 1.2 },
        },
        staminaCost: 10,
        recommendedPower: 1400,
        starRatingConfig: {
            threeStarMaxRounds: 6,
        },
        isVisible: true,
        sortOrder: 12,
    },
    "monster_rumble_challenge_gold_boss_3": {
        ruleId: "monster_rumble_challenge_gold_boss_3",
        gameName: "tacticalMonster",
        teamPreset: {
            mode: "override",
            slots: [
                { monsterId: "monster_004", level: 1, stars: 1, q: 0, r: 0, unlockSkills: ["basic_attack", "shield", "defense_boost"] },
                { monsterId: "monster_009", level: 1, stars: 1, q: 1, r: 2, unlockSkills: ["basic_attack", "shield", "defense_boost"] },
                { monsterId: "monster_006", level: 1, stars: 1, q: 0, r: 3, unlockSkills: ["basic_attack", "attack_boost", "combat_reflexes"] },
            ],
        },
        rewardPolicy: { type: "one_time_clear", oneTimeRewardKey: "tutorial_gold_boss_3" },
        uiRules: { hideTeamLayout: true },
        stageType: "challenge",
        stageNumber: 3,
        stageChain: {
            chainId: "challenge_gold",
            chainOrder: 3,
            previousLevels: ["monster_rumble_challenge_gold_boss_2"],
            nextLevels: ["monster_rumble_challenge_gold_boss_4"],
            unlockMode: "sequential",
            autoUnlockNext: true,
        },
        stageContent: {
            bossConfig: { bossId: "boss_gold_2" },
            mapConfig: {
                mapSize: { rows: 7, cols: 8 },
                templateId: "template_bronze_basic",
            },
            difficultyAdjustment: { powerBasedScaling: false, difficultyMultiplier: 1.3 },
        },
        staminaCost: 10,
        recommendedPower: 1500,
        starRatingConfig: {
            threeStarMaxRounds: 7,
        },
        isVisible: true,
        sortOrder: 13,
    },
    "monster_rumble_challenge_gold_boss_4": {
        ruleId: "monster_rumble_challenge_gold_boss_4",
        gameName: "tacticalMonster",
        teamPreset: {
            mode: "override",
            slots: [
                { monsterId: "monster_004", level: 1, stars: 1, q: 0, r: 0, unlockSkills: ["basic_attack", "shield", "defense_boost"] },
                { monsterId: "monster_003", level: 1, stars: 1, q: 1, r: 2, unlockSkills: ["basic_attack", "chaos_strike"] },
                { monsterId: "monster_008", level: 1, stars: 1, q: 0, r: 3, unlockSkills: ["basic_attack", "heal", "attack_boost"] },
            ],
        },
        rewardPolicy: { type: "one_time_clear", oneTimeRewardKey: "tutorial_gold_boss_4" },
        uiRules: { hideTeamLayout: true },
        stageType: "challenge",
        stageNumber: 4,
        stageChain: {
            chainId: "challenge_gold",
            chainOrder: 4,
            previousLevels: ["monster_rumble_challenge_gold_boss_3"],
            nextLevels: ["monster_rumble_challenge_gold_boss_5"],
            unlockMode: "sequential",
            autoUnlockNext: true,
        },
        stageContent: {
            bossConfig: { bossId: "boss_gold_2" },
            mapConfig: {
                mapSize: { rows: 7, cols: 8 },
                templateId: "template_bronze_basic",
            },
            difficultyAdjustment: { powerBasedScaling: false, difficultyMultiplier: 1.4 },
        },
        staminaCost: 10,
        recommendedPower: 1600,
        starRatingConfig: {
            threeStarMaxRounds: 7,
        },
        isVisible: true,
        sortOrder: 14,
    },
    "monster_rumble_challenge_gold_boss_5": {
        ruleId: "monster_rumble_challenge_gold_boss_5",
        gameName: "tacticalMonster",
        teamPreset: {
            mode: "override",
            slots: [
                { monsterId: "monster_004", level: 1, stars: 1, q: 0, r: 0, unlockSkills: ["basic_attack", "shield", "defense_boost"] },
                { monsterId: "monster_002", level: 1, stars: 1, q: 1, r: 2, unlockSkills: ["basic_attack", "ranged_attack", "dragon_breath"] },
                { monsterId: "monster_003", level: 1, stars: 1, q: 0, r: 3, unlockSkills: ["basic_attack", "chaos_strike"] },
                { monsterId: "monster_008", level: 1, stars: 1, q: 1, r: 5, unlockSkills: ["basic_attack", "heal", "attack_boost"] },
            ],
        },
        rewardPolicy: { type: "one_time_clear", oneTimeRewardKey: "tutorial_gold_boss_5" },
        uiRules: { hideTeamLayout: true },
        stageType: "challenge",
        stageNumber: 5,
        stageChain: {
            chainId: "challenge_gold",
            chainOrder: 5,
            previousLevels: ["monster_rumble_challenge_gold_boss_4"],
            unlockMode: "sequential",
            autoUnlockNext: false,
        },
        stageContent: {
            bossConfig: { bossId: "boss_gold_2" },
            mapConfig: {
                mapSize: { rows: 7, cols: 8 },
                templateId: "template_bronze_basic",
            },
            difficultyAdjustment: { powerBasedScaling: false, difficultyMultiplier: 1.5 },
        },
        staminaCost: 10,
        recommendedPower: 1700,
        starRatingConfig: {
            threeStarMaxRounds: 7,
        },
        isVisible: true,
        sortOrder: 15,
    },
    "monster_rumble_arena_bronze": {
        ruleId: "monster_rumble_arena_bronze",
        gameName: "tacticalMonster",
        teamPreset: { mode: "none", slots: [] },
        rewardPolicy: { type: "score_tiers", scoreTiers: [...DEFAULT_SOLO_SCORE_TIERS] },
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

    // ============================================
    // 材料本
    // ============================================
    "monster_rumble_farm_bronze_boss_1": {
        ruleId: "monster_rumble_farm_bronze_boss_1",
        gameName: "tacticalMonster",
        teamPreset: { mode: "none", slots: [] },
        rewardPolicy: { type: "score_tiers", scoreTiers: [...DEFAULT_SOLO_SCORE_TIERS] },
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

    // ============================================
    // 每日 Boss
    // ============================================
    "monster_rumble_daily_boss": {
        ruleId: "monster_rumble_daily_boss",
        gameName: "tacticalMonster",
        teamPreset: { mode: "none", slots: [] },
        rewardPolicy: { type: "score_tiers", scoreTiers: [...DEFAULT_SOLO_SCORE_TIERS] },
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

    // ============================================
    // 周常 Boss
    // ============================================
    "monster_rumble_weekly_boss": {
        ruleId: "monster_rumble_weekly_boss",
        gameName: "tacticalMonster",
        teamPreset: { mode: "none", slots: [] },
        rewardPolicy: { type: "score_tiers", scoreTiers: [...DEFAULT_SOLO_SCORE_TIERS] },
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
 * 获取关卡规则配置（合并 pedagogyByRuleId）
 */
export function getStageRuleConfig(ruleId: string): StageRuleConfig | undefined {
    const base = STAGE_RULE_CONFIGS[ruleId];
    if (!base) return undefined;
    const pedagogy = PEDAGOGY_BY_RULE_ID[ruleId];
    return pedagogy ? { ...base, pedagogy } : base;
}

