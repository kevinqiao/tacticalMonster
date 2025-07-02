/**
 * 统一锦标赛测试运行器
 */

import { v } from "convex/values";
import { query } from "../../../_generated/server";
import { SimpleScenarioTestRunner } from "./scenarios/simpleScenarioTests";
import { assertDefined, assertEqual, assertFalse, assertRejects, assertThrows, assertTrue } from "./simpleTestFramework";
import { TournamentTestUtils } from "./testUtils";

// ==================== 测试配置 ====================

export interface TestConfig {
    testTypes: Array<"unit" | "integration" | "e2e" | "performance" | "scenario">;
    specificTests?: string[];
    timeout: number;
    concurrency: number;
    verbose: boolean;
    stopOnFailure: boolean;
}

// ==================== 测试结果类型 ====================

export interface TestResult {
    testName: string;
    testType: string;
    status: "passed" | "failed" | "skipped";
    duration: number;
    error?: string;
    details?: any;
}

export interface TestSuiteResult {
    suiteName: string;
    results: TestResult[];
    summary: {
        total: number;
        passed: number;
        failed: number;
        skipped: number;
        duration: number;
        successRate: number;
    };
}

export interface TestExecutionResult {
    suites: TestSuiteResult[];
    summary: {
        total: number;
        passed: number;
        failed: number;
        skipped: number;
        duration: number;
        successRate: number;
    };
    config: TestConfig;
}

// ==================== 统一测试运行器 ====================

export class UnifiedTournamentTestRunner {

    private static defaultConfig: TestConfig = {
        testTypes: ["unit", "integration", "e2e", "performance", "scenario"],
        timeout: 30000,
        concurrency: 1,
        verbose: true,
        stopOnFailure: false
    };

    static async runAllTests(config: Partial<TestConfig> = {}): Promise<TestExecutionResult> {
        const finalConfig = { ...this.defaultConfig, ...config };
        const startTime = Date.now();

        console.log("🚀 开始运行统一锦标赛测试");
        console.log(`配置: ${JSON.stringify(finalConfig, null, 2)}`);

        const suites: TestSuiteResult[] = [];

        // 运行主测试套件
        if (finalConfig.testTypes.includes("unit") || finalConfig.testTypes.includes("integration")) {
            const mainSuite = await this.runMainTestSuite(finalConfig);
            suites.push(mainSuite);
        }

        // 运行简化场景测试
        if (finalConfig.testTypes.includes("scenario")) {
            const scenarioSuite = await this.runScenarioTests(finalConfig);
            suites.push(scenarioSuite);
        }

        const totalDuration = Date.now() - startTime;
        const overallSummary = this.calculateOverallSummary(suites, totalDuration);

        const result: TestExecutionResult = {
            suites,
            summary: overallSummary,
            config: finalConfig
        };

        this.printFinalReport(result);
        return result;
    }

    private static async runMainTestSuite(config: TestConfig): Promise<TestSuiteResult> {
        const startTime = Date.now();
        const results: TestResult[] = [];

        console.log("\n📦 运行主测试套件");

        // 基础功能测试
        const basicTests = [
            { name: "测试工具创建", fn: () => this.testTestUtilsCreation() },
            { name: "Mock上下文设置", fn: () => this.testMockContextSetup() },
            { name: "断言函数测试", fn: () => this.testAssertionFunctions() }
        ];

        for (const test of basicTests) {
            const testStartTime = Date.now();
            try {
                await test.fn();
                results.push({
                    testName: test.name,
                    testType: "unit",
                    status: "passed",
                    duration: Date.now() - testStartTime
                });
            } catch (error) {
                results.push({
                    testName: test.name,
                    testType: "unit",
                    status: "failed",
                    duration: Date.now() - testStartTime,
                    error: error instanceof Error ? error.message : "未知错误"
                });
            }
        }

        const duration = Date.now() - startTime;
        return this.createSuiteResult("主测试套件", results, startTime);
    }

