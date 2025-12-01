/**
 * 活动经验计算
 * 纯函数，不依赖数据库或上下文
 */

import { ExpRewardConfig, DEFAULT_EXP_REWARD_CONFIG } from "../config/expRewardConfig";

/**
 * 计算活动经验值
 * @param activityMultiplier 活动倍数（1.0-2.0）
 * @param config 经验值配置（可选，默认使用 DEFAULT_EXP_REWARD_CONFIG）
 * @returns 计算得到的经验值
 */
export function calculateActivityExp(
    activityMultiplier: number = 1.0,
    config: ExpRewardConfig = DEFAULT_EXP_REWARD_CONFIG
): number {
    const baseExp = config.activityExp.base;
    const multiplier = Math.max(1.0, Math.min(2.0, activityMultiplier)); // 限制在1.0-2.0之间
    
    const finalExp = Math.floor(baseExp * multiplier);
    
    return Math.max(0, finalExp);
}

