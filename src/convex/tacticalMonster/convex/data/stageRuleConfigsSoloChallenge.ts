import { StageRuleConfig } from "../types/stageRuleTypes";
import { DEFAULT_SOLO_SCORE_TIERS } from "./stageRuleConstants";

/**
 * Solo Lab 系列（Solo Challenge 子集）：默认玩家自编队伍（不写 teamPreset）。
 * 可选 `debugTeamProfileKey` 指向 `soloDebugTeamProfiles`。
 * 材料本 / 每日 / 周常见 `stageRuleConfigsSoloOther.ts`。
 */
export const STAGE_RULE_CONFIGS_SOLO_CHALLENGE: Record<string, StageRuleConfig> = {
    "monster_rumble_solo_lab_1": {
        ruleId: "monster_rumble_solo_lab_1",
        gameName: "tacticalMonster",
        // debugTeamProfileKey: "default",
        rewardPolicy: { type: "score_tiers", scoreTiers: [...DEFAULT_SOLO_SCORE_TIERS] },
        stageType: "challenge",
        stageChain: {
            chainId: "solo_lab",
            chainOrder: 1,
            previousLevels: [],
            unlockMode: "sequential",
            autoUnlockNext: true,
            nextLevels: ["monster_rumble_solo_lab_2"],
        },
        stageContent: {
            bossConfig: { bossId: "boss_bronze_1" },
            mapConfig: { mapSize: { rows: 7, cols: 8 }, templateId: "template_bronze_basic" },
            difficultyAdjustment: {
                powerBasedScaling: true,
                difficultyMultiplier: 1.0,
                minMultiplier: 0.5,
                maxMultiplier: 2.0,
            },
        },
        staminaCost: 6,
        isVisible: true,
        sortOrder: 200,
    },
    "monster_rumble_solo_lab_2": {
        ruleId: "monster_rumble_solo_lab_2",
        gameName: "tacticalMonster",
        debugTeamProfileKey: "default",
        rewardPolicy: { type: "score_tiers", scoreTiers: [...DEFAULT_SOLO_SCORE_TIERS] },
        stageType: "challenge",
        stageChain: {
            chainId: "solo_lab",
            chainOrder: 2,
            previousLevels: ["monster_rumble_solo_lab_1"],
            unlockMode: "sequential",
            autoUnlockNext: true,
            nextLevels: ["monster_rumble_solo_lab_3"],
        },
        stageContent: {
            bossConfig: { bossId: "boss_bronze_1" },
            mapConfig: { mapSize: { rows: 7, cols: 8 }, templateId: "template_bronze_basic" },
            difficultyAdjustment: {
                powerBasedScaling: true,
                difficultyMultiplier: 1.1,
                minMultiplier: 0.5,
                maxMultiplier: 2.0,
            },
        },
        staminaCost: 6,
        isVisible: true,
        sortOrder: 201,
    },
    "monster_rumble_solo_lab_3": {
        ruleId: "monster_rumble_solo_lab_3",
        gameName: "tacticalMonster",
        debugTeamProfileKey: "default",
        rewardPolicy: { type: "score_tiers", scoreTiers: [...DEFAULT_SOLO_SCORE_TIERS] },
        stageType: "challenge",
        stageChain: {
            chainId: "solo_lab",
            chainOrder: 3,
            previousLevels: ["monster_rumble_solo_lab_2"],
            unlockMode: "sequential",
            autoUnlockNext: true,
            nextLevels: ["monster_rumble_solo_lab_4"],
        },
        stageContent: {
            bossConfig: { bossId: "boss_silver_1" },
            mapConfig: { mapSize: { rows: 7, cols: 8 }, templateId: "template_bronze_basic" },
            difficultyAdjustment: {
                powerBasedScaling: true,
                difficultyMultiplier: 1.15,
                minMultiplier: 0.5,
                maxMultiplier: 2.0,
            },
        },
        staminaCost: 8,
        isVisible: true,
        sortOrder: 202,
    },
    "monster_rumble_solo_lab_4": {
        ruleId: "monster_rumble_solo_lab_4",
        gameName: "tacticalMonster",
        debugTeamProfileKey: "default",
        rewardPolicy: { type: "score_tiers", scoreTiers: [...DEFAULT_SOLO_SCORE_TIERS] },
        stageType: "challenge",
        stageChain: {
            chainId: "solo_lab",
            chainOrder: 4,
            previousLevels: ["monster_rumble_solo_lab_3"],
            unlockMode: "sequential",
            autoUnlockNext: true,
            nextLevels: ["monster_rumble_solo_lab_5"],
        },
        stageContent: {
            bossConfig: { bossId: "boss_silver_1" },
            mapConfig: { mapSize: { rows: 7, cols: 8 }, templateId: "template_bronze_basic" },
            difficultyAdjustment: {
                powerBasedScaling: true,
                difficultyMultiplier: 1.25,
                minMultiplier: 0.5,
                maxMultiplier: 2.0,
            },
        },
        staminaCost: 8,
        isVisible: true,
        sortOrder: 203,
    },
    "monster_rumble_solo_lab_5": {
        ruleId: "monster_rumble_solo_lab_5",
        gameName: "tacticalMonster",
        debugTeamProfileKey: "default",
        rewardPolicy: { type: "score_tiers", scoreTiers: [...DEFAULT_SOLO_SCORE_TIERS] },
        stageType: "challenge",
        stageChain: {
            chainId: "solo_lab",
            chainOrder: 5,
            previousLevels: ["monster_rumble_solo_lab_4"],
            unlockMode: "sequential",
            autoUnlockNext: false,
        },
        stageContent: {
            bossConfig: { bossId: "boss_gold_1" },
            mapConfig: { mapSize: { rows: 7, cols: 8 }, templateId: "template_bronze_basic" },
            difficultyAdjustment: {
                powerBasedScaling: true,
                difficultyMultiplier: 1.35,
                minMultiplier: 0.5,
                maxMultiplier: 2.0,
            },
        },
        staminaCost: 10,
        isVisible: true,
        sortOrder: 204,
    },
};
