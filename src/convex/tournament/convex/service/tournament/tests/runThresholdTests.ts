import { mutation } from "../../../_generated/server";
import { testThresholdRankingLogic, testThresholdTournamentIntegration } from "./testThresholdTournamentIntegration";

/**
 * 运行阈值锦标赛测试
 */
export const runThresholdTests = mutation({
    args: {},
    handler: async (ctx, args) => {
        console.log("=== 开始运行阈值锦标赛测试套件 ===");

        const results = {
            integrationTest: null as any,
            rankingLogicTest: null as any,
            overallSuccess: false
        };

        try {
            // 运行集成测试
            console.log("运行集成测试...");
            results.integrationTest = await testThresholdTournamentIntegration(ctx);

            if (results.integrationTest && !results.integrationTest.success) {
                throw new Error(`集成测试失败: ${results.integrationTest.error || '未知错误'}`);
            }

            // 运行排名逻辑测试
            console.log("运行排名逻辑测试...");
            results.rankingLogicTest = await testThresholdRankingLogic(ctx);

            results.overallSuccess = true;

            console.log("=== 阈值锦标赛测试套件完成 ===");

            return {
                success: true,
                message: "所有阈值锦标赛测试通过",
                results
            };

        } catch (error) {
            console.error("阈值锦标赛测试套件失败:", error);

            return {
                success: false,
                error: error instanceof Error ? error.message : "未知错误",
                results
            };
        }
    },
});

/**
 * 运行单个集成测试
 */


export const runIntegrationTest = (mutation as any)({
    args: {},
    handler: async (ctx: any, args: any) => {
        return await testThresholdTournamentIntegration(ctx);
    },
});

/**
 * 运行排名逻辑测试
 */
export const runRankingLogicTest = mutation({
    args: {},
    handler: async (ctx, args) => {
        return await testThresholdRankingLogic(ctx);
    },
}); 