import { internal } from "../../../_generated/api";
import { mutation } from "../../../_generated/server";

// 统一运行所有 tournament 测试
export const runAllTournamentTests = mutation({
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
export const runJoinTournamentTest = mutation({
    args: {} as Record<string, never>,
    handler: async (ctx: any, args: any) => {
        return await ctx.runMutation(internal.service.tournament.tests.testJoinTournament.runTestJoinTournament, {});
    }
});

export const runSubmitScoreTest = mutation({
    args: {} as Record<string, never>,
    handler: async (ctx: any, args: any) => {
        return await ctx.runMutation(internal.service.tournament.tests.testSubmitScore.runTestSubmitScore, {});
    }
});

export const runLimitsTest = mutation({
    args: {} as Record<string, never>,
    handler: async (ctx: any, args: any) => {
        return await ctx.runMutation(internal.service.tournament.tests.testLimits.runTestLimits, {});
    }
});

export const runSettleTournamentTest = mutation({
    args: {} as Record<string, never>,
    handler: async (ctx: any, args: any) => {
        return await ctx.runMutation(internal.service.tournament.tests.testSettleTournament.runTestSettleTournament, {});
    }
}); 