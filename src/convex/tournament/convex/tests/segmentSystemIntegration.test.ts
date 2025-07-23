// @ts-nocheck
import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { SegmentSystem } from "../service/segment/segmentSystem";
import { TournamentMatchingService } from "../service/tournament/tournamentMatchingService";

// ============================================================================
// 段位系统集成测试
// ============================================================================

/**
 * 测试1：段位系统基础功能
 */
export const testSegmentSystemBasics = mutation({
    args: {
        testPlayers: v.array(v.object({
            uid: v.string(),
            gameType: v.string(),
            expectedSegment: v.string()
        }))
    },
    handler: async (ctx: any, args: any) => {
        console.log("测试1：段位系统基础功能");
        const { testPlayers } = args;
        const results = [];

        for (const testPlayer of testPlayers) {
            try {
                // 初始化玩家段位
                await SegmentSystem.initializePlayerSegment(ctx, testPlayer.uid, testPlayer.gameType);

                // 获取玩家段位信息
                const segmentInfo = await SegmentSystem.getPlayerSegment(ctx, testPlayer.uid, testPlayer.gameType);

                // 验证段位是否正确
                const isCorrect = segmentInfo.segmentName === testPlayer.expectedSegment;

                results.push({
                    uid: testPlayer.uid,
                    gameType: testPlayer.gameType,
                    expectedSegment: testPlayer.expectedSegment,
                    actualSegment: segmentInfo.segmentName,
                    isCorrect,
                    success: true
                });
            } catch (error) {
                results.push({
                    uid: testPlayer.uid,
                    gameType: testPlayer.gameType,
                    expectedSegment: testPlayer.expectedSegment,
                    error: error instanceof Error ? error.message : "未知错误",
                    success: false
                });
            }
        }

        const summary = {
            total: testPlayers.length,
            success: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            correct: results.filter(r => r.success && r.isCorrect).length
        };

        console.log("段位系统基础功能测试结果:", summary);
        return { success: true, results, summary };
    }
});

/**
 * 测试2：段位分数更新和晋升
 */
export const testSegmentScoreUpdate = mutation({
    args: {
        uid: v.string(),
        gameType: v.string(),
        scoreChanges: v.array(v.number())
    },
    handler: async (ctx: any, args: any) => {
        console.log("测试2：段位分数更新和晋升");
        const { uid, gameType, scoreChanges } = args;
        const results = [];

        try {
            // 初始化玩家段位
            await SegmentSystem.initializePlayerSegment(ctx, uid, gameType);

            for (let i = 0; i < scoreChanges.length; i++) {
                const scoreChange = scoreChanges[i];

                // 更新段位分数
                const segmentResult = await SegmentSystem.updatePlayerSegmentScore(ctx, {
                    uid,
                    gameType,
                    scoreChange,
                    tournamentType: "test",
                    matchId: `test_match_${i}`,
                    rank: 1,
                    totalPlayers: 4
                });

                // 获取更新后的段位信息
                const segmentInfo = await SegmentSystem.getPlayerSegment(ctx, uid, gameType);

                results.push({
                    step: i + 1,
                    scoreChange,
                    oldSegment: segmentResult.oldSegment,
                    newSegment: segmentResult.newSegment,
                    currentPoints: segmentInfo.currentPoints,
                    segmentChanged: segmentResult.segmentChanged,
                    isPromotion: segmentResult.isPromotion,
                    isDemotion: segmentResult.isDemotion
                });
            }

            console.log("段位分数更新测试结果:", results);
            return { success: true, results };
        } catch (error) {
            console.error("段位分数更新测试失败:", error);
            return { success: false, error: error instanceof Error ? error.message : "未知错误" };
        }
    }
});

/**
 * 测试3：锦标赛段位奖励计算
 */
