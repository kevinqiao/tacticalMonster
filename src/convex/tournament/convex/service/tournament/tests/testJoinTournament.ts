import { internal } from "../../../_generated/api";
import { mutation } from "../../../_generated/server";
import { TestUtils } from "./testUtils";

// 加入锦标赛测试
export const runTestJoinTournament = (mutation as any)({
    args: {} as Record<string, never>,
    handler: async (ctx: any, args: any) => {
        const testUid = TestUtils.generateTestUid("tournament");

        try {
            console.log("开始测试加入锦标赛...");

            // 1. 初始化测试环境
            console.log("1. 初始化测试环境...");
            const { playerId, tournamentType } = await TestUtils.initializeTestEnvironment(ctx, testUid);

            // 2. 测试加入锦标赛
            console.log("2. 测试加入锦标赛...");
            const joinResult = await ctx.runMutation(internal.service.tournament.tournamentService.joinTournament, {
                uid: testUid,
                gameType: "solitaire",
                tournamentType: "daily_special"
            });

            console.log("加入锦标赛结果:", joinResult);

            // 3. 清理测试数据
            console.log("3. 清理测试数据...");
            await TestUtils.cleanupTestData(ctx, playerId, testUid);

            return {
                success: true,
                testUid,
                tournamentType: tournamentType.typeId,
                detail: joinResult,
                message: "加入锦标赛测试完成"
            };

        } catch (e) {
            console.error("测试失败:", e);
            return {
                success: false,
                testUid,
                error: e instanceof Error ? e.message : String(e),
                message: "加入锦标赛测试失败"
            };
        }
    }
}); 