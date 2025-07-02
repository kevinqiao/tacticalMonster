/**
 * 单人锦标赛处理器测试
 * 专门测试 singlePlayerTournamentHandler 的功能
 */

import { v } from "convex/values";
import { query } from "../../../_generated/server";
import { getTorontoDate } from "../../utils";
import { singlePlayerTournamentHandler } from "../handler/singlePlayerTournament";
import { MatchManager } from "../matchManager";

// ==================== 测试数据 ====================

const TEST_PLAYER = {
    _id: "player1_id" as any,
    _creationTime: Date.now(),
    uid: "player1",
    displayName: "Test Player",
    segmentName: "gold",
    isSubscribed: true,
    totalPoints: 1500,
    eloScore: 1500,
    level: 15,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    lastActive: "2024-01-01T00:00:00Z"
};

const TEST_SEASON = {
    _id: "season1_id" as any,
    _creationTime: Date.now(),
    name: "Test Season 2024",
    startDate: "2024-01-01",
    endDate: "2024-12-31",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z"
};

const TEST_CONFIG = {
    entryFee: { coins: 25 },
    rules: {
        maxAttempts: 5,
        isSingleMatch: true,
        rankingMethod: "highest_score"
    },
    rewards: {
        baseRewards: {
            coins: 50,
            gamePoints: 25,
            props: [],
            tickets: []
        },
        rankRewards: [
            {
                rankRange: [1, 1],
                multiplier: 2.0
            },
            {
                rankRange: [2, 5],
                multiplier: 1.5
            }
        ],
        segmentBonus: {
            bronze: 1.0,
            silver: 1.05,
            gold: 1.1,
            platinum: 1.15,
            diamond: 1.2
        },
        subscriptionBonus: 1.1,
        participationReward: {
            coins: 5,
            gamePoints: 3
        }
    },
    limits: {
        daily: {
            maxParticipations: 10,
            maxTournaments: 5,
            maxAttempts: 10
        },
        weekly: {
            maxParticipations: 70,
            maxTournaments: 35,
            maxAttempts: 70
        },
        seasonal: {
            maxParticipations: 300,
            maxTournaments: 150,
            maxAttempts: 300
        },
        total: {
            maxParticipations: 2000,
            maxTournaments: 1000,
            maxAttempts: 5000
        }
    }
};

const TEST_INVENTORY = {
    uid: "player1",
    coins: 1000,
    tickets: [
        { gameType: "solitaire", tournamentType: "single_player_tournament", quantity: 5 }
    ],
    props: [
        { gameType: "solitaire", propType: "hint", quantity: 10 },
        { gameType: "solitaire", propType: "undo", quantity: 5 }
    ]
};

// ==================== Mock Context ====================

class MockContext {
    db: any;
    auth: any;
    scheduler: any;
    runMutation: any;

    constructor() {
        this.db = {
            query: jest.fn(),
            get: jest.fn(),
            insert: jest.fn(),
            patch: jest.fn(),
            delete: jest.fn()
        };

        this.auth = {
            getUserIdentity: jest.fn()
        };

        this.scheduler = {
            runAfter: jest.fn()
        };
    }

    reset() {
        jest.clearAllMocks();
    }

