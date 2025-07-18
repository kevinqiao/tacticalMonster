import { internal } from "../../../_generated/api";
import { mutation } from "../../../_generated/server";
import { getTorontoDate } from "../../utils";

// 锦标赛结算测试
export const runTestSettleTournament = mutation({
    args: {},
    handler: async (ctx: any, args: any) => {
        const testUid = "test_settle_user_" + Date.now();
        const now = getTorontoDate();

        try {
            console.log("开始测试锦标赛结算...");

            // 1. 创建测试用户
            const playerId = await ctx.db.insert("players", {
                uid: testUid,
                displayName: "结算测试用户",
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

            // 3. 加入锦标赛
            console.log("3. 加入锦标赛...");
            const joinResult = await ctx.runMutation(internal.service.tournament.tournamentService.joinTournament, {
                uid: testUid,
                gameType: "solitaire",
                tournamentType: "daily_special"
            });

            if (!joinResult.success) {
                throw new Error("加入锦标赛失败: " + joinResult.message);
            }

            // 4. 提交分数
            console.log("4. 提交分数...");
            const submitResult = await ctx.runMutation(internal.service.tournament.tournamentService.submitScore, {
                tournamentId: joinResult.tournamentId,
                uid: testUid,
                gameType: "solitaire",
                score: 1500,
                gameData: {
                    moves: 50,
                    timeUsed: 300,
                    hintsUsed: 2
                },
                propsUsed: [],
                gameId: "test_game_" + Date.now()
            });

            // 5. 手动结算锦标赛
            console.log("5. 手动结算锦标赛...");
            const settleResult = await ctx.runMutation(internal.service.tournament.tournamentService.settleTournament, {
                tournamentId: joinResult.tournamentId
            });

            // 6. 检查结算结果
            console.log("6. 检查结算结果...");
            const tournamentDetails = await ctx.runQuery(internal.service.tournament.tournamentService.getTournamentDetails, {
                tournamentId: joinResult.tournamentId
            });

            // 7. 检查玩家奖励
            const inventory = await ctx.db
                .query("player_inventory")
                .withIndex("by_uid", (q: any) => q.eq("uid", testUid))
                .first();

            // 8. 清理测试数据
            try {
                await ctx.db.delete(playerId);
            } catch (cleanupError) {
                console.log("清理数据时出错:", cleanupError);
            }

            return {
                success: true,
                testUid,
                joinResult,
                submitResult,
                settleResult,
                tournamentDetails,
                finalInventory: inventory,
                message: "锦标赛结算测试完成"
            };

        } catch (e) {
            console.error("测试失败:", e);
            return {
                success: false,
                testUid,
                error: e instanceof Error ? e.message : String(e),
                message: "锦标赛结算测试失败"
            };
        }
    }
}); 