/**
 * 锦标赛系统测试工具
 * 提供通用的测试工具函数和模拟上下文
 * 完全移除 Jest 依赖，使用自定义测试框架
 */

import { TEST_INVENTORIES, TEST_PLAYERS, TEST_SEASONS, TEST_TOURNAMENT_CONFIGS } from "./mockData";
import { assertDefined, assertEqual, assertTrue, expect, jest, objectContaining } from "./simpleTestFramework";

// ==================== Mock Context ====================

export class MockContext {
    db: any;
    auth: any;
    scheduler: any;
    runMutation: any;

    constructor() {
        this.db = {
            query: jest().fn(),
            get: jest().fn(),
            insert: jest().fn(),
            patch: jest().fn(),
            delete: jest().fn()
        };

        this.auth = {
            getUserIdentity: jest().fn()
        };

        this.scheduler = {
            runAfter: jest().fn()
        };

        this.runMutation = jest().fn();
    }

    reset() {
        jest().clearAllMocks();
    }

    setupDefaultMocks() {
        // 设置默认的数据库查询响应
        this.db.query.mockImplementation((table: string) => {
            const queryResult = {
                withIndex: (indexName: string) => {
                    const indexResult = {
                        first: async () => {
                            if (table === "players") return TEST_PLAYERS[0];
                            if (table === "seasons") return TEST_SEASONS[0];
                            if (table === "player_inventory") return TEST_INVENTORIES[0];
                            if (table === "tournament_types") return TEST_TOURNAMENT_CONFIGS.daily_special;
                            return null;
                        },
                        collect: async () => {
                            if (table === "players") return TEST_PLAYERS;
                            if (table === "seasons") return TEST_SEASONS;
                            if (table === "player_inventory") return TEST_INVENTORIES;
                            if (table === "tournament_types") return Object.values(TEST_TOURNAMENT_CONFIGS);
                            return [];
                        },
                        eq: (field: string, value: any) => indexResult,
                        filter: (callback: any) => indexResult,
                        order: (direction: string) => indexResult,
                        take: (limit: number) => indexResult
                    };
                    return indexResult;
                },
                filter: (callback: any) => queryResult,
                order: (direction: string) => queryResult,
                take: (limit: number) => queryResult
            };
            return queryResult;
        });

        this.db.get.mockImplementation((id: string) => {
            if (id === "season1") return TEST_SEASONS[0];
            if (id === "player1") return TEST_PLAYERS[0];
            if (id === "inventory1") return TEST_INVENTORIES[0];
            return null;
        });

        this.db.insert.mockImplementation((table: string, data: any) => {
            return `new_${table}_id_${Date.now()}`;
        });

        this.db.patch.mockImplementation((id: string, data: any) => {
            return { success: true };
        });

        this.db.delete.mockImplementation((id: string) => {
            return { success: true };
        });

        this.auth.getUserIdentity.mockResolvedValue({
            subject: "player1",
            email: "test@example.com"
        });

        this.scheduler.runAfter.mockResolvedValue(undefined);

        this.runMutation.mockImplementation(async (mutation: any, args: any) => {
            return { success: true };
        });
    }

    setupMockForPlayer(playerId: string) {
        const player = TEST_PLAYERS.find(p => p.uid === playerId) || TEST_PLAYERS[0];
        this.db.query.mockImplementation((table: string) => {
            const queryResult = {
                withIndex: (indexName: string) => {
                    const indexResult = {
                        first: async () => {
                            if (table === "players") return player;
                            if (table === "seasons") return TEST_SEASONS[0];
                            if (table === "player_inventory") return TEST_INVENTORIES[0];
                            if (table === "tournament_types") return TEST_TOURNAMENT_CONFIGS.daily_special;
                            return null;
                        },
                        collect: async () => {
                            if (table === "players") return [player];
                            if (table === "seasons") return TEST_SEASONS;
                            if (table === "player_inventory") return TEST_INVENTORIES;
                            if (table === "tournament_types") return Object.values(TEST_TOURNAMENT_CONFIGS);
                            return [];
                        },
                        eq: (field: string, value: any) => indexResult,
                        filter: (callback: any) => indexResult,
                        order: (direction: string) => indexResult,
                        take: (limit: number) => indexResult
                    };
                    return indexResult;
                },
                filter: (callback: any) => queryResult,
                order: (direction: string) => queryResult,
                take: (limit: number) => queryResult
            };
            return queryResult;
        });
    }

