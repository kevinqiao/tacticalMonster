/**
 * 单人挑战关卡生成服务
 * 根据生成规则动态创建单人挑战关卡配置并注册到系统中
 */

import { LevelGenerator, getLevelGenerationRule } from "../../data/levelGenerationRules";
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
     * 生成关卡并保存到数据库（如果需要）
     * 注意：这里只生成配置，实际保存到 tournament_types 表需要调用 TournamentService
     */
    static async generateAndRegisterLevels(
        ctx: any,
        ruleId: string
    ): Promise<{
        success: boolean;
        generatedCount: number;
        levelTypeIds: string[];
        error?: string;
    }> {
        try {
            // 1. 生成关卡配置
            const levels = this.generateLevels(ruleId);

            // 2. 验证生成的配置
            const validLevels: TournamentConfig[] = [];
            for (const level of levels) {
                // 这里可以添加验证逻辑
                validLevels.push(level);
            }

            // 3. 返回生成的关卡信息
            // 注意：实际保存到数据库需要调用 TournamentService.loadTournamentConfig
            return {
                success: true,
                generatedCount: validLevels.length,
                levelTypeIds: validLevels.map(l => l.typeId),
            };
        } catch (error: any) {
            return {
                success: false,
                generatedCount: 0,
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
}

