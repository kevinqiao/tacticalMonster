/**
 * 关卡规则配置服务
 * 提供 StageRuleConfig 的查询和访问接口
 */

import { ChestTypeWeights, StageRuleConfig, getChestTypeWeights, getStageRuleConfig } from "../../data/stageRuleConfigs";

export class GameRuleConfigService {
    /**
     * 获取关卡规则配置
     */
    static getGameRuleConfig(ruleId: string): StageRuleConfig | undefined {
        return getStageRuleConfig(ruleId);
    }

    /**
     * 获取宝箱类型权重配置
     * @param ruleId 规则ID
     * @param tier Tier（可选，用于后备默认配置）
     * @returns 宝箱类型权重配置
     */
    static getChestTypeWeights(ruleId: string, tier?: string): ChestTypeWeights {
        return getChestTypeWeights(ruleId, tier);
    }

    /**
     * 验证宝箱类型权重配置
     * 确保权重总和接近 1.0（允许一定误差）
     */
    static validateChestTypeWeights(weights: ChestTypeWeights): { valid: boolean; error?: string } {
        const sum = (weights.silver || 0) +
            (weights.gold || 0) +
            (weights.purple || 0) +
            (weights.orange || 0);

        // 允许 0.99 - 1.01 的误差范围
        if (sum < 0.99 || sum > 1.01) {
            return {
                valid: false,
                error: `宝箱类型权重总和应为 1.0，当前为 ${sum.toFixed(3)}`
            };
        }

        return { valid: true };
    }
}

