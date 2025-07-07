import { api } from "../../../_generated/api";
import { mutation } from "../../../_generated/server";

/**
 * 运行 base.ts TournamentMatchingService 集成测试
 */
export const runBaseHandlerIntegrationTests: any = (mutation as any)({
    args: {},
    handler: async (ctx: any) => {
        console.log("开始运行 base.ts TournamentMatchingService 集成测试...");

        try {
            // 运行集成测试
            const testResult = await ctx.runMutation(
                (api as any)["service/tournament/tests/testBaseHandlerIntegration"].testBaseHandlerIntegration,
                {}
            );

            console.log("测试结果:", JSON.stringify(testResult, null, 2));

            // 分析测试结果
            const analysis = analyzeTestResults(testResult);

            return {
                success: testResult.success,
                message: "base.ts TournamentMatchingService 集成测试运行完成",
                testResult,
                analysis,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error("运行测试失败:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "未知错误",
                timestamp: new Date().toISOString()
            };
        }
    },
});

/**
 * 分析测试结果
 */
function analyzeTestResults(testResult: any) {
    if (!testResult.success) {
        return {
            overall: "失败",
            error: testResult.error,
            recommendations: [
                "检查 TournamentMatchingService 是否正确导入",
                "验证数据库表结构是否完整",
                "确认锦标赛类型配置是否正确"
            ]
        };
    }

    const results = testResult.results || [];
    const passedTests = results.filter((r: any) => r.success);
    const failedTests = results.filter((r: any) => !r.success);

    const analysis: {
        overall: string;
        totalTests: number;
        passedTests: number;
        failedTests: number;
        successRate: string;
        details: any;
        recommendations: string[];
    } = {
        overall: failedTests.length === 0 ? "通过" : "部分通过",
        totalTests: results.length,
        passedTests: passedTests.length,
        failedTests: failedTests.length,
        successRate: `${((passedTests.length / results.length) * 100).toFixed(1)}%`,
        details: {
            singleMatch: results.find((r: any) => r.test === "单人比赛锦标赛"),
            multiMatch: results.find((r: any) => r.test === "多人比赛锦标赛"),
            fallback: results.find((r: any) => r.test === "匹配失败回退")
        },
        recommendations: [] as string[]
    };

    // 生成建议
    if (failedTests.length > 0) {
        analysis.recommendations.push("检查失败的测试用例，修复相关问题");
    }

    if (analysis.details.singleMatch && !analysis.details.singleMatch.success) {
        analysis.recommendations.push("单人比赛锦标赛处理逻辑需要检查");
    }

    if (analysis.details.multiMatch && !analysis.details.multiMatch.success) {
        analysis.recommendations.push("多人比赛锦标赛匹配服务需要检查");
    }

    if (analysis.details.fallback && !analysis.details.fallback.success) {
        analysis.recommendations.push("匹配失败回退机制需要检查");
    }

    if (passedTests.length === results.length) {
        analysis.recommendations.push("所有测试通过，base.ts TournamentMatchingService 集成正常");
    }

    return analysis;
}

/**
 * 清理测试数据
 */
export const cleanupTestData: any = (mutation as any)({
    args: {},
    handler: async (ctx: any) => {
        console.log("开始清理测试数据...");

        try {
            const now = new Date();
            const cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24小时前

            // 清理测试玩家
            const testPlayers = await ctx.db
                .query("players")
                .filter((q: any) => q.like(q.field("uid"), "test_%"))
                .collect();

            let cleanedPlayers = 0;
            for (const player of testPlayers) {
                await ctx.db.delete(player._id);
                cleanedPlayers++;
            }

            // 清理测试锦标赛类型
            const testTournamentTypes = await ctx.db
                .query("tournament_types")
                .filter((q: any) => q.like(q.field("typeId"), "test_%"))
                .collect();

            let cleanedTournamentTypes = 0;
            for (const tournamentType of testTournamentTypes) {
                await ctx.db.delete(tournamentType._id);
                cleanedTournamentTypes++;
            }

            // 清理测试锦标赛
            const testTournaments = await ctx.db
                .query("tournaments")
                .filter((q: any) => q.like(q.field("tournamentType"), "test_%"))
                .collect();

            let cleanedTournaments = 0;
            for (const tournament of testTournaments) {
                await ctx.db.delete(tournament._id);
                cleanedTournaments++;
            }

            // 清理测试比赛
            const testMatches = await ctx.db
                .query("matches")
                .filter((q: any) => q.like(q.field("gameData"), "%test_%"))
                .collect();

            let cleanedMatches = 0;
            for (const match of testMatches) {
                await ctx.db.delete(match._id);
                cleanedMatches++;
            }

            return {
                success: true,
                message: "测试数据清理完成",
                cleaned: {
                    players: cleanedPlayers,
                    tournamentTypes: cleanedTournamentTypes,
                    tournaments: cleanedTournaments,
                    matches: cleanedMatches
                },
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error("清理测试数据失败:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "未知错误",
                timestamp: new Date().toISOString()
            };
        }
    },
}); 