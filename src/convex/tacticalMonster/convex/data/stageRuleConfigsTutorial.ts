import { StageRuleConfig } from "../types/stageRuleTypes";

/** 教学链：Bronze / Silver / Gold challenge bosses（与 tournament tutorial 对齐） */
export const STAGE_RULE_CONFIGS_TUTORIAL: Record<string, StageRuleConfig> = {
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
                { monsterId: "monster_001", level: 1, stars: 1, q: 1, r: 2, unlockSkills: ["basic_attack", "griffin_claw_attack"] },
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
            bossConfig: { bossId: "boss_bronze_1" },
            mapConfig: {
                mapSize: { rows: 7, cols: 8 },
                templateId: "template_bronze_basic",
            },
            difficultyAdjustment: {
                powerBasedScaling: true,
                difficultyMultiplier: 0.7,
                minMultiplier: 0.5,
                maxMultiplier: 2.0,
            },
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
};
