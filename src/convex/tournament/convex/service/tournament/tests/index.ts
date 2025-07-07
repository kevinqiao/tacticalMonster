import { internal } from "../../../_generated/api";
import { mutation } from "../../../_generated/server";

// 统一运行所有 tournament 测试
export const runAllTournamentTests = (mutation as any)({
    args: {} as Record<string, never>,
    handler: async (ctx: any, args: any) => {
        const results = [];
        const startTime = Date.now();

        console.log("🚀 开始运行所有锦标赛测试...");

        // 依次调用各测试 mutation
        try {
            console.log("📋 运行加入锦标赛测试...");
            const joinResult = await ctx.runMutation(internal.service.tournament.tests.testJoinTournament.runTestJoinTournament, {});
            results.push({ name: "joinTournament", ...joinResult });
        } catch (e) {
            results.push({ name: "joinTournament", success: false, error: e instanceof Error ? e.message : String(e) });
        }

        try {
            console.log("📋 运行分数提交测试...");
            const submitResult = await ctx.runMutation(internal.service.tournament.tests.testSubmitScore.runTestSubmitScore, {});
            results.push({ name: "submitScore", ...submitResult });
        } catch (e) {
            results.push({ name: "submitScore", success: false, error: e instanceof Error ? e.message : String(e) });
        }

        try {
            console.log("📋 运行限制校验测试...");
            const limitsResult = await ctx.runMutation(internal.service.tournament.tests.testLimits.runTestLimits, {});
            results.push({ name: "limits", ...limitsResult });
        } catch (e) {
            results.push({ name: "limits", success: false, error: e instanceof Error ? e.message : String(e) });
        }

        try {
            console.log("📋 运行结算测试...");
            const settleResult = await ctx.runMutation(internal.service.tournament.tests.testSettleTournament.runTestSettleTournament, {});
            results.push({ name: "settleTournament", ...settleResult });
        } catch (e) {
            results.push({ name: "settleTournament", success: false, error: e instanceof Error ? e.message : String(e) });
        }

        try {
            console.log("📋 运行阈值锦标赛测试...");
            const thresholdResult = await ctx.runMutation(internal.service.tournament.tests.testThresholdTournament.runTestThresholdTournament, {});
            results.push({ name: "thresholdTournament", ...thresholdResult });
        } catch (e) {
            results.push({ name: "thresholdTournament", success: false, error: e instanceof Error ? e.message : String(e) });
        }

        try {
            console.log("📋 运行可用锦标赛查询测试...");
            const availableResult = await ctx.runMutation(internal.service.tournament.tests.runGetAvailableTournamentsTests.runGetAvailableTournamentsTests, {});
            results.push({ name: "getAvailableTournaments", ...availableResult });
        } catch (e) {
            results.push({ name: "getAvailableTournaments", success: false, error: e instanceof Error ? e.message : String(e) });
        }

        const endTime = Date.now();
        const duration = endTime - startTime;

        const summary = {
            total: results.length,
            passed: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            duration: `${duration}ms`
        };

        console.log("✅ 所有测试完成！", summary);

        return {
            summary,
            results,
            timestamp: new Date().toISOString()
        };
    }
});

// 单独运行特定测试
export const runJoinTournamentTest = (mutation as any)({
    args: {} as Record<string, never>,
    handler: async (ctx: any, args: any): Promise<any> => {
        return await ctx.runMutation(internal.service.tournament.tests.testJoinTournament.runTestJoinTournament, {});
    }
});

export const runSubmitScoreTest = (mutation as any)({
    args: {} as Record<string, never>,
    handler: async (ctx: any, args: any): Promise<any> => {
        return await ctx.runMutation(internal.service.tournament.tests.testSubmitScore.runTestSubmitScore, {});
    }
});

export const runLimitsTest = (mutation as any)({
    args: {} as Record<string, never>,
    handler: async (ctx: any, args: any): Promise<any> => {
        return await ctx.runMutation(internal.service.tournament.tests.testLimits.runTestLimits, {});
    }
});

export const runSettleTournamentTest = (mutation as any)({
    args: {} as Record<string, never>,
    handler: async (ctx: any, args: any): Promise<any> => {
        return await ctx.runMutation(internal.service.tournament.tests.testSettleTournament.runTestSettleTournament, {});
    }
});

export const runThresholdTournamentTest = (mutation as any)({
    args: {} as Record<string, never>,
    handler: async (ctx: any, args: any): Promise<any> => {
        return await ctx.runMutation(internal.service.tournament.tests.testThresholdTournament.runTestThresholdTournament, {});
    }
});

export const runGetAvailableTournamentsTest = (mutation as any)({
    args: {} as Record<string, never>,
    handler: async (ctx: any, args: any): Promise<any> => {
        return await ctx.runMutation(internal.service.tournament.tests.runGetAvailableTournamentsTests.runGetAvailableTournamentsTests, {});
    }
});

/**
 * 锦标赛测试索引
 * 
 * 包含所有锦标赛相关的测试函数
 */

// 基础测试
export { runGetAvailableTournamentsTests, runSingleTest } from "./runGetAvailableTournamentsTests";

// 控制台测试 - 推荐使用
export { consoleTestGetAvailableTournaments, quickTestGetAvailableTournaments } from "./runGetAvailableTournamentsTests";

// 自动创建锦标赛测试
export { consoleTestAutoCreate, quickTestAutoCreate, runAutoCreateTests, runSingleAutoCreateTest } from "./runAutoCreateTests";

// 实时更新测试
export { consoleTestRealtimeUpdates, quickTestRealtimeUpdates, runRealtimeUpdateTests, runSingleRealtimeTest } from "./runRealtimeUpdateTests";

// 阈值锦标赛测试
export { runIntegrationTest, runThresholdTests } from "./runThresholdTests";

// 测试类
export { TestAutoCreateTournaments } from "./testAutoCreateTournaments";
export { TestGetAvailableTournaments } from "./testGetAvailableTournaments";
export { TestRealtimeUpdates } from "./testRealtimeUpdates";

// 测试工具
export { TestUtils } from "./testUtils";

/**
 * 测试使用指南：
 * 
 * 1. 快速验证 - 使用 quickTest* 函数
 * 2. 完整测试 - 使用 consoleTest* 函数
 * 3. 单个测试 - 使用 runSingle* 函数
 * 4. 详细文档 - 查看对应的 README 文件
 * 
 * 新增功能：
 * - 自动创建锦标赛测试：验证 getAvailableTournaments 中的懒加载创建功能
 * - 实时更新测试：验证锦标赛状态的实时更新功能
 * - 支持每日、每周、赛季锦标赛的自动创建
 * - 包含重复创建防护和通知功能测试
 * - 测试资格变化、库存变化等实时更新场景
 */ 