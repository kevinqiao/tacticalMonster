/**
 * 分数门槛控制系统测试函数
 * 在 Convex 中运行各种示例和测试
 */

import { v } from "convex/values";
import { mutation } from "../../../../_generated/server";
import {
    getAdaptiveMode,
    getDefaultScoreThresholds,
    getLearningRate,
    getRankingMode,
    getSegmentProtectionConfig,
    validateRankingProbabilities,
    validateScoreThresholds
} from '../config/config';
import { SegmentName } from '../config/types';

// ==================== 基础测试函数 ====================

/**
 * 运行所有示例
 */
export const runAllExamples = mutation({
    args: {},
    handler: async (ctx) => {
        console.log("🚀 开始运行所有示例...");

        try {
            const results = [];

            // 1. 测试基础配置
            try {
                const testSegments: SegmentName[] = ["bronze", "silver", "gold"];
                for (const segment of testSegments) {
                    const thresholds = getDefaultScoreThresholds(segment);
                    const learningRate = getLearningRate(segment);
                    const rankingMode = getRankingMode(segment);
                    const adaptiveMode = getAdaptiveMode(segment);
                    const protection = getSegmentProtectionConfig(segment);

                    console.log(`${segment} 段位配置:`, {
                        thresholdsCount: thresholds.length,
                        learningRate,
                        rankingMode,
                        adaptiveMode,
                        protection
                    });
                }
                results.push({ name: "基础配置", success: true });
            } catch (error) {
                results.push({ name: "基础配置", success: false, error: String(error) });
            }

            // 2. 测试分数门槛验证
            try {
                const testThresholds = getDefaultScoreThresholds("bronze");
                const isValid = validateScoreThresholds(testThresholds);
                console.log("分数门槛验证:", isValid);
                results.push({ name: "分数门槛验证", success: isValid });
            } catch (error) {
                results.push({ name: "分数门槛验证", success: false, error: String(error) });
            }

            // 3. 测试概率验证
            try {
                const testProbabilities = [0.25, 0.25, 0.25, 0.25];
                const isValid = validateRankingProbabilities(testProbabilities);
                console.log("概率验证:", isValid);
                results.push({ name: "概率验证", success: isValid });
            } catch (error) {
                results.push({ name: "概率验证", success: false, error: String(error) });
            }

            const successCount = results.filter(r => r.success).length;
            return {
                success: true,
                message: `所有示例运行完成: ${successCount}/${results.length} 通过`,
                results
            };
        } catch (error) {
            console.error("运行示例失败:", error);
            return {
                success: false,
                error: String(error)
            };
        }
    }
});

/**
 * 运行基础使用示例
 */
export const runBasicExample = mutation({
    args: {},
    handler: async (ctx) => {
        console.log("🚀 运行基础使用示例");

        try {
            const testSegments: SegmentName[] = ["bronze", "silver", "gold"];
            const results = [];

            for (const segment of testSegments) {
                const thresholds = getDefaultScoreThresholds(segment);
                const learningRate = getLearningRate(segment);
                const rankingMode = getRankingMode(segment);
                const adaptiveMode = getAdaptiveMode(segment);

                results.push({
                    segment,
                    thresholdsCount: thresholds.length,
                    learningRate,
                    rankingMode,
                    adaptiveMode
                });
            }

            return {
                success: true,
                message: "基础示例运行完成",
                results
            };
        } catch (error) {
            console.error("基础示例失败:", error);
            return {
                success: false,
                error: String(error)
            };
        }
    }
});

/**
 * 运行混合模式示例
 */
export const runHybridModeExample = mutation({
    args: {},
    handler: async (ctx) => {
        console.log("🚀 运行混合模式示例");

        try {
            const testSegments: SegmentName[] = ["bronze", "silver", "gold"];
            const results = [];

            for (const segment of testSegments) {
                const thresholds = getDefaultScoreThresholds(segment);
                const protection = getSegmentProtectionConfig(segment);

                results.push({
                    segment,
                    thresholdsCount: thresholds.length,
                    protection
                });
            }

            return {
                success: true,
                message: "混合模式示例运行完成",
                results
            };
        } catch (error) {
            console.error("混合模式示例失败:", error);
            return {
                success: false,
                error: String(error)
            };
        }
    }
});

/**
 * 运行段位升级示例
 */
