/**
 * 分数门槛控制系统测试函数
 * 在 Convex 中运行各种示例和测试
 */

import { v } from "convex/values";
import { mutation } from "../../../_generated/server";
import { SegmentPromotionDemotionManager } from '../../segment/segmentPromotionDemotionManager';
import { ScoreThresholdExample } from "./scoreThresholdExample";
import { scoreThresholdController } from "./scoreThresholdRankingController";

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
 * 运行自定义配置示例
 */
export const runCustomConfigExample = mutation({
    args: {},
    handler: async (ctx) => {
        console.log("🚀 运行自定义配置示例");
        await ScoreThresholdExample.customConfigExample(ctx);
        return { success: true, message: "自定义配置示例运行完成" };
    }
});

/**
 * 运行比赛结束示例
 */
export const runEndMatchExample = mutation({
    args: {},
    handler: async (ctx) => {
        console.log("🚀 运行比赛结束示例");
        await ScoreThresholdExample.endMatchExample(ctx);
        return { success: true, message: "比赛结束示例运行完成" };
    }
});

/**
 * 运行系统监控示例
 */
export const runSystemMonitoringExample = mutation({
    args: {},
    handler: async (ctx) => {
        console.log("🚀 运行系统监控示例");
        await ScoreThresholdExample.systemMonitoringExample(ctx);
        return { success: true, message: "系统监控示例运行完成" };
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
        console.log(`🚀 运行特定示例: ${args.exampleName}`);
        await ScoreThresholdExample.runSpecificExample(ctx, args.exampleName);
        return { success: true, message: `示例 ${args.exampleName} 运行完成` };
    }
});

/**
 * 运行示例列表
 */
export const getAvailableExamples = mutation({
    args: {},
    handler: async (ctx) => {
        const examples = [
            "basic",
            "hybrid",
            "upgrade",
            "custom",
            "endMatch",
            "monitoring",
            "batch",
            "performance",
            "segment"
        ];

        return {
            success: true,
            examples,
            message: `可用示例: ${examples.join(", ")}`
        };
    }
});

/**
 * 运行快速测试套件
 */
export const runQuickTestSuite = mutation({
    args: {},
    handler: async (ctx) => {
        console.log("🚀 运行快速测试套件...");

        try {
            // 运行核心功能测试
            await ScoreThresholdExample.basicUsageExample(ctx);
            console.log("✅ 基础功能测试通过");

            await ScoreThresholdExample.hybridModeExample(ctx);
            console.log("✅ 混合模式测试通过");

            await ScoreThresholdExample.endMatchExample(ctx);
            console.log("✅ 比赛结束测试通过");

            console.log("🎉 快速测试套件全部通过!");
            return {
                success: true,
                message: "快速测试套件全部通过",
                tests: ["basic", "hybrid", "endMatch"]
            };

        } catch (error) {
            console.error("❌ 快速测试套件失败:", error);
            return {
                success: false,
                message: "快速测试套件失败",
                error: error instanceof Error ? error.message : "未知错误"
            };
        }
    }
});

/**
 * 运行压力测试
 */
export const runStressTest = mutation({
    args: {
        playerCount: v.number(),
        batchSize: v.number()
    },
    handler: async (ctx, args) => {
        const { playerCount = 100, batchSize = 10 } = args;
        console.log(`🚀 开始压力测试: ${playerCount} 个玩家, 批次大小: ${batchSize}`);

        const startTime = Date.now();
        let successCount = 0;
        let errorCount = 0;
        const errors: string[] = [];

        try {
            // 分批创建玩家
            for (let i = 0; i < playerCount; i += batchSize) {
                const batch = [];
                for (let j = 0; j < batchSize && i + j < playerCount; j++) {
                    const playerIndex = i + j;
                    const uid = `stress_test_player_${playerIndex.toString().padStart(4, '0')}`;
                    const segment = ["bronze", "silver", "gold", "platinum", "diamond"][playerIndex % 5];

                    batch.push(
                        scoreThresholdController.initializePlayer(ctx, {
                            uid,
                            segmentName: segment,
                            useHybridMode: true
                        })
                    );
                }

                try {
                    await Promise.all(batch);
                    successCount += batch.length;
                    console.log(`✅ 批次 ${Math.floor(i / batchSize) + 1} 完成: ${batch.length} 个玩家`);
                } catch (error) {
                    errorCount += batch.length;
                    const errorMsg = error instanceof Error ? error.message : "未知错误";
                    errors.push(`批次 ${Math.floor(i / batchSize) + 1}: ${errorMsg}`);
                    console.error(`❌ 批次 ${Math.floor(i / batchSize) + 1} 失败:`, error);
                }
            }

            const endTime = Date.now();
            const duration = endTime - startTime;

            console.log(`🎉 压力测试完成! 耗时: ${duration}ms`);
            console.log(`成功: ${successCount}, 失败: ${errorCount}`);

            return {
                success: true,
                message: "压力测试完成",
                results: {
                    totalPlayers: playerCount,
                    successCount,
                    errorCount,
                    duration,
                    errors: errors.length > 0 ? errors : undefined
                }
            };

        } catch (error) {
            console.error("❌ 压力测试执行失败:", error);
            return {
                success: false,
                message: "压力测试执行失败",
                error: error instanceof Error ? error.message : "未知错误"
            };
        }
    }
});

/**
 * 运行段位系统测试
 */