    setupMockForTournamentType(tournamentType: string) {
        const config = TEST_TOURNAMENT_CONFIGS[tournamentType as keyof typeof TEST_TOURNAMENT_CONFIGS];
        this.db.query.mockImplementation((table: string) => {
            const queryResult = {
                withIndex: (indexName: string) => {
                    const indexResult = {
                        first: async () => {
                            if (table === "tournament_types") return config;
                            if (table === "players") return TEST_PLAYERS[0];
                            if (table === "seasons") return TEST_SEASONS[0];
                            if (table === "player_inventory") return TEST_INVENTORIES[0];
                            return null;
                        },
                        collect: async () => {
                            if (table === "tournament_types") return [config];
                            if (table === "players") return TEST_PLAYERS;
                            if (table === "seasons") return TEST_SEASONS;
                            if (table === "player_inventory") return TEST_INVENTORIES;
                            return [];
                        },
                        eq: (field: string, value: any) => indexResult,
                        filter: (callback: any) => indexResult,
                        order: (direction: string) => indexResult,
                        take: (limit: number) => indexResult
                    };
                    return indexResult;
                },
                filter: (callback: any) => queryResult,
                order: (direction: string) => queryResult,
                take: (limit: number) => queryResult
            };
            return queryResult;
        });
    }

    setupMockForInventory(playerId: string) {
        const inventory = TEST_INVENTORIES.find(i => i.uid === playerId) || TEST_INVENTORIES[0];
        this.db.query.mockImplementation((table: string) => {
            const queryResult = {
                withIndex: (indexName: string) => {
                    const indexResult = {
                        first: async () => {
                            if (table === "player_inventory") return inventory;
                            if (table === "players") return TEST_PLAYERS[0];
                            if (table === "seasons") return TEST_SEASONS[0];
                            if (table === "tournament_types") return TEST_TOURNAMENT_CONFIGS.daily_special;
                            return null;
                        },
                        collect: async () => {
                            if (table === "player_inventory") return [inventory];
                            if (table === "players") return TEST_PLAYERS;
                            if (table === "seasons") return TEST_SEASONS;
                            if (table === "tournament_types") return Object.values(TEST_TOURNAMENT_CONFIGS);
                            return [];
                        },
                        eq: (field: string, value: any) => indexResult,
                        filter: (callback: any) => indexResult,
                        order: (direction: string) => indexResult,
                        take: (limit: number) => indexResult
                    };
                    return indexResult;
                },
                filter: (callback: any) => queryResult,
                order: (direction: string) => queryResult,
                take: (limit: number) => queryResult
            };
            return queryResult;
        });
    }
}

// ==================== 测试工具函数 ====================

export class TournamentTestUtils {
    static createMockContext(): MockContext {
        return new MockContext();
    }

