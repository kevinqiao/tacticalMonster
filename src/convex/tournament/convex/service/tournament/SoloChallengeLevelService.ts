/**
 * 单人挑战关卡生成服务
 * 根据生成规则动态创建单人挑战关卡配置并注册到系统中
 */

import { v } from "convex/values";
import { action, internalMutation } from "../../_generated/server";
import { getLevelGenerationRule, LEVEL_GENERATION_RULES, LevelGenerator } from "../../data/levelGenerationRules";
import { TournamentConfig } from "../../data/tournamentConfigs";

export class SoloChallengeLevelService {
    /**
     * 根据规则生成关卡配置
     */
    static generateLevels(ruleId: string): TournamentConfig[] {
        const rule = getLevelGenerationRule(ruleId);
        if (!rule) {
            throw new Error(`生成规则不存在: ${ruleId}`);
        }

        return LevelGenerator.generateLevels(rule);
    }

    /**
     * 生成并注册关卡到系统（保存到数据库）
     * @param ctx Convex context
     * @param ruleId 生成规则ID
     * @param replaceExisting 是否替换已存在的关卡
     */
    static async generateAndRegisterLevels(
        ctx: any,
        ruleId: string,
        replaceExisting: boolean = false
    ): Promise<{
        success: boolean;
        generatedCount: number;
        savedCount: number;
        skippedCount: number;
        levelTypeIds: string[];
        error?: string;
    }> {
        try {
            // 1. 生成关卡配置
            const levels = this.generateLevels(ruleId);

            // 2. 检查已存在的关卡
            const existingTypeIds: string[] = [];
            for (const level of levels) {
                const exists = await this.checkLevelExists(ctx, level.typeId);
                if (exists) {
                    existingTypeIds.push(level.typeId);
                }
            }

            // 3. 决定要保存的关卡
            const levelsToSave = replaceExisting
                ? levels  // 替换所有
                : levels.filter(level => !existingTypeIds.includes(level.typeId));  // 只保存新的

            // 4. 保存关卡到数据库
            let savedCount = 0;
            for (const level of levelsToSave) {
                // 如果存在且不替换，跳过
                if (!replaceExisting && existingTypeIds.includes(level.typeId)) {
                    continue;
                }

                // 如果存在且要替换，先删除
                if (replaceExisting && existingTypeIds.includes(level.typeId)) {
                    const existing = await ctx.db
                        .query("tournament_types")
                        .withIndex("by_typeId", (q: any) => q.eq("typeId", level.typeId))
                        .first();
                    if (existing) {
                        await ctx.db.delete(existing._id);
                    }
                }

                // 插入新配置（添加必需的 priority 字段）
                const levelWithPriority = {
                    ...level,
                    priority: level.soloChallenge?.levelChain?.chainOrder || 0,  // 使用关卡链顺序作为优先级
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                } as any;  // 使用 any 避免类型检查问题，因为 schema 和 TypeScript 类型可能不完全匹配

                await ctx.db.insert("tournament_types", levelWithPriority);
                savedCount++;
            }

            return {
                success: true,
                generatedCount: levels.length,
                savedCount,
                skippedCount: existingTypeIds.length - (replaceExisting ? 0 : existingTypeIds.length),
                levelTypeIds: levelsToSave.map(l => l.typeId),
            };
        } catch (error: any) {
            return {
                success: false,
                generatedCount: 0,
                savedCount: 0,
                skippedCount: 0,
                levelTypeIds: [],
                error: error.message,
            };
        }
    }

    /**
     * 检查关卡是否已存在
     */
    static async checkLevelExists(
        ctx: any,
        typeId: string
    ): Promise<boolean> {
        const existing = await ctx.db
            .query("tournament_types")
            .withIndex("by_typeId", (q: any) => q.eq("typeId", typeId))
            .first();

        return !!existing;
    }

    /**
     * 批量检查关卡是否存在
     */
    static async checkLevelsExist(
        ctx: any,
        typeIds: string[]
    ): Promise<{ existing: string[]; missing: string[] }> {
        const existing: string[] = [];
        const missing: string[] = [];

        for (const typeId of typeIds) {
            const exists = await this.checkLevelExists(ctx, typeId);
            if (exists) {
                existing.push(typeId);
            } else {
                missing.push(typeId);
            }
        }

        return { existing, missing };
    }

    /**
     * 获取需要生成的关卡（排除已存在的）
     */
    static async getLevelsToGenerate(
        ctx: any,
        ruleId: string
    ): Promise<TournamentConfig[]> {
        // 1. 生成所有关卡配置
        const allLevels = this.generateLevels(ruleId);

        // 2. 检查哪些关卡已存在
        const typeIds = allLevels.map(l => l.typeId);
        const { existing } = await this.checkLevelsExist(ctx, typeIds);

        // 3. 返回不存在的关卡
        return allLevels.filter(level => !existing.includes(level.typeId));
    }

    /**
     * 生成缺失的关卡
     */
    static async generateMissingLevels(
        ctx: any,
        ruleId: string
    ): Promise<{
        success: boolean;
        generatedCount: number;
        skippedCount: number;
        levelTypeIds: string[];
        error?: string;
    }> {
        try {
            // 1. 获取需要生成的关卡
            const levelsToGenerate = await this.getLevelsToGenerate(ctx, ruleId);

            if (levelsToGenerate.length === 0) {
                return {
                    success: true,
                    generatedCount: 0,
                    skippedCount: 0,
                    levelTypeIds: [],
                };
            }

            // 2. 生成关卡配置
            const allLevels = this.generateLevels(ruleId);
            const existingTypeIds = (await this.checkLevelsExist(
                ctx,
                allLevels.map(l => l.typeId)
            )).existing;

            return {
                success: true,
                generatedCount: levelsToGenerate.length,
                skippedCount: existingTypeIds.length,
                levelTypeIds: levelsToGenerate.map(l => l.typeId),
            };
        } catch (error: any) {
            return {
                success: false,
                generatedCount: 0,
                skippedCount: 0,
                levelTypeIds: [],
                error: error.message,
            };
        }
    }