    setupDefaultMocks() {
        // 设置默认的数据库查询响应
        this.db.query.mockImplementation((table: string) => {
            if (table === "players") {
                return {
                    withIndex: () => ({
                        first: async () => TEST_PLAYER,
                        collect: async () => [TEST_PLAYER]
                    })
                };
            }
            if (table === "player_inventory") {
                return {
                    withIndex: () => ({
                        first: async () => TEST_INVENTORY
                    })
                };
            }
            if (table === "seasons") {
                return {
                    withIndex: () => ({
                        first: async () => TEST_SEASON
                    })
                };
            }
            if (table === "tournament_types") {
                return {
                    withIndex: () => ({
                        first: async () => ({ defaultConfig: TEST_CONFIG })
                    })
                };
            }
            if (table === "player_tournament_limits") {
                return {
                    withIndex: () => ({
                        first: async () => null, // 默认没有限制记录
                        collect: async () => []
                    })
                };
            }
            if (table === "matches") {
                return {
                    withIndex: () => ({
                        first: async () => null,
                        collect: async () => []
                    })
                };
            }
            if (table === "player_matches") {
                return {
                    withIndex: () => ({
                        first: async () => null,
                        collect: async () => []
                    })
                };
            }
            return {
                withIndex: () => ({
                    first: async () => null,
                    collect: async () => []
                })
            };
        });

        // 设置数据库操作响应
        this.db.insert.mockImplementation((table: string, data: any) => {
            if (table === "tournaments") {
                return Promise.resolve("tournament1");
            }
            if (table === "matches") {
                return Promise.resolve("match1");
            }
            if (table === "player_matches") {
                return Promise.resolve("playerMatch1");
            }
            if (table === "match_events") {
                return Promise.resolve("event1");
            }
            if (table === "prop_usage_logs") {
                return Promise.resolve("log1");
            }
            return Promise.resolve("id1");
        });

        this.db.get.mockImplementation((id: string) => {
            if (id === "season1") {
                return Promise.resolve(TEST_SEASON);
            }
            if (id === "tournament1") {
                return Promise.resolve({
                    _id: "tournament1",
                    seasonId: "season1",
                    gameType: "solitaire",
                    segmentName: "gold",
                    status: "open",
                    playerUids: ["player1"],
                    tournamentType: "single_player_tournament",
                    isSubscribedRequired: false,
                    isSingleMatch: true,
                    prizePool: 0,
                    config: TEST_CONFIG,
                    createdAt: getTorontoDate().iso,
                    updatedAt: getTorontoDate().iso
                });
            }
            if (id === "match1") {
                return Promise.resolve({
                    _id: "match1",
                    tournamentId: "tournament1",
                    gameType: "solitaire",
                    matchType: "single_match",
                    status: "in_progress",
                    maxPlayers: 1,
                    minPlayers: 1,
                    startTime: getTorontoDate().iso,
                    gameData: {},
                    createdAt: getTorontoDate().iso,
                    updatedAt: getTorontoDate().iso
                });
            }
            return Promise.resolve(null);
        });
    }
}

// ==================== 测试工具 ====================

class SinglePlayerTournamentTestUtils {
    static createMockContext(): MockContext {
        return new MockContext();
    }

    static async runTest(testName: string, testFn: (ctx: MockContext) => Promise<void>) {
        console.log(`\n🧪 运行单人锦标赛测试: ${testName}`);
        const ctx = this.createMockContext();
        ctx.setupDefaultMocks();

        try {
            await testFn(ctx);
            console.log(`✅ ${testName} - 通过`);
        } catch (error) {
            console.error(`❌ ${testName} - 失败:`, error);
            throw error;
        }
    }
}

// ==================== 测试用例 ====================

export class SinglePlayerTournamentTests {

    // 测试加入锦标赛
    static async testJoinTournament() {
        await SinglePlayerTournamentTestUtils.runTest("加入锦标赛测试", async (ctx) => {
            // Mock MatchManager
            jest.spyOn(MatchManager, 'createMatch').mockResolvedValue('match1');
            jest.spyOn(MatchManager, 'joinMatch').mockResolvedValue('playerMatch1');
            jest.spyOn(MatchManager, 'createRemoteGame').mockResolvedValue({
                gameId: 'game1',
                serverUrl: 'https://game-server.example.com',
                type: 'remote',
                success: true
            });

            const result = await singlePlayerTournamentHandler.join(ctx as any, {
                uid: TEST_PLAYER.uid,
                gameType: "solitaire",
                tournamentType: "single_player_tournament",
                player: TEST_PLAYER,
                season: TEST_SEASON
            });

            // 验证返回结果
            expect(result.tournamentId).toBeDefined();
            expect(result.matchId).toBeDefined();
            expect(result.playerMatchId).toBeDefined();
            expect(result.gameId).toBe('game1');
            expect(result.serverUrl).toBe('https://game-server.example.com');
            expect(result.attemptNumber).toBe(1);

            // 验证数据库调用
            expect(ctx.db.insert).toHaveBeenCalledWith("tournaments", expect.objectContaining({
                seasonId: TEST_SEASON._id,
                gameType: "solitaire",
                segmentName: TEST_PLAYER.segmentName,
                tournamentType: "single_player_tournament",
                isSingleMatch: true
            }));

            expect(MatchManager.createMatch).toHaveBeenCalledWith(ctx, expect.objectContaining({
                tournamentId: "tournament1",
                gameType: "solitaire",
                matchType: "single_match",
                maxPlayers: 1,
                minPlayers: 1
            }));

            expect(MatchManager.joinMatch).toHaveBeenCalledWith(ctx, expect.objectContaining({
                matchId: "match1",
                tournamentId: "tournament1",
                uid: TEST_PLAYER.uid,
                gameType: "solitaire"
            }));

            expect(MatchManager.createRemoteGame).toHaveBeenCalledWith(ctx, expect.objectContaining({
                matchId: "match1",
                tournamentId: "tournament1",
                uids: [TEST_PLAYER.uid],
                gameType: "solitaire",
                matchType: "single_match"
            }));
        });
    }

