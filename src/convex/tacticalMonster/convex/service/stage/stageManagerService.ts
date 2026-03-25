/**
 * Stage 管理服务
 * 基于 StageRuleConfig.stageContent 生成完整的 stage（包含 Boss、地图、障碍物、站位等）
 */

import { v } from "convex/values";
import { Stage } from "../../../../../component/battle/games/tacticalMonster/types/StageTypes";
import { internalMutation, internalQuery, query } from "../../_generated/server";
import { calculateScaleBoss, getBossConfig } from "../../data/bossConfigs";
import { getMapTemplateConfig, getMapTemplateConfigsByTier } from "../../data/mapTemplateConfigs";
import { STAGE_RULE_CONFIGS } from "../../data/stageRuleConfigs";
import { StageRuleConfig } from "../../types/stageRuleTypes";
import { SeededRandom } from "../../utils/seededRandom";
import { GameRuleConfigService } from "../game/gameRuleConfigService";
import { TeamService } from "../team/teamService";
import { MapGenerationService } from "./mapGenerationService";
import { StageUtils } from "./stageUtils";

/**
 * Stage 管理服务
 */
export class StageManagerService {
    static async isStageUnlocked(ctx: any, uid: string, stageRule: StageRuleConfig): Promise<boolean> {
        const previousLevels = stageRule.stageChain?.previousLevels || [];
        if (previousLevels.length > 0) {
            for (const previousLevel of previousLevels) {
                const firstClear = await ctx.db
                    .query("mr_player_first_clear")
                    .withIndex("by_uid_ruleId", (q: any) => q.eq("uid", uid).eq("ruleId", previousLevel)).unique();
                if (!firstClear || firstClear.performance < 2) {
                    return false;
                }
            }
        }
        return true;
    }
    static async findCurrentStageId(ctx: any, uid: string, stageRule: StageRuleConfig) {
        if (stageRule.stageType === "challenge") {
            const playerStage = await ctx.db
                .query("mr_player_stages")
                .withIndex("by_lastPlayAt", (q: any) => q.eq("uid", uid).eq("ruleId", stageRule.ruleId))
                .order("desc")
                .first();
            if (playerStage) {
                return playerStage.stageId;
            }


        } else if (stageRule.stageType === "arena") {
            const arenaStage = await ctx.db
                .query("mr_arena_stage")
                .withIndex("by_ruleId", (q: any) => q.eq("ruleId", stageRule.ruleId))
                .order("desc")
                .first();
            if (!arenaStage) {
                return arenaStage.stageId;
            }

        }

        return;
    }

