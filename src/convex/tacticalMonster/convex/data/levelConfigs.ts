/**
 * 关卡配置数据
 * 定义每个Tier+Boss组合的默认关卡配置
 * 这些配置会被存储到数据库中，但这里提供了默认模板
 */

import { TIER_CONFIGS } from "./tierConfigs";

/**
 * 默认关卡配置接口（简化版，实际存储在数据库中的是完整版本）
 */
export interface DefaultLevelConfig {
    tier: string;
    bossDifficulty: string;
    mapSize: { rows: number; cols: number };
    obstacleDensity: number;  // 障碍物密度 (0-1)
    playerZone: {
        minQ: number;
        maxQ: number;
        minR: number;
        maxR: number;
    };
    bossZone: {
        center: { q: number; r: number };
        radius: number;
    };
}

/**
 * 根据Tier和Boss难度生成默认关卡配置
 */
export function generateDefaultLevelConfig(
    tier: string,
    bossDifficulty: "easy" | "medium" | "hard" | "expert"
): DefaultLevelConfig {
    const tierConfig = TIER_CONFIGS[tier as keyof typeof TIER_CONFIGS];
    if (!tierConfig) {
        throw new Error(`Unknown tier: ${tier}`);
    }

    // 根据难度调整地图大小和障碍物密度
    const mapSizes: Record<string, { rows: number; cols: number }> = {
        easy: { rows: 10, cols: 10 },
        medium: { rows: 12, cols: 12 },
        hard: { rows: 14, cols: 14 },
        expert: { rows: 16, cols: 16 },
    };

    const obstacleDensities: Record<string, number> = {
        easy: 0.15,
        medium: 0.20,
        hard: 0.25,
        expert: 0.30,
    };

    const mapSize = mapSizes[bossDifficulty] || mapSizes.easy;
    const obstacleDensity = obstacleDensities[bossDifficulty] || 0.15;

    // 玩家区域通常在左下角
    const playerZone = {
        minQ: 0,
        maxQ: Math.floor(mapSize.cols * 0.4),
        minR: Math.floor(mapSize.rows * 0.6),
        maxR: mapSize.rows - 1,
    };

    // Boss区域通常在右上角或中心
    const bossZone = {
        center: {
            q: Math.floor(mapSize.cols * 0.7),
            r: Math.floor(mapSize.rows * 0.3),
        },
        radius: 2,
    };

    return {
        tier,
        bossDifficulty,
        mapSize,
        obstacleDensity,
        playerZone,
        bossZone,
    };
}

/**
 * 转换为数据库存储格式
 */
export function toDatabaseLevelConfig(
    levelId: string,
    tier: string,
    bossId: string,
    defaultConfig: DefaultLevelConfig
): any {
    return {
        levelId,
        tier,
        bossId,
        mapGeneration: {
            mapSize: defaultConfig.mapSize,
            generationType: "template",  // 使用模板+随机方式
            templateId: undefined,  // 将在运行时选择
            obstacleRules: {
                minObstacles: Math.floor(
                    defaultConfig.mapSize.rows * defaultConfig.mapSize.cols * defaultConfig.obstacleDensity * 0.8
                ),
                maxObstacles: Math.floor(
                    defaultConfig.mapSize.rows * defaultConfig.mapSize.cols * defaultConfig.obstacleDensity * 1.2
                ),
                obstacleTypes: ["rock", "tree", "wall"],
                spawnZones: [
                    {
                        type: "exclude",
                        region: defaultConfig.playerZone,
                    },
                    {
                        type: "exclude",
                        region: {
                            minQ: defaultConfig.bossZone.center.q - defaultConfig.bossZone.radius - 1,
                            maxQ: defaultConfig.bossZone.center.q + defaultConfig.bossZone.radius + 1,
                            minR: defaultConfig.bossZone.center.r - defaultConfig.bossZone.radius - 1,
                            maxR: defaultConfig.bossZone.center.r + defaultConfig.bossZone.radius + 1,
                        },
                    },
                ],
            },
            templateAdjustment: {
                adjustmentRatio: 0.15,  // 15%的障碍物可以调整
                preserveCoreObstacles: true,
            },
        },
        positionConfig: {
            bossZone: defaultConfig.bossZone,
            playerZone: {
                region: defaultConfig.playerZone,
            },
        },
        configVersion: 1,
    };
}
