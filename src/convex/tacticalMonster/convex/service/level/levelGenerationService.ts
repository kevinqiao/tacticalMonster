/**
 * 关卡生成服务
 * 核心关卡生成逻辑（地图+障碍物+Boss位置）
 */

import { hasOverlap, HexCoord, isInRegion, selectMinionPosition, selectRandomPositionInZone } from "../../utils/hexUtils";
import { SeededRandom } from "../../utils/seededRandom";
import { BossConfigService } from "../boss/bossConfigService";
import { BossPositions } from "../boss/bossInstanceService";
import { LevelConfigService } from "./levelConfigService";

export interface GeneratedLevel {
    levelId: string;
    bossId: string;
    mapId: string;
    bossPositions: BossPositions;
    playerZone: {
        region: {
            minQ: number;
            maxQ: number;
            minR: number;
            maxR: number;
        };
    };
}

export class LevelGenerationService {
    /**
     * 动态生成关卡（Boss + 地图障碍物）
     */
    static async generateLevel(
        ctx: any,
        tier: string,
        bossId?: string,
        seed?: string
    ): Promise<GeneratedLevel> {
        // 1. 确定Boss
        const selectedBossId = bossId || this.selectRandomBossByTier(tier, seed);
        // 使用合并后的配置（包含从 characterId 继承的属性）
        const bossConfig = BossConfigService.getMergedBossConfig(selectedBossId);
        if (!bossConfig) {
            throw new Error(`Boss配置不存在: ${selectedBossId}`);
        }

        // 2. 获取或生成关卡配置
        const levelConfig = await LevelConfigService.getOrGenerateLevelConfig(
            ctx,
            tier,
            selectedBossId,
            seed
        );

        // 3. 生成地图（包含障碍物）- 使用模板+随机方式
        const mapData = await this.generateMap(ctx, levelConfig, seed);

        // 4. 确定Boss组合初始位置
        // 注意：这里使用原始BossConfig即可，因为只需要minions信息
        const rawBossConfig = BossConfigService.getBossConfig(selectedBossId);
        if (!rawBossConfig) {
            throw new Error(`Boss配置不存在: ${selectedBossId}`);
        }
        const bossPositions = this.generateBossPositions(levelConfig, rawBossConfig, seed);

        // 5. 返回完整关卡数据
        return {
            levelId: levelConfig.levelId,
            bossId: selectedBossId,
            mapId: mapData.map_id,
            bossPositions,
            playerZone: levelConfig.positionConfig.playerZone,
        };
    }

    /**
     * 从Tier中随机选择Boss
     */
    private static selectRandomBossByTier(tier: string, seed?: string): string {
        const { BossSelectionService } = require("../boss/bossSelectionService");
        return BossSelectionService.selectRandomBoss(tier, seed);
    }

    /**
     * 生成地图数据（包含障碍物布局）
     * 使用模板+随机方式
     */
    private static async generateMap(
        ctx: any,
        levelConfig: any,
        seed?: string
    ): Promise<any> {
        const { mapGeneration } = levelConfig;
        const rng = new SeededRandom(seed || `map_${Date.now()}`);

        let obstacles: any[] = [];

        if (mapGeneration.generationType === "template") {
            // 使用模板+随机方式
            obstacles = await this.generateMapFromTemplate(
                ctx,
                mapGeneration,
                levelConfig.positionConfig,
                rng
            );
        } else {
            // 如果没有模板，使用程序化生成
            obstacles = this.generateProceduralObstacles(
                mapGeneration,
                levelConfig.positionConfig,
                rng
            );
        }

        // 创建地图数据并存储
        const mapId = `map_dynamic_${Date.now()}_${seed || rng.randomInt(0, 1000000)}`;
        const mapData = {
            map_id: mapId,
            rows: mapGeneration.mapSize.rows,
            cols: mapGeneration.mapSize.cols,
            obstacles,
            disables: [], // 可以根据需要生成禁用地块
        };

        await ctx.db.insert("tacticalMonster_map_data", mapData);
        return mapData;
    }

