/**
 * 地图生成服务
 * 处理地图和障碍物的生成逻辑
 */

import { getMapTemplateConfig } from "../../data/mapTemplateConfigs";
import { HexCoord, isInRegion } from "../../utils/hexUtils";
import { SeededRandom } from "../../utils/seededRandom";
import { ObstacleUtils } from "../../utils/obstacleUtils";

export class MapGenerationService {
    /**
     * 生成地图数据（包含Boss位置验证）
     * 
     * 流程：
     * 1. 如果有 mapConfig.templateId，尝试从 mapTemplateConfigs.ts 获取模板配置生成地图
     * 2. 如果没有 templateId 或生成失败，根据 boss 参数随机创建新地图
     * 3. 生成过程中确保 Boss 和小怪位置与障碍物不冲突
     */
    static async generateMapWithBossValidation(params: {
        mapConfig?: {
            mapSize?: { rows: number; cols: number };
            templateId?: string;
        };
        bossConfig: any;
        bossId: string;
        seed?: string;
    }): Promise<any> {
        const { mapConfig, bossConfig, seed } = params;
        const rng = new SeededRandom(seed || `map_${Date.now()}`);

        if (!mapConfig?.mapSize) {
            return null;
        }

        // 1. 提取所有 Boss 和小怪的位置
        const allBossPositions: HexCoord[] = [];

        // 添加 Boss 本体位置（如果配置中有）
        if (bossConfig.position) {
            allBossPositions.push({
                q: bossConfig.position.q,
                r: bossConfig.position.r,
            });
        }

        // 添加所有小怪位置（如果配置中有）
        if (bossConfig.minions && Array.isArray(bossConfig.minions)) {
            for (const minion of bossConfig.minions) {
                if (minion.position) {
                    allBossPositions.push({
                        q: minion.position.q,
                        r: minion.position.r,
                    });
                }
            }
        }

        // 2. 确定地图大小（优先使用mapConfig，否则根据Boss难度）
        let mapSize: { rows: number; cols: number } = mapConfig.mapSize;

        // 3. 尝试使用模板生成地图
        let obstacles: any[] = [];
        let mapGenerationSuccess = false;
        if (mapConfig.templateId) {
            const templateConfig = getMapTemplateConfig(mapConfig.templateId);

            if (templateConfig) {
                try {
                    // 使用模板的地图大小
                    mapSize = templateConfig.mapSize;

                    // 使用模板+随机方式生成地图
                    obstacles = this.generateMapFromTemplateConfig(
                        templateConfig,
                        allBossPositions,
                        rng
                    );

                    // 验证Boss位置与障碍物不冲突（生成时已处理，这里再次验证）
                    const hasConflict = this.checkBossPositionConflicts(
                        allBossPositions,
                        obstacles
                    );

                    if (!hasConflict) {
                        mapGenerationSuccess = true;
                    }
                } catch (error) {
                    console.warn(`使用模板 ${mapConfig.templateId} 生成地图失败:`, error);
                }
            }
        }

        // 4. 如果模板生成失败，使用随机生成
        if (!mapGenerationSuccess) {
            // 使用之前确定的地图大小
            // 随机生成地图，确保Boss位置不冲突
            obstacles = this.generateRandomMapWithBossAvoidance(
                mapSize,
                allBossPositions,
                rng
            );
        }

        // 5. 返回地图数据（不再存储到 mr_map，直接保存在 mr_stage 中）
        return {
            rows: mapSize.rows,
            cols: mapSize.cols,
            obstacles,
            disables: [],
        };
    }

    /**
     * 从模板配置生成地图（模板+随机混合方式）
     * 
     * 模板部分：
     * - 核心障碍物（coreObstacles）：100%保留，确保地图基本结构
     * 
     * 随机部分：
     * - 可选障碍物（optionalObstacles）：随机筛选，70%概率保留
     * - 新增障碍物：在允许区域内随机添加，增加变化性
     */
    private static generateMapFromTemplateConfig(
        templateConfig: {
            templateId: string;
            name: string;
            tier: string;
            mapSize: { rows: number; cols: number };
            coreObstacles: Array<{ q: number; r: number; type: number; asset: string }>;
            optionalObstacles: Array<{ q: number; r: number; type: number; asset: string }>;
            restrictedZones: Array<{ type: string; region: any }>;
        },
        bossPositions: HexCoord[],
        rng: SeededRandom
    ): any[] {
        // ============================================
        // 第一步：模板的固定部分（核心障碍物，100%保留）
        // ============================================
        let obstacles = [...templateConfig.coreObstacles];

        // ============================================
        // 第二步：可选障碍物的随机筛选（70%概率保留）
        // ============================================
        const optionalKeepProbability = 0.7;  // 70%概率保留可选障碍物
        const optionalToKeep = templateConfig.optionalObstacles.filter(() =>
            rng.random() <= optionalKeepProbability
        );
        obstacles = [...obstacles, ...optionalToKeep];

        // ============================================
        // 第三步：移除与Boss位置冲突的障碍物
        // ============================================
        const bossPositionSet = new Set(
            bossPositions.map(pos => `${pos.q},${pos.r}`)
        );
        obstacles = obstacles.filter(obstacle => {
            const key = `${obstacle.q},${obstacle.r}`;
            return !bossPositionSet.has(key);
        });

        // ============================================
        // 第四步：在允许区域随机添加新障碍物（增加变化性）
        // ============================================
        const additionalRatio = 0.15;  // 额外障碍物比例为现有障碍物的15%
        const targetAdditionalCount = Math.floor(obstacles.length * additionalRatio);
        const obstacleTypes = ["rock", "tree"];

        const additionalObstacles = this.generateRandomAdditionalObstacles(
            templateConfig.mapSize,
            obstacles,
            bossPositions,
            templateConfig.restrictedZones,
            targetAdditionalCount,
            obstacleTypes,
            rng
        );

        obstacles = [...obstacles, ...additionalObstacles];

        return obstacles;
    }

