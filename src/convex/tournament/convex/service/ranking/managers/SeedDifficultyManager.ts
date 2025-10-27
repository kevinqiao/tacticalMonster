/**
 * 种子难度管理器
 * 核心功能：种子的难度计算、分类和查询
 */

import {
    DifficultyConfig,
    DifficultyLevel,
    GetSeedsByDifficultyOptions,
    SeedDifficultyInfo
} from './types/SeedDifficulty';

export class SeedDifficultyManager {
    private ctx: any;

    // 难度配置
    private readonly DIFFICULTY_CONFIGS: Record<DifficultyLevel, DifficultyConfig> = {
        'very_easy': {
            level: 'very_easy',
            coefficientRange: { min: 0, max: 0.6 },
            scoreRange: { min: 1500, max: 10000 },
            description: '非常简单 - 适合新手玩家'
        },
        'easy': {
            level: 'easy',
            coefficientRange: { min: 0.6, max: 0.8 },
            scoreRange: { min: 1000, max: 1500 },
            description: '简单 - 适合初级玩家'
        },
        'normal': {
            level: 'normal',
            coefficientRange: { min: 0.8, max: 1.4 },
            scoreRange: { min: 700, max: 1000 },
            description: '普通 - 适合中级玩家'
        },
        'hard': {
            level: 'hard',
            coefficientRange: { min: 1.4, max: 1.8 },
            scoreRange: { min: 500, max: 700 },
            description: '困难 - 适合高级玩家'
        },
        'very_hard': {
            level: 'very_hard',
            coefficientRange: { min: 1.8, max: 2.0 },
            scoreRange: { min: 0, max: 500 },
            description: '非常困难 - 适合专家玩家'
        }
    };

    constructor(ctx: any) {
        this.ctx = ctx;
    }

    /**
     * 计算种子难度系数
     * 基于平均分数计算：分数越低，难度系数越高
     */
    calculateDifficultyCoefficient(averageScore: number): number {
        if (averageScore <= 0) return 2.0; // 最低分对应最高难度

        // 基准分数 1000，系数范围 0.5-2.0
        const coefficient = Math.max(0.5, Math.min(2.0, 1000 / averageScore));
        return Math.round(coefficient * 100) / 100;
    }

    /**
     * 根据难度系数确定难度等级
     */
    mapCoefficientToDifficultyLevel(coefficient: number): DifficultyLevel {
        if (coefficient >= 1.8) return 'very_hard';
        if (coefficient >= 1.4) return 'hard';
        if (coefficient >= 0.8) return 'normal';
        if (coefficient >= 0.6) return 'easy';
        return 'very_easy';
    }

    /**
     * 分析并更新种子难度
     */
    async analyzeAndUpdateSeedDifficulty(seed: string): Promise<boolean> {
        try {
            // 获取该种子的所有比赛
            const matches = await this.ctx.db
                .query("match_results")
                .withIndex("by_seed", (q: any) => q.eq("seed", seed))
                .collect();

            if (matches.length === 0) {
                console.log(`种子 ${seed} 没有比赛数据`);
                return false;
            }

            // 计算统计数据
            const scores = matches.map((m: any) => m.score || 0).filter((s: any) => s > 0);
            if (scores.length === 0) {
                console.log(`种子 ${seed} 没有有效分数`);
                return false;
            }

            const totalMatches = matches.length;
            const averageScore = scores.reduce((sum: any, score: any) => sum + score, 0) / scores.length;
            const minScore = Math.min(...scores);
            const maxScore = Math.max(...scores);

            // 计算难度系数和等级
            const difficultyCoefficient = this.calculateDifficultyCoefficient(averageScore);
            const difficultyLevel = this.mapCoefficientToDifficultyLevel(difficultyCoefficient);

            // 准备更新数据
            const updateData = {
                totalMatches,
                difficultyLevel,
                difficultyCoefficient,
                scoreStats: {
                    totalScores: scores.reduce((sum: any, score: any) => sum + score, 0),
                    averageScore,
                    minScore,
                    maxScore,
                    scoreCount: scores.length
                },
                lastAnalysisTime: new Date().toISOString(),
                lastMatchCreatedAt: matches[matches.length - 1]?.createdAt || new Date().toISOString()
            };

            // 更新或插入记录
            const existing = await this.ctx.db
                .query("seed_statistics_cache")
                .withIndex("by_seed", (q: any) => q.eq("seed", seed))
                .first();

            if (existing) {
                await this.ctx.db.patch(existing._id, updateData);
                console.log(`已更新种子 ${seed} 的难度: ${difficultyLevel} (${difficultyCoefficient})`);
            } else {
                await this.ctx.db.insert("seed_statistics_cache", {
                    seed,
                    createdAt: new Date().toISOString(),
                    ...updateData
                });
                console.log(`已创建种子 ${seed} 的难度记录: ${difficultyLevel} (${difficultyCoefficient})`);
            }

            return true;

        } catch (error) {
            console.error(`分析种子难度失败: ${seed}`, error);
            return false;
        }
    }