    // 测试提交分数
    static async testSubmitScore() {
        await SinglePlayerTournamentTestUtils.runTest("提交分数测试", async (ctx) => {
            // Mock 查找玩家比赛记录
            ctx.db.query.mockImplementation((table: string) => {
                if (table === "player_matches") {
                    return {
                        withIndex: () => ({
                            first: async () => ({
                                _id: "playerMatch1",
                                matchId: "match1",
                                tournamentId: "tournament1",
                                uid: TEST_PLAYER.uid,
                                gameType: "solitaire",
                                score: 0,
                                completed: false,
                                attemptNumber: 1,
                                propsUsed: [],
                                playerGameData: {},
                                joinTime: getTorontoDate().iso,
                                createdAt: getTorontoDate().iso,
                                updatedAt: getTorontoDate().iso
                            }),
                            collect: async () => [{
                                _id: "playerMatch1",
                                matchId: "match1",
                                tournamentId: "tournament1",
                                uid: TEST_PLAYER.uid,
                                gameType: "solitaire",
                                score: 1000,
                                completed: true,
                                attemptNumber: 1,
                                propsUsed: ["hint"],
                                playerGameData: { moves: 50, time: 300 },
                                joinTime: getTorontoDate().iso,
                                leaveTime: getTorontoDate().iso,
                                createdAt: getTorontoDate().iso,
                                updatedAt: getTorontoDate().iso
                            }]
                        })
                    };
                }
                return {
                    withIndex: () => ({
                        first: async () => null,
                        collect: async () => []
                    })
                };
            });

            // Mock MatchManager
            jest.spyOn(MatchManager, 'submitScore').mockResolvedValue({
                success: true,
                playerMatchId: "playerMatch1",
                score: 1000
            });

            // Mock 延迟扣除
            ctx.runMutation = jest.fn().mockResolvedValue({
                deductionId: "deduction1",
                success: true
            });

            const result = await singlePlayerTournamentHandler.submitScore(ctx as any, {
                tournamentId: "tournament1",
                uid: TEST_PLAYER.uid,
                gameType: "solitaire",
                score: 1000,
                gameData: { moves: 50, time: 300 },
                propsUsed: ["hint"],
                gameId: "game1"
            });

            // 验证返回结果
            expect(result.success).toBe(true);
            expect(result.matchId).toBeDefined();
            expect(result.score).toBe(1000);
            expect(result.deductionResult).toBeDefined();

            // 验证数据库调用
            expect(MatchManager.submitScore).toHaveBeenCalledWith(ctx, expect.objectContaining({
                matchId: "match1",
                tournamentId: "tournament1",
                uid: TEST_PLAYER.uid,
                gameType: "solitaire",
                score: 1000,
                gameData: { moves: 50, time: 300 },
                propsUsed: ["hint"],
                attemptNumber: 1
            }));

            // 验证道具使用日志
            expect(ctx.db.insert).toHaveBeenCalledWith("prop_usage_logs", expect.objectContaining({
                uid: TEST_PLAYER.uid,
                gameType: "tournament",
                propType: "hint",
                gameState: {
                    tournamentId: "tournament1",
                    matchId: "match1",
                    gameId: "game1"
                },
                deductionMode: "delayed",
                gameId: "game1"
            }));
        });
    }

