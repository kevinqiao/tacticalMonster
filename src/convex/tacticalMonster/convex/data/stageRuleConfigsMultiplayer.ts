import { StageRuleConfig } from "../types/stageRuleTypes";
import { DEFAULT_SOLO_SCORE_TIERS } from "./stageRuleConstants";

/** 多人 / 竞技场 */
export const STAGE_RULE_CONFIGS_MULTIPLAYER: Record<string, StageRuleConfig> = {
    "monster_rumble_arena_bronze": {
        ruleId: "monster_rumble_arena_bronze",
        gameName: "tacticalMonster",
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
};
