import { v } from "convex/values";
import { mutation } from "../../../_generated/server";
import { TestAutoCreateTournaments } from "./testAutoCreateTournaments";

/**
 * 运行自动创建锦标赛测试
 */
export const runAutoCreateTests = mutation({
    args: {},
    handler: async (ctx, args) => {
        console.log("🎮 开始运行自动创建锦标赛测试...");
        console.log("=".repeat(60));

        try {
            const results = await TestAutoCreateTournaments.runAllTests(ctx);

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
                message: results.success ? "所有自动创建测试通过" : "部分测试失败",
                results: results
            };

        } catch (error) {
            console.error("❌ 运行自动创建测试失败:", error);
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
export const runSingleAutoCreateTest = mutation({
    args: { testName: v.string() },
    handler: async (ctx, args) => {
        console.log(`🧪 运行单个测试: ${args.testName}`);

        try {
            let result;
            switch (args.testName) {
                case "basic":
                    result = await TestAutoCreateTournaments.testBasicAutoCreate(ctx);
                    break;
                case "duplicate":
                    result = await TestAutoCreateTournaments.testNoDuplicateCreation(ctx);
                    break;
                case "gameTypes":
                    result = await TestAutoCreateTournaments.testDifferentGameTypes(ctx);
                    break;
                case "notification":
                    result = await TestAutoCreateTournaments.testNotificationFeature(ctx);
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
export const consoleTestAutoCreate = mutation({
    args: {},
    handler: async (ctx) => {
        console.log("🎮 开始控制台测试自动创建锦标赛功能...");
        console.log("=".repeat(60));

        try {
            // 运行所有测试
            const results = await TestAutoCreateTournaments.runAllTests(ctx);

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
                        (result.createdTournaments ? `(创建了${result.createdTournaments}个锦标赛)` :
                            result.tournamentCount ? `(锦标赛数量: ${result.tournamentCount})` : "") :
                        `(错误: ${result.error})`;
                    console.log(`${index + 1}. ${status} ${result.name} ${details}`);
                });
            }

            console.log("\n" + "=".repeat(60));
            console.log(results.success ? "🎉 所有测试通过！" : "⚠️ 部分测试失败");
            console.log("=".repeat(60));

            return {
                success: results.success,
                message: results.success ? "所有自动创建测试通过" : "部分测试失败",
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
export const quickTestAutoCreate = mutation({
    args: {},
    handler: async (ctx) => {
        console.log("⚡ 快速测试自动创建锦标赛功能...");

        try {
            const result = await TestAutoCreateTournaments.testBasicAutoCreate(ctx);

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