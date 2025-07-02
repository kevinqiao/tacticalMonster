
/**
 * 简化的场景测试
 * 不依赖 Jest，使用自定义测试框架
 */

import { v } from "convex/values";
import { query } from "../../../../_generated/server";
import { TEST_PLAYERS } from "../mockData";
import { assertDefined, assertEqual, assertRejects, assertTrue } from "../simpleTestFramework";
import { MockContext, TournamentTestUtils } from "../testUtils";

// ==================== 每日特殊锦标赛测试 ====================

export class SimpleDailySpecialTests {

    static async testJoinTournament() {
        await TournamentTestUtils.runTest("每日特殊锦标赛加入测试", async (ctx: MockContext) => {
            // 设置测试数据
            ctx.setupMockForPlayer("player1");
            ctx.setupMockForTournamentType("daily_special");
            ctx.setupMockForInventory("player1");

            // 模拟处理器
            const mockHandler = {
                join: async (ctx: any, params: any) => {
                    assertDefined(params.uid, "用户ID应该存在");
                    assertEqual(params.gameType, "solitaire", "游戏类型应该是solitaire");
                    assertEqual(params.tournamentType, "daily_special", "锦标赛类型应该是daily_special");

                    return {
                        tournamentId: "tournament1",
                        matchId: "match1",
                        playerMatchId: "playerMatch1",
                        gameId: "game1",
                        serverUrl: "https://game-server.example.com",
                        attemptNumber: 1
                    };
                }
            };

            const result = await mockHandler.join(ctx as any, {
                uid: "player1",
                gameType: "solitaire",
                tournamentType: "daily_special",
                player: TEST_PLAYERS[0],
                season: { _id: "season1" }
            });

            // 验证结果
            TournamentTestUtils.validateJoinResult(result);
            assertEqual(result.tournamentId, "tournament1");
            assertEqual(result.gameId, "game1");
        });
    }

    static async testDailyLimit() {
        await TournamentTestUtils.runTest("每日限制测试", async (ctx: MockContext) => {
            // 设置每日限制场景
            const scenario = TournamentTestUtils.generateDailyLimitScenario();
            scenario.setup(ctx);

            const mockHandler = {
                join: async (ctx: any, params: any) => {
                    // 模拟检查每日限制
                    const limit = await ctx.db.query("player_tournament_limits")
                        .withIndex("by_uid_tournament_date")
                        .first();

                    if (limit && limit.participationCount >= limit.maxDailyParticipations) {
                        throw new Error("今日参与次数已达上限");
                    }

                    return { success: true };
                }
            };

            // 应该抛出错误
            await assertRejects(
                mockHandler.join(ctx as any, {
                    uid: "player1",
                    gameType: "solitaire",
                    tournamentType: "daily_special"
                }),
                "今日参与次数已达上限"
            );
        });
    }

    static async testInsufficientCoins() {
        await TournamentTestUtils.runTest("金币不足测试", async (ctx: MockContext) => {
            // 设置金币不足场景
            const scenario = TournamentTestUtils.generateInsufficientCoinsScenario();
            scenario.setup(ctx);

            const mockHandler = {
                join: async (ctx: any, params: any) => {
                    // 模拟检查金币
                    const inventory = await ctx.db.query("player_inventory")
                        .withIndex("by_uid")
                        .first();

                    if (inventory.coins < 50) {
                        throw new Error("金币或门票不足");
                    }

                    return { success: true };
                }
            };

            // 应该抛出错误
            await assertRejects(
                mockHandler.join(ctx as any, {
                    uid: "player1",
                    gameType: "solitaire",
                    tournamentType: "daily_special"
                }),
                "金币或门票不足"
            );
        });
    }
}

// ==================== 单人锦标赛测试 ====================

export class SimpleSinglePlayerTests {

    static async testJoinTournament() {
        await TournamentTestUtils.runTest("单人锦标赛加入测试", async (ctx: MockContext) => {
            ctx.setupMockForPlayer("player1");
            ctx.setupMockForTournamentType("single_player_tournament");

            const mockHandler = {
                join: async (ctx: any, params: any) => {
                    assertDefined(params.uid, "用户ID应该存在");
                    assertEqual(params.gameType, "solitaire", "游戏类型应该是solitaire");

                    return {
                        tournamentId: "tournament1",
                        matchId: "match1",
                        playerMatchId: "playerMatch1",
                        gameId: "game1",
                        serverUrl: "https://game-server.example.com",
                        attemptNumber: 1
                    };
                }
            };

            const result = await mockHandler.join(ctx as any, {
                uid: "player1",
                gameType: "solitaire",
                tournamentType: "single_player_tournament",
                player: TEST_PLAYERS[0],
                season: { _id: "season1" }
            });

            TournamentTestUtils.validateJoinResult(result);
        });
    }

