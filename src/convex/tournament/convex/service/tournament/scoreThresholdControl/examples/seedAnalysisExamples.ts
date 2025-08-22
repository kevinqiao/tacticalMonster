/**
 * Seed难度分析系统使用示例
 * 展示如何使用seed难度分析功能
 */

import { mutation, query } from "../../../../_generated/server";
import { PlayerHistoricalDataManager } from "../managers/PlayerHistoricalDataManager";

// ==================== 基础使用示例 ====================

/**
 * 基础seed难度分析示例
 */
export const basicSeedAnalysisExample = query({
    args: {},
    handler: async (ctx) => {
        try {
            const manager = new PlayerHistoricalDataManager(ctx);

            // 示例seed
            const testSeed = "seed_test_001";

            // 分析单个seed的难度
            const analysis = await manager.calculateSeedDifficultyCoefficient(testSeed);

            return {
                success: true,
                example: {
                    seed: testSeed,
                    analysis,
                    description: "基础seed难度分析示例"
                }
            };
        } catch (error) {
            console.error("基础seed分析示例失败:", error);
            return {
                success: false,
                error: `示例失败: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }
});

/**
 * 批量seed分析示例
 */
export const batchSeedAnalysisExample = query({
    args: {},
    handler: async (ctx) => {
        try {
            const manager = new PlayerHistoricalDataManager(ctx);

            // 示例seed列表
            const testSeeds = [
                "seed_easy_001",
                "seed_normal_001",
                "seed_hard_001",
                "seed_extreme_001"
            ];

            // 批量分析
            const results = await manager.analyzeMultipleSeedDifficulties(testSeeds);

            return {
                success: true,
                example: {
                    seeds: testSeeds,
                    results: Object.fromEntries(results),
                    description: "批量seed难度分析示例"
                }
            };
        } catch (error) {
            console.error("批量seed分析示例失败:", error);
            return {
                success: false,
                error: `示例失败: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }
});

/**
 * Seed难度报告示例
 */
export const seedDifficultyReportExample = query({
    args: {},
    handler: async (ctx) => {
        try {
            const manager = new PlayerHistoricalDataManager(ctx);

            // 获取完整的seed难度报告
            const report = await manager.getSeedDifficultyReport(true);

            return {
                success: true,
                example: {
                    report,
                    description: "Seed难度统计报告示例"
                }
            };
        } catch (error) {
            console.error("Seed难度报告示例失败:", error);
            return {
                success: false,
                error: `示例失败: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }
});

// ==================== 高级分析示例 ====================

/**
 * 玩家技能影响分析示例
 */
export const playerSkillImpactExample = query({
    args: {},
    handler: async (ctx) => {
        try {
            const manager = new PlayerHistoricalDataManager(ctx);

            // 分析不同seed对玩家技能的影响
            const testSeeds = ["seed_beginner", "seed_intermediate", "seed_advanced"];
            const results = [];

            for (const seed of testSeeds) {
                try {
                    const impact = await manager.analyzeSeedPlayerSkillImpact(seed);
                    results.push({
                        seed,
                        impact,
                        success: true
                    });
                } catch (error) {
                    results.push({
                        seed,
                        error: error instanceof Error ? error.message : String(error),
                        success: false
                    });
                }
            }

            return {
                success: true,
                example: {
                    seeds: testSeeds,
                    results,
                    description: "玩家技能影响分析示例"
                }
            };
        } catch (error) {
            console.error("玩家技能影响分析示例失败:", error);
            return {
                success: false,
                error: `示例失败: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }
});

/**
 * 分页查询示例（大数据量处理）
 */
export const paginationExample = query({
    args: {},
    handler: async (ctx) => {
        try {
            const manager = new PlayerHistoricalDataManager(ctx);

            // 示例：分页获取seed的比赛历史
            const testSeed = "seed_large_dataset";
            const pageSize = 100;

            const firstPage = await manager.getSeedMatchHistoryPaginated(testSeed, 1, pageSize);

            return {
                success: true,
                example: {
                    seed: testSeed,
                    firstPage,
                    paginationInfo: {
                        pageSize,
                        totalPages: Math.ceil(firstPage.totalCount / pageSize),
                        estimatedTotalSize: `${Math.round(firstPage.totalCount * 0.001)}KB`
                    },
                    description: "分页查询大数据量示例"
                }
            };
        } catch (error) {
            console.error("分页查询示例失败:", error);
            return {
                success: false,
                error: `示例失败: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }
});

/**
 * 流式处理示例
 */
export const streamProcessingExample = query({
    args: {},
    handler: async (ctx) => {
        try {
            const manager = new PlayerHistoricalDataManager(ctx);

            // 示例：流式处理seed数据
            const testSeed = "seed_stream_test";
            const batchSize = 500;

            // 注意：Convex不支持真正的流式处理，这里展示分页方式
            const streamInfo = await manager.getSeedMatchHistoryPaginated(testSeed, 1, batchSize);

            return {
                success: true,
                example: {
                    seed: testSeed,
                    streamInfo,
                    processingStrategy: {
                        method: "分页批处理",
                        batchSize,
                        totalBatches: Math.ceil(streamInfo.totalCount / batchSize),
                        estimatedTime: `${Math.ceil(streamInfo.totalCount / batchSize) * 0.05}s`
                    },
                    description: "流式处理大数据量示例"
                }
            };
        } catch (error) {
            console.error("流式处理示例失败:", error);
            return {
                success: false,
                error: `示例失败: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }
});

// ==================== 性能优化示例 ====================

/**
 * 性能统计示例
 */
export const performanceStatsExample = query({
    args: {},
    handler: async (ctx) => {
        try {
            const manager = new PlayerHistoricalDataManager(ctx);

            // 获取所有seed
            const allSeeds = await manager.getAllSeeds();

            // 计算性能统计
            const performanceStats = {
                totalSeeds: allSeeds.length,
                estimatedAnalysisTime: `${Math.ceil(allSeeds.length * 0.1)}s`,
                recommendedBatchSize: Math.min(1000, Math.max(100, Math.ceil(allSeeds.length / 10))),
                memoryUsage: `${Math.ceil(allSeeds.length * 0.01)}MB`,
                optimizationSuggestions: [
                    '对于大量seed，建议使用分页查询',
                    '考虑使用缓存减少重复计算',
                    '大数据量时建议分批处理',
                    '监控内存使用，避免OOM'
                ]
            };

            return {
                success: true,
                example: {
                    performanceStats,
                    description: "性能统计和优化建议示例"
                }
            };
        } catch (error) {
            console.error("性能统计示例失败:", error);
            return {
                success: false,
                error: `示例失败: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }
});

/**
 * 缓存策略示例
 */
export const cachingStrategyExample = query({
    args: {},
    handler: async (ctx) => {
        try {
            const manager = new PlayerHistoricalDataManager(ctx);

            // 模拟缓存策略
            const cachingStrategy = {
                cacheLevels: [
                    {
                        level: "L1",
                        description: "内存缓存",
                        ttl: "5分钟",
                        capacity: "1000个seed分析结果"
                    },
                    {
                        level: "L2",
                        description: "数据库缓存",
                        ttl: "24小时",
                        capacity: "10000个seed分析结果"
                    },
                    {
                        level: "L3",
                        description: "持久化存储",
                        ttl: "7天",
                        capacity: "无限制"
                    }
                ],
                cacheKeys: [
                    "seed_difficulty_{seed}",
                    "seed_statistics_{seed}",
                    "seed_player_impact_{seed}",
                    "seed_difficulty_report_{timestamp}"
                ],
                invalidationStrategies: [
                    "基于时间TTL",
                    "基于数据更新",
                    "基于访问频率",
                    "基于内存压力"
                ]
            };

            return {
                success: true,
                example: {
                    cachingStrategy,
                    description: "缓存策略示例"
                }
            };
        } catch (error) {
            console.error("缓存策略示例失败:", error);
            return {
                success: false,
                error: `示例失败: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }
});

// ==================== 综合示例 ====================

/**
 * 运行所有seed分析示例
 */
export const runAllSeedAnalysisExamples = mutation({
    args: {},
    handler: async (ctx) => {
        try {
            const results = [];

            // 运行基础示例
            try {
                const manager = new PlayerHistoricalDataManager(ctx);
                const testSeed = "seed_test_001";
                const analysis = await manager.calculateSeedDifficultyCoefficient(testSeed);

                results.push({
                    name: "基础seed难度分析",
                    success: true,
                    result: { seed: testSeed, analysis }
                });
            } catch (error) {
                results.push({
                    name: "基础seed难度分析",
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }

            // 运行批量分析示例
            try {
                const manager = new PlayerHistoricalDataManager(ctx);
                const testSeeds = ["seed_1", "seed_2", "seed_3"];
                const batchResults = await manager.analyzeMultipleSeedDifficulties(testSeeds);

                results.push({
                    name: "批量seed难度分析",
                    success: true,
                    result: { seeds: testSeeds, results: Object.fromEntries(batchResults) }
                });
            } catch (error) {
                results.push({
                    name: "批量seed难度分析",
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }

            // 运行难度报告示例
            try {
                const manager = new PlayerHistoricalDataManager(ctx);
                const report = await manager.getSeedDifficultyReport(true);

                results.push({
                    name: "Seed难度统计报告",
                    success: true,
                    result: report
                });
            } catch (error) {
                results.push({
                    name: "Seed难度统计报告",
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }

            // 运行性能统计示例
            try {
                const manager = new PlayerHistoricalDataManager(ctx);
                const allSeeds = await manager.getAllSeeds();

                const performanceStats = {
                    totalSeeds: allSeeds.length,
                    estimatedAnalysisTime: `${Math.ceil(allSeeds.length * 0.1)}s`,
                    recommendedBatchSize: Math.min(1000, Math.max(100, Math.ceil(allSeeds.length / 10)))
                };

                results.push({
                    name: "性能统计",
                    success: true,
                    result: performanceStats
                });
            } catch (error) {
                results.push({
                    name: "性能统计",
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }

            return {
                success: true,
                summary: {
                    totalExamples: results.length,
                    successfulExamples: results.filter(r => r.success).length,
                    failedExamples: results.filter(r => !r.success).length
                },
                results
            };
        } catch (error) {
            console.error("运行所有seed分析示例失败:", error);
            return {
                success: false,
                error: `运行失败: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }
});

// ==================== 使用说明 ====================

/**
 * 获取seed难度分析系统使用说明
 */
export const getSeedAnalysisUsageGuide = query({
    args: {},
    handler: async (ctx) => {
        return {
            system: "Seed难度分析系统",
            purpose: "基于match_results数据统计和分析每个seed对应的牌序难度系数",
            features: [
                "单个seed难度分析",
                "批量seed难度分析",
                "玩家技能影响分析",
                "分页查询大数据量",
                "性能优化和缓存策略",
                "完整的难度统计报告"
            ],
            usage: {
                basic: "使用 analyzeSeedDifficulty 分析单个seed",
                batch: "使用 analyzeMultipleSeedDifficulties 批量分析",
                report: "使用 getSeedDifficultyReport 获取统计报告",
                pagination: "使用 getSeedMatchHistoryPaginated 处理大数据量",
                performance: "使用 getSeedAnalysisPerformanceStats 获取性能建议"
            },
            dataRequirements: [
                "match_results表必须包含seed字段",
                "建议为seed字段创建索引以提高查询性能",
                "大量数据时建议使用分页查询",
                "考虑实现缓存机制减少重复计算"
            ],
            optimization: [
                "使用分页查询避免一次性加载大量数据",
                "实现缓存机制减少重复分析",
                "分批处理大量seed避免超时",
                "监控内存使用，避免OOM错误",
                "定期清理过期缓存数据"
            ]
        };
    }
});