    /**
     * 从模板生成地图（模板+随机调整）
     */
    private static async generateMapFromTemplate(
        ctx: any,
        mapGeneration: any,
        positionConfig: any,
        rng: SeededRandom
    ): Promise<any[]> {
        // 如果没有指定模板ID，创建一个基础模板
        if (!mapGeneration.templateId) {
            return this.generateProceduralObstacles(
                mapGeneration,
                positionConfig,
                rng
            );
        }

        // 查询模板
        const template = await ctx.db
            .query("mr_map_templates")
            .withIndex("by_templateId", (q: any) => q.eq("templateId", mapGeneration.templateId))
            .first();

        if (!template) {
            // 如果模板不存在，回退到程序化生成
            return this.generateProceduralObstacles(
                mapGeneration,
                positionConfig,
                rng
            );
        }

        // 合并核心障碍物和可选障碍物
        let obstacles = [...template.coreObstacles];

        // 随机调整可选障碍物
        if (mapGeneration.templateAdjustment) {
            const adjustmentRatio = mapGeneration.templateAdjustment.adjustmentRatio || 0.15;
            const preserveCore = mapGeneration.templateAdjustment.preserveCoreObstacles !== false;

            // 决定哪些可选障碍物保留
            const optionalToKeep = template.optionalObstacles.filter(() =>
                rng.random() > adjustmentRatio
            );

            obstacles = [...obstacles, ...optionalToKeep];

            // 在允许区域添加新的随机障碍物
            const newObstacles = this.generateRandomObstaclesInAllowedZones(
                mapGeneration,
                positionConfig,
                template.restrictedZones,
                obstacles.length,
                rng
            );

            obstacles = [...obstacles, ...newObstacles];
        } else {
            obstacles = [...obstacles, ...template.optionalObstacles];
        }

        return obstacles;
    }

    /**
     * 程序化生成障碍物
     */
    private static generateProceduralObstacles(
        mapGeneration: any,
        positionConfig: any,
        rng: SeededRandom
    ): any[] {
        const { obstacleRules } = mapGeneration;
        const { mapSize } = mapGeneration;

        const obstacles: any[] = [];
        const excludeRegions: any[] = [];

        // 添加玩家区域和Boss区域到排除列表
        excludeRegions.push(positionConfig.playerZone.region);

        if (obstacleRules.spawnZones) {
            obstacleRules.spawnZones
                .filter((zone: any) => zone.type === "exclude")
                .forEach((zone: any) => excludeRegions.push(zone.region));
        }

        // 生成障碍物数量
        const obstacleCount = rng.randomInt(
            obstacleRules.minObstacles,
            obstacleRules.maxObstacles + 1
        );

        // 生成障碍物位置
        const usedPositions: HexCoord[] = [];
        const obstacleTypes: string[] = obstacleRules.obstacleTypes || ["rock"];

        for (let i = 0; i < obstacleCount; i++) {
            const position = this.findAvailableObstaclePosition(
                mapSize,
                excludeRegions,
                usedPositions,
                rng
            );

            if (position) {
                const obstacleType = rng.choice(obstacleTypes);
                obstacles.push({
                    q: position.q,
                    r: position.r,
                    type: this.getObstacleTypeCode(obstacleType),
                    asset: this.getObstacleAsset(obstacleType),
                });
                usedPositions.push(position);
            }
        }

        return obstacles;
    }

