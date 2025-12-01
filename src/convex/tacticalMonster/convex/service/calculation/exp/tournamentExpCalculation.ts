/**
 * 锦标赛经验计算
 * 纯函数，不依赖数据库或上下文
 */

import { ExpRewardConfig, DEFAULT_EXP_REWARD_CONFIG } from "../config/expRewardConfig";

/**
 * 计算锦标赛经验值
 * @param rank 排名（1-based）
 * @param totalParticipants 总参与人数
 * @param tier 锦标赛Tier：bronze, silver, gold, platinum
 * @param config 经验值配置（可选，默认使用 DEFAULT_EXP_REWARD_CONFIG）
 * @returns 计算得到的经验值
 */
export function calculateTournamentExp(
    rank: number,
    totalParticipants: number,
    tier: string = "bronze",
    config: ExpRewardConfig = DEFAULT_EXP_REWARD_CONFIG
): number {
    // 1. 参与奖励
    let baseExp = config.tournamentExp.participation;
    
    // 2. 排名奖励
    let rankBonus = 0;
    
    // 根据排名范围查找奖励
    const rankRewards = config.tournamentExp.rankRewards;
    
    if (rank === 1) {
        rankBonus = rankRewards["1-1"] || 0;
    } else if (rank >= 2 && rank <= 3) {
        rankBonus = rankRewards["2-3"] || 0;
    } else if (rank >= 4 && rank <= 10) {
        rankBonus = rankRewards["4-10"] || 0;
    } else if (rank >= 11 && rank <= 50) {
        rankBonus = rankRewards["11-50"] || 0;
    } else {
        rankBonus = rankRewards["51+"] || 0;
    }
    
    baseExp += rankBonus;
    
    // 3. Tier加成
    const tierMultiplier = config.tournamentExp.tierMultiplier[tier as keyof typeof config.tournamentExp.tierMultiplier] || 1.0;
    
    const finalExp = Math.floor(baseExp * tierMultiplier);
    
    return Math.max(0, finalExp);
}

/**
 * 获取排名范围字符串
 * @param rank 排名
 * @returns 排名范围字符串，如 "1-1", "2-3", "4-10" 等
 */
export function getRankRange(rank: number): string {
    if (rank === 1) return "1-1";
    if (rank >= 2 && rank <= 3) return "2-3";
    if (rank >= 4 && rank <= 10) return "4-10";
    if (rank >= 11 && rank <= 50) return "11-50";
    return "51+";
}