    /**
     * 根据难度等级获取种子列表
     */
    async getSeedsByDifficulty(options: GetSeedsByDifficultyOptions): Promise<SeedDifficultyInfo[]> {
        const {
            difficultyLevel,
            limit = 10,
            excludeSeeds = [],
            minMatches = 10
        } = options;

        try {
            // 查询指定难度的种子
            const seeds = await this.ctx.db
                .query("seed_statistics_cache")
                .withIndex("by_difficulty", (q: any) => q.eq("difficultyLevel", difficultyLevel))
                .filter((q: any) => q.gte(q.field("totalMatches"), minMatches))
                .collect();

            // 过滤掉排除的种子
            const filteredSeeds = seeds.filter((s: any) => !excludeSeeds.includes(s.seed));

            // 转换为 SeedDifficultyInfo 格式并按质量排序
            const result: SeedDifficultyInfo[] = filteredSeeds
                .map((s: any) => ({
                    seed: s.seed,
                    difficultyLevel: s.difficultyLevel as DifficultyLevel,
                    difficultyCoefficient: s.difficultyCoefficient,
                    averageScore: s.scoreStats?.averageScore || 0,
                    totalMatches: s.totalMatches,
                    lastUpdated: s.lastAnalysisTime
                }))
                .sort((a: any, b: any) => {
                    // 优先考虑比赛场次多的
                    const scoreA = a.totalMatches * 0.7 -
                        (new Date().getTime() - new Date(a.lastUpdated).getTime()) / (1000 * 60 * 60 * 24) * 0.3;
                    const scoreB = b.totalMatches * 0.7 -
                        (new Date().getTime() - new Date(b.lastUpdated).getTime()) / (1000 * 60 * 60 * 24) * 0.3;
                    return scoreB - scoreA;
                })
                .slice(0, limit);

            console.log(`获取到 ${result.length} 个 ${difficultyLevel} 难度的种子`);
            return result;

        } catch (error) {
            console.error(`根据难度获取种子失败: ${difficultyLevel}`, error);
            return [];
        }
    }

    /**
     * 获取种子的难度信息
     */
    async getSeedDifficulty(seed: string): Promise<SeedDifficultyInfo | null> {
        try {
            const record = await this.ctx.db
                .query("seed_statistics_cache")
                .withIndex("by_seed", (q: any) => q.eq("seed", seed))
                .first();

            if (!record) {
                return null;
            }

            return {
                seed: record.seed,
                difficultyLevel: record.difficultyLevel as DifficultyLevel,
                difficultyCoefficient: record.difficultyCoefficient,
                averageScore: record.scoreStats?.averageScore || 0,
                totalMatches: record.totalMatches,
                lastUpdated: record.lastAnalysisTime
            };

        } catch (error) {
            console.error(`获取种子难度失败: ${seed}`, error);
            return null;
        }
    }

    /**
     * 批量更新多个种子的难度
     */
    async batchAnalyzeSeedDifficulties(seeds: string[]): Promise<number> {
        let successCount = 0;

        for (const seed of seeds) {
            const success = await this.analyzeAndUpdateSeedDifficulty(seed);
            if (success) {
                successCount++;
            }
        }

        console.log(`批量分析完成: ${successCount}/${seeds.length}`);
        return successCount;
    }

    /**
     * 获取难度配置
     */
    getDifficultyConfig(level: DifficultyLevel): DifficultyConfig {
        return this.DIFFICULTY_CONFIGS[level];
    }

    /**
     * 获取所有难度配置
     */
    getAllDifficultyConfigs(): DifficultyConfig[] {
        return Object.values(this.DIFFICULTY_CONFIGS);
    }

    /**
     * 获取难度分布统计
     */
    async getDifficultyDistribution(): Promise<Record<DifficultyLevel, number>> {
        const distribution: Record<DifficultyLevel, number> = {
            'very_easy': 0,
            'easy': 0,
            'normal': 0,
            'hard': 0,
            'very_hard': 0
        };

        try {
            // 遍历所有难度等级
            for (const level of Object.keys(this.DIFFICULTY_CONFIGS) as DifficultyLevel[]) {
                const seeds = await this.ctx.db
                    .query("seed_statistics_cache")
                    .withIndex("by_difficulty", (q: any) => q.eq("difficultyLevel", level))
                    .collect();

                distribution[level] = seeds.length;
            }

            return distribution;

        } catch (error) {
            console.error('获取难度分布失败', error);
            return distribution;
        }
    }
}