    static async testSubmitScore() {
        await TournamentTestUtils.runTest("单人锦标赛提交分数测试", async (ctx: MockContext) => {
            const mockHandler = {
                submitScore: async (ctx: any, params: any) => {
                    assertDefined(params.tournamentId, "锦标赛ID应该存在");
                    assertDefined(params.score, "分数应该存在");
                    assertTrue(params.score > 0, "分数应该大于0");

                    return {
                        success: true,
                        matchId: "match1",
                        score: params.score
                    };
                }
            };

            const result = await mockHandler.submitScore(ctx as any, {
                tournamentId: "tournament1",
                uid: "player1",
                gameType: "solitaire",
                score: 1000,
                gameData: { moves: 50, time: 300 },
                propsUsed: []
            });

            TournamentTestUtils.validateSubmitResult(result);
            assertEqual(result.score, 1000);
        });
    }
}

// ==================== 多人锦标赛测试 ====================

export class SimpleMultiPlayerTests {

    static async testJoinTournament() {
        await TournamentTestUtils.runTest("多人锦标赛加入测试", async (ctx: MockContext) => {
            ctx.setupMockForPlayer("player1");
            ctx.setupMockForTournamentType("multi_player_tournament");

            const mockHandler = {
                join: async (ctx: any, params: any) => {
                    assertDefined(params.uid, "用户ID应该存在");
                    assertEqual(params.gameType, "rummy", "游戏类型应该是rummy");

                    return {
                        tournamentId: "tournament1",
                        matchId: "match1",
                        playerMatchId: "playerMatch1",
                        gameId: "game1",
                        serverUrl: "https://game-server.example.com",
                        attemptNumber: 1,
                        matchStatus: {
                            status: "matched",
                            players: ["player1", "player2", "player3"]
                        }
                    };
                }
            };

            const result = await mockHandler.join(ctx as any, {
                uid: "player1",
                gameType: "rummy",
                tournamentType: "multi_player_tournament",
                player: TEST_PLAYERS[0],
                season: { _id: "season1" }
            });

            TournamentTestUtils.validateJoinResult(result);
            assertDefined(result.matchStatus, "匹配状态应该存在");
        });
    }

    static async testMultiPlayerMatching() {
        await TournamentTestUtils.runTest("多人匹配测试", async (ctx: MockContext) => {
            const scenario = TournamentTestUtils.generateMultiPlayerMatchingScenario();
            scenario.setup(ctx);

            const mockHandler = {
                join: async (ctx: any, params: any) => {
                    // 模拟匹配逻辑
                    const match = await ctx.db.query("matches")
                        .withIndex("by_tournament")
                        .first();

                    if (match && match.currentPlayers >= match.minPlayers) {
                        return {
                            tournamentId: "tournament1",
                            matchId: match._id,
                            status: "matched"
                        };
                    }

                    return {
                        tournamentId: "tournament1",
                        matchId: "match1",
                        status: "waiting"
                    };
                }
            };

            const result = await mockHandler.join(ctx as any, {
                uid: "player1",
                gameType: "rummy",
                tournamentType: "multi_player_tournament"
            });

            assertDefined(result.matchId, "比赛ID应该存在");
            assertEqual(result.status, "matched", "状态应该是matched");
        });
    }
}

// ==================== 独立锦标赛测试 ====================

export class SimpleIndependentTests {

    static async testIndependentCreation() {
        await TournamentTestUtils.runTest("独立锦标赛创建测试", async (ctx: MockContext) => {
            ctx.setupMockForPlayer("player1");
            ctx.setupMockForTournamentType("independent_tournament");

            const mockHandler = {
                join: async (ctx: any, params: any) => {
                    // 每次尝试都创建新的锦标赛
                    const tournamentId = `tournament_${Date.now()}_${Math.random()}`;

                    return {
                        tournamentId,
                        matchId: "match1",
                        playerMatchId: "playerMatch1",
                        gameId: "game1",
                        serverUrl: "https://game-server.example.com",
                        attemptNumber: 1
                    };
                }
            };

            // 第一次尝试
            const result1 = await mockHandler.join(ctx as any, {
                uid: "player1",
                gameType: "solitaire",
                tournamentType: "independent_tournament"
            });

            // 第二次尝试
            const result2 = await mockHandler.join(ctx as any, {
                uid: "player1",
                gameType: "solitaire",
                tournamentType: "independent_tournament"
            });

            // 验证每次都是独立的锦标赛
            assertTrue(result1.tournamentId !== result2.tournamentId, "每次尝试应该创建不同的锦标赛");
        });
    }
}

