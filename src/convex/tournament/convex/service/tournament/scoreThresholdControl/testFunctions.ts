/**
 * 分数门槛控制系统测试函数
 * 在 Convex 中运行各种示例和测试
 */

import { v } from "convex/values";
import { mutation } from "../../../_generated/server";
import { canDemote, canPromote, getAllSegmentNames, getNextSegment, getPreviousSegment, getSegmentRule } from '../../segment/config';
import { SegmentManager } from '../../segment/SegmentManager';
import { SegmentName } from '../../segment/types';
import { ScoreThresholdExample } from "./scoreThresholdExample";

/**
 * 运行所有示例
 */
export const runAllExamples = mutation({
    args: {},
    handler: async (ctx) => {
        console.log("🚀 开始运行所有示例...");
        await ScoreThresholdExample.runAllExamples(ctx);
        return { success: true, message: "所有示例运行完成" };
    }
});

/**
 * 运行基础使用示例
 */
export const runBasicExample = mutation({
    args: {},
    handler: async (ctx) => {
        console.log("🚀 运行基础使用示例");
        await ScoreThresholdExample.basicUsageExample(ctx);
        return { success: true, message: "基础示例运行完成" };
    }
});

/**
 * 运行混合模式示例
 */
export const runHybridModeExample = mutation({
    args: {},
    handler: async (ctx) => {
        console.log("🚀 运行混合模式示例");
        await ScoreThresholdExample.hybridModeExample(ctx);
        return { success: true, message: "混合模式示例运行完成" };
    }
});

/**
 * 运行段位升级示例
 */
export const runSegmentUpgradeExample = mutation({
    args: {},
    handler: async (ctx) => {
        console.log("🚀 运行段位升级示例");
        await ScoreThresholdExample.segmentUpgradeExample(ctx);
        return { success: true, message: "段位升级示例运行完成" };
    }
});

/**
 * 运行自适应学习示例
 */
export const runAdaptiveLearningExample = mutation({
    args: {},
    handler: async (ctx) => {
        console.log("🚀 运行自适应学习示例");
        await ScoreThresholdExample.adaptiveLearningExample(ctx);
        return { success: true, message: "自适应学习示例运行完成" };
    }
});

/**
 * 运行批量操作示例
 */
export const runBatchOperationExample = mutation({
    args: {},
    handler: async (ctx) => {
        console.log("🚀 运行批量操作示例");
        await ScoreThresholdExample.batchOperationExample(ctx);
        return { success: true, message: "批量操作示例运行完成" };
    }
});

/**
 * 运行配置优化示例
 */
export const runConfigOptimizationExample = mutation({
    args: {},
    handler: async (ctx) => {
        console.log("🚀 运行配置优化示例");
        await ScoreThresholdExample.configOptimizationExample(ctx);
        return { success: true, message: "配置优化示例运行完成" };
    }
});

/**
 * 运行性能测试示例
 */
export const runPerformanceTestExample = mutation({
    args: {},
    handler: async (ctx) => {
        console.log("🚀 运行性能测试示例");
        await ScoreThresholdExample.performanceTestExample(ctx);
        return { success: true, message: "性能测试示例运行完成" };
    }
});

/**
 * 运行特定示例
 */
export const runSpecificExample = mutation({
    args: { exampleName: v.string() },
    handler: async (ctx, args) => {
        const examples: Record<string, (ctx: any) => Promise<void>> = {
            "basic": ScoreThresholdExample.basicUsageExample,
            "hybrid": ScoreThresholdExample.hybridModeExample,
            "upgrade": ScoreThresholdExample.segmentUpgradeExample,
            "adaptive": ScoreThresholdExample.adaptiveLearningExample,
            "batch": ScoreThresholdExample.batchOperationExample,
            "optimization": ScoreThresholdExample.configOptimizationExample,
            "performance": ScoreThresholdExample.performanceTestExample
        };

        const example = examples[args.exampleName];
        if (example) {
            console.log(`🚀 运行示例: ${args.exampleName}`);
            await example(ctx);
            return { success: true, message: `示例 ${args.exampleName} 运行完成` };
        } else {
            console.error(`❌ 未知示例: ${args.exampleName}`);
            return {
                success: false,
                error: `未知示例: ${args.exampleName}`,
                availableExamples: Object.keys(examples)
            };
        }
    }
});