    // 测试结算逻辑
    static async testSettleTournament() {
        await SinglePlayerTournamentTestUtils.runTest("结算锦标赛测试", async (ctx) => {
            // Mock 比赛数据
            ctx.db.query.mockImplementation((table: string) => {
                if (table === "matches") {
                    return {
                        withIndex: () => ({
                            collect: async () => [{
                                _id: "match1",
                                tournamentId: "tournament1",
                                gameType: "solitaire",
                                matchType: "single_match",
                                status: "completed",
                                maxPlayers: 1,
                                minPlayers: 1,
                                startTime: getTorontoDate().iso,
                                endTime: getTorontoDate().iso,
                                gameData: {},
                                createdAt: getTorontoDate().iso,
                                updatedAt: getTorontoDate().iso
                            }]
                        })
                    };
                }
                if (table === "player_matches") {
                    return {
                        withIndex: () => ({
                            collect: async () => [{
                                _id: "playerMatch1",
                                matchId: "match1",
                                tournamentId: "tournament1",
                                uid: TEST_PLAYER.uid,
                                gameType: "solitaire",
                                score: 1000,
                                completed: true,
                                attemptNumber: 1,
                                propsUsed: ["hint"],
                                playerGameData: { moves: 50, time: 300 },
                                joinTime: getTorontoDate().iso,
                                leaveTime: getTorontoDate().iso,
                                createdAt: getTorontoDate().iso,
                                updatedAt: getTorontoDate().iso
                            }]
                        })
                    };
                }
                return {
                    withIndex: () => ({
                        first: async () => null,
                        collect: async () => []
                    })
                };
            });

            // Mock 奖励分配
            const mockDistributeRewards = jest.fn().mockResolvedValue(undefined);
            singlePlayerTournamentHandler.distributeRewards = mockDistributeRewards;

            await singlePlayerTournamentHandler.settle(ctx as any, "tournament1");

            // 验证奖励分配被调用
            expect(mockDistributeRewards).toHaveBeenCalledWith(ctx, expect.objectContaining({
                uid: TEST_PLAYER.uid,
                rank: 1,
                score: 1000,
                tournament: expect.objectContaining({
                    _id: "tournament1",
                    tournamentType: "single_player_tournament"
                })
            }));

            // 验证锦标赛状态更新
            expect(ctx.db.patch).toHaveBeenCalledWith("tournament1", expect.objectContaining({
                status: "completed",
                updatedAt: expect.any(String)
            }));
        });
    }

    // 测试限制验证
    static async testLimitValidation() {
        await SinglePlayerTournamentTestUtils.runTest("限制验证测试", async (ctx) => {
            // Mock 已达到每日限制
            ctx.db.query.mockImplementation((table: string) => {
                if (table === "player_tournament_limits") {
                    return {
                        withIndex: () => ({
                            first: async () => ({
                                uid: TEST_PLAYER.uid,
                                tournamentType: "single_player_tournament",
                                date: getTorontoDate().localDate.toISOString().split("T")[0],
                                participationCount: 10 // 已达到每日限制
                            })
                        })
                    };
                }
                return {
                    withIndex: () => ({
                        first: async () => null,
                        collect: async () => []
                    })
                };
            });

            // 测试加入应该失败
            await expect(
                singlePlayerTournamentHandler.join(ctx as any, {
                    uid: TEST_PLAYER.uid,
                    gameType: "solitaire",
                    tournamentType: "single_player_tournament",
                    player: TEST_PLAYER,
                    season: TEST_SEASON
                })
            ).rejects.toThrow("今日参与次数已达上限");
        });
    }

    // 测试金币不足
    static async testInsufficientCoins() {
        await SinglePlayerTournamentTestUtils.runTest("金币不足测试", async (ctx) => {
            // Mock 金币不足
            ctx.db.query.mockImplementation((table: string) => {
                if (table === "player_inventory") {
                    return {
                        withIndex: () => ({
                            first: async () => ({
                                ...TEST_INVENTORY,
                                coins: 0 // 没有金币
                            })
                        })
                    };
                }
                return {
                    withIndex: () => ({
                        first: async () => null,
                        collect: async () => []
                    })
                };
            });

            // 测试加入应该失败
            await expect(
                singlePlayerTournamentHandler.join(ctx as any, {
                    uid: TEST_PLAYER.uid,
                    gameType: "solitaire",
                    tournamentType: "single_player_tournament",
                    player: TEST_PLAYER,
                    season: TEST_SEASON
                })
            ).rejects.toThrow("金币或门票不足");
        });
    }