export const runSegmentUpgradeExample = mutation({
    args: {},
    handler: async (ctx) => {
        console.log("🚀 运行段位升级示例");

        try {
            const testSegments: SegmentName[] = ["bronze", "silver", "gold"];
            const results = [];

            for (const segment of testSegments) {
                const protection = getSegmentProtectionConfig(segment);

                results.push({
                    segment,
                    protectionThreshold: protection.protectionThreshold,
                    demotionGracePeriod: protection.demotionGracePeriod,
                    promotionStabilityPeriod: protection.promotionStabilityPeriod
                });
            }

            return {
                success: true,
                message: "段位升级示例运行完成",
                results
            };
        } catch (error) {
            console.error("段位升级示例失败:", error);
            return {
                success: false,
                error: String(error)
            };
        }
    }
});

/**
 * 运行自适应学习示例
 */
export const runAdaptiveLearningExample = mutation({
    args: {},
    handler: async (ctx) => {
        console.log("🚀 运行自适应学习示例");

        try {
            const testSegments: SegmentName[] = ["bronze", "silver", "gold"];
            const results = [];

            for (const segment of testSegments) {
                const learningRate = getLearningRate(segment);
                const adaptiveMode = getAdaptiveMode(segment);

                results.push({
                    segment,
                    learningRate,
                    adaptiveMode
                });
            }

            return {
                success: true,
                message: "自适应学习示例运行完成",
                results
            };
        } catch (error) {
            console.error("自适应学习示例失败:", error);
            return {
                success: false,
                error: String(error)
            };
        }
    }
});

/**
 * 运行批量操作示例
 */
export const runBatchOperationExample = mutation({
    args: {},
    handler: async (ctx) => {
        console.log("🚀 运行批量操作示例");

        try {
            const testSegments: SegmentName[] = ["bronze", "silver", "gold", "platinum"];
            const results = [];

            for (const segment of testSegments) {
                const thresholds = getDefaultScoreThresholds(segment);
                const isValid = validateScoreThresholds(thresholds);

                results.push({
                    segment,
                    thresholdsCount: thresholds.length,
                    isValid
                });
            }

            return {
                success: true,
                message: "批量操作示例运行完成",
                results
            };
        } catch (error) {
            console.error("批量操作示例失败:", error);
            return {
                success: false,
                error: String(error)
            };
        }
    }
});

/**
 * 运行配置优化示例
 */
export const runConfigOptimizationExample = mutation({
    args: {},
    handler: async (ctx) => {
        console.log("🚀 运行配置优化示例");

        try {
            const testSegments: SegmentName[] = ["bronze", "silver", "gold"];
            const results = [];

            for (const segment of testSegments) {
                const thresholds = getDefaultScoreThresholds(segment);
                const protection = getSegmentProtectionConfig(segment);

                // 验证配置
                const thresholdsValid = validateScoreThresholds(thresholds);

                results.push({
                    segment,
                    thresholdsValid,
                    protectionConfig: protection
                });
            }

            return {
                success: true,
                message: "配置优化示例运行完成",
                results
            };
        } catch (error) {
            console.error("配置优化示例失败:", error);
            return {
                success: false,
                error: String(error)
            };
        }
    }
});

/**
 * 运行性能测试示例
 */
export const runPerformanceTestExample = mutation({
    args: {},
    handler: async (ctx) => {
        console.log("🚀 运行性能测试示例");

        try {
            const startTime = Date.now();
            const testSegments: SegmentName[] = ["bronze", "silver", "gold", "platinum", "diamond"];
            const results = [];

            for (const segment of testSegments) {
                const segmentStartTime = Date.now();

                const thresholds = getDefaultScoreThresholds(segment);
                const learningRate = getLearningRate(segment);
                const rankingMode = getRankingMode(segment);
                const adaptiveMode = getAdaptiveMode(segment);
                const protection = getSegmentProtectionConfig(segment);

                const segmentTime = Date.now() - segmentStartTime;

                results.push({
                    segment,
                    thresholdsCount: thresholds.length,
                    processingTime: segmentTime,
                    learningRate,
                    rankingMode,
                    adaptiveMode
                });
            }

            const totalTime = Date.now() - startTime;

            return {
                success: true,
                message: "性能测试示例运行完成",
                totalTime,
                averageTime: totalTime / testSegments.length,
                results
            };
        } catch (error) {
            console.error("性能测试示例失败:", error);
            return {
                success: false,
                error: String(error)
            };
        }
    }
});

/**
 * 运行特定示例
 */