    private static async runScenarioTests(config: TestConfig): Promise<TestSuiteResult> {
        const startTime = Date.now();
        const results: TestResult[] = [];

        console.log("\n📦 运行场景测试");

        try {
            const scenarioResult = await SimpleScenarioTestRunner.runAllTests();

            // 转换场景测试结果为统一格式
            const testNames = [
                "每日特殊锦标赛加入测试",
                "每日限制测试",
                "金币不足测试",
                "单人锦标赛加入测试",
                "单人锦标赛提交分数测试",
                "多人锦标赛加入测试",
                "多人匹配测试",
                "独立锦标赛创建测试"
            ];

            testNames.forEach((name, index) => {
                results.push({
                    testName: name,
                    testType: "scenario",
                    status: scenarioResult.failed === 0 ? "passed" : "failed",
                    duration: 1000, // 估算时间
                    details: scenarioResult
                });
            });

        } catch (error) {
            results.push({
                testName: "场景测试套件",
                testType: "scenario",
                status: "failed",
                duration: Date.now() - startTime,
                error: error instanceof Error ? error.message : "未知错误"
            });
        }

        return this.createSuiteResult("场景测试套件", results, startTime);
    }

    // ==================== 基础测试函数 ====================

    private static async testTestUtilsCreation() {
        const ctx = TournamentTestUtils.createMockContext();
        assertDefined(ctx, "Mock上下文应该被创建");
        assertDefined(ctx.db, "数据库模拟应该存在");
        assertDefined(ctx.auth, "认证模拟应该存在");
    }

    private static async testMockContextSetup() {
        try {
            console.log("🔧 开始测试 Mock 上下文设置...");

            const ctx = TournamentTestUtils.createMockContext();
            console.log("✅ Mock 上下文创建成功");

            ctx.setupDefaultMocks();
            console.log("✅ 默认 Mock 设置完成");

            // 测试数据库查询模拟 - 简化版本
            const playerQuery = ctx.db.query("players");
            console.log("✅ 玩家查询创建成功:", typeof playerQuery);
            assertDefined(playerQuery, "玩家查询应该存在");

            // 测试查询链式调用 - 确保返回正确的结构
            const queryResult = playerQuery.withIndex("by_uid");
            console.log("✅ 查询索引创建成功:", typeof queryResult);
            assertDefined(queryResult, "查询索引应该存在");

            const playerResult = await queryResult.first();
            console.log("✅ 玩家查询结果:", playerResult);
            assertDefined(playerResult, "玩家查询结果应该存在");
            assertDefined(playerResult.uid, "玩家UID应该存在");

            // 测试认证模拟
            const identity = await ctx.auth.getUserIdentity();
            console.log("✅ 用户身份:", identity);
            assertDefined(identity, "用户身份应该存在");
            assertDefined(identity.subject, "用户ID应该存在");

            // 测试数据库操作
            const insertResult = await ctx.db.insert("players", { uid: "test" });
            console.log("✅ 插入结果:", insertResult);
            assertDefined(insertResult, "插入操作应该返回结果");

            const patchResult = await ctx.db.patch("player1", { name: "test" });
            console.log("✅ 更新结果:", patchResult);
            assertDefined(patchResult, "更新操作应该返回结果");

            console.log("✅ Mock上下文设置测试完全通过");
        } catch (error) {
            console.error("❌ Mock上下文设置测试失败:", error);
            throw error;
        }
    }

    private static async testAssertionFunctions() {
        // 测试基本断言
        assertTrue(true, "true应该是true");
        assertFalse(false, "false应该是false");
        assertEqual(1, 1, "1应该等于1");
        assertDefined("test", "test应该已定义");

        // 测试错误断言
        assertThrows(() => {
            throw new Error("测试错误");
        }, "测试错误");

        // 测试异步错误断言
        await assertRejects(
            Promise.reject(new Error("异步错误")),
            "异步错误"
        );
    }

    // ==================== 工具函数 ====================