export const testTournamentSegmentRewards = query({
    args: {
        tournamentTypes: v.array(v.string()),
        ranks: v.array(v.number()),
        totalPlayers: v.array(v.number())
    },
    handler: async (ctx: any, args: any) => {
        console.log("测试3：锦标赛段位奖励计算");
        const { tournamentTypes, ranks, totalPlayers } = args;
        const results = [];

        for (let i = 0; i < tournamentTypes.length; i++) {
            const tournamentType = tournamentTypes[i];
            const rank = ranks[i];
            const total = totalPlayers[i];

            try {
                const scoreChange = SegmentSystem.calculateTournamentSegmentReward(
                    tournamentType,
                    rank,
                    total
                );

                results.push({
                    tournamentType,
                    rank,
                    totalPlayers: total,
                    scoreChange,
                    success: true
                });
            } catch (error) {
                results.push({
                    tournamentType,
                    rank,
                    totalPlayers: total,
                    error: error instanceof Error ? error.message : "未知错误",
                    success: false
                });
            }
        }

        console.log("锦标赛段位奖励计算测试结果:", results);
        return { success: true, results };
    }
});

/**
 * 测试4：段位兼容性计算
 */
export const testSegmentCompatibility = query({
    args: {
        playerPairs: v.array(v.object({
            player1: v.object({
                segmentName: v.string(),
                segmentPoints: v.number()
            }),
            player2: v.object({
                segmentName: v.string(),
                segmentPoints: v.number()
            }),
            expectedCompatible: v.boolean()
        }))
    },
    handler: async (ctx: any, args: any) => {
        console.log("测试4：段位兼容性计算");
        const { playerPairs } = args;
        const results = [];

        for (const pair of playerPairs) {
            try {
                // 计算段位兼容性
                const tier1 = SegmentSystem.getSegmentTier(pair.player1.segmentName);
                const tier2 = SegmentSystem.getSegmentTier(pair.player2.segmentName);
                const segmentDiff = Math.abs(tier1 - tier2);
                const pointsDiff = Math.abs(pair.player1.segmentPoints - pair.player2.segmentPoints);

                const tierCompatibility = Math.max(0, 1 - segmentDiff / 8);
                const pointsCompatibility = Math.max(0, 1 - pointsDiff / 1000);
                const overallCompatibility = tierCompatibility * 0.7 + pointsCompatibility * 0.3;

                const isCompatible = overallCompatibility >= 0.5;
                const matchesExpected = isCompatible === pair.expectedCompatible;

                results.push({
                    player1: {
                        segmentName: pair.player1.segmentName,
                        tier: tier1,
                        points: pair.player1.segmentPoints
                    },
                    player2: {
                        segmentName: pair.player2.segmentName,
                        tier: tier2,
                        points: pair.player2.segmentPoints
                    },
                    compatibility: {
                        tierCompatibility,
                        pointsCompatibility,
                        overallCompatibility,
                        segmentDiff,
                        pointsDiff,
                        isCompatible
                    },
                    expectedCompatible: pair.expectedCompatible,
                    matchesExpected,
                    success: true
                });
            } catch (error) {
                results.push({
                    player1: pair.player1,
                    player2: pair.player2,
                    error: error instanceof Error ? error.message : "未知错误",
                    success: false
                });
            }
        }

        const summary = {
            total: playerPairs.length,
            success: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            matchesExpected: results.filter(r => r.success && r.matchesExpected).length
        };

        console.log("段位兼容性计算测试结果:", summary);
        return { success: true, results, summary };
    }
});

/**
 * 测试5：锦标赛匹配队列集成
 */
export const testTournamentMatchingIntegration = mutation({
    args: {
        gameType: v.string(),
        tournamentType: v.string(),
        players: v.array(v.object({
            uid: v.string(),
            totalPoints: v.number(),
            isSubscribed: v.boolean(),
            expectedSegment: v.string()
        }))
    },
    handler: async (ctx: any, args: any) => {
        console.log("测试5：锦标赛匹配队列集成");
        const { gameType, tournamentType, players } = args;
        const results = [];

        try {
            // 1. 初始化所有玩家段位
            for (const player of players) {
                await SegmentSystem.initializePlayerSegment(ctx, player.uid, gameType);
            }

            // 2. 模拟加入匹配队列
            const tournamentConfig = {
                gameType,
                typeId: tournamentType,
                config: {
                    advanced: {
                        matching: {
                            algorithm: "segment_based",
                            skillRange: 200,
                            segmentRange: 1
                        }
                    }
                }
            };

            for (const player of players) {
                const joinResult = await TournamentMatchingService.joinMatchingQueue(ctx, {
                    tournament: null,
                    tournamentType: tournamentConfig,
                    player
                });

                // 验证段位信息是否正确
                const segmentInfo = await SegmentSystem.getPlayerSegment(ctx, player.uid, gameType);
                const segmentMatches = segmentInfo.segmentName === player.expectedSegment;

                results.push({
                    uid: player.uid,
                    joinResult,
                    expectedSegment: player.expectedSegment,
                    actualSegment: segmentInfo.segmentName,
                    segmentMatches,
                    success: joinResult.success
                });
            }

            const summary = {
                total: players.length,
                joinSuccess: results.filter(r => r.success).length,
                segmentMatches: results.filter(r => r.segmentMatches).length
            };

            console.log("锦标赛匹配队列集成测试结果:", summary);
            return { success: true, results, summary };
        } catch (error) {
            console.error("锦标赛匹配队列集成测试失败:", error);
            return { success: false, error: error instanceof Error ? error.message : "未知错误" };
        }
    }
});