    /**
     * 在允许区域生成随机障碍物
     */
    private static generateRandomObstaclesInAllowedZones(
        mapGeneration: any,
        positionConfig: any,
        restrictedZones: any[],
        currentCount: number,
        rng: SeededRandom
    ): any[] {
        const { obstacleRules } = mapGeneration;
        const targetCount = Math.floor(currentCount * (mapGeneration.templateAdjustment?.adjustmentRatio || 0.15));
        const obstacles: any[] = [];
        const usedPositions: HexCoord[] = [];

        const excludeRegions: any[] = [
            positionConfig.playerZone.region,
            ...(restrictedZones || []).map((zone: any) => zone.region),
        ];

        for (let i = 0; i < targetCount; i++) {
            const position = this.findAvailableObstaclePosition(
                mapGeneration.mapSize,
                excludeRegions,
                usedPositions,
                rng
            );

            if (position) {
                const obstacleTypes: string[] = obstacleRules.obstacleTypes || ["rock"];
                const obstacleType = rng.choice(obstacleTypes);
                obstacles.push({
                    q: position.q,
                    r: position.r,
                    type: this.getObstacleTypeCode(obstacleType),
                    asset: this.getObstacleAsset(obstacleType),
                });
                usedPositions.push(position);
            }
        }

        return obstacles;
    }

    /**
     * 查找可用的障碍物位置
     */
    private static findAvailableObstaclePosition(
        mapSize: { rows: number; cols: number },
        excludeRegions: any[],
        usedPositions: HexCoord[],
        rng: SeededRandom
    ): HexCoord | null {
        const maxAttempts = 100;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const q = rng.randomInt(0, mapSize.cols);
            const r = rng.randomInt(0, mapSize.rows);
            const position: HexCoord = { q, r };

            // 检查是否在排除区域内
            const inExcludeRegion = excludeRegions.some(region =>
                isInRegion(position, region)
            );

            if (inExcludeRegion) {
                continue;
            }

            // 检查是否已被使用
            if (hasOverlap(position, usedPositions)) {
                continue;
            }

            return position;
        }

        return null;  // 找不到可用位置
    }

    /**
     * 生成Boss组合的初始位置
     */
    private static generateBossPositions(
        levelConfig: any,
        bossConfig: any,
        seed?: string
    ): BossPositions {
        const { bossZone } = levelConfig.positionConfig;
        const rng = new SeededRandom(seed || `boss_pos_${Date.now()}`);

        // 如果有关卡配置的预设位置，使用预设；否则在区域内随机选择
        let bossMainPosition: HexCoord;
        if (bossZone.positions && bossZone.positions.length > 0) {
            bossMainPosition = rng.choice(bossZone.positions);
        } else {
            // 在中心区域随机选择
            bossMainPosition = selectRandomPositionInZone(
                {
                    minQ: bossZone.center.q - bossZone.radius,
                    maxQ: bossZone.center.q + bossZone.radius,
                    minR: bossZone.center.r - bossZone.radius,
                    maxR: bossZone.center.r + bossZone.radius,
                },
                [],
                rng
            );
        }

        // 生成小怪位置（围绕Boss）
        const minionPositions: Array<{ minionId: string; position: HexCoord }> = [];
        if (bossConfig.minions) {
            for (const minion of bossConfig.minions) {
                for (let i = 0; i < minion.quantity; i++) {
                    const minionPos = selectMinionPosition(
                        bossMainPosition,
                        bossZone.radius,
                        [bossMainPosition, ...minionPositions.map(m => m.position)],
                        rng
                    );
                    minionPositions.push({
                        minionId: `${minion.minionId}_${i}`,
                        position: minionPos,
                    });
                }
            }
        }

        return {
            bossMain: bossMainPosition,
            minions: minionPositions,
        };
    }

    /**
     * 获取障碍物类型代码
     */
    private static getObstacleTypeCode(type: string): number {
        const typeMap: Record<string, number> = {
            rock: 1,
            tree: 2,
            wall: 3,
        };
        return typeMap[type] || 1;
    }

    /**
     * 获取障碍物资源路径
     */
    private static getObstacleAsset(type: string): string {
        const assetMap: Record<string, string> = {
            rock: "/assets/obstacles/rock.glb",
            tree: "/assets/obstacles/tree.glb",
            wall: "/assets/obstacles/wall.glb",
        };
        return assetMap[type] || "/assets/obstacles/rock.glb";
    }
}