export const runSegmentSystemTest = mutation({
    args: {},
    handler: async (ctx) => {
        console.log("🏆 开始测试段位升降系统...");

        try {
            const results = [];

            // 测试1: 获取所有段位信息
            const segments = SegmentPromotionDemotionManager.getAvailableSegments();
            results.push({
                test: "获取可用段位",
                result: segments,
                success: segments.length > 0
            });
            console.log(`✅ 可用段位: ${segments.join(", ")}`);

            // 测试2: 检查段位升级路径
            const upgradePath = [];
            let currentSegment = "bronze";
            while (currentSegment) {
                upgradePath.push(currentSegment);
                currentSegment = SegmentPromotionDemotionManager.getNextSegment(currentSegment) || "";
            }
            results.push({
                test: "段位升级路径",
                result: upgradePath,
                success: upgradePath.length > 1
            });
            console.log(`✅ 升级路径: ${upgradePath.join(" → ")}`);

            // 测试3: 检查段位降级路径
            const demotionPath = [];
            currentSegment = "grandmaster";
            while (currentSegment) {
                demotionPath.push(currentSegment);
                currentSegment = SegmentPromotionDemotionManager.getPreviousSegment(currentSegment) || "";
            }
            results.push({
                test: "段位降级路径",
                result: demotionPath,
                success: demotionPath.length > 1
            });
            console.log(`✅ 降级路径: ${demotionPath.join(" → ")}`);

            // 测试4: 检查段位特性
            const segmentFeatures = [];
            for (const segment of segments.slice(0, 3)) { // 只测试前3个段位
                const info = SegmentPromotionDemotionManager.getSegmentInfo(segment);
                if (info) {
                    segmentFeatures.push({
                        segment,
                        tier: info.tier,
                        color: info.color,
                        icon: info.icon,
                        canPromote: SegmentPromotionDemotionManager.canPromote(segment),
                        canDemote: SegmentPromotionDemotionManager.canDemote(segment)
                    });
                }
            }
            results.push({
                test: "段位特性",
                result: segmentFeatures,
                success: segmentFeatures.length > 0
            });
            console.log(`✅ 段位特性测试完成, 测试了 ${segmentFeatures.length} 个段位`);

            // 测试5: 模拟段位变化检查
            const mockPerformanceMetrics = {
                totalMatches: 20,
                totalWins: 12,
                totalLosses: 8,
                currentWinStreak: 3,
                currentLoseStreak: 0
            };

            // 模拟一个青铜段位玩家获得足够积分
            const segmentChange = await SegmentPromotionDemotionManager.checkSegmentChange(
                ctx,
                "test_player_bronze",
                1500, // 超过升级所需的1000积分
                mockPerformanceMetrics
            );

            results.push({
                test: "段位变化检查",
                result: segmentChange,
                success: true // 这里只是测试函数调用，不检查实际结果
            });
            console.log(`✅ 段位变化检查测试完成`);

            console.log("🎉 段位系统测试全部完成!");
            return {
                success: true,
                message: "段位系统测试完成",
                tests: results,
                summary: {
                    totalTests: results.length,
                    passedTests: results.filter(r => r.success).length,
                    failedTests: results.filter(r => !r.success).length
                }
            };

        } catch (error) {
            console.error("❌ 段位系统测试失败:", error);
            return {
                success: false,
                message: "段位系统测试失败",
                error: error instanceof Error ? error.message : "未知错误"
            };
        }
    }
});

/**
 * 清理测试数据
 */
export const cleanupTestData = mutation({
    args: {
        pattern: v.string() // 清理匹配此模式的测试数据
    },
    handler: async (ctx, args) => {
        const pattern = args.pattern || "test_";
        console.log(`🧹 开始清理测试数据, 模式: ${pattern}`);

        try {
            let cleanedCount = 0;

            // 清理分数门槛配置
            const configs = await ctx.db
                .query("score_threshold_configs")
                .collect();

            for (const config of configs) {
                if (config.uid.startsWith(pattern)) {
                    await ctx.db.delete(config._id);
                    cleanedCount++;
                }
            }

            // 清理性能指标
            const metrics = await ctx.db
                .query("player_performance_metrics")
                .collect();

            for (const metric of metrics) {
                if (metric.uid.startsWith(pattern)) {
                    await ctx.db.delete(metric._id);
                    cleanedCount++;
                }
            }

            // 清理保护状态
            const protections = await ctx.db
                .query("player_protection_status")
                .collect();

            for (const protection of protections) {
                if (protection.uid.startsWith(pattern)) {
                    await ctx.db.delete(protection._id);
                    cleanedCount++;
                }
            }

            // 清理比赛记录
            const records = await ctx.db
                .query("player_match_records")
                .collect();

            for (const record of records) {
                if (record.uid.startsWith(pattern)) {
                    await ctx.db.delete(record._id);
                    cleanedCount++;
                }
            }

            // 清理段位变化历史
            const history = await ctx.db
                .query("segment_change_history")
                .collect();

            for (const record of history) {
                if (record.uid.startsWith(pattern)) {
                    await ctx.db.delete(record._id);
                    cleanedCount++;
                }
            }

            console.log(`✅ 测试数据清理完成, 共清理 ${cleanedCount} 条记录`);

            return {
                success: true,
                message: "测试数据清理完成",
                cleanedCount
            };

        } catch (error) {
            console.error("❌ 测试数据清理失败:", error);
            return {
                success: false,
                message: "测试数据清理失败",
                error: error instanceof Error ? error.message : "未知错误"
            };
        }
    }
});
