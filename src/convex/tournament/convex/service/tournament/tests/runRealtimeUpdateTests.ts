import { v } from "convex/values";
import { mutation } from "../../../_generated/server";
import { TestRealtimeUpdates } from "./testRealtimeUpdates";

/**
 * 运行实时更新测试
 */
export const runRealtimeUpdateTests = mutation({
    args: {},
    handler: async (ctx, args) => {
        console.log("🎮 开始运行实时更新测试...");
        console.log("=".repeat(60));

        try {
            const results = await TestRealtimeUpdates.runAllTests(ctx);

            // 格式化输出结果
            console.log("\n" + "=".repeat(60));
            console.log("📊 测试结果汇总");
            console.log("=".repeat(60));
            console.log(`✅ 通过: ${results.passed}`);
            console.log(`❌ 失败: ${results.failed}`);
            console.log(`📈 成功率: ${((results.passed / results.total) * 100).toFixed(1)}%`);

            if (results.results.length > 0) {
                console.log("\n📋 详细结果:");
                results.results.forEach((result: any, index: number) => {
                    const status = result.success ? "✅" : "❌";
                    console.log(`${index + 1}. ${status} ${result.name}: ${result.success ? "通过" : result.error}`);
                });
            }

            return {
                success: results.success,
                message: results.success ? "所有实时更新测试通过" : "部分测试失败",
                results: results
            };

        } catch (error) {
            console.error("❌ 运行实时更新测试失败:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "未知错误"
            };
        }
    },
});

/**
 * 运行单个测试
 */
export const runSingleRealtimeTest = mutation({
    args: { testName: v.string() },
    handler: async (ctx, args) => {
        console.log(`🧪 运行单个实时更新测试: ${args.testName}`);

        try {
            let result;
            switch (args.testName) {
                case "join":
                    result = await TestRealtimeUpdates.testStatusUpdateAfterJoin(ctx);
                    break;
                case "submit":
                    result = await TestRealtimeUpdates.testStatusUpdateAfterSubmitScore(ctx);
                    break;
                case "eligibility":
                    result = await TestRealtimeUpdates.testEligibilityChangeDetection(ctx);
                    break;
                case "inventory":
                    result = await TestRealtimeUpdates.testInventoryChangeDetection(ctx);
                    break;
                default:
                    throw new Error(`未知测试: ${args.testName}`);
            }

            return {
                success: result.success,
                message: result.success ? "测试通过" : "测试失败",
                result: result
            };

        } catch (error) {
            console.error(`❌ 运行测试 ${args.testName} 失败:`, error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "未知错误"
            };
        }
    },
});

/**
 * 控制台测试 - 推荐使用
 */
export const consoleTestRealtimeUpdates = mutation({
    args: {},
    handler: async (ctx) => {
        console.log("🎮 开始控制台测试实时更新功能...");
        console.log("=".repeat(60));

        try {
            // 运行所有测试
            const results = await TestRealtimeUpdates.runAllTests(ctx);

            // 格式化输出结果
            console.log("\n" + "=".repeat(60));
            console.log("📊 测试结果汇总");
            console.log("=".repeat(60));
            console.log(`✅ 通过: ${results.passed}`);
            console.log(`❌ 失败: ${results.failed}`);
            console.log(`📈 成功率: ${((results.passed / results.total) * 100).toFixed(1)}%`);

            if (results.results.length > 0) {
                console.log("\n📋 详细结果:");
                results.results.forEach((result: any, index: number) => {
                    const status = result.success ? "✅" : "❌";
                    const details = result.success ?
                        (result.initialAttempts ? `(尝试次数: ${result.initialAttempts} -> ${result.updatedAttempts})` :
                            result.initialCoins ? `(金币: ${result.initialCoins} -> ${result.updatedCoins})` : "") :
                        `(错误: ${result.error})`;
                    console.log(`${index + 1}. ${status} ${result.name} ${details}`);
                });
            }

            console.log("\n" + "=".repeat(60));
            console.log(results.success ? "🎉 所有实时更新测试通过！" : "⚠️ 部分测试失败");
            console.log("=".repeat(60));

            return {
                success: results.success,
                message: results.success ? "所有实时更新测试通过" : "部分测试失败",
                results: results
            };

        } catch (error) {
            console.error("❌ 控制台测试失败:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "未知错误"
            };
        }
    },
});

/**
 * 快速测试 - 只运行基础功能
 */
export const quickTestRealtimeUpdates = mutation({
    args: {},
    handler: async (ctx) => {
        console.log("⚡ 快速测试实时更新功能...");

        try {
            const result = await TestRealtimeUpdates.testStatusUpdateAfterJoin(ctx);

            console.log(result.success ? "✅ 快速测试通过" : "❌ 快速测试失败");
            if (!result.success) {
                console.error("错误:", result.error);
            }

            return {
                success: result.success,
                message: result.success ? "快速测试通过" : "快速测试失败",
                result: result
            };

        } catch (error) {
            console.error("❌ 快速测试失败:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "未知错误"
            };
        }
    },
}); 