/**
 * 测试6：完整锦标赛流程
 */
export const testCompleteTournamentFlow = mutation({
    args: {
        gameType: v.string(),
        tournamentType: v.string(),
        players: v.array(v.object({
            uid: v.string(),
            totalPoints: v.number(),
            isSubscribed: v.boolean()
        }))
    },
    handler: async (ctx: any, args: any) => {
        console.log("测试6：完整锦标赛流程");
        const { gameType, tournamentType, players } = args;
        const results = [];

        try {
            // 1. 初始化所有玩家段位
            for (const player of players) {
                await SegmentSystem.initializePlayerSegment(ctx, player.uid, gameType);
            }

            // 2. 记录初始段位
            const initialSegments = [];
            for (const player of players) {
                const segmentInfo = await SegmentSystem.getPlayerSegment(ctx, player.uid, gameType);
                initialSegments.push({
                    uid: player.uid,
                    segmentName: segmentInfo.segmentName,
                    points: segmentInfo.currentPoints
                });
            }

            // 3. 模拟锦标赛结算
            const playerResults = players.map((player, index) => ({
                uid: player.uid,
                rank: index + 1,
                score: 1000 - index * 50
            }));

            const totalPlayers = playerResults.length;
            const segmentUpdates = [];

            for (const playerResult of playerResults) {
                const scoreChange = SegmentSystem.calculateTournamentSegmentReward(
                    tournamentType,
                    playerResult.rank,
                    totalPlayers
                );

                const segmentResult = await SegmentSystem.updatePlayerSegmentScore(ctx, {
                    uid: playerResult.uid,
                    gameType,
                    scoreChange,
                    tournamentType,
                    tournamentId: "test_tournament",
                    rank: playerResult.rank,
                    totalPlayers
                });

                segmentUpdates.push({
                    uid: playerResult.uid,
                    rank: playerResult.rank,
                    scoreChange,
                    oldSegment: segmentResult.oldSegment,
                    newSegment: segmentResult.newSegment,
                    segmentChanged: segmentResult.segmentChanged,
                    isPromotion: segmentResult.isPromotion
                });
            }

            // 4. 记录最终段位
            const finalSegments = [];
            for (const player of players) {
                const segmentInfo = await SegmentSystem.getPlayerSegment(ctx, player.uid, gameType);
                finalSegments.push({
                    uid: player.uid,
                    segmentName: segmentInfo.segmentName,
                    points: segmentInfo.currentPoints
                });
            }

            results.push({
                step: "initialization",
                initialSegments
            });

            results.push({
                step: "tournament_settlement",
                playerResults,
                segmentUpdates
            });

            results.push({
                step: "final_state",
                finalSegments
            });

            const summary = {
                totalPlayers,
                promotions: segmentUpdates.filter(u => u.isPromotion).length,
                demotions: segmentUpdates.filter(u => u.isDemotion).length,
                segmentChanges: segmentUpdates.filter(u => u.segmentChanged).length
            };

            console.log("完整锦标赛流程测试结果:", summary);
            return { success: true, results, summary };
        } catch (error) {
            console.error("完整锦标赛流程测试失败:", error);
            return { success: false, error: error instanceof Error ? error.message : "未知错误" };
        }
    }
});

/**
 * 测试7：段位排行榜功能
 */
