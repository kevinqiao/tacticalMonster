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

export type { StageRuleConfig } from "../types/stageRuleTypes";
import { STAGE_RULE_CONFIGS_MULTIPLAYER } from "./stageRuleConfigsMultiplayer";
import { STAGE_RULE_CONFIGS_SOLO_CHALLENGE } from "./stageRuleConfigsSoloChallenge";
import { STAGE_RULE_CONFIGS_SOLO_OTHER } from "./stageRuleConfigsSoloOther";
import { STAGE_RULE_CONFIGS_TUTORIAL } from "./stageRuleConfigsTutorial";

function mergeStageRuleRecords(
    ...parts: Record<string, StageRuleConfig>[]
): Record<string, StageRuleConfig> {
    const out: Record<string, StageRuleConfig> = {};
    for (const p of parts) {
        for (const k of Object.keys(p)) {
            if (Object.prototype.hasOwnProperty.call(out, k)) {
                throw new Error(`[stageRuleConfigs] Duplicate ruleId: ${k}`);
            }
            out[k] = p[k];
        }
    }
    return out;
}

/**
 * 关卡规则配置集合
 * 通过 ruleId 查询对应的配置
 *
 * 注意：
 * - 配置需要手动添加静态配置
 * - 不再支持自动生成
 */
export const STAGE_RULE_CONFIGS: Record<string, StageRuleConfig> = mergeStageRuleRecords(
    STAGE_RULE_CONFIGS_TUTORIAL,
    STAGE_RULE_CONFIGS_SOLO_CHALLENGE,
    STAGE_RULE_CONFIGS_SOLO_OTHER,
    STAGE_RULE_CONFIGS_MULTIPLAYER,
);

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
