/**
 * Stage 管理服务
 * 基于 StageRuleConfig.stageContent 生成完整的 stage（包含 Boss、地图、障碍物、站位等）
 * 整合了原有的 LevelGenerationService 功能
 */

import { v } from "convex/values";
import { Stage } from "../../../../../component/battle/games/tacticalMonster/battle/types/StageTypes";
import { mutation, query } from "../../_generated/server";
import { calculateScaleBoss, getBossConfig } from "../../data/bossConfigs";
import { getMapTemplateConfig } from "../../data/mapTemplateConfigs";
import { hasOverlap, HexCoord, isInRegion } from "../../utils/hexUtils";
import { SeededRandom } from "../../utils/seededRandom";
import { GameRuleConfigService } from "../game/gameRuleConfigService";
import { TeamService } from "../team/teamService";



/**
 * Stage 管理服务
 */
export class StageManagerService {
    static async openStage(ctx: any, params: {
        uid: string;
        typeId: string;
    }): Promise<Stage | null> {
        const { uid, typeId } = params;
        const ruleConfig = GameRuleConfigService.getGameRuleConfig(typeId);
        if (!ruleConfig) {
            throw new Error(`关卡规则配置不存在: ${typeId}`);
        }
        // 验证玩家是否有配置队伍
        const team = await TeamService.getPlayerTeam(ctx, uid);
        if (!team || team.length === 0) {
            throw new Error(`队伍不存在: ${uid}`);
        }
        if (ruleConfig.stageType === "challenge") {
            const playerStage = await ctx.db.query("mr_player_stages").withIndex("by_uid_ruleId", (q: any) => q.eq("uid", uid).eq("ruleId", typeId)).order("desc").first();
            if (playerStage) {
                const stageDoc = await ctx.db.query("mr_stage").withIndex("by_stageId", (q: any) => q.eq("stageId", playerStage.stageId)).first();
                if (stageDoc) {
                    // map 数据直接保存在 stage 中，直接返回
                    const stage: Stage = {
                        stageId: stageDoc.stageId,
                        bossId: stageDoc.bossId,
                        map: stageDoc.map,
                        difficulty: stageDoc.difficulty,
                        seed: stageDoc.seed,
                        attempts: stageDoc.attempts,
                        createdAt: stageDoc.createdAt,
                    };
                    return stage;
                }
            } else {
                console.log("新建 stage", typeId);
                // 新建 stage，使用 ruleConfig 中的默认难度配置
                const difficulty = ruleConfig.stageContent?.difficultyAdjustment?.difficultyMultiplier || 1.0;
                const stage = await this.createStage(ctx, {
                    ruleId: typeId,
                    difficulty,
                });
                if (stage) {
                    console.log("stage", stage);
                    await ctx.db.insert("mr_player_stages", {
                        uid,
                        ruleId: typeId,
                        stageId: stage.stageId,
                        createdAt: new Date().toISOString(),
                    });
                }
                return stage;
            }

        } else if (ruleConfig.stageType === "arena") {
            const arenaStage = await ctx.db.query("mr_arena_stage").withIndex("by_ruleId", (q: any) => q.eq("ruleId", typeId)).order("desc").first();
            console.log("arenaStage", arenaStage);
            if (arenaStage) {
                const stageDoc = await ctx.db.query("mr_stage").withIndex("by_stageId", (q: any) => q.eq("stageId", arenaStage.stageId)).first();
                if (stageDoc) {
                    // map 数据直接保存在 stage 中，直接返回
                    const stage: Stage = {
                        stageId: stageDoc.stageId,
                        bossId: stageDoc.bossId,
                        map: stageDoc.map,
                        difficulty: stageDoc.difficulty,
                        seed: stageDoc.seed,
                        attempts: stageDoc.attempts,
                        createdAt: stageDoc.createdAt,
                    };
                    return stage;
                }
            } else {
                // 新建 stage，使用 ruleConfig 中的默认难度配置
                const difficulty = ruleConfig.stageContent?.difficultyAdjustment?.difficultyMultiplier || 1.0;
                const stage = await this.createStage(ctx, {
                    ruleId: typeId,
                    difficulty,
                });

                if (stage) {
                    await ctx.db.insert("mr_arena_stage", {
                        ruleId: typeId,
                        stageId: stage.stageId,
                        createdAt: new Date().toISOString(),
                    });
                }
                return stage;
            }

        }
        return null;
    }
    /**
     * 创建 Stage
     * 基于 StageRuleConfig.stageContent 生成完整的 stage
     */
    static async createStage(
        ctx: any,
        params: {
            ruleId: string;

            difficulty: number;         // Boss Power / Player Team Power 比率（缩放后）
        }
    ): Promise<Stage> {
        const { ruleId, difficulty } = params;

        // 1. 生成 seed（在方法内部生成，确保每次创建都有唯一的 seed）
        const seed = `stage_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        // 2. 获取 StageRuleConfig
        const stageRuleConfig = GameRuleConfigService.getGameRuleConfig(ruleId);
        if (!stageRuleConfig) {
            throw new Error(`StageRuleConfig 不存在: ${ruleId}`);
        }

        // 3. 验证 stageContent 存在
        if (!stageRuleConfig.stageContent) {
            throw new Error(`StageRuleConfig ${ruleId} 缺少 stageContent 配置`);
        }

        const { stageContent } = stageRuleConfig;

        // 4. 确定 Boss ID（依据 stageContent.bossConfig）
        const bossId = this.selectBossFromConfig(stageContent.bossConfig, seed);
        if (!bossId) {
            throw new Error(`无法确定 Boss ID：stageContent.bossConfig 配置无效`);
        }

        // 5. 获取Boss配置（用于获取位置信息）
        const bossConfig = getBossConfig(bossId);
        if (!bossConfig) {
            throw new Error(`Boss配置不存在: ${bossId}`);
        }

        // 6. 生成地图（依据 mapConfig.templateId 或随机生成）
        const mapData = await this.generateMapWithBossValidation(
            ctx,
            {
                mapConfig: stageContent.mapConfig,
                bossConfig,
                bossId,
                seed,
            }
        );

        // 验证地图数据是否生成成功
        if (!mapData) {
            throw new Error(`无法生成地图数据：StageRuleConfig ${ruleId} 缺少 mapConfig 配置或 mapConfig.mapSize 未定义`);
        }

        // 7. 生成 stageId（使用 seed 确保一致性）
        const stageId = this.generateStageId(ruleId, seed);

        // 8. 构建 map 对象（直接保存到 mr_stage 表中）
        const mapForStage = {
            rows: mapData.rows,
            cols: mapData.cols,
            obstacles: mapData.obstacles.map((obs: any) => ({
                q: obs.q,
                r: obs.r,
                type: obs.type,
                asset: obs.asset,
            })),
            disables: mapData.disables || [],
        };

        // 9. 存储到数据库 mr_stage 表
        // 检查是否已存在相同的 stageId
        const existingStage = await ctx.db
            .query("mr_stage")
            .withIndex("by_stageId", (q: any) => q.eq("stageId", stageId))
            .first();

        if (existingStage) {
            // 如果已存在，直接返回数据库中的数据（map 已包含在 stage 中）
            const stage: Stage = {
                stageId: existingStage.stageId,
                bossId: existingStage.bossId,
                map: existingStage.map,
                difficulty: existingStage.difficulty,
                seed: existingStage.seed,
                attempts: existingStage.attempts,
                createdAt: existingStage.createdAt,
            };
            return stage;
        } else {
            // 如果不存在，插入新记录（map 直接保存在 stage 中）
            await ctx.db.insert("mr_stage", {
                stageId,
                bossId,
                map: mapForStage,
                difficulty,
                seed,
                attempts: 1,
                createdAt: new Date().toISOString(),
            });

            // 构建符合 Stage 接口的对象用于返回
            const stage: Stage = {
                stageId,
                bossId,
                map: mapForStage,
                difficulty,
                seed,
                attempts: 1,
                createdAt: new Date().toISOString(),
            };
            return stage;
        }
    }

    /**
     * 增加 Stage 的尝试次数
     * @param ctx 数据库上下文
     * @param stageId Stage ID
     * @returns 更新后的 attempts 次数，如果 Stage 不存在则返回 null
     */
    static async incrementAttempts(
        ctx: any,
        stageId: string
    ): Promise<number | null> {
        const existingStage = await ctx.db
            .query("mr_stage")
            .withIndex("by_stageId", (q: any) => q.eq("stageId", stageId))
            .first();

        if (!existingStage) {
            return null;
        }

        const updatedAttempts = existingStage.attempts + 1;
        await ctx.db.patch(existingStage._id, {
            attempts: updatedAttempts,
        });

        return updatedAttempts;
    }

    /**
     * 从 bossConfig 中选择 Boss ID
     */
    private static selectBossFromConfig(
        bossConfig: any,
        seed?: string
    ): string | null {
        if (!bossConfig) {
            return null;
        }

        // 优先使用固定 Boss ID
        if (bossConfig.bossId) {
            return bossConfig.bossId;
        }

        // 如果有 Boss 池，从池中随机选择
        if (bossConfig.bossPool && bossConfig.bossPool.length > 0) {
            const rng = new SeededRandom(seed || `boss_selection_${Date.now()}`);
            return rng.choice(bossConfig.bossPool);
        }

        // 如果都没有，返回 null（不能确定 Boss ID）
        return null;
    }

    /**
     * 生成地图数据（包含Boss位置验证）
     * 
     * 流程：
     * 1. 如果有 mapConfig.templateId，尝试从 mapTemplateConfigs.ts 获取模板配置生成地图
     * 2. 如果没有 templateId 或生成失败，根据 boss 参数随机创建新地图
     * 3. 生成过程中确保 Boss 和小怪位置与障碍物不冲突
     */
    private static async generateMapWithBossValidation(
        ctx: any,
        params: {
            mapConfig?: {
                mapSize?: { rows: number; cols: number };
                templateId?: string;
            };
            bossConfig: any;
            bossId: string;
            seed?: string;
        }
    ): Promise<any> {
        const { mapConfig, bossConfig, bossId, seed } = params;
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
                type: this.getObstacleTypeCode(obstacleTypeName),
                asset: this.getObstacleAsset(obstacleTypeName),
            });

            usedPositions.add(positionKey);
        }

        return newObstacles;
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


    /**
     * 获取 Stage 配置
     * 基于 ruleId 从 StageRuleConfig 获取 stage 配置信息
     * 
     * @param ruleId StageRuleConfig 的 ruleId
     * @returns Stage 配置对象，包含地图配置、Boss 配置等信息
     * @throws 如果 ruleId 不存在或缺少必要配置则抛出错误
     */
    static getStageConfig(ruleId: string): {
        ruleId: string;
        stageContent: any;
        mapConfig: any;
    } {
        const stageRuleConfig = GameRuleConfigService.getGameRuleConfig(ruleId);
        if (!stageRuleConfig) {
            throw new Error(`StageRuleConfig 不存在: ${ruleId}`);
        }

        if (!stageRuleConfig.stageContent) {
            throw new Error(`StageRuleConfig ${ruleId} 缺少 stageContent 配置`);
        }

        if (!stageRuleConfig.stageContent.mapConfig) {
            throw new Error(`StageRuleConfig ${ruleId} 缺少 stageContent.mapConfig 配置`);
        }

        return {
            ruleId,
            stageContent: stageRuleConfig.stageContent,
            mapConfig: stageRuleConfig.stageContent.mapConfig,
        };
    }


    /**
     * 生成唯一的 stageId
     */
    private static generateStageId(ruleId: string, seed: string): string {
        // 使用 seed 的哈希值生成 stageId，确保相同 seed 生成相同的 stageId
        const seedHash = this.hashSeed(seed);
        return `stage_${ruleId}_${seedHash}`;
    }

    /**
     * 简单哈希 seed 字符串
     */
    private static hashSeed(seed: string): string {
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            const char = seed.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * 根据 stageId 查找 Stage
     * @param ctx 数据库上下文
     * @param params 查询参数
     * @returns Stage 对象，如果不存在则返回 null
     */
    static async findStage(
        ctx: any,
        params: {
            stageId: string;
        }
    ): Promise<Stage | null> {
        const { stageId } = params;

        const stageDoc = await ctx.db
            .query("mr_stage")
            .withIndex("by_stageId", (q: any) => q.eq("stageId", stageId))
            .first();

        if (!stageDoc) {
            return null;
        }


        // 构建符合 Stage 接口的对象
        const stage: Stage = {
            stageId: stageDoc.stageId,
            bossId: stageDoc.bossId,
            map: stageDoc.map,
            difficulty: stageDoc.difficulty,
            seed: stageDoc.seed,
            attempts: stageDoc.attempts,
            createdAt: stageDoc.createdAt,
        };

        return stage;
    }
}
export const openStage = mutation({
    args: {
        uid: v.string(),
        typeId: v.string(),
    },
    handler: async (ctx: any, args: any) => {
        const stage = await StageManagerService.openStage(ctx, args);
        if (!stage) {
            return { ok: false, error: "无法获取关卡" };
        }
        return { ok: true, stage };

    },
});
export const findStage = query({
    args: { stageId: v.string() },
    handler: async (ctx: any, args: any) => {
        return await StageManagerService.findStage(ctx, args);
    },
});
export const findPowerStage = query({
    args: { uid: v.string(), stageId: v.string() },
    handler: async (ctx: any, args: any) => {
        const { uid, stageId } = args;
        const stage = await StageManagerService.findStage(ctx, { stageId });
        if (!stage) {
            return null;
        }
        const teamPower = await TeamService.getTeamPower(ctx, uid);
        if (!teamPower) {
            return null;
        }
        const scaleBoss = calculateScaleBoss(stage.bossId, teamPower, stage.difficulty);
        if (!scaleBoss) {
            return null;
        }
        return {
            ok: true,
            stage: {
                stageId: stage.stageId,
                boss: scaleBoss,
                map: stage.map,
                difficulty: stage.difficulty,
                seed: stage.seed,
                attempts: stage.attempts,
                createdAt: stage.createdAt,
            },
        };

    },
});