    private static createSuiteResult(suiteName: string, results: TestResult[], startTime: number): TestSuiteResult {
        const duration = Date.now() - startTime;
        const passed = results.filter(r => r.status === "passed").length;
        const failed = results.filter(r => r.status === "failed").length;
        const skipped = results.filter(r => r.status === "skipped").length;
        const total = results.length;

        return {
            suiteName,
            results,
            summary: {
                total,
                passed,
                failed,
                skipped,
                duration,
                successRate: total > 0 ? (passed / total) * 100 : 0
            }
        };
    }

    private static calculateOverallSummary(suites: TestSuiteResult[], totalDuration: number) {
        const total = suites.reduce((sum, suite) => sum + suite.summary.total, 0);
        const passed = suites.reduce((sum, suite) => sum + suite.summary.passed, 0);
        const failed = suites.reduce((sum, suite) => sum + suite.summary.failed, 0);
        const skipped = suites.reduce((sum, suite) => sum + suite.summary.skipped, 0);

        return {
            total,
            passed,
            failed,
            skipped,
            duration: totalDuration,
            successRate: total > 0 ? (passed / total) * 100 : 0
        };
    }

    private static printFinalReport(result: TestExecutionResult) {
        console.log("\n" + "=".repeat(60));
        console.log("📊 测试执行报告");
        console.log("=".repeat(60));

        for (const suite of result.suites) {
            console.log(`\n📦 ${suite.suiteName}:`);
            console.log(`   总测试: ${suite.summary.total}`);
            console.log(`   通过: ${suite.summary.passed} ✅`);
            console.log(`   失败: ${suite.summary.failed} ❌`);
            console.log(`   跳过: ${suite.summary.skipped} ⏭️`);
            console.log(`   成功率: ${suite.summary.successRate.toFixed(1)}%`);
            console.log(`   耗时: ${suite.summary.duration}ms`);

            if (suite.summary.failed > 0) {
                console.log("\n   失败测试:");
                suite.results
                    .filter(r => r.status === "failed")
                    .forEach(r => {
                        console.log(`     ❌ ${r.testName}: ${r.error}`);
                    });
            }
        }

        console.log("\n" + "-".repeat(60));
        console.log("📈 总体统计:");
        console.log(`   总测试: ${result.summary.total}`);
        console.log(`   通过: ${result.summary.passed} ✅`);
        console.log(`   失败: ${result.summary.failed} ❌`);
        console.log(`   跳过: ${result.summary.skipped} ⏭️`);
        console.log(`   成功率: ${result.summary.successRate.toFixed(1)}%`);
        console.log(`   总耗时: ${result.summary.duration}ms`);
        console.log("=".repeat(60));
    }

    static async runSpecificTest(testName: string, config: Partial<TestConfig> = {}): Promise<TestResult> {
        const finalConfig = { ...this.defaultConfig, ...config };
        const startTime = Date.now();

        console.log(`🧪 运行特定测试: ${testName}`);

        try {
            // 检查是否是场景测试
            if (testName.startsWith("scenario_")) {
                const scenarioTestName = testName.replace("scenario_", "");
                await SimpleScenarioTestRunner.runSpecificTest(scenarioTestName);

                return {
                    testName,
                    testType: "scenario",
                    status: "passed",
                    duration: Date.now() - startTime
                };
            }

            // 其他测试类型
            throw new Error(`未知测试: ${testName}`);

        } catch (error) {
            return {
                testName,
                testType: "unknown",
                status: "failed",
                duration: Date.now() - startTime,
                error: error instanceof Error ? error.message : "未知错误"
            };
        }
    }
}

// ==================== 便捷函数 ====================

export async function runAllTournamentTests(config?: Partial<TestConfig>) {
    return await UnifiedTournamentTestRunner.runAllTests(config);
}

export async function runSpecificTournamentTest(testName: string, config?: Partial<TestConfig>) {
    return await UnifiedTournamentTestRunner.runSpecificTest(testName, config);
}

// ==================== Convex 函数接口 ====================