    /**
     * 获取或创建 Challenge Stage
     */
    static async getOrCreateChallengeStage(
        ctx: any,
        uid: string,
        typeId: string,
        ruleConfig: StageRuleConfig
    ): Promise<Stage | null> {
        const playerStage = await ctx.db
            .query("mr_player_stages")
            .withIndex("by_uid_ruleId", (q: any) => q.eq("uid", uid).eq("ruleId", typeId))
            .order("desc")
            .first();

        if (playerStage) {
            const stageDoc = await ctx.db
                .query("mr_stage")
                .withIndex("by_stageId", (q: any) => q.eq("stageId", playerStage.stageId))
                .first();

            if (stageDoc) {
                return StageUtils.buildStageFromDoc(stageDoc);
            }
        }

        // 新建 stage（优先使用仿真 override 的难度）
        console.log("新建 stage", typeId);
        const mergedConfig = await GameRuleConfigService.getGameRuleConfigWithOverrides(ctx, typeId);
        const difficulty = mergedConfig?.stageContent?.difficultyAdjustment?.difficultyMultiplier
            ?? ruleConfig.stageContent?.difficultyAdjustment?.difficultyMultiplier ?? 1.0;
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

    /**
     * 获取或创建 Arena Stage
     */
    static async getOrCreateArenaStage(
        ctx: any,
        typeId: string,
        ruleConfig: StageRuleConfig
    ): Promise<Stage | null> {
        const arenaStage = await ctx.db
            .query("mr_arena_stage")
            .withIndex("by_ruleId", (q: any) => q.eq("ruleId", typeId))
            .order("desc")
            .first();

        if (arenaStage) {
            const stageDoc = await ctx.db
                .query("mr_stage")
                .withIndex("by_stageId", (q: any) => q.eq("stageId", arenaStage.stageId))
                .first();

            if (stageDoc) {
                return StageUtils.buildStageFromDoc(stageDoc);
            }
        }

        // 新建 stage（优先使用仿真 override 的难度）
        const mergedConfig = await GameRuleConfigService.getGameRuleConfigWithOverrides(ctx, typeId);
        const difficulty = mergedConfig?.stageContent?.difficultyAdjustment?.difficultyMultiplier
            ?? ruleConfig.stageContent?.difficultyAdjustment?.difficultyMultiplier ?? 1.0;
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

    /**
     * 创建 Stage
     * 基于 StageRuleConfig.stageContent 生成完整的 stage
     */
    static async createStage(
        ctx: any,
        params: {
            ruleId: string;
            difficulty: number;  // Boss Power / Player Team Power 比率（缩放后）
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

        // 6. 准备地图配置（如果不存在则从模板配置中获取）
        let mapConfig = stageContent.mapConfig;

        if (!mapConfig || !mapConfig.mapSize) {
            // 从 ruleId 中提取 tier（例如：monster_rumble_challenge_bronze_boss_1 -> bronze）
            const tier = this.extractTierFromRuleId(ruleId);

            // 尝试从模板配置中获取对应 tier 的模板
            const templatesByTier = getMapTemplateConfigsByTier(tier);
            let defaultTemplate = templatesByTier.length > 0 ? templatesByTier[0] : null;

            // 如果没有找到对应 tier 的模板，尝试使用默认模板
            if (!defaultTemplate) {
                const defaultTemplateConfig = getMapTemplateConfig("template_bronze_basic");
                if (defaultTemplateConfig) {
                    defaultTemplate = defaultTemplateConfig;
                }
            }

            // 使用模板配置构建 mapConfig
            if (defaultTemplate) {
                mapConfig = {
                    mapSize: defaultTemplate.mapSize,
                    templateId: defaultTemplate.templateId,
                };
            } else {
                // 最后的默认值
                mapConfig = {
                    mapSize: { rows: 7, cols: 8 },
                };
            }
        }

        // 确保 mapSize 存在
        if (!mapConfig.mapSize) {
            mapConfig.mapSize = { rows: 7, cols: 8 };
        }

        // 7. 生成地图（依据 mapConfig.templateId 或随机生成）
        const mapData = await MapGenerationService.generateMapWithBossValidation({
            mapConfig,
            bossConfig,
            bossId,
            seed,
        });

        // 验证地图数据是否生成成功
        if (!mapData) {
            throw new Error(`无法生成地图数据：StageRuleConfig ${ruleId} 地图生成失败`);
        }

        // 7. 构建 map 对象（直接保存到 mr_stage 表中）
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

        // 8. 存储到数据库 mr_stage 表，使用 _id 作为 stageId
        const createdAt = new Date().toISOString();
        const stageDocId = await ctx.db.insert("mr_stage", {
            stageId: "", // 临时值，插入后更新为 _id
            bossId,
            map: mapForStage,
            difficulty,
            seed,
            attempts: 1,
            createdAt,
        });

        // 使用 _id 的字符串形式作为 stageId（在运行时 Id 就是字符串）
        const stageId = stageDocId.toString();
        await ctx.db.patch(stageDocId, { stageId });

        // 构建符合 Stage 接口的对象用于返回
        return {
            stageId,
            bossId,
            map: mapForStage,
            difficulty,
            seed,
            attempts: 1,
            createdAt,
        };
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
     * 从 ruleId 中提取 tier
     * 例如：monster_rumble_challenge_bronze_boss_1 -> bronze
     */
    private static extractTierFromRuleId(ruleId: string): string {
        // 尝试从 ruleId 中提取 tier（bronze, silver, gold 等）
        const tierMatch = ruleId.match(/(bronze|silver|gold|platinum|diamond)/i);
        if (tierMatch) {
            return tierMatch[1].toLowerCase();
        }

        // 默认返回 bronze
        return "bronze";
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

        return StageUtils.buildStageFromDoc(stageDoc);
    }

    /**
     * 创建初始规则关卡
     * 遍历所有 stageRuleConfigs，检查每个 ruleId 在 mr_stage_stats 中是否有记录
     * 如果没有记录，创建 stage 并在 mr_stage 和 mr_stage_stats 中保存
     * @param ctx 数据库上下文
     * @returns 创建的规则数量统计
     */
    static async createInitialRuleStages(ctx: any): Promise<{
        total: number;
        created: number;
        skipped: number;
        errors: string[];
    }> {
        const result = {
            total: 0,
            created: 0,
            skipped: 0,
            errors: [] as string[],
        };

        // 获取所有已有的 mr_stage_stats 记录，收集 ruleId 集合
        const existingStats = await ctx.db
            .query("mr_stage_stats")
            .collect();
        const existingRuleIds = new Set<string>();
        for (const stat of existingStats) {
            existingRuleIds.add(stat.ruleId);
        }

        // 遍历所有规则配置
        for (const ruleId of Object.keys(STAGE_RULE_CONFIGS)) {
            result.total++;

            try {
                // 检查是否已存在记录
                if (existingRuleIds.has(ruleId)) {
                    result.skipped++;
                    continue;
                }

                // 获取规则配置
                const ruleConfig = STAGE_RULE_CONFIGS[ruleId];
                if (!ruleConfig || !ruleConfig.stageContent) {
                    result.errors.push(`规则配置 ${ruleId} 缺少 stageContent`);
                    continue;
                }

                // 使用默认难度创建 stage
                const difficulty = ruleConfig.stageContent?.difficultyAdjustment?.difficultyMultiplier || 1.0;
                const stage = await this.createStage(ctx, {
                    ruleId,
                    difficulty,
                });

                if (!stage) {
                    result.errors.push(`创建 stage 失败: ${ruleId}`);
                    continue;
                }

                // 插入 mr_stage_stats 记录
                // powerLevel 默认为 1（可以根据难度或其他规则调整，这里先用默认值）
                await ctx.db.insert("mr_stage_stats", {
                    ruleId,
                    stageId: stage.stageId,
                    powerLevel: 1,
                    attempts: 0,
                });

                result.created++;
                // 更新 existingRuleIds，避免重复创建
                existingRuleIds.add(ruleId);
            } catch (error: any) {
                result.errors.push(`处理规则 ${ruleId} 时出错: ${error.message}`);
            }
        }

        return result;
    }
}
export const createInitialRuleStages = internalMutation({
    handler: async (ctx: any, args: any) => {
        return await StageManagerService.createInitialRuleStages(ctx);
    },
});

export const isStageUnlocked = internalQuery({
    args: { uid: v.string(), stageRule: v.object({ ruleId: v.string(), stageType: v.string() }) },
    handler: async (ctx: any, args: any) => {
        return await StageManagerService.isStageUnlocked(ctx, args.uid, args.stageRule);
    },
});
export const findCurrentStageId = internalQuery({
    args: { uid: v.string(), stageRule: v.object({ ruleId: v.string(), stageType: v.string() }) },
    handler: async (ctx: any, args: any) => {
        return await StageManagerService.findCurrentStageId(ctx, args.uid, args.stageRule);
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