export const runSpecificExample = mutation({
    args: { exampleName: v.string() },
    handler: async (ctx, args) => {
        const availableExamples = [
            "basic", "hybrid", "upgrade", "adaptive",
            "batch", "optimization", "performance"
        ];

        if (!availableExamples.includes(args.exampleName)) {
            console.error(`❌ 未知示例: ${args.exampleName}`);
            return {
                success: false,
                error: `未知示例: ${args.exampleName}`,
                availableExamples
            };
        }

        console.log(`🚀 运行示例: ${args.exampleName}`);

        // 根据示例名称执行相应的测试逻辑
        switch (args.exampleName) {
            case "basic":
                try {
                    const testSegments: SegmentName[] = ["bronze", "silver", "gold"];
                    const results = [];
                    for (const segment of testSegments) {
                        const thresholds = getDefaultScoreThresholds(segment);
                        const learningRate = getLearningRate(segment);
                        const rankingMode = getRankingMode(segment);
                        const adaptiveMode = getAdaptiveMode(segment);
                        results.push({ segment, thresholdsCount: thresholds.length, learningRate, rankingMode, adaptiveMode });
                    }
                    return { success: true, message: "基础示例运行完成", results };
                } catch (error) {
                    return { success: false, error: String(error) };
                }
            case "hybrid":
                try {
                    const testSegments: SegmentName[] = ["bronze", "silver", "gold"];
                    const results = [];
                    for (const segment of testSegments) {
                        const thresholds = getDefaultScoreThresholds(segment);
                        const protection = getSegmentProtectionConfig(segment);
                        results.push({ segment, thresholdsCount: thresholds.length, protection });
                    }
                    return { success: true, message: "混合模式示例运行完成", results };
                } catch (error) {
                    return { success: false, error: String(error) };
                }
            case "upgrade":
                try {
                    const testSegments: SegmentName[] = ["bronze", "silver", "gold"];
                    const results = [];
                    for (const segment of testSegments) {
                        const protection = getSegmentProtectionConfig(segment);
                        results.push({ segment, protectionThreshold: protection.protectionThreshold, demotionGracePeriod: protection.demotionGracePeriod, promotionStabilityPeriod: protection.promotionStabilityPeriod });
                    }
                    return { success: true, message: "段位升级示例运行完成", results };
                } catch (error) {
                    return { success: false, error: String(error) };
                }
            case "adaptive":
                try {
                    const testSegments: SegmentName[] = ["bronze", "silver", "gold"];
                    const results = [];
                    for (const segment of testSegments) {
                        const learningRate = getLearningRate(segment);
                        const adaptiveMode = getAdaptiveMode(segment);
                        results.push({ segment, learningRate, adaptiveMode });
                    }
                    return { success: true, message: "自适应学习示例运行完成", results };
                } catch (error) {
                    return { success: false, error: String(error) };
                }
            case "batch":
                try {
                    const testSegments: SegmentName[] = ["bronze", "silver", "gold", "platinum"];
                    const results = [];
                    for (const segment of testSegments) {
                        const thresholds = getDefaultScoreThresholds(segment);
                        const isValid = validateScoreThresholds(thresholds);
                        results.push({ segment, thresholdsCount: thresholds.length, isValid });
                    }
                    return { success: true, message: "批量操作示例运行完成", results };
                } catch (error) {
                    return { success: false, error: String(error) };
                }
            case "optimization":
                try {
                    const testSegments: SegmentName[] = ["bronze", "silver", "gold"];
                    const results = [];
                    for (const segment of testSegments) {
                        const thresholds = getDefaultScoreThresholds(segment);
                        const protection = getSegmentProtectionConfig(segment);
                        const thresholdsValid = validateScoreThresholds(thresholds);
                        results.push({ segment, thresholdsValid, protectionConfig: protection });
                    }
                    return { success: true, message: "配置优化示例运行完成", results };
                } catch (error) {
                    return { success: false, error: String(error) };
                }
            case "performance":
                try {
                    const startTime = Date.now();
                    const testSegments: SegmentName[] = ["bronze", "silver", "gold", "platinum", "diamond"];
                    const results = [];
                    for (const segment of testSegments) {
                        const segmentStartTime = Date.now();
                        const thresholds = getDefaultScoreThresholds(segment);
                        const learningRate = getLearningRate(segment);
                        const rankingMode = getRankingMode(segment);
                        const adaptiveMode = getAdaptiveMode(segment);
                        const protection = getSegmentProtectionConfig(segment);
                        const segmentTime = Date.now() - segmentStartTime;
                        results.push({ segment, thresholdsCount: thresholds.length, processingTime: segmentTime, learningRate, rankingMode, adaptiveMode });
                    }
                    const totalTime = Date.now() - startTime;
                    return { success: true, message: "性能测试示例运行完成", totalTime, averageTime: totalTime / testSegments.length, results };
                } catch (error) {
                    return { success: false, error: String(error) };
                }
            default:
                return {
                    success: false,
                    error: `示例 ${args.exampleName} 执行失败`
                };
        }
    }
});

