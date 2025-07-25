// @ts-nocheck
import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { TournamentService } from "../service/tournament/tournamentService";

// ============================================================================
// TournamentService 接口函数测试
// ============================================================================

/**
 * 测试1：joinTournament 接口测试
 */
export const testJoinTournament = mutation({
    args: {
        testCases: v.array(v.object({
            uid: v.string(),
            typeId: v.string(),
            expectedSuccess: v.boolean(),
            expectedError: v.optional(v.string())
        }))
    },
    handler: async (ctx: any, args: any) => {
        console.log("测试1：joinTournament 接口测试");
        const { testCases } = args;
        const results = [];

        for (const testCase of testCases) {
            try {
                // 准备测试数据
                const player = await ctx.db.query("players")
                    .withIndex("by_uid", (q: any) => q.eq("uid", testCase.uid))
                    .first();

                if (!player) {
                    // 创建测试玩家
                    await ctx.db.insert("players", {
                        uid: testCase.uid,
                        displayName: `TestPlayer_${testCase.uid}`,
                        totalPoints: 1000,
                        isSubscribed: false,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    });
                }

                // 检查锦标赛类型是否存在
                const tournamentType = await ctx.db.query("tournament_types")
                    .withIndex("by_typeId", (q: any) => q.eq("typeId", testCase.typeId))
                    .first();

                if (!tournamentType) {
                    results.push({
                        uid: testCase.uid,
                        typeId: testCase.typeId,
                        success: false,
                        error: "锦标赛类型不存在",
                        expectedSuccess: testCase.expectedSuccess,
                        matchesExpected: false
                    });
                    continue;
                }

                // 调用 joinTournament 接口
                const result = await TournamentService.join(ctx, {
                    player: { uid: testCase.uid, totalPoints: 1000, isSubscribed: false },
                    tournamentType,
                    tournament: null
                });

                results.push({
                    uid: testCase.uid,
                    typeId: testCase.typeId,
                    success: result.success,
                    result,
                    expectedSuccess: testCase.expectedSuccess,
                    matchesExpected: result.success === testCase.expectedSuccess
                });

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "未知错误";
                const matchesExpected = !testCase.expectedSuccess &&
                    (testCase.expectedError ? errorMessage.includes(testCase.expectedError) : true);

                results.push({
                    uid: testCase.uid,
                    typeId: testCase.typeId,
                    success: false,
                    error: errorMessage,
                    expectedSuccess: testCase.expectedSuccess,
                    expectedError: testCase.expectedError,
                    matchesExpected
                });
            }
        }

        const summary = {
            total: testCases.length,
            success: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            matchesExpected: results.filter(r => r.matchesExpected).length
        };

        console.log("joinTournament 测试结果:", summary);
        return { success: true, results, summary };
    }
});

/**
 * 测试2：submitScore 接口测试
 */