    // 测试多次尝试
    static async testMultipleAttempts() {
        await SinglePlayerTournamentTestUtils.runTest("多次尝试测试", async (ctx) => {
            // Mock MatchManager
            jest.spyOn(MatchManager, 'createMatch').mockResolvedValue('match1');
            jest.spyOn(MatchManager, 'joinMatch').mockResolvedValue('playerMatch1');
            jest.spyOn(MatchManager, 'createRemoteGame').mockResolvedValue({
                gameId: 'game1',
                serverUrl: 'https://game-server.example.com',
                type: 'remote',
                success: true
            });

            // 第一次尝试
            const result1 = await singlePlayerTournamentHandler.join(ctx as any, {
                uid: TEST_PLAYER.uid,
                gameType: "solitaire",
                tournamentType: "single_player_tournament",
                player: TEST_PLAYER,
                season: TEST_SEASON
            });

            expect(result1.tournamentId).toBeDefined();
            expect(result1.attemptNumber).toBe(1);

            // 重置 mock 以模拟第二次尝试
            ctx.reset();
            ctx.setupDefaultMocks();

            // 第二次尝试
            const result2 = await singlePlayerTournamentHandler.join(ctx as any, {
                uid: TEST_PLAYER.uid,
                gameType: "solitaire",
                tournamentType: "single_player_tournament",
                player: TEST_PLAYER,
                season: TEST_SEASON
            });

            expect(result2.tournamentId).toBeDefined();
            expect(result2.attemptNumber).toBe(1);

            // 验证可以创建多个锦标赛（单人锦标赛支持多次尝试）
            expect(result1.tournamentId).not.toBe(result2.tournamentId);
        });
    }

    // 测试道具使用
    static async testPropUsage() {
        await SinglePlayerTournamentTestUtils.runTest("道具使用测试", async (ctx) => {
            // Mock 查找玩家比赛记录
            ctx.db.query.mockImplementation((table: string) => {
                if (table === "player_matches") {
                    return {
                        withIndex: () => ({
                            first: async () => ({
                                _id: "playerMatch1",
                                matchId: "match1",
                                tournamentId: "tournament1",
                                uid: TEST_PLAYER.uid,
                                gameType: "solitaire",
                                score: 0,
                                completed: false,
                                attemptNumber: 1,
                                propsUsed: [],
                                playerGameData: {},
                                joinTime: getTorontoDate().iso,
                                createdAt: getTorontoDate().iso,
                                updatedAt: getTorontoDate().iso
                            })
                        })
                    };
                }
                return {
                    withIndex: () => ({
                        first: async () => null,
                        collect: async () => []
                    })
                };
            });

            // Mock MatchManager
            jest.spyOn(MatchManager, 'submitScore').mockResolvedValue({
                success: true,
                playerMatchId: "playerMatch1",
                score: 1000
            });

            // Mock 延迟扣除
            ctx.runMutation = jest.fn().mockResolvedValue({
                deductionId: "deduction1",
                success: true
            });

            const result = await singlePlayerTournamentHandler.submitScore(ctx as any, {
                tournamentId: "tournament1",
                uid: TEST_PLAYER.uid,
                gameType: "solitaire",
                score: 1000,
                gameData: { moves: 50, time: 300 },
                propsUsed: ["hint", "undo"], // 使用多个道具
                gameId: "game1"
            });

            // 验证道具使用日志
            expect(ctx.db.insert).toHaveBeenCalledWith("prop_usage_logs", expect.objectContaining({
                uid: TEST_PLAYER.uid,
                gameType: "tournament",
                propType: "hint,undo", // 多个道具用逗号分隔
                gameState: {
                    tournamentId: "tournament1",
                    matchId: "match1",
                    gameId: "game1"
                },
                deductionMode: "delayed",
                gameId: "game1",
                deductionId: "deduction1"
            }));

            // 验证延迟扣除被调用
            expect(ctx.runMutation).toHaveBeenCalledWith(
                expect.any(String), // internal mutation path
                expect.objectContaining({
                    gameId: "game1",
                    uid: TEST_PLAYER.uid,
                    gameResult: {
                        score: 1000,
                        gameData: { moves: 50, time: 300 },
                        propsUsed: ["hint", "undo"],
                        completed: true
                    }
                })
            );
        });
    }

