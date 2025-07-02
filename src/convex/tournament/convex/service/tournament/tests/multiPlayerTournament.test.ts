/**
 * 多人锦标赛处理器测试
 * 专门测试 multiPlayerTournamentHandler 的功能
 */

import { v } from "convex/values";
import { mutation, query } from "../../../_generated/server";
import { getTorontoDate } from "../../utils";
import { multiPlayerTournamentHandler } from "../handler/multiPlayerTournament";
import { MatchManager } from "../matchManager";
import { TournamentMatchingService } from "../tournamentMatchingService";

// ==================== 测试数据 ====================

const TEST_PLAYERS = [
    {
        _id: "player1_id" as any,
        _creationTime: Date.now(),
        uid: "player1",
        displayName: "Player One",
        segmentName: "gold",
        isSubscribed: true,
        totalPoints: 1500,
        eloScore: 1500,
        level: 15,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        lastActive: "2024-01-01T00:00:00Z"
    },
    {
        _id: "player2_id" as any,
        _creationTime: Date.now(),
        uid: "player2",
        displayName: "Player Two",
        segmentName: "silver",
        isSubscribed: false,
        totalPoints: 800,
        eloScore: 800,
        level: 8,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        lastActive: "2024-01-01T00:00:00Z"
    },
    {
        _id: "player3_id" as any,
        _creationTime: Date.now(),
        uid: "player3",
        displayName: "Player Three",
        segmentName: "bronze",
        isSubscribed: false,
        totalPoints: 300,
        eloScore: 300,
        level: 3,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        lastActive: "2024-01-01T00:00:00Z"
    },
    {
        _id: "player4_id" as any,
        _creationTime: Date.now(),
        uid: "player4",
        displayName: "Player Four",
        segmentName: "platinum",
        isSubscribed: true,
        totalPoints: 2000,
        eloScore: 2000,
        level: 20,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        lastActive: "2024-01-01T00:00:00Z"
    }
];

const TEST_SEASON = {
    _id: "season1" as any,
    _creationTime: Date.now(),
    name: "Test Season 2024",
    startDate: "2024-01-01",
    endDate: "2024-12-31",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z"
};

const TEST_CONFIG = {
    entryFee: {
        coins: 100,
        tickets: {
            gameType: "rummy",
            tournamentType: "multi_player_tournament",
            quantity: 1
        }
    },
    rules: {
        maxAttempts: 1,
        isSingleMatch: false,
        rankingMethod: "total_score"
    },
    rewards: {
        baseRewards: {
            coins: 200,
            gamePoints: 100,
            props: [
                {
                    gameType: "rummy",
                    propType: "wild_card",
                    quantity: 1,
                    rarity: "rare"
                }
            ],
            tickets: []
        },
        rankRewards: [
            {
                rankRange: [1, 1],
                multiplier: 4.0,
                bonusProps: [
                    {
                        gameType: "rummy",
                        propType: "joker",
                        quantity: 1,
                        rarity: "epic"
                    }
                ]
            },
            {
                rankRange: [2, 2],
                multiplier: 2.5
            },
            {
                rankRange: [3, 3],
                multiplier: 1.5
            }
        ],
        segmentBonus: {
            bronze: 1.0,
            silver: 1.1,
            gold: 1.2,
            platinum: 1.3,
            diamond: 1.5
        },
        subscriptionBonus: 1.3,
        participationReward: {
            coins: 20,
            gamePoints: 10
        }
    },
    limits: {
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
        },
        total: {
            maxParticipations: 1000,
            maxTournaments: 500,
            maxAttempts: 1000
        }
    },
    advanced: {
        matching: {
            algorithm: "skill_based",
            skillRange: 150,
            maxWaitTime: 60,
            fallbackToAI: false
        },
        settlement: {
            autoSettle: true,
            settleDelay: 600,
            requireMinimumPlayers: true,
            minimumPlayers: 2
        }
    }
};