    /**
     * 检查Boss位置与障碍物的冲突
     */
    private static checkBossPositionConflicts(
        bossPositions: HexCoord[],
        obstacles: any[]
    ): boolean {
        const bossPositionSet = new Set(
            bossPositions.map(pos => `${pos.q},${pos.r}`)
        );

        for (const obstacle of obstacles) {
            const key = `${obstacle.q},${obstacle.r}`;
            if (bossPositionSet.has(key)) {
                return true;  // 发现冲突
            }
        }

        return false;  // 无冲突
    }

    /**
     * 随机生成地图（避开Boss位置）
     */
    private static generateRandomMapWithBossAvoidance(
        mapSize: { rows: number; cols: number },
        bossPositions: HexCoord[],
        rng: SeededRandom
    ): any[] {
        const obstacles: any[] = [];
        const usedPositions = new Set<string>();

        // 标记Boss位置为已占用
        bossPositions.forEach(pos => {
            usedPositions.add(`${pos.q},${pos.r}`);
        });

        // 计算障碍物数量（地图面积的10-20%）
        const totalCells = mapSize.rows * mapSize.cols;
        const minObstacles = Math.floor(totalCells * 0.1);
        const maxObstacles = Math.floor(totalCells * 0.2);
        const obstacleCount = rng.randomInt(minObstacles, maxObstacles + 1);

        // 排除区域定义
        const playerZone = {
            minQ: 0,
            maxQ: Math.floor(mapSize.cols * 0.4),
            minR: Math.floor(mapSize.rows * 0.6),
            maxR: mapSize.rows - 1,
        };

        const bossZone = {
            minQ: Math.floor(mapSize.cols * 0.6),
            maxQ: mapSize.cols - 1,
            minR: 0,
            maxR: Math.floor(mapSize.rows * 0.4),
        };

        const obstacleTypes = [
            { type: 1, asset: "/assets/obstacles/rock.glb" },
            { type: 2, asset: "/assets/obstacles/tree.glb" },
        ];

        let attempts = 0;
        const maxAttempts = obstacleCount * 20;

        while (obstacles.length < obstacleCount && attempts < maxAttempts) {
            attempts++;

            const q = rng.randomInt(0, mapSize.cols);
            const r = rng.randomInt(0, mapSize.rows);
            const positionKey = `${q},${r}`;
            const position: HexCoord = { q, r };

            // 检查是否已被占用（Boss位置或已有障碍物）
            if (usedPositions.has(positionKey)) {
                continue;
            }

            // 检查是否在排除区域
            const inPlayerZone = isInRegion(position, playerZone);
            const inBossZone = isInRegion(position, bossZone);

            if (inPlayerZone || inBossZone) {
                continue;
            }

            // 添加障碍物
            const obstacleType = rng.choice(obstacleTypes);
            obstacles.push({
                q,
                r,
                type: obstacleType.type,
                asset: obstacleType.asset,
            });
            usedPositions.add(positionKey);
        }

        return obstacles;
    }

    /**
     * 在允许区域内随机生成额外障碍物
     */
    private static generateRandomAdditionalObstacles(
        mapSize: { rows: number; cols: number },
        existingObstacles: any[],
        bossPositions: HexCoord[],
        restrictedZones: any[],
        targetCount: number,
        obstacleTypes: string[],
        rng: SeededRandom
    ): any[] {
        const newObstacles: any[] = [];
        const usedPositions = new Set<string>();

        // 标记所有已占用的位置
        [...existingObstacles, ...bossPositions].forEach(item => {
            const key = `${item.q},${item.r}`;
            usedPositions.add(key);
        });

        // 构建排除区域列表
        const excludeRegions = restrictedZones.map(zone => zone.region);

        let attempts = 0;
        const maxAttempts = targetCount * 20;

        while (newObstacles.length < targetCount && attempts < maxAttempts) {
            attempts++;

            const q = rng.randomInt(0, mapSize.cols);
            const r = rng.randomInt(0, mapSize.rows);
            const positionKey = `${q},${r}`;
            const position: HexCoord = { q, r };

            // 检查位置是否已被占用
            if (usedPositions.has(positionKey)) {
                continue;
            }

            // 检查是否在排除区域内
            const inExcludeRegion = excludeRegions.some(region =>
                isInRegion(position, region)
            );
            if (inExcludeRegion) {
                continue;
            }

            // 随机选择障碍物类型
            const obstacleTypeName = rng.choice(obstacleTypes);
            newObstacles.push({
                q,
                r,
                type: ObstacleUtils.getObstacleTypeCode(obstacleTypeName),
                asset: ObstacleUtils.getObstacleAsset(obstacleTypeName),
            });

            usedPositions.add(positionKey);
        }

        return newObstacles;
    }
}

