import { v } from "convex/values";
import { internal } from "../../../_generated/api";
import { mutation } from "../../../_generated/server";
import { getTorontoDate } from "../../utils";

/**
 * 真实数据库测试
 * 直接使用 Convex 数据库进行测试，验证真实的数据交互
 */

// ==================== 辅助函数 ====================

// 辅助函数：调用本地突变
async function callLocalMutation(mutationFn: any, ctx: any, args: any) {
    return await mutationFn.handler(ctx, args);
}

async function setupRealTestData(
    ctx: any,
    testUid: string,
    gameType: string,
    tournamentType: string
): Promise<{ tournamentId: string; matchId: string; playerMatchId: string }> {
    const now = getTorontoDate();

    // 1. 创建测试玩家
    const playerId = await ctx.db.insert("players", {
        uid: testUid,
        email: `${testUid}@example.com`,
        displayName: `Test Player ${testUid}`,
        segmentName: "gold",
        isSubscribed: true,
        totalPoints: 1500,
        createdAt: now.iso,
        updatedAt: now.iso,
        lastActive: now.iso
    });

    // 2. 创建玩家库存
    const inventoryId = await ctx.db.insert("player_inventory", {
        uid: testUid,
        coins: 1000,
        props: [],
        tickets: [],
        updatedAt: now.iso
    });

    // 3. 创建活跃赛季
    const seasonId = await ctx.db.insert("seasons", {
        name: "Real Test Season",
        startDate: now.iso,
        endDate: new Date(now.localDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        isActive: true,
        createdAt: now.iso,
        updatedAt: now.iso
    });

    // 4. 创建玩家赛季记录
    const playerSeasonId = await ctx.db.insert("player_seasons", {
        uid: testUid,
        seasonId,
        seasonPoints: 0,
        gamePoints: { solitaire: 0, uno: 0, ludo: 0, rummy: 0 },
        matchesPlayed: 0,
        matchesWon: 0,
        winRate: 0,
        lastMatchAt: now.iso,
        createdAt: now.iso,
        updatedAt: now.iso
    });

    // 5. 创建锦标赛类型配置
    const tournamentTypeId = await ctx.db.insert("tournament_types", {
        typeId: tournamentType || "single_player_tournament",
        name: "Real Test Tournament",
        description: "真实数据库测试锦标赛",
        handlerModule: "single_player_tournament",
        defaultConfig: {
            gameType: gameType || "solitaire",
            isActive: true,
            priority: 1,
            entryFee: { coins: 50 },
            duration: 3600,
            maxAttempts: 3,
            rules: { isSingleMatch: true },
            scoring: {
                move: 10,
                timeLimit: 300,
                completionBonus: 100
            },
            limits: {
                daily: {
                    maxParticipations: 3,
                    maxTournaments: 1,
                    maxAttempts: 3
                },
                weekly: {
                    maxParticipations: 21,
                    maxTournaments: 7,
                    maxAttempts: 21
                },
                seasonal: {
                    maxParticipations: 90,
                    maxTournaments: 30,
                    maxAttempts: 90
                },
                total: {
                    maxParticipations: 1000,
                    maxTournaments: 500,
                    maxAttempts: 3000
                },
                subscribed: {
                    daily: {
                        maxParticipations: 5,
                        maxTournaments: 2,
                        maxAttempts: 5
                    },
                    weekly: {
                        maxParticipations: 35,
                        maxTournaments: 14,
                        maxAttempts: 35
                    },
                    seasonal: {
                        maxParticipations: 150,
                        maxTournaments: 60,
                        maxAttempts: 150
                    }
                }
            }
        },
        createdAt: now.iso,
        updatedAt: now.iso
    });

    // 6. 加入锦标赛
    const joinResult: any = await ctx.runMutation(internal.service.tournament.tournamentService.joinTournament, {
        uid: testUid,
        gameType,
        tournamentType
    });

    return {
        tournamentId: joinResult.tournamentId,
        matchId: joinResult.matchId,
        playerMatchId: joinResult.playerMatchId
    };
}

async function cleanupRealTestData(ctx: any, testUid: string) {
    console.log("🧹 清理真实测试数据...");

    try {
        // 删除玩家相关数据
        const player = await ctx.db.query("players").filter((q: any) => q.eq(q.field("uid"), testUid)).first();
        if (player) {
            await ctx.db.delete(player._id);
        }

        const inventory = await ctx.db.query("player_inventory").filter((q: any) => q.eq(q.field("uid"), testUid)).first();
        if (inventory) {
            await ctx.db.delete(inventory._id);
        }

        const playerSeason = await ctx.db.query("player_seasons").filter((q: any) => q.eq(q.field("uid"), testUid)).first();
        if (playerSeason) {
            await ctx.db.delete(playerSeason._id);
        }

        // 删除锦标赛相关数据
        const tournaments = await ctx.db.query("tournaments").filter((q: any) => q.eq(q.field("playerUids"), testUid)).collect();
        for (const tournament of tournaments) {
            await ctx.db.delete(tournament._id);
        }

        const playerMatches = await ctx.db.query("player_matches").filter((q: any) => q.eq(q.field("uid"), testUid)).collect();
        for (const playerMatch of playerMatches) {
            await ctx.db.delete(playerMatch._id);
        }

        const matches = await ctx.db.query("matches").collect();
        for (const match of matches) {
            await ctx.db.delete(match._id);
        }

        console.log("✅ 真实测试数据清理完成");

    } catch (error) {
        console.error("❌ 清理真实测试数据失败:", error);
    }
}

// ==================== 测试运行器 ====================

export const runAllRealDatabaseTests = mutation({
    args: {
        uid: v.string(),
    },
    handler: async (ctx, args): Promise<{
        success: boolean;
        message: string;
        results: any[];
        summary: {
            total: number;
            passed: number;
            failed: number;
            successRate: number;
        };
    }> => {
        console.log("🚀 开始运行所有真实数据库测试...");

        const results = [];
        const testUid = `real_test_${args.uid}_${Date.now()}`;

        try {
            // 1. 锦标赛创建测试
            console.log("🧪 开始真实锦标赛创建测试...");
            const testData: { tournamentId: string; matchId: string; playerMatchId: string } = await setupRealTestData(ctx, testUid, "solitaire", "single_player_tournament");
            results.push({
                test: "锦标赛创建",
                result: { success: true, message: "锦标赛创建测试成功", data: testData }
            });

            // 2. 分数提交测试
            console.log("🧪 开始真实分数提交测试...");
            const submitResult: any = await ctx.runMutation(internal.service.tournament.tournamentService.submitScore, {
                tournamentId: testData.tournamentId,
                uid: testUid,
                gameType: "solitaire",
                score: 1000,
                gameData: { moves: 10, timeTaken: 250 },
                propsUsed: []
            });
            results.push({
                test: "分数提交",
                result: { success: true, message: "分数提交测试成功", data: { testData, submitResult } }
            });

            // 3. 锦标赛结算测试
            console.log("🧪 开始真实锦标赛结算测试...");
            const settleResult: any = await ctx.runMutation(internal.service.tournament.tournamentService.settleTournament, {
                tournamentId: testData.tournamentId
            });
            results.push({
                test: "锦标赛结算",
                result: { success: true, message: "锦标赛结算测试成功", data: { testData, settleResult } }
            });

        } catch (error) {
            console.error("❌ 真实数据库测试失败:", error);
            results.push({
                test: "测试执行",
                result: { success: false, message: error instanceof Error ? error.message : "未知错误" }
            });
        } finally {
            // 清理测试数据
            await cleanupRealTestData(ctx, testUid);
        }

        const passedTests: number = results.filter(r => r.result.success).length;
        const totalTests: number = results.length;

        return {
            success: passedTests === totalTests,
            message: `真实数据库测试完成: ${passedTests}/${totalTests} 通过`,
            results,
            summary: {
                total: totalTests,
                passed: passedTests,
                failed: totalTests - passedTests,
                successRate: (passedTests / totalTests) * 100
            }
        };
    }
}); 