const TEST_INVENTORIES = [
    {
        uid: "player1",
        coins: 1000,
        tickets: [
            { gameType: "rummy", tournamentType: "multi_player_tournament", quantity: 5 }
        ],
        props: [
            { gameType: "rummy", propType: "wild_card", quantity: 10 }
        ]
    },
    {
        uid: "player2",
        coins: 500,
        tickets: [
            { gameType: "rummy", tournamentType: "multi_player_tournament", quantity: 2 }
        ],
        props: []
    },
    {
        uid: "player3",
        coins: 200,
        tickets: [],
        props: []
    },
    {
        uid: "player4",
        coins: 2000,
        tickets: [
            { gameType: "rummy", tournamentType: "multi_player_tournament", quantity: 10 }
        ],
        props: [
            { gameType: "rummy", propType: "joker", quantity: 5 }
        ]
    }
];

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
                        first: async () => TEST_PLAYERS[0],
                        collect: async () => TEST_PLAYERS
                    })
                };
            }
            if (table === "player_inventory") {
                return {
                    withIndex: () => ({
                        first: async () => TEST_INVENTORIES[0]
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
                        first: async () => null,
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
                    gameType: "rummy",
                    segmentName: "gold",
                    status: "open",
                    playerUids: ["player1", "player2", "player3"],
                    tournamentType: "multi_player_tournament",
                    isSubscribedRequired: false,
                    isSingleMatch: false,
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
                    gameType: "rummy",
                    matchType: "multiplayer_single_match",
                    status: "in_progress",
                    maxPlayers: 4,
                    minPlayers: 2,
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

class MultiPlayerTournamentTestUtils {
    static createMockContext(): MockContext {
        return new MockContext();
    }

    static async runTest(testName: string, testFn: (ctx: MockContext) => Promise<void>) {
        console.log(`\n🧪 运行多人锦标赛测试: ${testName}`);
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

export class MultiPlayerTournamentTests {

    // 测试加入多人锦标赛
    static async testJoinMultiPlayerTournament() {
        await MultiPlayerTournamentTestUtils.runTest("加入多人锦标赛测试", async (ctx) => {
            // Mock TournamentMatchingService
            jest.spyOn(TournamentMatchingService, 'joinTournamentMatch').mockResolvedValue({
                success: true,
                matchId: "match1",
                playerMatchId: "playerMatch1",
                gameId: "game1",
                serverUrl: "https://game-server.example.com",
                status: "matched",
                matchInfo: {
                    currentPlayers: 3,
                    maxPlayers: 4,
                    minPlayers: 2,
                    isReady: true,
                    message: "匹配成功"
                }
            });

            const result = await multiPlayerTournamentHandler.join(ctx as any, {
                uid: TEST_PLAYERS[0].uid,
                gameType: "rummy",
                tournamentType: "multi_player_tournament",
                player: TEST_PLAYERS[0],
                season: TEST_SEASON
            });

            // 验证返回结果
            expect(result.tournamentId).toBeDefined();
            expect(result.matchId).toBe("match1");
            expect(result.playerMatchId).toBe("playerMatch1");
            expect(result.gameId).toBe("game1");
            expect(result.serverUrl).toBe("https://game-server.example.com");
            expect(result.attemptNumber).toBe(1);
            expect(result.matchStatus).toBeDefined();

            // 验证匹配服务被调用
            expect(TournamentMatchingService.joinTournamentMatch).toHaveBeenCalledWith(ctx, expect.objectContaining({
                uid: TEST_PLAYERS[0].uid,
                tournamentId: "tournament1",
                gameType: "rummy",
                player: TEST_PLAYERS[0],
                config: TEST_CONFIG
            }));
        });
    }

    // 测试单人比赛模式
    static async testSingleMatchMode() {
        await MultiPlayerTournamentTestUtils.runTest("单人比赛模式测试", async (ctx) => {
            // 修改配置为单人比赛模式
            const singleMatchConfig = {
                ...TEST_CONFIG,
                rules: { ...TEST_CONFIG.rules, isSingleMatch: true }
            };

            ctx.db.query.mockImplementation((table: string) => {
                if (table === "tournament_types") {
                    return {
                        withIndex: () => ({
                            first: async () => ({ defaultConfig: singleMatchConfig })
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
            jest.spyOn(MatchManager, 'createMatch').mockResolvedValue('match1');
            jest.spyOn(MatchManager, 'joinMatch').mockResolvedValue('playerMatch1');
            jest.spyOn(MatchManager, 'createRemoteGame').mockResolvedValue({
                gameId: 'game1',
                serverUrl: 'https://game-server.example.com',
                type: 'remote',
                success: true
            });

            const result = await multiPlayerTournamentHandler.join(ctx as any, {
                uid: TEST_PLAYERS[0].uid,
                gameType: "rummy",
                tournamentType: "multi_player_tournament",
                player: TEST_PLAYERS[0],
                season: TEST_SEASON
            });

            // 验证直接创建比赛而不是使用匹配服务
            expect(MatchManager.createMatch).toHaveBeenCalledWith(ctx, expect.objectContaining({
                tournamentId: "tournament1",
                gameType: "rummy",
                matchType: "single_match",
                maxPlayers: 1,
                minPlayers: 1
            }));

            expect(MatchManager.joinMatch).toHaveBeenCalledWith(ctx, expect.objectContaining({
                matchId: "match1",
                tournamentId: "tournament1",
                uid: TEST_PLAYERS[0].uid,
                gameType: "rummy"
            }));
        });
    }

    // 测试提交分数
    static async testSubmitScore() {
        await MultiPlayerTournamentTestUtils.runTest("提交分数测试", async (ctx) => {
            // Mock 查找玩家比赛记录
            ctx.db.query.mockImplementation((table: string) => {
                if (table === "player_matches") {
                    return {
                        withIndex: () => ({
                            first: async () => ({
                                _id: "playerMatch1",
                                matchId: "match1",
                                tournamentId: "tournament1",
                                uid: TEST_PLAYERS[0].uid,
                                gameType: "rummy",
                                score: 0,
                                completed: false,
                                attemptNumber: 1,
                                propsUsed: [],
                                playerGameData: {},
                                joinTime: getTorontoDate().iso,
                                createdAt: getTorontoDate().iso,
                                updatedAt: getTorontoDate().iso
                            }),
                            collect: async () => [
                                {
                                    _id: "playerMatch1",
                                    matchId: "match1",
                                    tournamentId: "tournament1",
                                    uid: TEST_PLAYERS[0].uid,
                                    gameType: "rummy",
                                    score: 1000,
                                    completed: true,
                                    attemptNumber: 1,
                                    propsUsed: ["wild_card"],
                                    playerGameData: { rounds: 5, wins: 3 },
                                    joinTime: getTorontoDate().iso,
                                    leaveTime: getTorontoDate().iso,
                                    createdAt: getTorontoDate().iso,
                                    updatedAt: getTorontoDate().iso
                                },
                                {
                                    _id: "playerMatch2",
                                    matchId: "match1",
                                    tournamentId: "tournament1",
                                    uid: TEST_PLAYERS[1].uid,
                                    gameType: "rummy",
                                    score: 800,
                                    completed: true,
                                    attemptNumber: 1,
                                    propsUsed: [],
                                    playerGameData: { rounds: 5, wins: 2 },
                                    joinTime: getTorontoDate().iso,
                                    leaveTime: getTorontoDate().iso,
                                    createdAt: getTorontoDate().iso,
                                    updatedAt: getTorontoDate().iso
                                },
                                {
                                    _id: "playerMatch3",
                                    matchId: "match1",
                                    tournamentId: "tournament1",
                                    uid: TEST_PLAYERS[2].uid,
                                    gameType: "rummy",
                                    score: 600,
                                    completed: true,
                                    attemptNumber: 1,
                                    propsUsed: [],
                                    playerGameData: { rounds: 5, wins: 1 },
                                    joinTime: getTorontoDate().iso,
                                    leaveTime: getTorontoDate().iso,
                                    createdAt: getTorontoDate().iso,
                                    updatedAt: getTorontoDate().iso
                                }
                            ]
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

            const result = await multiPlayerTournamentHandler.submitScore(ctx as any, {
                tournamentId: "tournament1",
                uid: TEST_PLAYERS[0].uid,
                gameType: "rummy",
                score: 1000,
                gameData: { rounds: 5, wins: 3 },
                propsUsed: ["wild_card"],
                gameId: "game1"
            });

            // 验证返回结果
            expect(result.success).toBe(true);
            expect(result.matchId).toBeDefined();
            expect(result.score).toBe(1000);
            expect(result.deductionResult).toBeDefined();

            // 验证 MatchManager 调用
            expect(MatchManager.submitScore).toHaveBeenCalledWith(ctx, expect.objectContaining({
                matchId: "match1",
                tournamentId: "tournament1",
                uid: TEST_PLAYERS[0].uid,
                gameType: "rummy",
                score: 1000,
                gameData: { rounds: 5, wins: 3 },
                propsUsed: ["wild_card"],
                attemptNumber: 1
            }));
        });
    }

    // 测试结算逻辑
    static async testSettleTournament() {
        await MultiPlayerTournamentTestUtils.runTest("结算锦标赛测试", async (ctx) => {
            // Mock 比赛数据
            ctx.db.query.mockImplementation((table: string) => {
                if (table === "matches") {
                    return {
                        withIndex: () => ({
                            collect: async () => [
                                {
                                    _id: "match1",
                                    tournamentId: "tournament1",
                                    gameType: "rummy",
                                    matchType: "multiplayer_single_match",
                                    status: "completed",
                                    maxPlayers: 4,
                                    minPlayers: 2,
                                    startTime: getTorontoDate().iso,
                                    endTime: getTorontoDate().iso,
                                    gameData: {},
                                    createdAt: getTorontoDate().iso,
                                    updatedAt: getTorontoDate().iso
                                }
                            ]
                        })
                    };
                }
                if (table === "player_matches") {
                    return {
                        withIndex: () => ({
                            collect: async () => [
                                {
                                    _id: "playerMatch1",
                                    matchId: "match1",
                                    tournamentId: "tournament1",
                                    uid: TEST_PLAYERS[0].uid,
                                    gameType: "rummy",
                                    score: 1000,
                                    completed: true,
                                    attemptNumber: 1,
                                    propsUsed: ["wild_card"],
                                    playerGameData: { rounds: 5, wins: 3 },
                                    joinTime: getTorontoDate().iso,
                                    leaveTime: getTorontoDate().iso,
                                    createdAt: getTorontoDate().iso,
                                    updatedAt: getTorontoDate().iso
                                },
                                {
                                    _id: "playerMatch2",
                                    matchId: "match1",
                                    tournamentId: "tournament1",
                                    uid: TEST_PLAYERS[1].uid,
                                    gameType: "rummy",
                                    score: 800,
                                    completed: true,
                                    attemptNumber: 1,
                                    propsUsed: [],
                                    playerGameData: { rounds: 5, wins: 2 },
                                    joinTime: getTorontoDate().iso,
                                    leaveTime: getTorontoDate().iso,
                                    createdAt: getTorontoDate().iso,
                                    updatedAt: getTorontoDate().iso
                                },
                                {
                                    _id: "playerMatch3",
                                    matchId: "match1",
                                    tournamentId: "tournament1",
                                    uid: TEST_PLAYERS[2].uid,
                                    gameType: "rummy",
                                    score: 600,
                                    completed: true,
                                    attemptNumber: 1,
                                    propsUsed: [],
                                    playerGameData: { rounds: 5, wins: 1 },
                                    joinTime: getTorontoDate().iso,
                                    leaveTime: getTorontoDate().iso,
                                    createdAt: getTorontoDate().iso,
                                    updatedAt: getTorontoDate().iso
                                }
                            ]
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
            multiPlayerTournamentHandler.distributeRewards = mockDistributeRewards;

            await multiPlayerTournamentHandler.settle(ctx as any, "tournament1");

            // 验证奖励分配被调用（应该为每个玩家调用）
            expect(mockDistributeRewards).toHaveBeenCalledTimes(3);

            // 验证第一个玩家（最高分）的奖励分配
            expect(mockDistributeRewards).toHaveBeenCalledWith(ctx, expect.objectContaining({
                uid: TEST_PLAYERS[0].uid,
                rank: 1,
                score: 1000, // 总分
                tournament: expect.objectContaining({
                    _id: "tournament1",
                    tournamentType: "multi_player_tournament"
                })
            }));

            // 验证第二个玩家的奖励分配
            expect(mockDistributeRewards).toHaveBeenCalledWith(ctx, expect.objectContaining({
                uid: TEST_PLAYERS[1].uid,
                rank: 2,
                score: 800
            }));

            // 验证第三个玩家的奖励分配
            expect(mockDistributeRewards).toHaveBeenCalledWith(ctx, expect.objectContaining({
                uid: TEST_PLAYERS[2].uid,
                rank: 3,
                score: 600
            }));

            // 验证锦标赛状态更新
            expect(ctx.db.patch).toHaveBeenCalledWith("tournament1", expect.objectContaining({
                status: "completed",
                updatedAt: expect.any(String)
            }));
        });
    }

    // 测试多人匹配
    static async testMultiPlayerMatching() {
        await MultiPlayerTournamentTestUtils.runTest("多人匹配测试", async (ctx) => {
            // Mock 多个玩家同时加入
            const players = [TEST_PLAYERS[0], TEST_PLAYERS[1], TEST_PLAYERS[2]];

            // Mock TournamentMatchingService 返回匹配结果
            jest.spyOn(TournamentMatchingService, 'joinTournamentMatch').mockImplementation(async (ctx, params) => {
                return {
                    success: true,
                    matchId: "match1",
                    playerMatchId: `playerMatch_${params.uid}`,
                    gameId: "game1",
                    serverUrl: "https://game-server.example.com",
                    status: "matched",
                    matchInfo: {
                        currentPlayers: players.length,
                        maxPlayers: 4,
                        minPlayers: 2,
                        isReady: true,
                        message: "匹配成功"
                    }
                };
            });

            // 模拟多个玩家同时加入
            const joinPromises = players.map(player =>
                multiPlayerTournamentHandler.join(ctx as any, {
                    uid: player.uid,
                    gameType: "rummy",
                    tournamentType: "multi_player_tournament",
                    player,
                    season: TEST_SEASON
                })
            );

            const results = await Promise.all(joinPromises);

            // 验证所有玩家都成功加入
            results.forEach((result, index) => {
                expect(result.success).toBe(true);
                expect(result.tournamentId).toBeDefined();
                expect(result.matchId).toBe("match1");
                expect(result.gameId).toBe("game1");
                expect(result.playerMatchId).toBe(`playerMatch_${players[index].uid}`);
            });

            // 验证匹配服务被调用正确的次数
            expect(TournamentMatchingService.joinTournamentMatch).toHaveBeenCalledTimes(3);

            // 验证所有玩家在同一锦标赛中
            const tournamentIds = [...new Set(results.map(r => r.tournamentId))];
            expect(tournamentIds.length).toBe(1);
        });
    }

    // 测试技能匹配
    static async testSkillBasedMatching() {
        await MultiPlayerTournamentTestUtils.runTest("技能匹配测试", async (ctx) => {
            // 测试不同技能水平的玩家匹配
            const highSkillPlayer = TEST_PLAYERS[0]; // ELO 1500
            const mediumSkillPlayer = TEST_PLAYERS[1]; // ELO 800
            const lowSkillPlayer = TEST_PLAYERS[2]; // ELO 300

            // Mock 匹配服务根据技能水平进行匹配
            jest.spyOn(TournamentMatchingService, 'joinTournamentMatch').mockImplementation(async (ctx, params) => {
                const player = params.player;
                let matchId = "match1";

                // 根据技能水平分配到不同的比赛
                if (player.eloScore >= 1200) {
                    matchId = "high_skill_match";
                } else if (player.eloScore >= 600) {
                    matchId = "medium_skill_match";
                } else {
                    matchId = "low_skill_match";
                }

                return {
                    success: true,
                    matchId,
                    playerMatchId: `playerMatch_${params.uid}`,
                    gameId: `game_${matchId}`,
                    serverUrl: "https://game-server.example.com",
                    status: "matched",
                    matchInfo: {
                        currentPlayers: 1,
                        maxPlayers: 4,
                        minPlayers: 2,
                        isReady: true,
                        message: "匹配成功"
                    }
                };
            });

            // 高技能玩家加入
            const highSkillResult = await multiPlayerTournamentHandler.join(ctx as any, {
                uid: highSkillPlayer.uid,
                gameType: "rummy",
                tournamentType: "multi_player_tournament",
                player: highSkillPlayer,
                season: TEST_SEASON
            });

            // 中等技能玩家加入
            const mediumSkillResult = await multiPlayerTournamentHandler.join(ctx as any, {
                uid: mediumSkillPlayer.uid,
                gameType: "rummy",
                tournamentType: "multi_player_tournament",
                player: mediumSkillPlayer,
                season: TEST_SEASON
            });

            // 低技能玩家加入
            const lowSkillResult = await multiPlayerTournamentHandler.join(ctx as any, {
                uid: lowSkillPlayer.uid,
                gameType: "rummy",
                tournamentType: "multi_player_tournament",
                player: lowSkillPlayer,
                season: TEST_SEASON
            });

            // 验证技能匹配结果
            expect(highSkillResult.matchId).toBe("high_skill_match");
            expect(mediumSkillResult.matchId).toBe("medium_skill_match");
            expect(lowSkillResult.matchId).toBe("low_skill_match");

            // 验证匹配服务被正确调用
            expect(TournamentMatchingService.joinTournamentMatch).toHaveBeenCalledWith(ctx, expect.objectContaining({
                uid: highSkillPlayer.uid,
                player: highSkillPlayer
            }));
        });
    }

    // 测试门票验证
    static async testTicketValidation() {
        await MultiPlayerTournamentTestUtils.runTest("门票验证测试", async (ctx) => {
            // Mock 没有门票的库存
            ctx.db.query.mockImplementation((table: string) => {
                if (table === "player_inventory") {
                    return {
                        withIndex: () => ({
                            first: async () => ({
                                ...TEST_INVENTORIES[0],
                                tickets: [] // 没有门票
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

            // 测试加入应该失败（需要门票）
            await expect(
                multiPlayerTournamentHandler.join(ctx as any, {
                    uid: TEST_PLAYERS[0].uid,
                    gameType: "rummy",
                    tournamentType: "multi_player_tournament",
                    player: TEST_PLAYERS[0],
                    season: TEST_SEASON
                })
            ).rejects.toThrow("金币或门票不足");
        });
    }

    // 测试错误处理
    static async testErrorHandling() {
        await MultiPlayerTournamentTestUtils.runTest("错误处理测试", async (ctx) => {
            // 测试锦标赛不存在
            ctx.db.get.mockResolvedValue(null);

            await expect(
                multiPlayerTournamentHandler.submitScore(ctx as any, {
                    tournamentId: "notfound",
                    uid: TEST_PLAYERS[0].uid,
                    gameType: "rummy",
                    score: 1000,
                    gameData: {},
                    propsUsed: [],
                    gameId: "game1"
                })
            ).rejects.toThrow("锦标赛不存在");

            // 测试匹配服务失败
            jest.spyOn(TournamentMatchingService, 'joinTournamentMatch').mockRejectedValue(
                new Error("匹配服务不可用")
            );

            await expect(
                multiPlayerTournamentHandler.join(ctx as any, {
                    uid: TEST_PLAYERS[0].uid,
                    gameType: "rummy",
                    tournamentType: "multi_player_tournament",
                    player: TEST_PLAYERS[0],
                    season: TEST_SEASON
                })
            ).rejects.toThrow("匹配服务不可用");
        });
    }
}

// ==================== 测试运行器 ====================

export class MultiPlayerTournamentTestRunner {

    static async runAllTests() {
        console.log("🚀 开始运行多人锦标赛处理器测试");

        try {
            await MultiPlayerTournamentTests.testJoinMultiPlayerTournament();
            await MultiPlayerTournamentTests.testSingleMatchMode();
            await MultiPlayerTournamentTests.testSubmitScore();
            await MultiPlayerTournamentTests.testSettleTournament();
            await MultiPlayerTournamentTests.testMultiPlayerMatching();
            await MultiPlayerTournamentTests.testSkillBasedMatching();
            await MultiPlayerTournamentTests.testTicketValidation();
            await MultiPlayerTournamentTests.testErrorHandling();

            console.log("\n🎉 所有多人锦标赛测试通过！");

        } catch (error) {
            console.error("\n💥 测试失败:", error);
            throw error;
        }
    }

    static async runSpecificTest(testName: string) {
        console.log(`🎯 运行特定测试: ${testName}`);

        switch (testName) {
            case "join":
                await MultiPlayerTournamentTests.testJoinMultiPlayerTournament();
                break;
            case "singleMatch":
                await MultiPlayerTournamentTests.testSingleMatchMode();
                break;
            case "submit":
                await MultiPlayerTournamentTests.testSubmitScore();
                break;
            case "settle":
                await MultiPlayerTournamentTests.testSettleTournament();
                break;
            case "matching":
                await MultiPlayerTournamentTests.testMultiPlayerMatching();
                break;
            case "skillMatching":
                await MultiPlayerTournamentTests.testSkillBasedMatching();
                break;
            case "tickets":
                await MultiPlayerTournamentTests.testTicketValidation();
                break;
            case "errors":
                await MultiPlayerTournamentTests.testErrorHandling();
                break;
            default:
                throw new Error(`未知测试: ${testName}`);
        }
    }
}

// ==================== Convex 函数接口 ====================

export const runMultiPlayerTournamentTests = mutation({
    args: { testName: v.optional(v.string()) },
    handler: async (ctx, args) => {
        if (args.testName) {
            await MultiPlayerTournamentTestRunner.runSpecificTest(args.testName);
        } else {
            await MultiPlayerTournamentTestRunner.runAllTests();
        }
        return { success: true, message: "多人锦标赛测试完成" };
    },
});

export const getMultiPlayerTournamentTestResults = query({
    args: {},
    handler: async (ctx) => {
        return {
            testCount: 8,
            testNames: [
                "join",
                "singleMatch",
                "submit",
                "settle",
                "matching",
                "skillMatching",
                "tickets",
                "errors"
            ],
            description: "多人锦标赛处理器功能测试"
        };
    },
}); 