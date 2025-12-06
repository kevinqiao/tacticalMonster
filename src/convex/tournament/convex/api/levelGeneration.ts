/**
 * 动态关卡生成 API
 * 通过一个配置规则自动生成所有顺序关卡
 */

import { v } from "convex/values";
import { action, internalMutation } from "../_generated/server";
import { LEVEL_GENERATION_RULES } from "../data/levelGenerationRules";
import { SoloChallengeLevelService } from "../service/tournament/SoloChallengeLevelService";

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
 * 生成并注册关卡到系统的处理函数
 */
async function generateAndRegisterLevelsHandler(
    ctx: any,
    { ruleId, replaceExisting = false }: { ruleId: string; replaceExisting?: boolean }
) {
    try {
        // 1. 生成关卡配置
        const levels = SoloChallengeLevelService.generateLevels(ruleId);

        // 2. 检查已存在的关卡
        const existingTypeIds: string[] = [];
        for (const level of levels) {
            const exists = await SoloChallengeLevelService.checkLevelExists(ctx, level.typeId);
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
            error: error.message,
        };
    }
}

/**
 * 生成并注册关卡到系统
 * 将生成的关卡添加到 TOURNAMENT_CONFIGS 并保存到数据库
 */
export const generateAndRegisterLevels = internalMutation({
    args: {
        ruleId: v.string(),
        replaceExisting: v.optional(v.boolean()),  // 是否替换已存在的关卡
    },
    handler: generateAndRegisterLevelsHandler,
});

/**
 * 批量生成多个规则的关卡
 */
export const generateMultipleRuleLevels = internalMutation({
    args: {
        ruleIds: v.array(v.string()),
        replaceExisting: v.optional(v.boolean()),
    },
    handler: async (ctx, { ruleIds, replaceExisting = false }) => {
        const results: Array<{
            ruleId: string;
            success: boolean;
            generatedCount?: number;
            savedCount?: number;
            error?: string;
        }> = [];

        for (const ruleId of ruleIds) {
            try {
                // Call the handler function directly, not the mutation
                const result = await generateAndRegisterLevelsHandler(ctx, {
                    ruleId,
                    replaceExisting,
                });

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
 * 一键生成所有活跃规则的关卡
 */
export const generateAllActiveLevels = internalMutation({
    args: {
        replaceExisting: v.optional(v.boolean()),
    },
    handler: async (ctx, { replaceExisting = false }) => {
        const activeRules = LEVEL_GENERATION_RULES.filter(rule => rule.isActive);
        const ruleIds = activeRules.map(rule => rule.ruleId);

        // Call the handler function directly
        const generateMultipleRuleLevelsHandler = async (ctx: any, args: { ruleIds: string[]; replaceExisting?: boolean }) => {
            const results: Array<{
                ruleId: string;
                success: boolean;
                generatedCount?: number;
                savedCount?: number;
                error?: string;
            }> = [];

            for (const ruleId of args.ruleIds) {
                try {
                    const result = await generateAndRegisterLevelsHandler(ctx, {
                        ruleId,
                        replaceExisting: args.replaceExisting,
                    });

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
        };

        return await generateMultipleRuleLevelsHandler(ctx, {
            ruleIds,
            replaceExisting,
        });
    },
});

