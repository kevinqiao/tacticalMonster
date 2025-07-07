import { v } from "convex/values";
import { mutation } from "../../../_generated/server";
import { TestGetAvailableTournaments } from "./testGetAvailableTournaments";

/**
 * 控制台测试 getAvailableTournaments
 * 可以直接在控制台运行，无需参数
 */
export const consoleTestGetAvailableTournaments = mutation({
    args: {},
    handler: async (ctx) => {
        console.log("🎮 开始控制台测试 getAvailableTournaments...");
        console.log("=".repeat(60));

        try {
            // 运行所有测试
            const results = await TestGetAvailableTournaments.runAllTests(ctx);

            // 格式化输出结果
            console.log("\n" + "=".repeat(60));
            console.log("📊 测试结果汇总");
            console.log("=".repeat(60));
            console.log(`✅ 通过: ${results.passed}`);
            console.log(`❌ 失败: ${results.failed}`);
            console.log(`📈 总计: ${results.passed + results.failed}`);
            console.log(`📊 成功率: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

            // 详细测试结果
            console.log("\n📋 详细测试结果:");
            console.log("-".repeat(60));

            results.tests.forEach((test: any, index: number) => {
                const status = test.status === "PASSED" ? "✅" : "❌";
                const error = test.error ? ` (错误: ${test.error})` : "";
                console.log(`${index + 1}. ${status} ${test.name}${error}`);
            });

            // 返回结构化结果
            return {
                success: results.failed === 0,
                message: `测试完成 - 通过: ${results.passed}, 失败: ${results.failed}`,
                summary: {
                    passed: results.passed,
                    failed: results.failed,
                    total: results.passed + results.failed,
                    successRate: ((results.passed / (results.passed + results.failed)) * 100).toFixed(1) + "%"
                },
                details: results.tests
            };

        } catch (error) {
            console.error("💥 测试运行失败:", error);
            return {
                success: false,
                message: "测试运行失败",
                error: error instanceof Error ? error.message : "未知错误"
            };
        }
    }
});

/**
 * 快速测试 - 只测试基础功能
 */
export const quickTestGetAvailableTournaments = mutation({
    args: {},
    handler: async (ctx) => {
        console.log("⚡ 快速测试 getAvailableTournaments...");
        console.log("=".repeat(50));

        try {
            const testResults = {
                passed: 0,
                failed: 0,
                tests: [] as any[]
            };

            // 只运行基础功能测试
            await TestGetAvailableTournaments["testBasicFunctionality"](ctx, testResults);

            console.log("\n" + "=".repeat(50));
            console.log("⚡ 快速测试结果");
            console.log("=".repeat(50));
            console.log(`✅ 通过: ${testResults.passed}`);
            console.log(`❌ 失败: ${testResults.failed}`);

            return {
                success: testResults.failed === 0,
                message: `快速测试完成 - 通过: ${testResults.passed}, 失败: ${testResults.failed}`,
                results: testResults
            };

        } catch (error) {
            console.error("💥 快速测试失败:", error);
            return {
                success: false,
                message: "快速测试失败",
                error: error instanceof Error ? error.message : "未知错误"
            };
        }
    }
});

/**
 * 运行 getAvailableTournaments 测试
 */
export const runGetAvailableTournamentsTests = mutation({
    args: {},
    handler: async (ctx) => {
        console.log("开始运行 getAvailableTournaments 测试...");

        try {
            const results = await TestGetAvailableTournaments.runAllTests(ctx);

            return {
                success: true,
                message: "测试完成",
                results: {
                    passed: results.passed,
                    failed: results.failed,
                    total: results.passed + results.failed,
                    tests: results.tests
                }
            };
        } catch (error) {
            console.error("测试运行失败:", error);
            return {
                success: false,
                message: "测试运行失败",
                error: error instanceof Error ? error.message : "未知错误"
            };
        }
    }
});

/**
 * 运行单个测试
 */
export const runSingleTest = mutation({
    args: { testName: v.string() },
    handler: async (ctx, args) => {
        console.log(`开始运行单个测试: ${args.testName}`);

        try {
            const testResults = {
                passed: 0,
                failed: 0,
                tests: [] as any[]
            };

            switch (args.testName) {
                case "basic":
                    await TestGetAvailableTournaments["testBasicFunctionality"](ctx, testResults);
                    break;
                case "gameTypeFilter":
                    await TestGetAvailableTournaments["testGameTypeFilter"](ctx, testResults);
                    break;
                case "categoryFilter":
                    await TestGetAvailableTournaments["testCategoryFilter"](ctx, testResults);
                    break;
                case "eligibility":
                    await TestGetAvailableTournaments["testEligibilityCheck"](ctx, testResults);
                    break;
                case "participation":
                    await TestGetAvailableTournaments["testParticipationStats"](ctx, testResults);
                    break;
                case "segment":
                    await TestGetAvailableTournaments["testSegmentRestrictions"](ctx, testResults);
                    break;
                case "subscription":
                    await TestGetAvailableTournaments["testSubscriptionRequirements"](ctx, testResults);
                    break;
                case "entryFee":
                    await TestGetAvailableTournaments["testEntryFeeRequirements"](ctx, testResults);
                    break;
                default:
                    throw new Error(`未知的测试名称: ${args.testName}`);
            }

            return {
                success: true,
                message: `测试 ${args.testName} 完成`,
                results: {
                    passed: testResults.passed,
                    failed: testResults.failed,
                    total: testResults.passed + testResults.failed,
                    tests: testResults.tests
                }
            };
        } catch (error) {
            console.error(`测试 ${args.testName} 运行失败:`, error);
            return {
                success: false,
                message: `测试 ${args.testName} 运行失败`,
                error: error instanceof Error ? error.message : "未知错误"
            };
        }
    }
}); 