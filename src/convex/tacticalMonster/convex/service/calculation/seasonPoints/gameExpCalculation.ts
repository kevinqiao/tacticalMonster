/**
 * 游戏完成赛季积分计算
 * 纯函数，不依赖数据库或上下文
 */

import { SeasonPointsConfig, DEFAULT_SEASON_POINTS_CONFIG } from "../config/seasonPointsConfig";

/**
 * 计算 Monster Rumble 积分
 * @param rank 排名（1-based）
 * @param score 游戏分数
 * @param tier 游戏Tier：bronze, silver, gold, platinum
 * @param config 赛季积分配置（可选，默认使用 DEFAULT_SEASON_POINTS_CONFIG）
 * @returns 计算得到的赛季积分
 */
export function calculateMonsterRumblePoints(
    rank: number,
    score: number,
    tier: string,
    config: SeasonPointsConfig = DEFAULT_SEASON_POINTS_CONFIG
): number {
    // 1. 排名基础分
    let basePoints = 0;
    
    // 查找排名对应的基础分
    const rankBasePoints = config.gameExp.rankBasePoints;
    
    // 直接查找排名
    if (rankBasePoints[rank] !== undefined) {
        basePoints = rankBasePoints[rank];
    } else {
        // 使用默认值（排名10以后）
        basePoints = 20;
    }
    
    // 2. Tier加成
    const tierMultiplier = config.gameExp.tierMultiplier[tier as keyof typeof config.gameExp.tierMultiplier] || 1.0;
    basePoints = Math.floor(basePoints * tierMultiplier);
    
    // 3. 分数加成（可选，如果提供了分数）
    if (score !== undefined && score > 0) {
        if (score >= 90) {
            basePoints = Math.floor(basePoints * config.gameExp.scoreMultiplier.excellent);
        } else if (score >= 80) {
            basePoints = Math.floor(basePoints * config.gameExp.scoreMultiplier.good);
        }
    }
    
    return Math.max(0, basePoints);
}