export const testSubmitScore = mutation({
    args: {
        testCases: v.array(v.object({
            matchId: v.string(),
            games: v.array(v.object({
                uid: v.string(),
                score: v.number(),
                gameData: v.any(),
                gameId: v.optional(v.string())
            })),
            expectedSuccess: v.boolean(),
            expectedError: v.optional(v.string())
        }))
    },
    handler: async (ctx: any, args: any) => {
        console.log("测试2：submitScore 接口测试");
        const { testCases } = args;
        const results = [];

        for (const testCase of testCases) {
            try {
                // 准备测试数据 - 创建比赛
                const match = await ctx.db.insert("matches", {
                    tournamentId: "test_tournament_id",
                    typeId: "test_match_type",
                    gameType: "solitaire",
                    status: "active",
                    startTime: new Date().toISOString(),
                    endTime: new Date(Date.now() + 3600000).toISOString(),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });

                // 为每个玩家创建比赛记录
                for (const game of testCase.games) {
                    await ctx.db.insert("player_matches", {
                        matchId: match,
                        tournamentId: "test_tournament_id",
                        uid: game.uid,
                        gameType: "solitaire",
                        score: 0,
                        completed: false,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    });
                }

                // 调用 submitScore 接口
                const result = await TournamentService.submitScore(ctx, {
                    scores: testCase.games.map(game => ({
                        gameId: game.gameId || "test_game_id",
                        uid: game.uid,
                        score: game.score,
                        gameData: game.gameData
                    }))
                });

                results.push({
                    matchId: testCase.matchId,
                    gamesCount: testCase.games.length,
                    success: result.success,
                    result,
                    expectedSuccess: testCase.expectedSuccess,
                    matchesExpected: result.success === testCase.expectedSuccess
                });

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "未知错误";
                const matchesExpected = !testCase.expectedSuccess &&
                    (testCase.expectedError ? errorMessage.includes(testCase.expectedError) : true);

                results.push({
                    matchId: testCase.matchId,
                    gamesCount: testCase.games.length,
                    success: false,
                    error: errorMessage,
                    expectedSuccess: testCase.expectedSuccess,
                    expectedError: testCase.expectedError,
                    matchesExpected
                });
            }
        }

        const summary = {
            total: testCases.length,
            success: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            matchesExpected: results.filter(r => r.matchesExpected).length
        };

        console.log("submitScore 测试结果:", summary);
        return { success: true, results, summary };
    }
});

/**
 * 测试3：getAvailableTournaments 接口测试
 */
export const testGetAvailableTournaments = query({
    args: {
        testCases: v.array(v.object({
            uid: v.string(),
            gameType: v.optional(v.string()),
            expectedTournamentCount: v.optional(v.number()),
            expectedGameType: v.optional(v.string())
        }))
    },
    handler: async (ctx: any, args: any) => {
        console.log("测试3：getAvailableTournaments 接口测试");
        const { testCases } = args;
        const results = [];

        for (const testCase of testCases) {
            try {
                // 准备测试数据 - 创建测试玩家
                const existingPlayer = await ctx.db.query("players")
                    .withIndex("by_uid", (q: any) => q.eq("uid", testCase.uid))
                    .first();

                if (!existingPlayer) {
                    await ctx.db.insert("players", {
                        uid: testCase.uid,
                        displayName: `TestPlayer_${testCase.uid}`,
                        totalPoints: 1000,
                        isSubscribed: false,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    });
                }

                // 准备测试数据 - 创建玩家库存
                const existingInventory = await ctx.db.query("player_inventory")
                    .withIndex("by_uid", (q: any) => q.eq("uid", testCase.uid))
                    .first();

                if (!existingInventory) {
                    await ctx.db.insert("player_inventory", {
                        uid: testCase.uid,
                        coins: 1000,
                        gamePoints: 500,
                        props: [],
                        tickets: {
                            daily_ticket: 5,
                            weekly_ticket: 2,
                            seasonal_ticket: 1
                        },
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    });
                }

                // 准备测试数据 - 创建赛季
                const existingSeason = await ctx.db.query("seasons")
                    .filter((q: any) => q.eq(q.field("status"), "active"))
                    .first();

                if (!existingSeason) {
                    await ctx.db.insert("seasons", {
                        name: "测试赛季",
                        startDate: new Date().toISOString(),
                        endDate: new Date(Date.now() + 86400000 * 30).toISOString(),
                        status: "active",
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    });
                }

                // 调用 getAvailableTournaments 接口
                const result = await TournamentService.getAvailableTournaments(ctx, {
                    uid: testCase.uid,
                    gameType: testCase.gameType
                });

                // 验证结果
                const tournamentCount = result.tournaments.length;
                const matchesExpectedCount = testCase.expectedTournamentCount ?
                    tournamentCount === testCase.expectedTournamentCount : true;

                let matchesExpectedGameType = true;
                if (testCase.expectedGameType) {
                    matchesExpectedGameType = result.tournaments.every((t: any) =>
                        t.gameType === testCase.expectedGameType
                    );
                }

                results.push({
                    uid: testCase.uid,
                    gameType: testCase.gameType,
                    success: result.success,
                    tournamentCount,
                    expectedTournamentCount: testCase.expectedTournamentCount,
                    expectedGameType: testCase.expectedGameType,
                    matchesExpectedCount,
                    matchesExpectedGameType,
                    tournaments: result.tournaments.map((t: any) => ({
                        typeId: t.typeId,
                        name: t.name,
                        gameType: t.gameType,
                        eligibility: t.eligibility
                    }))
                });

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "未知错误";
                results.push({
                    uid: testCase.uid,
                    gameType: testCase.gameType,
                    success: false,
                    error: errorMessage
                });
            }
        }

        const summary = {
            total: testCases.length,
            success: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            matchesExpectedCount: results.filter(r => r.matchesExpectedCount).length,
            matchesExpectedGameType: results.filter(r => r.matchesExpectedGameType).length
        };

        console.log("getAvailableTournaments 测试结果:", summary);
        return { success: true, results, summary };
    }
});

