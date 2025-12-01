/**
 * 任务经验计算
 * 纯函数，不依赖数据库或上下文
 */

import { ExpRewardConfig, DEFAULT_EXP_REWARD_CONFIG } from "../config/expRewardConfig";

/**
 * 计算任务经验值
 * @param taskType 任务类型：daily, weekly, achievement
 * @param taskDifficulty 任务难度：easy, medium, hard
 * @param taskRewardValue 任务奖励价值（金币等），用于计算价值加成
 * @param config 经验值配置（可选，默认使用 DEFAULT_EXP_REWARD_CONFIG）
 * @returns 计算得到的经验值
 */
export function calculateTaskExp(
    taskType: "daily" | "weekly" | "achievement",
    taskDifficulty: "easy" | "medium" | "hard" = "medium",
    taskRewardValue: number = 0,
    config: ExpRewardConfig = DEFAULT_EXP_REWARD_CONFIG
): number {
    const taskConfig = config.taskExp[taskType];
    
    // 1. 基础经验
    let baseExp = taskConfig.base;
    
    // 2. 难度倍数
    const difficultyMultiplier = taskConfig.difficultyMultiplier[taskDifficulty] || 1.0;
    baseExp = Math.floor(baseExp * difficultyMultiplier);
    
    // 3. 奖励价值加成（每100金币价值+10经验）
    const valueBonus = Math.floor(taskRewardValue / 100) * taskConfig.valueBonusRate;
    
    const finalExp = baseExp + valueBonus;
    
    return Math.max(0, finalExp);
}

