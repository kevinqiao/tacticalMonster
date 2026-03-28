/**
 * 关卡规则配置服务
 * 提供 StageRuleConfig 的查询和访问接口
 */

import { StageRuleConfig, getStageRuleConfig } from "../../data/stageRuleConfigs";

export class GameRuleConfigService {
    /**
     * 获取关卡规则配置
     */
    static getGameRuleConfig(ruleId: string): StageRuleConfig | undefined {
        return getStageRuleConfig(ruleId);
    }

    /**
     * 获取关卡规则配置（合并仿真 override）
     * 当 mr_stage_simulation_overrides 存在 approved 记录时，用 suggestedRecommendedPower、suggestedDifficultyMultiplier 覆盖
     */
    static async getGameRuleConfigWithOverrides(ctx: { db: { query: (table: string) => any } }, ruleId: string): Promise<StageRuleConfig | undefined> {
        const base = getStageRuleConfig(ruleId);
        if (!base) return undefined;

        const override = await ctx.db
            .query("mr_stage_simulation_overrides")
            .withIndex("by_ruleId", (q: any) => q.eq("ruleId", ruleId))
            .first();

        if (!override || override.status !== "approved") return base;

        const merged = JSON.parse(JSON.stringify(base)) as StageRuleConfig;

        if (override.suggestedRecommendedPower != null) {
            merged.recommendedPower = override.suggestedRecommendedPower;
        }
        if (override.suggestedDifficultyMultiplier != null && merged.stageContent?.difficultyAdjustment) {
            merged.stageContent = {
                ...merged.stageContent,
                difficultyAdjustment: {
                    ...merged.stageContent.difficultyAdjustment,
                    difficultyMultiplier: override.suggestedDifficultyMultiplier,
                },
            };
        }

        return merged;
    }

}