// ==================== 测试运行器 ====================

export class SimpleScenarioTestRunner {

    static async runAllTests() {
        console.log("🚀 开始运行简化场景测试");

        const testSuites = [
            {
                name: "每日特殊锦标赛测试",
                tests: [
                    () => SimpleDailySpecialTests.testJoinTournament(),
                    () => SimpleDailySpecialTests.testDailyLimit(),
                    () => SimpleDailySpecialTests.testInsufficientCoins()
                ]
            },
            {
                name: "单人锦标赛测试",
                tests: [
                    () => SimpleSinglePlayerTests.testJoinTournament(),
                    () => SimpleSinglePlayerTests.testSubmitScore()
                ]
            },
            {
                name: "多人锦标赛测试",
                tests: [
                    () => SimpleMultiPlayerTests.testJoinTournament(),
                    () => SimpleMultiPlayerTests.testMultiPlayerMatching()
                ]
            },
            {
                name: "独立锦标赛测试",
                tests: [
                    () => SimpleIndependentTests.testIndependentCreation()
                ]
            }
        ];

        let totalTests = 0;
        let passedTests = 0;
        let failedTests = 0;

        for (const suite of testSuites) {
            console.log(`\n📦 运行测试套件: ${suite.name}`);

            for (const test of suite.tests) {
                totalTests++;
                try {
                    await test();
                    passedTests++;
                    console.log(`✅ 测试通过`);
                } catch (error) {
                    failedTests++;
                    console.error(`❌ 测试失败:`, error);
                }
            }
        }

        console.log(`\n📊 测试总结:`);
        console.log(`总测试数: ${totalTests}`);
        console.log(`通过: ${passedTests}`);
        console.log(`失败: ${failedTests}`);
        console.log(`成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

        return {
            total: totalTests,
            passed: passedTests,
            failed: failedTests,
            successRate: (passedTests / totalTests) * 100
        };
    }

    static async runSpecificTest(testName: string) {
        console.log(`🧪 运行特定测试: ${testName}`);

        const testMap: Record<string, () => Promise<void>> = {
            "daily_join": () => SimpleDailySpecialTests.testJoinTournament(),
            "daily_limit": () => SimpleDailySpecialTests.testDailyLimit(),
            "daily_coins": () => SimpleDailySpecialTests.testInsufficientCoins(),
            "single_join": () => SimpleSinglePlayerTests.testJoinTournament(),
            "single_submit": () => SimpleSinglePlayerTests.testSubmitScore(),
            "multi_join": () => SimpleMultiPlayerTests.testJoinTournament(),
            "multi_matching": () => SimpleMultiPlayerTests.testMultiPlayerMatching(),
            "independent_creation": () => SimpleIndependentTests.testIndependentCreation()
        };

        const test = testMap[testName];
        if (!test) {
            throw new Error(`未知测试: ${testName}`);
        }

        await test();
        console.log(`✅ ${testName} - 通过`);
    }
}

// ==================== Convex 函数接口 ====================

export const runSimpleScenarioTests = query({
    args: { testName: v.optional(v.string()) },
    handler: async (ctx, args) => {
        if (args.testName) {
            await SimpleScenarioTestRunner.runSpecificTest(args.testName);
            return { success: true, message: `特定测试 ${args.testName} 完成` };
        } else {
            const result = await SimpleScenarioTestRunner.runAllTests();
            return {
                success: result.failed === 0,
                result,
                message: result.failed === 0 ? "所有简化场景测试通过" : `${result.failed} 个测试失败`
            };
        }
    }
});

export const getSimpleScenarioTestStatus = query({
    args: {},
    handler: async (ctx) => {
        return {
            status: "ready",
            availableTests: [
                "daily_join",
                "daily_limit",
                "daily_coins",
                "single_join",
                "single_submit",
                "multi_join",
                "multi_matching",
                "independent_creation"
            ],
            message: "简化场景测试系统已准备就绪",
            timestamp: new Date().toISOString()
        };
    }
}); 