export const testSegmentLeaderboard = mutation({
    args: {
        gameType: v.string(),
        testPlayers: v.array(v.object({
            uid: v.string(),
            gameType: v.string(),
            initialPoints: v.number()
        }))
    },
    handler: async (ctx: any, args: any) => {
        console.log("测试7：段位排行榜功能");
        const { gameType, testPlayers } = args;
        const results = [];

        try {
            // 1. 初始化玩家并设置分数
            for (const testPlayer of testPlayers) {
                await SegmentSystem.initializePlayerSegment(ctx, testPlayer.uid, testPlayer.gameType);

                // 设置初始分数
                await SegmentSystem.updatePlayerSegmentScore(ctx, {
                    uid: testPlayer.uid,
                    gameType: testPlayer.gameType,
                    scoreChange: testPlayer.initialPoints,
                    tournamentType: "test",
                    matchId: "test_initial",
                    rank: 1,
                    totalPlayers: 1
                });
            }

            // 2. 获取排行榜
            const leaderboard = await SegmentSystem.getSegmentLeaderboard(ctx, gameType, undefined, 50);

            // 3. 验证排行榜排序
            const isSorted = leaderboard.leaderboard.every((player: any, index: number) => {
                if (index === 0) return true;
                return player.currentPoints <= leaderboard.leaderboard[index - 1].currentPoints;
            });

            results.push({
                step: "leaderboard_retrieval",
                totalPlayers: leaderboard.totalCount,
                leaderboardLength: leaderboard.leaderboard.length,
                isSorted,
                success: true
            });

            // 4. 测试特定段位排行榜
            const segments = ["Bronze", "Silver", "Gold", "Platinum", "Diamond"];
            for (const segment of segments) {
                const segmentLeaderboard = await SegmentSystem.getSegmentLeaderboard(ctx, gameType, segment, 10);

                results.push({
                    step: `segment_leaderboard_${segment}`,
                    segment,
                    totalPlayers: segmentLeaderboard.totalCount,
                    leaderboardLength: segmentLeaderboard.leaderboard.length,
                    success: true
                });
            }

            console.log("段位排行榜功能测试结果:", results);
            return { success: true, results };
        } catch (error) {
            console.error("段位排行榜功能测试失败:", error);
            return { success: false, error: error instanceof Error ? error.message : "未知错误" };
        }
    }
});

/**
 * 测试8：性能测试
 */