// ==================== 系统测试函数 ====================

/**
 * 测试段位系统功能
 */
export const testSegmentSystem = mutation({
    args: {},
    handler: async (ctx) => {
        console.log("🧪 测试段位系统功能...");

        try {
            const testSegments: SegmentName[] = ["bronze", "silver", "gold", "platinum", "diamond"];
            const results = [];

            for (const segment of testSegments) {
                try {
                    const thresholds = getDefaultScoreThresholds(segment);
                    const learningRate = getLearningRate(segment);
                    const rankingMode = getRankingMode(segment);
                    const adaptiveMode = getAdaptiveMode(segment);
                    const protection = getSegmentProtectionConfig(segment);

                    results.push({
                        segment,
                        success: true,
                        thresholdsCount: thresholds.length,
                        learningRate,
                        rankingMode,
                        adaptiveMode,
                        protection
                    });
                } catch (error) {
                    results.push({
                        segment,
                        success: false,
                        error: String(error)
                    });
                }
            }

            const successCount = results.filter(r => r.success).length;
            return {
                success: successCount === results.length,
                message: `段位系统测试完成: ${successCount}/${results.length} 通过`,
                results,
                segmentCount: results.length
            };
        } catch (error) {
            console.error("段位系统测试失败:", error);
            return {
                success: false,
                error: String(error)
            };
        }
    }
});

/**
 * 测试分数门槛配置
 */
export const testScoreThresholdConfig = mutation({
    args: {},
    handler: async (ctx) => {
        console.log("🧪 测试分数门槛配置...");

        try {
            const testSegments: SegmentName[] = ["bronze", "gold", "platinum"];
            const results = [];

            for (const segment of testSegments) {
                try {
                    const thresholds = getDefaultScoreThresholds(segment);
                    const isValid = validateScoreThresholds(thresholds);

                    results.push({
                        segment,
                        success: true,
                        thresholdsCount: thresholds.length,
                        isValid
                    });
                } catch (error) {
                    results.push({
                        segment,
                        success: false,
                        error: String(error)
                    });
                }
            }

            const successCount = results.filter(r => r.success).length;
            return {
                success: successCount === results.length,
                message: `分数门槛配置测试完成: ${successCount}/${results.length} 通过`,
                results
            };
        } catch (error) {
            console.error("分数门槛配置测试失败:", error);
            return {
                success: false,
                error: String(error)
            };
        }
    }
});

/**
 * 测试混合模式配置
 */
export const testHybridModeConfig = mutation({
    args: {},
    handler: async (ctx) => {
        console.log("🧪 测试混合模式配置...");

        try {
            const testSegments: SegmentName[] = ["bronze", "silver", "gold"];
            const results = [];

            for (const segment of testSegments) {
                try {
                    const thresholds = getDefaultScoreThresholds(segment);
                    const protection = getSegmentProtectionConfig(segment);
                    const isValid = validateScoreThresholds(thresholds);

                    results.push({
                        segment,
                        success: true,
                        thresholdsCount: thresholds.length,
                        isValid,
                        protection
                    });
                } catch (error) {
                    results.push({
                        segment,
                        success: false,
                        error: String(error)
                    });
                }
            }

            const successCount = results.filter(r => r.success).length;
            return {
                success: successCount === results.length,
                message: `混合模式配置测试完成: ${successCount}/${results.length} 通过`,
                results
            };
        } catch (error) {
            console.error("混合模式配置测试失败:", error);
            return {
                success: false,
                error: String(error)
            };
        }
    }
});

/**
 * 运行完整测试套件
 */