export const runUnifiedTests = query({
    args: {
        testTypes: v.optional(v.array(v.string())),
        specificTests: v.optional(v.array(v.string())),
        timeout: v.optional(v.number()),
        verbose: v.optional(v.boolean())
    },
    handler: async (ctx, args) => {
        const config: Partial<TestConfig> = {
            testTypes: args.testTypes as any,
            specificTests: args.specificTests,
            timeout: args.timeout,
            verbose: args.verbose
        };

        const result = await UnifiedTournamentTestRunner.runAllTests(config);
        return {
            success: result.summary.failed === 0,
            result,
            message: result.summary.failed === 0 ? "所有测试通过" : `${result.summary.failed} 个测试失败`
        };
    }
});

export const runSpecificTest = query({
    args: {
        testName: v.string(),
        timeout: v.optional(v.number())
    },
    handler: async (ctx, args) => {
        const config: Partial<TestConfig> = {
            timeout: args.timeout
        };

        const result = await UnifiedTournamentTestRunner.runSpecificTest(args.testName, config);
        return {
            success: result.status === "passed",
            result,
            message: result.status === "passed" ? "测试通过" : `测试失败: ${result.error}`
        };
    }
});

export const getTestStatus = query({
    args: {},
    handler: async (ctx) => {
        return {
            status: "ready",
            availableTests: [
                "scenario_daily_join",
                "scenario_daily_limit",
                "scenario_single_join",
                "scenario_multi_join",
                "scenario_independent_creation"
            ],
            message: "统一测试系统已准备就绪",
            timestamp: new Date().toISOString()
        };
    }
});

// ==================== 测试验证函数 ====================

export const testRunUnifiedTests = query({
    args: {},
    handler: async (ctx) => {
        try {
            console.log("🧪 开始测试 runUnifiedTests 函数...");

            // 测试 runUnifiedTests 函数是否可用
            const testConfig = {
                testTypes: ["unit"] as ("unit" | "scenario" | "performance" | "integration" | "e2e")[],
                timeout: 5000,
                verbose: true
            };

            console.log("🔧 测试配置:", testConfig);

            const result = await UnifiedTournamentTestRunner.runAllTests(testConfig);
            console.log("✅ 测试执行完成:", result);

            return {
                success: true,
                message: "runUnifiedTests 函数正常工作",
                result: {
                    total: result.summary.total,
                    passed: result.summary.passed,
                    failed: result.summary.failed,
                    successRate: result.summary.successRate
                }
            };
        } catch (error) {
            console.error("❌ runUnifiedTests 函数测试失败:", error);
            return {
                success: false,
                message: `runUnifiedTests 函数测试失败: ${error instanceof Error ? error.message : "未知错误"}`,
                error: error instanceof Error ? error.stack : "未知错误",
                debugInfo: {
                    errorType: error instanceof Error ? error.constructor.name : typeof error,
                    errorMessage: error instanceof Error ? error.message : String(error),
                    timestamp: new Date().toISOString()
                }
            };
        }
    }
});

// ==================== 简单测试验证函数 ====================

