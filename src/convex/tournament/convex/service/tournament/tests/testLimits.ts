import { internal } from "../../../_generated/api";
import { mutation } from "../../../_generated/server";
import { getTorontoDate } from "../../utils";

// 限制校验测试
export const runTestLimits = mutation({
    args: {},
    handler: async (ctx: any, args: any) => {
        const testUid = "test_limits_user_" + Date.now();
        const now = getTorontoDate();

        try {
            console.log("开始测试限制校验...");

            // 1. 创建测试用户
            const playerId = await ctx.db.insert("players", {
                uid: testUid,
                displayName: "限制测试用户",
                segmentName: "bronze",
                isActive: true,
                isSubscribed: false,
                totalPoints: 1000,
                eloScore: 1000,
                lastActive: now.iso,
                createdAt: now.iso,
                updatedAt: now.iso
            });

            await ctx.db.insert("player_inventory", {
                uid: testUid,
                coins: 1000,
                props: [],
                tickets: [],
                createdAt: now.iso,
                updatedAt: now.iso
            });

            // 2. 确保有活跃赛季
            let season = await ctx.db
                .query("seasons")
                .withIndex("by_isActive", (q: any) => q.eq("isActive", true))
                .first();

            if (!season) {
                const seasonId = await ctx.db.insert("seasons", {
                    name: "测试赛季",
                    startDate: "2024-01-01",
                    endDate: "2024-12-31",
                    isActive: true,
                    createdAt: now.iso,
                    updatedAt: now.iso
                });
                season = await ctx.db.get(seasonId);
            }

            await ctx.db.insert("player_seasons", {
                uid: testUid,
                seasonId: season._id,
                seasonPoints: 0,
                gamePoints: { solitaire: 0, uno: 0, ludo: 0, rummy: 0 },
                matchesPlayed: 0,
                matchesWon: 0,
                winRate: 0,
                lastMatchAt: now.iso,
                createdAt: now.iso,
                updatedAt: now.iso
            });

            const results = [];

            // 3. 测试正常加入（应该成功）
            console.log("3. 测试正常加入...");
            try {
                const joinResult1 = await ctx.runMutation(internal.service.tournament.tournamentService.joinTournament, {
                    uid: testUid,
                    gameType: "solitaire",
                    tournamentType: "daily_special"
                });
                results.push({
                    test: "正常加入",
                    success: joinResult1.success,
                    detail: joinResult1
                });
            } catch (e) {
                results.push({
                    test: "正常加入",
                    success: false,
                    error: e instanceof Error ? e.message : String(e)
                });
            }

            // 4. 测试重复加入（应该失败）
            console.log("4. 测试重复加入...");
            try {
                const joinResult2 = await ctx.runMutation(internal.service.tournament.tournamentService.joinTournament, {
                    uid: testUid,
                    gameType: "solitaire",
                    tournamentType: "daily_special"
                });
                results.push({
                    test: "重复加入",
                    success: !joinResult2.success, // 期望失败
                    detail: joinResult2
                });
            } catch (e) {
                results.push({
                    test: "重复加入",
                    success: true, // 抛出异常说明限制生效
                    error: e instanceof Error ? e.message : String(e)
                });
            }

            // 5. 测试金币不足
            console.log("5. 测试金币不足...");
            await ctx.db.patch(
                (await ctx.db.query("player_inventory").withIndex("by_uid", (q: any) => q.eq("uid", testUid)).first())._id,
                { coins: 0 }
            );

            try {
                const joinResult3 = await ctx.runMutation(internal.service.tournament.tournamentService.joinTournament, {
                    uid: testUid,
                    gameType: "solitaire",
                    tournamentType: "daily_special"
                });
                results.push({
                    test: "金币不足",
                    success: !joinResult3.success, // 期望失败
                    detail: joinResult3
                });
            } catch (e) {
                results.push({
                    test: "金币不足",
                    success: true, // 抛出异常说明限制生效
                    error: e instanceof Error ? e.message : String(e)
                });
            }

            // 6. 清理测试数据
            try {
                await ctx.db.delete(playerId);
            } catch (cleanupError) {
                console.log("清理数据时出错:", cleanupError);
            }

            return {
                success: true,
                testUid,
                results,
                summary: {
                    total: results.length,
                    passed: results.filter(r => r.success).length,
                    failed: results.filter(r => !r.success).length
                },
                message: "限制校验测试完成"
            };

        } catch (e) {
            console.error("测试失败:", e);
            return {
                success: false,
                testUid,
                error: e instanceof Error ? e.message : String(e),
                message: "限制校验测试失败"
            };
        }
    }
}); 