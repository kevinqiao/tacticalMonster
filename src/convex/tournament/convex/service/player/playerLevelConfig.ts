/**
 * 玩家等级配置
 * 定义等级上限、经验值公式等配置
 */

/**
 * 玩家等级配置接口
 */
export interface PlayerLevelConfig {
    maxLevel: number; // 最大等级
    baseExp: number; // 基础经验值
    expGrowthFactor: number; // 经验增长因子（等级^factor）
}

/**
 * 默认玩家等级配置
 */
export const DEFAULT_PLAYER_LEVEL_CONFIG: PlayerLevelConfig = {
    maxLevel: 100, // 最大等级100
    baseExp: 100, // 基础经验值
    expGrowthFactor: 1.5, // 等级^1.5
};

