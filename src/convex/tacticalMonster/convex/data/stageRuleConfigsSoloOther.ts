import { StageRuleConfig } from "../types/stageRuleTypes";
import { DEFAULT_SOLO_SCORE_TIERS } from "./stageRuleConstants";

/**
 * Solo 向非 Lab 关卡：材料本、每日、周常（与 `stageRuleConfigsSoloChallenge` 中 **测试用** Solo Lab 链拆分）。
 */
export const STAGE_RULE_CONFIGS_SOLO_OTHER: Record<string, StageRuleConfig> = {
    "monster_rumble_farm_bronze_boss_1": {
        ruleId: "monster_rumble_farm_bronze_boss_1",
        gameName: "tacticalMonster",
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

    "monster_rumble_daily_boss": {
        ruleId: "monster_rumble_daily_boss",
        gameName: "tacticalMonster",
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

    "monster_rumble_weekly_boss": {
        ruleId: "monster_rumble_weekly_boss",
        gameName: "tacticalMonster",
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
