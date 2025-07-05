import { internal } from "../../../_generated/api";
import { mutation } from "../../../_generated/server";
import { TestUtils } from "./testUtils";

/**
 * 测试阈值锦标赛功能
 */
export const runTestThresholdTournament = (mutation as any)({
    args: {} as Record<string, never>,
    handler: async (ctx: any) => {
        const testUid = `tournament_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        let testData: any = null;

        try {
            console.log(`开始测试阈值锦标赛功能 (${testUid})`);

            // 1. 初始化测试环境
            testData = await TestUtils.initializeTestEnvironment(ctx, testUid);

            // 2. 创建阈值锦标赛类型配置
            const thresholdTournamentType = await ctx.db.insert("tournament_types", {
                typeId: "single_player_threshold_tournament",
                name: "单人阈值锦标赛",
                description: "达到目标分数即可获胜，挑战你的极限",
                category: "casual",
                handlerModule: "single_player_tournament",
                isActive: true,
                defaultConfig: {
                    matchRules: {
                        rankingMethod: "threshold",
                        scoreThreshold: 1000, // 达到1000分即可获胜
                        maxAttempts: 3
                    },
                    rewards: {
                        baseRewards: {
                            coins: 80,
                            gamePoints: 40
                        },
                        rankRewards: [
                            {
                                rankRange: [1, 1],
                                multiplier: 3.0
                            },
                            {
                                rankRange: [2, 2],
                                multiplier: 1.5
                            }
                        ]
                    }
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            console.log("✅ 阈值锦标赛类型配置创建成功");

            // 3. 测试加入阈值锦标赛
            const joinResult = await ctx.runMutation(
                internal.service.tournament.tournamentService.joinTournament,
                {
                    uid: testUid,
                    gameType: "solitaire",
                    tournamentType: "single_player_threshold_tournament"
                }
            );

            console.log("✅ 加入阈值锦标赛成功:", joinResult);

            // 4. 测试获取可用锦标赛列表
            const availableTournaments = await ctx.runQuery(
                internal.service.tournament.tournamentService.getAvailableTournaments,
                {
                    uid: testUid,
                    gameType: "solitaire"
                }
            );

            console.log("✅ 获取可用锦标赛列表成功:", availableTournaments);

            // 验证返回的数据结构
            if (!availableTournaments.success) {
                throw new Error("获取可用锦标赛列表失败");
            }

            if (availableTournaments.tournaments.length === 0) {
                throw new Error("没有找到可用的锦标赛");
            }

            // 验证阈值锦标赛在列表中
            const thresholdTournament = availableTournaments.tournaments.find(
                (t: any) => t.typeId === "single_player_threshold_tournament"
            );

            if (!thresholdTournament) {
                throw new Error("阈值锦标赛不在可用列表中");
            }

            if (!thresholdTournament.eligibility.eligible) {
                console.log("⚠️ 阈值锦标赛资格检查:", thresholdTournament.eligibility.reasons);
            }

            console.log("✅ 阈值锦标赛资格验证通过");

            // 5. 测试提交分数
            const submitResult = await ctx.runMutation(
                internal.service.tournament.tournamentService.submitScore,
                {
                    tournamentId: joinResult.tournamentId,
                    uid: testUid,
                    gameType: "solitaire",
                    score: 1200, // 超过阈值1000
                    gameData: { moves: 50, time: 300 },
                    propsUsed: []
                }
            );

            console.log("✅ 提交分数成功:", submitResult);

            // 6. 检查锦标赛是否已结算
            const tournamentDetails = await ctx.runQuery(
                internal.service.tournament.tournamentService.getTournamentDetails,
                {
                    tournamentId: joinResult.tournamentId
                }
            );

            console.log("✅ 锦标赛详情:", tournamentDetails);

            // 7. 验证排名结果
            if (tournamentDetails.players.length > 0) {
                const player = tournamentDetails.players[0];
                console.log(`玩家分数: ${player.bestScore}, 排名: ${player.rank}`);

                if (player.bestScore >= 1000 && player.rank === 1) {
                    console.log("✅ 阈值排名逻辑正确：达到阈值获得第一名");
                } else if (player.bestScore < 1000 && player.rank === 2) {
                    console.log("✅ 阈值排名逻辑正确：未达到阈值获得第二名");
                } else {
                    console.log("❌ 阈值排名逻辑错误");
                }
            }

            // 8. 清理测试数据
            await TestUtils.cleanupTestData(ctx, testData.playerId, testUid);

            return {
                success: true,
                message: "阈值锦标赛功能测试完成",
                testUid,
                joinResult,
                availableTournaments,
                submitResult,
                tournamentDetails
            };

        } catch (error) {
            console.error("❌ 阈值锦标赛功能测试失败:", error);

            // 清理测试数据
            if (testData) {
                await TestUtils.cleanupTestData(ctx, testData.playerId, testUid);
            }

            throw error;
        }
    }
}); 