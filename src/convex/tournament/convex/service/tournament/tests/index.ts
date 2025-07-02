/**
 * 锦标赛测试系统统一入口
 * 提供所有测试功能的统一接口
 */

import { TEST_INVENTORIES, TEST_PLAYERS } from "./mockData";
import { SimpleScenarioTestRunner } from "./scenarios/simpleScenarioTests";
import { assertDefined, assertEqual, assertFalse, assertRejects, assertThrows, assertTrue, jest } from "./simpleTestFramework";
import { runAllTournamentTests } from "./testRunner";
import { MockContext, TournamentTestUtils } from "./testUtils";

// ==================== 测试框架 ====================
export {
    afterEach, assertDefined,
    // 断言函数
    assertEqual, assertFalse, assertRejects, assertThrows, assertTrue, beforeEach,
    // 测试运行器
    describe,
    it,
    // Mock 函数
    jest
} from "./simpleTestFramework";

// ==================== 测试工具 ====================
export {
    MockContext,
    TournamentTestUtils
} from "./testUtils";

// ==================== 测试数据 ====================
export {
    TEST_EVENTS, TEST_INVENTORIES, TEST_LIMITS, TEST_MATCHES,
    TEST_PLAYER_MATCHES, TEST_PLAYERS, TEST_SEASONS, TEST_TOURNAMENTS
} from "./mockData";

// ==================== 场景测试 ====================
export {
    getSimpleScenarioTestStatus, runSimpleScenarioTests, SimpleDailySpecialTests, SimpleIndependentTests, SimpleMultiPlayerTests, SimpleScenarioTestRunner, SimpleSinglePlayerTests
} from "./scenarios/simpleScenarioTests";

// ==================== 统一测试运行器 ====================
export {
    debugTestSystem, getTestStatus,
    runAllTournamentTests, runSpecificTest, runUnifiedTests, testRunUnifiedTests, UnifiedTournamentTestRunner
} from "./testRunner";

// ==================== 测试配置类型 ====================
export type {
    TestConfig, TestExecutionResult, TestResult,
    TestSuiteResult
} from "./testRunner";

// ==================== 便捷测试函数 ====================

/**
 * 快速运行所有测试
 */
export async function runAllTests() {
    console.log("🚀 运行所有锦标赛测试");

    // 运行统一测试
    const unifiedResult = await runAllTournamentTests();

    // 运行简化场景测试
    const scenarioResult = await SimpleScenarioTestRunner.runAllTests();

    return {
        unified: unifiedResult,
        scenario: scenarioResult,
        overall: {
            success: unifiedResult.summary.failed === 0 && scenarioResult.failed === 0,
            totalTests: unifiedResult.summary.total + 8, // 8个场景测试
            passedTests: unifiedResult.summary.passed + scenarioResult.passed,
            failedTests: unifiedResult.summary.failed + scenarioResult.failed
        }
    };
}

/**
 * 运行特定类型的测试
 */
export async function runTestType(type: "unit" | "integration" | "scenario" | "all") {
    switch (type) {
        case "unit":
            return await runAllTournamentTests({ testTypes: ["unit"] });
        case "integration":
            return await runAllTournamentTests({ testTypes: ["integration"] });
        case "scenario":
            return await SimpleScenarioTestRunner.runAllTests();
        case "all":
            return await runAllTests();
        default:
            throw new Error(`未知测试类型: ${type}`);
    }
}

/**
 * 获取测试状态
 */
export function getTestSystemStatus() {
    return {
        status: "ready",
        availableTestTypes: ["unit", "integration", "scenario", "all"],
        availableSpecificTests: [
            "daily_join",
            "daily_limit",
            "daily_coins",
            "single_join",
            "single_submit",
            "multi_join",
            "multi_matching",
            "independent_creation"
        ],
        frameworks: {
            simpleTestFramework: "ready",
            testUtils: "ready",
            mockData: "ready",
            scenarioTests: "ready",
            unifiedRunner: "ready"
        },
        message: "锦标赛测试系统已准备就绪",
        timestamp: new Date().toISOString()
    };
}

/**
 * 验证测试环境
 */
export async function validateTestEnvironment() {
    const results = [];

    try {
        // 测试断言函数
        assertTrue(true);
        assertFalse(false);
        assertEqual(1, 1);
        assertDefined("test");
        results.push({ component: "断言函数", status: "✅" });
    } catch (error) {
        results.push({ component: "断言函数", status: "❌", error });
    }

    try {
        // 测试 Mock 函数
        if (typeof jest === 'function') {
            const mockFn = (jest as any)().fn();
            mockFn("test");
            results.push({ component: "Mock函数", status: "✅" });
        } else {
            results.push({ component: "Mock函数", status: "⏭️", message: "jest not available in runtime" });
        }
    } catch (error) {
        results.push({ component: "Mock函数", status: "❌", error });
    }

    try {
        // 测试测试工具
        const ctx = TournamentTestUtils.createMockContext();
        results.push({ component: "测试工具", status: "✅" });
    } catch (error) {
        results.push({ component: "测试工具", status: "❌", error });
    }

    try {
        // 测试测试数据
        assertDefined(TEST_PLAYERS);
        assertDefined(TEST_INVENTORIES);
        results.push({ component: "测试数据", status: "✅" });
    } catch (error) {
        results.push({ component: "测试数据", status: "❌", error });
    }

    const allPassed = results.every(r => r.status === "✅");

    return {
        valid: allPassed,
        results,
        message: allPassed ? "测试环境验证通过" : "测试环境验证失败"
    };
}

// ==================== 默认导出 ====================
export default {
    // 测试框架
    assertEqual,
    assertDefined,
    assertTrue,
    assertFalse,
    assertThrows,
    assertRejects,
    jest,

    // 测试工具
    TournamentTestUtils,
    MockContext,

    // 测试数据
    TEST_PLAYERS,
    TEST_INVENTORIES,

    // 测试运行器
    runAllTests,
    runTestType,
    runAllTournamentTests,
    SimpleScenarioTestRunner,

    // 状态和验证
    getTestSystemStatus,
    validateTestEnvironment
}; 