    // 测试错误处理
    static async testErrorHandling() {
        await SinglePlayerTournamentTestUtils.runTest("错误处理测试", async (ctx) => {
            // 测试锦标赛不存在
            ctx.db.get.mockResolvedValue(null);

            await expect(
                singlePlayerTournamentHandler.submitScore(ctx as any, {
                    tournamentId: "notfound",
                    uid: TEST_PLAYER.uid,
                    gameType: "solitaire",
                    score: 1000,
                    gameData: {},
                    propsUsed: [],
                    gameId: "game1"
                })
            ).rejects.toThrow("锦标赛不存在");

            // 测试比赛记录不存在
            ctx.db.get.mockResolvedValue({
                _id: "tournament1",
                tournamentType: "single_player_tournament"
            });

            ctx.db.query.mockImplementation((table: string) => ({
                withIndex: () => ({
                    first: async () => null,
                    collect: async () => []
                })
            }));

            await expect(
                singlePlayerTournamentHandler.submitScore(ctx as any, {
                    tournamentId: "tournament1",
                    uid: TEST_PLAYER.uid,
                    gameType: "solitaire",
                    score: 1000,
                    gameData: {},
                    propsUsed: [],
                    gameId: "game1"
                })
            ).rejects.toThrow("未找到对应的比赛记录");
        });
    }
}

// ==================== 测试运行器 ====================

export class SinglePlayerTournamentTestRunner {

    static async runAllTests() {
        console.log("🚀 开始运行单人锦标赛处理器测试");

        try {
            await SinglePlayerTournamentTests.testJoinTournament();
            await SinglePlayerTournamentTests.testSubmitScore();
            await SinglePlayerTournamentTests.testSettleTournament();
            await SinglePlayerTournamentTests.testLimitValidation();
            await SinglePlayerTournamentTests.testInsufficientCoins();
            await SinglePlayerTournamentTests.testMultipleAttempts();
            await SinglePlayerTournamentTests.testPropUsage();
            await SinglePlayerTournamentTests.testErrorHandling();

            console.log("\n🎉 所有单人锦标赛测试通过！");

        } catch (error) {
            console.error("\n💥 测试失败:", error);
            throw error;
        }
    }

    static async runSpecificTest(testName: string) {
        console.log(`🎯 运行特定测试: ${testName}`);

        switch (testName) {
            case "join":
                await SinglePlayerTournamentTests.testJoinTournament();
                break;
            case "submit":
                await SinglePlayerTournamentTests.testSubmitScore();
                break;
            case "settle":
                await SinglePlayerTournamentTests.testSettleTournament();
                break;
            case "limits":
                await SinglePlayerTournamentTests.testLimitValidation();
                break;
            case "coins":
                await SinglePlayerTournamentTests.testInsufficientCoins();
                break;
            case "attempts":
                await SinglePlayerTournamentTests.testMultipleAttempts();
                break;
            case "props":
                await SinglePlayerTournamentTests.testPropUsage();
                break;
            case "errors":
                await SinglePlayerTournamentTests.testErrorHandling();
                break;
            default:
                throw new Error(`未知测试: ${testName}`);
        }
    }
}

// ==================== Convex 函数接口 ====================

export const runSinglePlayerTournamentTests = query({
    args: { testName: v.optional(v.string()) },
    handler: async (ctx, args) => {
        if (args.testName) {
            await SinglePlayerTournamentTestRunner.runSpecificTest(args.testName);
        } else {
            await SinglePlayerTournamentTestRunner.runAllTests();
        }
        return { success: true, message: "单人锦标赛测试完成" };
    },
});

export const getSinglePlayerTournamentTestResults = query({
    args: {},
    handler: async (ctx) => {
        return {
            testCount: 8,
            testNames: [
                "join",
                "submit",
                "settle",
                "limits",
                "coins",
                "attempts",
                "props",
                "errors"
            ],
            description: "单人锦标赛处理器功能测试"
        };
    },
}); 