/**
 * 测试段位系统功能
 */
export const testSegmentSystem = mutation({
    args: {},
    handler: async (ctx) => {
        console.log("🧪 测试段位系统功能...");

        try {
            const segmentManager = new SegmentManager(ctx);
            const allSegments = getAllSegmentNames();

            console.log("可用段位:", allSegments);

            // 测试段位规则
            for (const segment of allSegments) {
                const rule = getSegmentRule(segment);
                if (rule) {
                    console.log(`${segment} 段位规则:`, {
                        tier: rule.tier,
                        canPromote: canPromote(segment),
                        canDemote: canDemote(segment),
                        nextSegment: getNextSegment(segment),
                        previousSegment: getPreviousSegment(segment)
                    });
                }
            }

            return {
                success: true,
                message: "段位系统测试完成",
                segmentCount: allSegments.length
            };
        } catch (error) {
            console.error("段位系统测试失败:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
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
                const rule = getSegmentRule(segment);
                if (rule) {
                    results.push({
                        segment,
                        tier: rule.tier,
                        promotion: rule.promotion,
                        demotion: rule.demotion
                    });
                }
            }

            return {
                success: true,
                message: "分数门槛配置测试完成",
                results
            };
        } catch (error) {
            console.error("分数门槛配置测试失败:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
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
                const rule = getSegmentRule(segment);
                if (rule) {
                    results.push({
                        segment,
                        tier: rule.tier,
                        icon: rule.icon,
                        color: rule.color
                    });
                }
            }

            return {
                success: true,
                message: "混合模式配置测试完成",
                results
            };
        } catch (error) {
            console.error("混合模式配置测试失败:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
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
                const segmentManager = new SegmentManager(ctx);
                const allSegments = getAllSegmentNames();

                console.log("可用段位:", allSegments);

                // 测试段位规则
                for (const segment of allSegments) {
                    const rule = getSegmentRule(segment);
                    if (rule) {
                        console.log(`${segment} 段位规则:`, {
                            tier: rule.tier,
                            canPromote: canPromote(segment),
                            canDemote: canDemote(segment),
                            nextSegment: getNextSegment(segment),
                            previousSegment: getPreviousSegment(segment)
                        });
                    }
                }

                results.push({ name: "段位系统", success: true, message: "段位系统测试完成" });
            } catch (error) {
                results.push({
                    name: "段位系统",
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }

            // 2. 测试分数门槛配置
            try {
                const testSegments: SegmentName[] = ["bronze", "gold", "platinum"];
                const configResults = [];

                for (const segment of testSegments) {
                    const rule = getSegmentRule(segment);
                    if (rule) {
                        configResults.push({
                            segment,
                            tier: rule.tier,
                            promotion: rule.promotion,
                            demotion: rule.demotion
                        });
                    }
                }

                results.push({ name: "分数门槛配置", success: true, message: "分数门槛配置测试完成" });
            } catch (error) {
                results.push({
                    name: "分数门槛配置",
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }

            // 3. 测试混合模式配置
            try {
                const testSegments: SegmentName[] = ["bronze", "silver", "gold"];
                const hybridResults = [];

                for (const segment of testSegments) {
                    const rule = getSegmentRule(segment);
                    if (rule) {
                        hybridResults.push({
                            segment,
                            tier: rule.tier,
                            icon: rule.icon,
                            color: rule.color
                        });
                    }
                }

                results.push({ name: "混合模式配置", success: true, message: "混合模式配置测试完成" });
            } catch (error) {
                results.push({
                    name: "混合模式配置",
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }

            // 4. 运行所有示例
            try {
                await ScoreThresholdExample.runAllExamples(ctx);
                results.push({ name: "示例运行", success: true, message: "所有示例运行完成" });
            } catch (error) {
                results.push({
                    name: "示例运行",
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
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
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
});