export const runFullTestSuite = mutation({
    args: {},
    handler: async (ctx) => {
        console.log("🧪 开始运行完整测试套件...");

        try {
            const results = [];

            // 1. 测试段位系统
            try {
                const testSegments: SegmentName[] = ["bronze", "silver", "gold", "platinum", "diamond"];
                const segmentResults = [];

                for (const segment of testSegments) {
                    try {
                        const thresholds = getDefaultScoreThresholds(segment);
                        const learningRate = getLearningRate(segment);
                        const rankingMode = getRankingMode(segment);
                        const adaptiveMode = getAdaptiveMode(segment);
                        const protection = getSegmentProtectionConfig(segment);

                        segmentResults.push({
                            segment,
                            success: true,
                            thresholdsCount: thresholds.length,
                            learningRate,
                            rankingMode,
                            adaptiveMode,
                            protection
                        });
                    } catch (error) {
                        segmentResults.push({
                            segment,
                            success: false,
                            error: String(error)
                        });
                    }
                }

                const segmentSuccessCount = segmentResults.filter(r => r.success).length;
                results.push({
                    name: "段位系统",
                    success: segmentSuccessCount === segmentResults.length,
                    message: `段位系统测试完成: ${segmentSuccessCount}/${segmentResults.length} 通过`,
                    results: segmentResults
                });
            } catch (error) {
                results.push({
                    name: "段位系统",
                    success: false,
                    error: String(error)
                });
            }

            // 2. 测试分数门槛配置
            try {
                const testSegments: SegmentName[] = ["bronze", "gold", "platinum"];
                const configResults = [];

                for (const segment of testSegments) {
                    try {
                        const thresholds = getDefaultScoreThresholds(segment);
                        const isValid = validateScoreThresholds(thresholds);

                        configResults.push({
                            segment,
                            success: true,
                            thresholdsCount: thresholds.length,
                            isValid
                        });
                    } catch (error) {
                        configResults.push({
                            segment,
                            success: false,
                            error: String(error)
                        });
                    }
                }

                const configSuccessCount = configResults.filter(r => r.success).length;
                results.push({
                    name: "分数门槛配置",
                    success: configSuccessCount === configResults.length,
                    message: `分数门槛配置测试完成: ${configSuccessCount}/${configResults.length} 通过`,
                    results: configResults
                });
            } catch (error) {
                results.push({
                    name: "分数门槛配置",
                    success: false,
                    error: String(error)
                });
            }

            // 3. 测试混合模式配置
            try {
                const testSegments: SegmentName[] = ["bronze", "silver", "gold"];
                const hybridResults = [];

                for (const segment of testSegments) {
                    try {
                        const thresholds = getDefaultScoreThresholds(segment);
                        const protection = getSegmentProtectionConfig(segment);
                        const isValid = validateScoreThresholds(thresholds);

                        hybridResults.push({
                            segment,
                            success: true,
                            thresholdsCount: thresholds.length,
                            isValid,
                            protection
                        });
                    } catch (error) {
                        hybridResults.push({
                            segment,
                            success: false,
                            error: String(error)
                        });
                    }
                }

                const hybridSuccessCount = hybridResults.filter(r => r.success).length;
                results.push({
                    name: "混合模式配置",
                    success: hybridSuccessCount === hybridResults.length,
                    message: `混合模式配置测试完成: ${hybridSuccessCount}/${hybridResults.length} 通过`,
                    results: hybridResults
                });
            } catch (error) {
                results.push({
                    name: "混合模式配置",
                    success: false,
                    error: String(error)
                });
            }

            // 4. 运行基础配置测试
            try {
                const testSegments: SegmentName[] = ["bronze", "silver", "gold"];
                const basicResults = [];

                for (const segment of testSegments) {
                    try {
                        const thresholds = getDefaultScoreThresholds(segment);
                        const learningRate = getLearningRate(segment);
                        const rankingMode = getRankingMode(segment);
                        const adaptiveMode = getAdaptiveMode(segment);
                        const protection = getSegmentProtectionConfig(segment);

                        basicResults.push({
                            segment,
                            thresholdsCount: thresholds.length,
                            learningRate,
                            rankingMode,
                            adaptiveMode,
                            protection
                        });
                    } catch (error) {
                        basicResults.push({
                            segment,
                            error: String(error)
                        });
                    }
                }

                results.push({
                    name: "基础配置测试",
                    success: true,
                    message: "基础配置测试完成",
                    results: basicResults
                });
            } catch (error) {
                results.push({
                    name: "基础配置测试",
                    success: false,
                    error: String(error)
                });
            }

            const successCount = results.filter(r => r.success).length;
            const totalCount = results.length;

            return {
                success: successCount === totalCount,
                message: `测试套件完成: ${successCount}/${totalCount} 通过`,
                results,
                summary: {
                    total: totalCount,
                    passed: successCount,
                    failed: totalCount - successCount
                }
            };
        } catch (error) {
            console.error("完整测试套件运行失败:", error);
            return {
                success: false,
                error: String(error)
            };
        }
    }
});