    /**
     * 批量生成多个规则的关卡
     */
    static async generateMultipleRuleLevels(
        ctx: any,
        ruleIds: string[],
        replaceExisting: boolean = false
    ): Promise<{
        success: boolean;
        results: Array<{
            ruleId: string;
            success: boolean;
            generatedCount?: number;
            savedCount?: number;
            error?: string;
        }>;
        totalGenerated: number;
        totalSaved: number;
    }> {
        const results: Array<{
            ruleId: string;
            success: boolean;
            generatedCount?: number;
            savedCount?: number;
            error?: string;
        }> = [];

        for (const ruleId of ruleIds) {
            try {
                const result = await this.generateAndRegisterLevels(ctx, ruleId, replaceExisting);

                results.push({
                    ruleId,
                    success: result.success,
                    generatedCount: result.generatedCount,
                    savedCount: result.savedCount,
                    error: result.error,
                });
            } catch (error: any) {
                results.push({
                    ruleId,
                    success: false,
                    error: error.message,
                });
            }
        }

        return {
            success: true,
            results,
            totalGenerated: results.reduce((sum, r) => sum + (r.generatedCount || 0), 0),
            totalSaved: results.reduce((sum, r) => sum + (r.savedCount || 0), 0),
        };
    }

    /**
     * 生成所有活跃规则的关卡
     */
    static async generateAllActiveLevels(
        ctx: any,
        replaceExisting: boolean = false
    ): Promise<{
        success: boolean;
        results: Array<{
            ruleId: string;
            success: boolean;
            generatedCount?: number;
            savedCount?: number;
            error?: string;
        }>;
        totalGenerated: number;
        totalSaved: number;
    }> {
        // 动态导入以避免循环依赖
        const { LEVEL_GENERATION_RULES } = await import("../../data/levelGenerationRules");

        const activeRules = LEVEL_GENERATION_RULES.filter(rule => rule.isActive);
        const ruleIds = activeRules.map(rule => rule.ruleId);

        return await this.generateMultipleRuleLevels(ctx, ruleIds, replaceExisting);
    }
}

// ============================================================================
// Convex API 端点导出
// 与 tournamentService.ts 保持相同的设计模式
// ============================================================================

/**
 * 根据规则生成关卡配置（不保存到数据库）
 * 用于预览生成的关卡
 */
export const generateLevels = action({
    args: {
        ruleId: v.string(),
    },
    handler: async (ctx, { ruleId }) => {
        try {
            const levels = SoloChallengeLevelService.generateLevels(ruleId);

            return {
                success: true,
                count: levels.length,
                levels: levels.map(level => ({
                    typeId: level.typeId,
                    name: level.name,
                    chapter: level.soloChallenge?.chapter,
                    levelNumber: level.soloChallenge?.levelNumber,
                    chainOrder: level.soloChallenge?.levelChain?.chainOrder,
                    previousLevels: level.soloChallenge?.levelChain?.previousLevels,
                    nextLevels: level.soloChallenge?.levelChain?.nextLevels,
                })),
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message,
            };
        }
    },
});

/**
 * 生成并注册关卡到系统
 * 将生成的关卡添加到 TOURNAMENT_CONFIGS 并保存到数据库
 */
export const generateAndRegisterLevels = internalMutation({
    args: {
        ruleId: v.string(),
        replaceExisting: v.optional(v.boolean()),  // 是否替换已存在的关卡
    },
    handler: async (ctx, args) => {
        return await SoloChallengeLevelService.generateAndRegisterLevels(
            ctx,
            args.ruleId,
            args.replaceExisting || false
        );
    },
});

/**
 * 批量生成多个规则的关卡
 */
export const generateMultipleRuleLevels = internalMutation({
    args: {
        ruleIds: v.array(v.string()),
        replaceExisting: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        return await SoloChallengeLevelService.generateMultipleRuleLevels(
            ctx,
            args.ruleIds,
            args.replaceExisting || false
        );
    },
});

/**
 * 获取所有可用的生成规则
 */
export const getGenerationRules = action({
    args: {},
    handler: async (ctx) => {
        return LEVEL_GENERATION_RULES
            .filter(rule => rule.isActive)
            .map(rule => ({
                ruleId: rule.ruleId,
                name: rule.name,
                description: rule.description,
                generationScope: rule.generationScope,
            }));
    },
});

/**
 * 生成所有活跃规则的关卡处理函数
 * 导出以便其他模块可以直接调用
 */
export async function generateAllActiveLevelsHandler(
    ctx: any,
    { replaceExisting = false }: { replaceExisting?: boolean }
) {
    return await SoloChallengeLevelService.generateAllActiveLevels(ctx, replaceExisting);
}

/**
 * 一键生成所有活跃规则的关卡
 */
export const generateAllActiveLevels = internalMutation({
    args: {
        replaceExisting: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        return await SoloChallengeLevelService.generateAllActiveLevels(
            ctx,
            args.replaceExisting || false
        );
    },
});