/**
 * 测试4：完整流程测试 - 从获取可用锦标赛到加入再到提交分数
 */
export const testCompleteTournamentFlow = mutation({
    args: {
        uid: v.string(),
        gameType: v.string(),
        tournamentTypeId: v.string()
    },
    handler: async (ctx: any, args: any) => {
        console.log("测试4：完整流程测试");
        const { uid, gameType, tournamentTypeId } = args;
        const results = [];

        try {
            // 步骤1：准备测试数据
            console.log("步骤1：准备测试数据");

            // 创建玩家
            const existingPlayer = await ctx.db.query("players")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .first();

            if (!existingPlayer) {
                await ctx.db.insert("players", {
                    uid,
                    displayName: `TestPlayer_${uid}`,
                    totalPoints: 1000,
                    isSubscribed: false,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
            }

            // 创建玩家库存
            const existingInventory = await ctx.db.query("player_inventory")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .first();

            if (!existingInventory) {
                await ctx.db.insert("player_inventory", {
                    uid,
                    coins: 1000,
                    gamePoints: 500,
                    props: [],
                    tickets: {
                        daily_ticket: 5,
                        weekly_ticket: 2,
                        seasonal_ticket: 1
                    },
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
            }

            // 创建赛季
            const existingSeason = await ctx.db.query("seasons")
                .filter((q: any) => q.eq(q.field("status"), "active"))
                .first();

            if (!existingSeason) {
                await ctx.db.insert("seasons", {
                    name: "测试赛季",
                    startDate: new Date().toISOString(),
                    endDate: new Date(Date.now() + 86400000 * 30).toISOString(),
                    status: "active",
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
            }

            results.push({ step: "data_preparation", success: true });

            // 步骤2：获取可用锦标赛
            console.log("步骤2：获取可用锦标赛");
            const availableTournaments = await TournamentService.getAvailableTournaments(ctx, {
                uid,
                gameType
            });

            results.push({
                step: "get_available_tournaments",
                success: availableTournaments.success,
                tournamentCount: availableTournaments.tournaments.length,
                tournaments: availableTournaments.tournaments.map((t: any) => ({
                    typeId: t.typeId,
                    name: t.name,
                    gameType: t.gameType
                }))
            });

            // 步骤3：加入锦标赛
            console.log("步骤3：加入锦标赛");
            const tournamentType = await ctx.db.query("tournament_types")
                .withIndex("by_typeId", (q: any) => q.eq("typeId", tournamentTypeId))
                .first();

            if (!tournamentType) {
                throw new Error(`锦标赛类型 ${tournamentTypeId} 不存在`);
            }

            const joinResult = await TournamentService.join(ctx, {
                player: { uid, totalPoints: 1000, isSubscribed: false },
                tournamentType,
                tournament: null
            });

            results.push({
                step: "join_tournament",
                success: joinResult.success,
                result: joinResult
            });

            // 步骤4：提交分数（如果有比赛ID）
            if (joinResult.matchId) {
                console.log("步骤4：提交分数");
                const submitResult = await TournamentService.submitScore(ctx, {
                    scores: [{
                        gameId: "test_game_id",
                        uid,
                        score: 1500,
                        gameData: { moves: 10, time: 120 }
                    }]
                });

                results.push({
                    step: "submit_score",
                    success: submitResult.success,
                    result: submitResult
                });
            }

            console.log("完整流程测试完成");
            return { success: true, results };

        } catch (error) {
            console.error("完整流程测试失败:", error);
            results.push({
                step: "error",
                success: false,
                error: error instanceof Error ? error.message : "未知错误"
            });
            return { success: false, results };
        }
    }
});

/**
 * 测试5：边界条件测试
 */
export const testBoundaryConditions = mutation({
    args: {
        testCases: v.array(v.object({
            testName: v.string(),
            uid: v.string(),
            typeId: v.string(),
            shouldFail: v.boolean(),
            expectedError: v.optional(v.string())
        }))
    },
    handler: async (ctx: any, args: any) => {
        console.log("测试5：边界条件测试");
        const { testCases } = args;
        const results = [];

        for (const testCase of testCases) {
            try {
                switch (testCase.testName) {
                    case "invalid_uid":
                        // 测试无效用户ID
                        const result1 = await TournamentService.join(ctx, {
                            player: { uid: "", totalPoints: 1000, isSubscribed: false },
                            tournamentType: { typeId: testCase.typeId },
                            tournament: null
                        });
                        results.push({
                            testName: testCase.testName,
                            success: result1.success,
                            shouldFail: testCase.shouldFail,
                            matchesExpected: result1.success !== testCase.shouldFail
                        });
                        break;

                    case "non_existent_tournament_type":
                        // 测试不存在的锦标赛类型
                        const result2 = await TournamentService.join(ctx, {
                            player: { uid: testCase.uid, totalPoints: 1000, isSubscribed: false },
                            tournamentType: { typeId: "non_existent_type" },
                            tournament: null
                        });
                        results.push({
                            testName: testCase.testName,
                            success: result2.success,
                            shouldFail: testCase.shouldFail,
                            matchesExpected: result2.success !== testCase.shouldFail
                        });
                        break;

                    case "insufficient_resources":
                        // 测试资源不足
                        // 先清空玩家库存
                        const inventory = await ctx.db.query("player_inventory")
                            .withIndex("by_uid", (q: any) => q.eq("uid", testCase.uid))
                            .first();

                        if (inventory) {
                            await ctx.db.patch(inventory._id, {
                                coins: 0,
                                gamePoints: 0,
                                tickets: {
                                    daily_ticket: 0,
                                    weekly_ticket: 0,
                                    seasonal_ticket: 0
                                }
                            });
                        }

                        const result3 = await TournamentService.join(ctx, {
                            player: { uid: testCase.uid, totalPoints: 1000, isSubscribed: false },
                            tournamentType: { typeId: testCase.typeId },
                            tournament: null
                        });
                        results.push({
                            testName: testCase.testName,
                            success: result3.success,
                            shouldFail: testCase.shouldFail,
                            matchesExpected: result3.success !== testCase.shouldFail
                        });
                        break;

                    default:
                        throw new Error(`未知测试用例: ${testCase.testName}`);
                }

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "未知错误";
                const matchesExpected = testCase.shouldFail &&
                    (testCase.expectedError ? errorMessage.includes(testCase.expectedError) : true);

                results.push({
                    testName: testCase.testName,
                    success: false,
                    error: errorMessage,
                    shouldFail: testCase.shouldFail,
                    expectedError: testCase.expectedError,
                    matchesExpected
                });
            }
        }

        const summary = {
            total: testCases.length,
            matchesExpected: results.filter(r => r.matchesExpected).length,
            unexpectedSuccess: results.filter(r => !r.shouldFail && !r.success).length,
            unexpectedFailure: results.filter(r => r.shouldFail && r.success).length
        };

        console.log("边界条件测试结果:", summary);
        return { success: true, results, summary };
    }
});

/**
 * 测试6：性能测试
 */
export const testPerformance = mutation({
    args: {
        playerCount: v.number(),
        tournamentTypeCount: v.number()
    },
    handler: async (ctx: any, args: any) => {
        console.log("测试6：性能测试");
        const { playerCount, tournamentTypeCount } = args;
        const results = [];

        try {
            const startTime = Date.now();

            // 1. 批量创建测试玩家
            const playerStartTime = Date.now();
            for (let i = 0; i < playerCount; i++) {
                const uid = `test_player_${i}`;

                // 创建玩家
                await ctx.db.insert("players", {
                    uid,
                    displayName: `TestPlayer_${i}`,
                    totalPoints: 1000 + i,
                    isSubscribed: i % 5 === 0, // 20% 是订阅用户
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });

                // 创建玩家库存
                await ctx.db.insert("player_inventory", {
                    uid,
                    coins: 1000 + i * 10,
                    gamePoints: 500 + i * 5,
                    props: [],
                    tickets: {
                        daily_ticket: 5,
                        weekly_ticket: 2,
                        seasonal_ticket: 1
                    },
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
            }
            const playerEndTime = Date.now();
            const playerDuration = playerEndTime - playerStartTime;

            // 2. 批量测试 getAvailableTournaments
            const availableStartTime = Date.now();
            for (let i = 0; i < Math.min(playerCount, 10); i++) { // 限制测试数量
                const uid = `test_player_${i}`;
                await TournamentService.getAvailableTournaments(ctx, { uid });
            }
            const availableEndTime = Date.now();
            const availableDuration = availableEndTime - availableStartTime;

            // 3. 批量测试 joinTournament
            const joinStartTime = Date.now();
            const tournamentTypes = await ctx.db.query("tournament_types")
                .take(tournamentTypeCount);

            for (let i = 0; i < Math.min(playerCount, 5); i++) { // 限制测试数量
                const uid = `test_player_${i}`;
                for (const tournamentType of tournamentTypes) {
                    try {
                        await TournamentService.join(ctx, {
                            player: { uid, totalPoints: 1000 + i, isSubscribed: i % 5 === 0 },
                            tournamentType,
                            tournament: null
                        });
                    } catch (error) {
                        // 忽略错误，继续测试
                    }
                }
            }
            const joinEndTime = Date.now();
            const joinDuration = joinEndTime - joinStartTime;

            const totalDuration = Date.now() - startTime;

            results.push({
                test: "player_creation",
                playerCount,
                duration: playerDuration,
                averagePerPlayer: playerDuration / playerCount
            });

            results.push({
                test: "get_available_tournaments",
                playerCount: Math.min(playerCount, 10),
                duration: availableDuration,
                averagePerPlayer: availableDuration / Math.min(playerCount, 10)
            });

            results.push({
                test: "join_tournament",
                playerCount: Math.min(playerCount, 5),
                tournamentTypeCount,
                duration: joinDuration,
                averagePerPlayer: joinDuration / Math.min(playerCount, 5)
            });

            results.push({
                test: "total",
                playerCount,
                tournamentTypeCount,
                duration: totalDuration,
                averagePerPlayer: totalDuration / playerCount
            });

            console.log("性能测试结果:", results);
            return { success: true, results };

        } catch (error) {
            console.error("性能测试失败:", error);
            return { success: false, error: error instanceof Error ? error.message : "未知错误" };
        }
    }
}); 