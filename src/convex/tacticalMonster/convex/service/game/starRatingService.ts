/**
 * 星级评定服务（关卡体力与奖励机制设计）
 * 根据过关表现计算星级，用于奖励倍率
 */

import { getStageRuleConfig } from "../../data/stageRuleConfigs";
import { CharacterSurvivalStats } from "./sharedScoreService";

/**
 * 计算过关星级（1-3）
 * @param ruleId 关卡规则ID
 * @param survivalStats 存活统计
 * @param roundsUsed 使用的回合数
 * @param isWin 是否胜利
 */
export function computeStarRating(
    ruleId: string,
    survivalStats: CharacterSurvivalStats,
    roundsUsed: number,
    isWin: boolean
): 1 | 2 | 3 {
    if (!isWin) return 1;

    const config = getStageRuleConfig(ruleId);
    const starConfig = config?.starRatingConfig ?? {};
    const threeStarMaxRounds = starConfig.threeStarMaxRounds ?? 999;
    const twoStarMinSurvivors = starConfig.twoStarMinSurvivors ?? 1;

    // 3 星：全员存活 且 回合数 <= 阈值
    if (
        survivalStats.perfectSurvival &&
        roundsUsed <= threeStarMaxRounds
    ) {
        return 3;
    }

    // 2 星：存活数 >= 2星阈值
    if (survivalStats.aliveCharacters >= twoStarMinSurvivors) {
        return 2;
    }

    // 1 星：勉强通关
    return 1;
}

/**
 * 获取星级对应的奖励倍率
 */
export function getStarRewardMultiplier(
    ruleId: string,
    star: 1 | 2 | 3
): number {
    const config = getStageRuleConfig(ruleId);
    const mult = config?.starRewardMultipliers?.[star];
    if (mult !== undefined) return mult;
    const defaults: Record<1 | 2 | 3, number> = {
        1: 0.6,
        2: 0.8,
        3: 1.0,
    };
    return defaults[star];
}