    static async runTest(testName: string, testFn: (ctx: MockContext) => Promise<void>) {
        console.log(`\n🧪 运行测试: ${testName}`);
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

    static mockMatchManager(ctx: MockContext) {
        const mockCreateMatch = jest().fn().mockResolvedValue('match1');
        const mockJoinMatch = jest().fn().mockResolvedValue('playerMatch1');
        const mockCreateRemoteGame = jest().fn().mockResolvedValue({
            gameId: 'game1',
            serverUrl: 'https://game-server.example.com',
            type: 'remote',
            success: true
        });
        const mockSubmitScore = jest().fn().mockResolvedValue({
            success: true,
            playerMatchId: 'playerMatch1',
            score: 1000
        });

        // 模拟模块导入
        const mockModule = {
            MatchManager: {
                createMatch: mockCreateMatch,
                joinMatch: mockJoinMatch,
                createRemoteGame: mockCreateRemoteGame,
                submitScore: mockSubmitScore
            }
        };

        return {
            createMatch: mockCreateMatch,
            joinMatch: mockJoinMatch,
            createRemoteGame: mockCreateRemoteGame,
            submitScore: mockSubmitScore,
            module: mockModule
        };
    }

    static mockTournamentMatchingService(ctx: MockContext) {
        const mockJoinTournamentMatch = jest().fn().mockResolvedValue({
            matchId: 'match1',
            playerMatchId: 'playerMatch1',
            gameId: 'game1',
            serverUrl: 'https://game-server.example.com',
            matchInfo: {
                status: 'matched',
                players: ['player1', 'player2', 'player3']
            }
        });

        const mockModule = {
            TournamentMatchingService: {
                joinTournamentMatch: mockJoinTournamentMatch
            }
        };

        return {
            joinTournamentMatch: mockJoinTournamentMatch,
            module: mockModule
        };
    }

    static mockRuleEngine(ctx: MockContext) {
        const mockDeductEntryFee = jest().fn().mockResolvedValue({
            method: "coins",
            amount: 50
        });
        const mockValidateLimits = jest().fn().mockResolvedValue(undefined);

        const mockModule = {
            deductEntryFee: mockDeductEntryFee,
            validateLimits: mockValidateLimits
        };

        return {
            deductEntryFee: mockDeductEntryFee,
            validateLimits: mockValidateLimits,
            module: mockModule
        };
    }

    static mockUnifiedPropManager(ctx: MockContext) {
        const mockExecuteDelayedDeduction = jest().fn().mockResolvedValue({
            deductionId: 'deduction1',
            success: true
        });
        const mockCancelDelayedDeduction = jest().fn().mockResolvedValue({
            success: true
        });

        const mockModule = {
            executeDelayedDeduction: mockExecuteDelayedDeduction,
            cancelDelayedDeduction: mockCancelDelayedDeduction
        };

        return {
            executeDelayedDeduction: mockExecuteDelayedDeduction,
            cancelDelayedDeduction: mockCancelDelayedDeduction,
            module: mockModule
        };
    }

    // ==================== 验证函数 ====================

    static validateJoinResult(result: any) {
        assertDefined(result, "结果应该存在");
        assertDefined(result.tournamentId, "锦标赛ID应该存在");
        assertDefined(result.matchId, "比赛ID应该存在");
        assertDefined(result.gameId, "游戏ID应该存在");
        assertDefined(result.serverUrl, "服务器URL应该存在");
        assertDefined(result.attemptNumber, "尝试次数应该存在");
    }

    static validateSubmitResult(result: any) {
        assertDefined(result, "结果应该存在");
        assertTrue(result.success, "提交应该成功");
        assertDefined(result.matchId, "比赛ID应该存在");
        assertDefined(result.score, "分数应该存在");
    }

    static validateSettleResult(result: any) {
        assertDefined(result, "结果应该存在");
        assertTrue(result.success, "结算应该成功");
        assertDefined(result.tournamentId, "锦标赛ID应该存在");
    }

    static validateDatabaseCall(ctx: MockContext, call: { type: 'insert' | 'patch' | 'query', table: string, data?: any, id?: string }) {
        if (call.type === 'insert') {
            expect(ctx.db.insert).toHaveBeenCalledWith(call.table, objectContaining(call.data));
        } else if (call.type === 'patch') {
            expect(ctx.db.patch).toHaveBeenCalledWith(call.id, objectContaining(call.data));
        } else if (call.type === 'query') {
            expect(ctx.db.query).toHaveBeenCalledWith(call.table);
        }
    }

    static validateError(error: any, expectedMessage: string) {
        assertTrue(error instanceof Error, "应该抛出Error实例");
        assertTrue((error as Error).message.includes(expectedMessage), `错误消息应该包含 "${expectedMessage}"`);
    }

    static validateLimitCheck(ctx: MockContext, limitCall: any[], expectedLimit: number) {
        assertTrue(limitCall[1].participationCount <= expectedLimit, "参与次数应该在限制范围内");
    }

    static validateRewardCalculation(calculatedReward: number, expectedReward: number) {
        assertEqual(calculatedReward, expectedReward, "奖励计算应该正确");
    }

    // ==================== 测试场景生成器 ====================

    static generateDailyLimitScenario() {
        return {
            name: "每日限制测试",
            setup: (ctx: MockContext) => {
                ctx.db.query.mockImplementation((table: string) => {
                    if (table === "player_tournament_limits") {
                        return {
                            withIndex: () => ({
                                first: async () => ({
                                    participationCount: 5,
                                    maxDailyParticipations: 3
                                })
                            })
                        };
                    }
                    return ctx.db.query(table);
                });
            },
            expectedError: "今日参与次数已达上限"
        };
    }

    static generateInsufficientCoinsScenario() {
        return {
            name: "金币不足测试",
            setup: (ctx: MockContext) => {
                ctx.db.query.mockImplementation((table: string) => {
                    if (table === "player_inventory") {
                        return {
                            withIndex: () => ({
                                first: async () => ({
                                    ...TEST_INVENTORIES[0],
                                    coins: 10 // 不足支付入场费
                                })
                            })
                        };
                    }
                    return ctx.db.query(table);
                });
            },
            expectedError: "金币或门票不足"
        };
    }

    static generateMultiPlayerMatchingScenario() {
        return {
            name: "多人匹配测试",
            setup: (ctx: MockContext) => {
                // 设置多人匹配的模拟数据
                ctx.db.query.mockImplementation((table: string) => {
                    if (table === "matches") {
                        return {
                            withIndex: () => ({
                                first: async () => ({
                                    _id: "match1",
                                    status: "pending",
                                    maxPlayers: 4,
                                    minPlayers: 2,
                                    currentPlayers: 1
                                })
                            })
                        };
                    }
                    return ctx.db.query(table);
                });
            },
            expectedResult: {
                matchId: "match1",
                status: "matched"
            }
        };
    }
}

// ==================== 测试场景生成器 ====================

export class TestScenarioGenerator {
    static generateDailyLimitScenario() {
        return {
            name: "每日限制测试",
            setup: (ctx: MockContext) => {
                ctx.db.query.mockImplementation((table: string) => {
                    if (table === "player_tournament_limits") {
                        return {
                            withIndex: () => ({
                                first: async () => ({
                                    participationCount: 5,
                                    maxDailyParticipations: 3
                                })
                            })
                        };
                    }
                    return ctx.db.query(table);
                });
            },
            expectedError: "今日参与次数已达上限"
        };
    }

    static generateInsufficientCoinsScenario() {
        return {
            name: "金币不足测试",
            setup: (ctx: MockContext) => {
                ctx.db.query.mockImplementation((table: string) => {
                    if (table === "player_inventory") {
                        return {
                            withIndex: () => ({
                                first: async () => ({
                                    ...TEST_INVENTORIES[0],
                                    coins: 10 // 不足支付入场费
                                })
                            })
                        };
                    }
                    return ctx.db.query(table);
                });
            },
            expectedError: "金币或门票不足"
        };
    }

    static generateMultiPlayerMatchingScenario() {
        return {
            name: "多人匹配测试",
            setup: (ctx: MockContext) => {
                // 设置多人匹配的模拟数据
                ctx.db.query.mockImplementation((table: string) => {
                    if (table === "matches") {
                        return {
                            withIndex: () => ({
                                first: async () => ({
                                    _id: "match1",
                                    status: "pending",
                                    maxPlayers: 4,
                                    minPlayers: 2,
                                    currentPlayers: 1
                                })
                            })
                        };
                    }
                    return ctx.db.query(table);
                });
            },
            expectedResult: {
                matchId: "match1",
                status: "matched"
            }
        };
    }
} 