export const testMockContext = query({
    args: {},
    handler: async (ctx) => {
        try {
            console.log("🧪 开始测试 Mock 上下文...");

            // 创建 Mock 上下文
            const mockCtx = TournamentTestUtils.createMockContext();
            console.log("✅ Mock 上下文创建成功");

            // 检查 db.query 是否被正确创建
            console.log("🔍 检查 db.query:", typeof mockCtx.db.query);
            console.log("🔍 db.query 对象:", mockCtx.db.query);

            mockCtx.setupDefaultMocks();
            console.log("✅ 默认 Mock 设置完成");

            // 再次检查 db.query 是否被正确设置
            console.log("🔍 设置后 db.query:", typeof mockCtx.db.query);
            console.log("🔍 设置后 db.query 对象:", mockCtx.db.query);

            // 测试玩家查询 - 详细调试
            console.log("🔍 测试玩家查询...");
            const playerQuery = mockCtx.db.query("players");
            console.log("✅ 玩家查询创建成功:", typeof playerQuery);
            console.log("🔍 玩家查询对象:", playerQuery);

            if (!playerQuery) {
                throw new Error("玩家查询对象为空");
            }

            if (typeof playerQuery.withIndex !== 'function') {
                throw new Error("玩家查询对象缺少 withIndex 方法");
            }

            const queryResult = playerQuery.withIndex("by_uid");
            console.log("✅ 查询索引创建成功:", typeof queryResult);
            console.log("🔍 查询索引对象:", queryResult);

            if (!queryResult) {
                throw new Error("查询索引对象为空");
            }

            if (typeof queryResult.first !== 'function') {
                throw new Error("查询索引对象缺少 first 方法");
            }

            const playerResult = await queryResult.first();
            console.log("✅ 玩家查询结果:", playerResult);

            if (!playerResult) {
                throw new Error("玩家查询结果为空");
            }

            if (!playerResult.uid) {
                throw new Error("玩家查询结果缺少 uid 字段");
            }

            // 测试认证
            console.log("🔍 测试认证...");
            const identity = await mockCtx.auth.getUserIdentity();
            console.log("✅ 用户身份:", identity);

            if (!identity) {
                throw new Error("用户身份为空");
            }

            if (!identity.subject) {
                throw new Error("用户身份缺少 subject 字段");
            }

            // 测试数据库操作
            console.log("🔍 测试数据库操作...");
            const insertResult = await mockCtx.db.insert("players", { uid: "test" });
            console.log("✅ 插入结果:", insertResult);

            if (!insertResult) {
                throw new Error("插入操作返回空结果");
            }

            const patchResult = await mockCtx.db.patch("player1", { name: "test" });
            console.log("✅ 更新结果:", patchResult);

            if (!patchResult) {
                throw new Error("更新操作返回空结果");
            }

            return {
                success: true,
                message: "Mock 上下文测试通过",
                results: {
                    playerQuery: typeof playerQuery,
                    playerResult: playerResult ? "存在" : "不存在",
                    playerUid: playerResult?.uid || "无",
                    identity: identity ? "存在" : "不存在",
                    identitySubject: identity?.subject || "无",
                    insertResult: insertResult ? "成功" : "失败",
                    patchResult: patchResult ? "成功" : "失败"
                }
            };
        } catch (error) {
            console.error("❌ Mock 上下文测试失败:", error);
            return {
                success: false,
                message: `Mock 上下文测试失败: ${error instanceof Error ? error.message : "未知错误"}`,
                error: error instanceof Error ? error.stack : "未知错误",
                debugInfo: {
                    errorType: error instanceof Error ? error.constructor.name : typeof error,
                    errorMessage: error instanceof Error ? error.message : String(error)
                }
            };
        }
    }
});

// ==================== 简单验证函数 ====================

export const testJestFunction = query({
    args: {},
    handler: async (ctx) => {
        try {
            console.log("🧪 测试 jest 函数...");

            // 导入 jest 函数
            const { jest } = await import("./simpleTestFramework");
            console.log("✅ jest 函数导入成功");

            // 创建 mock 函数
            const mockFn = jest().fn();
            console.log("✅ mock 函数创建成功");

            // 设置返回值
            mockFn.mockReturnValue("test_value");
            console.log("✅ mock 函数设置返回值成功");

            // 调用函数
            const result = mockFn("test_arg");
            console.log("✅ mock 函数调用成功，结果:", result);

            // 验证结果
            if (result !== "test_value") {
                throw new Error(`期望返回 "test_value"，但得到 "${result}"`);
            }

            // 验证调用记录
            if (mockFn.mock.calls.length !== 1) {
                throw new Error(`期望调用 1 次，但实际调用 ${mockFn.mock.calls.length} 次`);
            }

            if (mockFn.mock.calls[0][0] !== "test_arg") {
                throw new Error(`期望参数 "test_arg"，但得到 "${mockFn.mock.calls[0][0]}"`);
            }

            return {
                success: true,
                message: "jest 函数测试通过",
                result: {
                    returnValue: result,
                    callCount: mockFn.mock.calls.length,
                    callArgs: mockFn.mock.calls[0]
                }
            };

        } catch (error) {
            console.error("❌ jest 函数测试失败:", error);
            return {
                success: false,
                message: `jest 函数测试失败: ${error instanceof Error ? error.message : "未知错误"}`,
                error: error instanceof Error ? error.stack : "未知错误"
            };
        }
    }
});

