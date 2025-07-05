import { internal } from "../../../_generated/api";
import { mutation } from "../../../_generated/server";
import { getTorontoDate } from "../../utils";

// 分数提交测试
export const runTestSubmitScore = (mutation as any)({
    args: {} as Record<string, never>,
    handler: async (ctx: any, args: any) => {
        const testUid = "test_score_user_" + Date.now();
        const now = getTorontoDate();

        try {
            console.log("开始测试分数提交...");

            // 1. 检查并创建锦标赛类型配置
            console.log("1. 检查锦标赛类型配置...");
            let tournamentType = await ctx.db
                .query("tournament_types")
                .withIndex("by_typeId", (q: any) => q.eq("typeId", "daily_special"))
                .first();

            if (!tournamentType) {
                console.log("创建 daily_special 锦标赛类型...");
                const typeId = await ctx.db.insert("tournament_types", {
                    typeId: "daily_special",
                    name: "每日特殊锦标赛",
                    description: "每日限时特殊锦标赛，提供丰厚奖励",
                    category: "daily",
                    gameType: "solitaire",
                    isActive: true,
                    priority: 1,
                    defaultConfig: {
                        entryFee: {
                            coins: 50
                        },
                        rules: {
                            maxAttempts: 3,
                            isSingleMatch: true
                        },
                        duration: 24 * 60 * 60 * 1000
                    },
                    createdAt: now.iso,
                    updatedAt: now.iso
                });
                tournamentType = await ctx.db.get(typeId);
            }

            // 2. 创建测试用户和必要数据
            console.log("2. 创建测试用户...");
            const playerId = await ctx.db.insert("players", {
                uid: testUid,
                displayName: "分数测试用户",
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

            // 3. 确保有活跃赛季
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

            // 4. 先加入锦标赛
            console.log("3. 加入锦标赛...");
            const joinResult = await ctx.runMutation(internal.service.tournament.tournamentService.joinTournament, {
                uid: testUid,
                gameType: "solitaire",
                tournamentType: "daily_special"
            });

            if (!joinResult.success) {
                throw new Error("加入锦标赛失败: " + joinResult.message);
            }

            // 5. 提交分数
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
                propsUsed: ["hint"],
                gameId: "test_game_" + Date.now()
            });

            console.log("分数提交结果:", submitResult);

            // 6. 清理测试数据
            try {
                await ctx.db.delete(playerId);
            } catch (cleanupError) {
                console.log("清理数据时出错:", cleanupError);
            }

            return {
                success: true,
                testUid,
                tournamentType: tournamentType.typeId,
                joinResult,
                submitResult,
                message: "分数提交测试完成"
            };

        } catch (e) {
            console.error("测试失败:", e);
            return {
                success: false,
                testUid,
                error: e instanceof Error ? e.message : String(e),
                message: "分数提交测试失败"
            };
        }
    }
}); 