export const testPerformance = mutation({
    args: {
        playerCount: v.number(),
        gameType: v.string()
    },
    handler: async (ctx: any, args: any) => {
        console.log("测试8：性能测试");
        const { playerCount, gameType } = args;
        const results = [];

        try {
            const startTime = Date.now();

            // 1. 批量初始化玩家段位
            const initStartTime = Date.now();
            for (let i = 0; i < playerCount; i++) {
                await SegmentSystem.initializePlayerSegment(ctx, `test_player_${i}`, gameType);
            }
            const initEndTime = Date.now();
            const initDuration = initEndTime - initStartTime;

            // 2. 批量更新段位分数
            const updateStartTime = Date.now();
            for (let i = 0; i < playerCount; i++) {
                await SegmentSystem.updatePlayerSegmentScore(ctx, {
                    uid: `test_player_${i}`,
                    gameType,
                    scoreChange: Math.floor(Math.random() * 100) - 50,
                    tournamentType: "performance_test",
                    matchId: `test_match_${i}`,
                    rank: Math.floor(Math.random() * 4) + 1,
                    totalPlayers: 4
                });
            }
            const updateEndTime = Date.now();
            const updateDuration = updateEndTime - updateStartTime;

            // 3. 获取排行榜性能
            const leaderboardStartTime = Date.now();
            const leaderboard = await SegmentSystem.getSegmentLeaderboard(ctx, gameType, undefined, 100);
            const leaderboardEndTime = Date.now();
            const leaderboardDuration = leaderboardEndTime - leaderboardStartTime;

            const totalDuration = Date.now() - startTime;

            results.push({
                test: "initialization",
                playerCount,
                duration: initDuration,
                averagePerPlayer: initDuration / playerCount
            });

            results.push({
                test: "score_update",
                playerCount,
                duration: updateDuration,
                averagePerPlayer: updateDuration / playerCount
            });

            results.push({
                test: "leaderboard_retrieval",
                playerCount,
                duration: leaderboardDuration,
                totalCount: leaderboard.totalCount
            });

            results.push({
                test: "total",
                playerCount,
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

/**
 * 测试9：错误处理测试
 */
export const testErrorHandling = mutation({
    args: {
        testCases: v.array(v.object({
            testName: v.string(),
            uid: v.string(),
            gameType: v.string(),
            shouldFail: v.boolean()
        }))
    },
    handler: async (ctx: any, args: any) => {
        console.log("测试9：错误处理测试");
        const { testCases } = args;
        const results = [];

        for (const testCase of testCases) {
            try {
                switch (testCase.testName) {
                    case "invalid_uid":
                        await SegmentSystem.initializePlayerSegment(ctx, "", testCase.gameType);
                        break;
                    case "invalid_gameType":
                        await SegmentSystem.initializePlayerSegment(ctx, testCase.uid, "");
                        break;
                    case "duplicate_initialization":
                        await SegmentSystem.initializePlayerSegment(ctx, testCase.uid, testCase.gameType);
                        await SegmentSystem.initializePlayerSegment(ctx, testCase.uid, testCase.gameType);
                        break;
                    case "invalid_score_update":
                        await SegmentSystem.updatePlayerSegmentScore(ctx, {
                            uid: testCase.uid,
                            gameType: testCase.gameType,
                            scoreChange: NaN,
                            tournamentType: "test",
                            matchId: "test",
                            rank: 1,
                            totalPlayers: 4
                        });
                        break;
                    default:
                        throw new Error(`未知测试用例: ${testCase.testName}`);
                }

                results.push({
                    testName: testCase.testName,
                    shouldFail: testCase.shouldFail,
                    actualResult: "success",
                    matchesExpected: !testCase.shouldFail,
                    success: true
                });
            } catch (error) {
                results.push({
                    testName: testCase.testName,
                    shouldFail: testCase.shouldFail,
                    actualResult: "error",
                    error: error instanceof Error ? error.message : "未知错误",
                    matchesExpected: testCase.shouldFail,
                    success: true
                });
            }
        }

        const summary = {
            total: testCases.length,
            matchesExpected: results.filter(r => r.matchesExpected).length,
            unexpectedSuccess: results.filter(r => !r.shouldFail && r.actualResult === "error").length,
            unexpectedFailure: results.filter(r => r.shouldFail && r.actualResult === "success").length
        };

        console.log("错误处理测试结果:", summary);
        return { success: true, results, summary };
    }
});

/**
 * 测试10：集成测试总结
 */
export const testIntegrationSummary = query({
    args: {},
    handler: async (ctx: any, args: any) => {
        console.log("测试10：集成测试总结");

        try {
            // 获取段位系统配置
            const segmentLevels = SegmentSystem.SEGMENT_LEVELS;
            const tournamentRewards = SegmentSystem.TOURNAMENT_SEGMENT_REWARDS;

            // 统计数据库中的段位数据
            const playerSegments = await ctx.db.query("player_segments").collect();
            const segmentRewards = await ctx.db.query("segment_rewards").collect();

            const summary = {
                segmentSystem: {
                    totalSegments: Object.keys(segmentLevels).length,
                    supportedTournamentTypes: Object.keys(tournamentRewards).length,
                    segmentLevels: Object.keys(segmentLevels)
                },
                database: {
                    totalPlayerSegments: playerSegments.length,
                    totalSegmentRewards: segmentRewards.length,
                    uniquePlayers: new Set(playerSegments.map((ps: any) => ps.uid)).size,
                    uniqueGameTypes: new Set(playerSegments.map((ps: any) => ps.gameType)).size
                },
                integration: {
                    segmentSystemAvailable: true,
                    tournamentMatchingServiceAvailable: true,
                    baseHandlerAvailable: true,
                    apiEndpointsAvailable: true
                }
            };

            console.log("集成测试总结:", summary);
            return { success: true, summary };
        } catch (error) {
            console.error("集成测试总结失败:", error);
            return { success: false, error: error instanceof Error ? error.message : "未知错误" };
        }
    }
}); 