export const testSimpleMock = query({
    args: {},
    handler: async (ctx) => {
        try {
            console.log("🧪 开始简单 Mock 测试...");

            // 创建 Mock 上下文
            const mockCtx = TournamentTestUtils.createMockContext();
            console.log("✅ Mock 上下文创建成功");

            // 设置默认 Mock
            mockCtx.setupDefaultMocks();
            console.log("✅ 默认 Mock 设置完成");

            // 测试玩家查询
            const playerQuery = mockCtx.db.query("players");
            console.log("✅ 玩家查询创建成功:", typeof playerQuery);

            if (!playerQuery) {
                throw new Error("玩家查询对象为空");
            }

            const queryResult = playerQuery.withIndex("by_uid");
            console.log("✅ 查询索引创建成功:", typeof queryResult);

            if (!queryResult) {
                throw new Error("查询索引对象为空");
            }

            const playerResult = await queryResult.first();
            console.log("✅ 玩家查询结果:", playerResult);

            if (!playerResult) {
                throw new Error("玩家查询结果为空");
            }

            if (!playerResult.uid) {
                throw new Error("玩家查询结果缺少 uid 字段");
            }

            // 测试认证
            const identity = await mockCtx.auth.getUserIdentity();
            console.log("✅ 用户身份:", identity);

            if (!identity) {
                throw new Error("用户身份为空");
            }

            if (!identity.subject) {
                throw new Error("用户身份缺少 subject 字段");
            }

            // 测试数据库操作
            const insertResult = await mockCtx.db.insert("players", { uid: "test" });
            console.log("✅ 插入结果:", insertResult);

            if (!insertResult) {
                throw new Error("插入操作返回空结果");
            }

            const patchResult = await mockCtx.db.patch("player1", { name: "test" });
            console.log("✅ 更新结果:", patchResult);

            if (!patchResult) {
                throw new Error("更新操作返回空结果");
            }

            return {
                success: true,
                message: "简单 Mock 测试通过",
                results: {
                    playerQuery: typeof playerQuery,
                    playerResult: playerResult ? "存在" : "不存在",
                    playerUid: playerResult?.uid || "无",
                    identity: identity ? "存在" : "不存在",
                    identitySubject: identity?.subject || "无",
                    insertResult: insertResult ? "成功" : "失败",
                    patchResult: patchResult ? "成功" : "失败"
                }
            };

        } catch (error) {
            console.error("❌ 简单 Mock 测试失败:", error);
            return {
                success: false,
                message: `简单 Mock 测试失败: ${error instanceof Error ? error.message : "未知错误"}`,
                error: error instanceof Error ? error.stack : "未知错误",
                debugInfo: {
                    errorType: error instanceof Error ? error.constructor.name : typeof error,
                    errorMessage: error instanceof Error ? error.message : String(error)
                }
            };
        }
    }
});

// ==================== 调试函数 ====================

export const debugTestSystem = query({
    args: {},
    handler: async (ctx) => {
        const debugInfo = {
            timestamp: new Date().toISOString(),
            functions: {
                runUnifiedTests: typeof runUnifiedTests,
                runSpecificTest: typeof runSpecificTest,
                getTestStatus: typeof getTestStatus,
                UnifiedTournamentTestRunner: typeof UnifiedTournamentTestRunner,
                runAllTournamentTests: typeof runAllTournamentTests
            },
            imports: {
                convexValues: typeof v !== 'undefined',
                convexQuery: typeof query !== 'undefined',
                simpleScenarioTestRunner: typeof SimpleScenarioTestRunner !== 'undefined'
            },
            message: "调试信息收集完成"
        };

        return debugInfo;
    }
}); 