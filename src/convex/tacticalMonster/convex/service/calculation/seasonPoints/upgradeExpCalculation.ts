/**
 * 升级和升星赛季积分计算
 * 纯函数，不依赖数据库或上下文
 */

import { SeasonPointsConfig, DEFAULT_SEASON_POINTS_CONFIG } from "../config/seasonPointsConfig";

/**
 * 计算怪物升级积分
 * @param rarity 怪物稀有度：Common, Rare, Epic, Legendary
 * @param level 升级后的等级
 * @param previousLevel 升级前的等级（可选，用于计算等级增长）
 * @param config 赛季积分配置（可选，默认使用 DEFAULT_SEASON_POINTS_CONFIG）
 * @returns 计算得到的赛季积分
 */
export function calculateUpgradePoints(
    rarity: string,
    level: number,
    previousLevel: number = 0,
    config: SeasonPointsConfig = DEFAULT_SEASON_POINTS_CONFIG
): number {
    // 1. 稀有度基础分
    const rarityBase = config.upgradeExp.rarityBase[rarity as keyof typeof config.upgradeExp.rarityBase] || 5;
    
    // 2. 等级增长奖励（如果有previousLevel）
    let levelBonus = 0;
    if (previousLevel > 0) {
        const levelDiff = level - previousLevel;
        
        if (level <= 20) {
            // 低等级：每级+2分
            levelBonus = levelDiff * 2;
        } else if (level <= 40) {
            // 中等级：每级+3分
            levelBonus = levelDiff * 3;
        } else {
            // 高等级：每级+5分（鼓励高等级培养）
            levelBonus = levelDiff * 5;
        }
    }
    
    // 3. 里程碑奖励（每10级额外奖励）
    const milestoneBonus = Math.floor(level / 10) * config.upgradeExp.levelBonus.per10Levels;
    
    return rarityBase + levelBonus + milestoneBonus;
}

/**
 * 计算怪物升星积分
 * @param rarity 怪物稀有度：Common, Rare, Epic, Legendary
 * @param stars 升星后的星级
 * @param config 赛季积分配置（可选，默认使用 DEFAULT_SEASON_POINTS_CONFIG）
 * @returns 计算得到的赛季积分
 */
export function calculateStarUpPoints(
    rarity: string,
    stars: number,
    config: SeasonPointsConfig = DEFAULT_SEASON_POINTS_CONFIG
): number {
    // 1. 稀有度基础分
    const rarityBase = config.starUpExp.rarityBase[rarity as keyof typeof config.starUpExp.rarityBase] || 20;
    
    // 2. 星级倍数（如果启用）
    let starMultiplier = 1;
    if (config.starUpExp.starMultiplier) {
        starMultiplier = stars;
    }
    
    // 3. 高星级额外奖励（5星及以上）
    let highStarBonus = 0;
    if (stars >= config.starUpExp.highStarBonus.threshold) {
        highStarBonus = (stars - config.starUpExp.highStarBonus.threshold + 1) * config.starUpExp.highStarBonus.bonusPerStar;
    }
    
    return (rarityBase * starMultiplier) + highStarBonus;
}

/**
 * 计算宝箱开启积分
 * @param chestType 宝箱类型：silver, gold, purple, orange
 * @param config 赛季积分配置（可选，默认使用 DEFAULT_SEASON_POINTS_CONFIG）
 * @returns 计算得到的赛季积分
 */
export function calculateChestPoints(
    chestType: string,
    config: SeasonPointsConfig = DEFAULT_SEASON_POINTS_CONFIG
): number {
    const chestPoints = config.chestExp.chestPoints[chestType as keyof typeof config.chestExp.chestPoints];
    return chestPoints || 10; // 默认10分
}

/**
 * 计算 Boss 击败积分
 * @param bossDifficulty Boss难度：easy, medium, hard, expert
 * @param config 赛季积分配置（可选，默认使用 DEFAULT_SEASON_POINTS_CONFIG）
 * @returns 计算得到的赛季积分
 */
export function calculateBossDefeatPoints(
    bossDifficulty: string,
    config: SeasonPointsConfig = DEFAULT_SEASON_POINTS_CONFIG
): number {
    const difficultyPoints = config.bossExp.difficultyPoints[bossDifficulty as keyof typeof config.bossExp.difficultyPoints];
    return difficultyPoints || 30; // 默认30分
}

