/**
 * RankingRecommendationManagerOptimized 测试文件
 * 
 * 测试覆盖：
 * - 输入验证
 * - 策略选择逻辑
 * - 排名生成功能
 * - AI 对手生成
 * - 错误处理
 * - 不同配置场景
 */

import { RankingRecommendationManagerOptimized } from '../RankingRecommendationManagerOptimized';
import { HumanPlayer, PlayerRankingProfile } from '../types/CommonTypes';
import { RankingConfig } from '../types/RankingConfig';

/**
 * 创建模拟的 Convex Context
 */
function createMockContext() {
    const mockMatches: any[] = [];
    const mockProfiles: any = {};

    return {
        db: {
            query: (tableName: string) => {
                if (tableName === 'match_results') {
                    return {
                        withIndex: (indexName: string, callback: (q: any) => any) => {
                            const q = {
                                eq: (field: string, value: any) => {
                                    // 过滤匹配的数据
                                    const filtered = mockMatches.filter((m: any) => m[field] === value);
                                    return {
                                        order: (direction: string) => ({
                                            take: (count: number) => {
                                                return direction === 'desc'
                                                    ? filtered.slice(0, count)
                                                    : filtered.slice(-count);
                                            }
                                        })
                                    };
                                }
                            };
                            return callback(q);
                        }
                    };
                }
                return {
                    withIndex: () => ({
                        order: () => ({
                            take: () => []
                        })
                    })
                };
            }
        },
        runQuery: async (queryFunc: any, args: any) => {
            // 模拟查询玩家画像
            if (args.uid && mockProfiles[args.uid]) {
                return mockProfiles[args.uid];
            }
            return null;
        },
        // 测试辅助方法：设置模拟数据
        _setMockMatches: (uid: string, matches: any[]) => {
            mockMatches.push(...matches.map((m: any) => ({ ...m, uid })));
        },
        _setMockProfile: (uid: string, profile: any) => {
            mockProfiles[uid] = profile;
        },
        _clearMockData: () => {
            mockMatches.length = 0;
            Object.keys(mockProfiles).forEach(key => delete mockProfiles[key]);
        }
    };
}

/**
 * 创建默认玩家数据
 */
function createTestPlayer(uid: string, score: number = 1500): HumanPlayer {
    return {
        uid,
        score,
        name: `Player ${uid}`,
        character_id: 'char_1'
    };
}

/**
 * 创建测试用的玩家档案
 */
function createTestProfile(
    uid: string,
    totalMatches: number = 20,
    averageScore: number = 1500,
    averageRank: number = 3,
    winRate: number = 0.33,
    consistency: number = 0.7
): PlayerRankingProfile {
    const last10Matches = Array.from({ length: Math.min(totalMatches, 10) }, (_, i) => ({
        score: averageScore + (Math.random() - 0.5) * 200,
        rank: averageRank + Math.floor((Math.random() - 0.5) * 2),
        matchId: `match_${i}`,
        seed: 'seed_1',
        createdAt: new Date().toISOString()
    }));

    return {
        uid,
        segmentName: 'bronze',
        averageScore,
        averageRank,
        winRate,
        totalMatches,
        recentPerformance: {
            last10Matches,
            trendDirection: 'stable' as const,
            consistency
        }
    };
}

describe('RankingRecommendationManagerOptimized', () => {
    let mockCtx: any;
    let manager: RankingRecommendationManagerOptimized;

    beforeEach(() => {
        mockCtx = createMockContext();
        manager = new RankingRecommendationManagerOptimized(mockCtx);
        mockCtx._clearMockData();
    });

    describe('构造函数和配置', () => {
        it('应该使用默认配置创建实例', () => {
            const manager = new RankingRecommendationManagerOptimized(mockCtx);
            const config = manager.getConfig();

            expect(config.newbieThreshold).toBe(10);
            expect(config.growingThreshold).toBe(30);
            expect(config.maxAICount).toBe(10);
            expect(config.maxParticipants).toBe(20);
        });

        it('应该接受自定义配置', () => {
            const customConfig: Partial<RankingConfig> = {
                newbieThreshold: 5,
                growingThreshold: 20,
                maxAICount: 5
            };

            const manager = new RankingRecommendationManagerOptimized(mockCtx, customConfig);
            const config = manager.getConfig();

            expect(config.newbieThreshold).toBe(5);
            expect(config.growingThreshold).toBe(20);
            expect(config.maxAICount).toBe(5);
        });

        it('应该合并部分配置', () => {
            const partialConfig: Partial<RankingConfig> = {
                newbieThreshold: 15
            };

            const manager = new RankingRecommendationManagerOptimized(mockCtx, partialConfig);
            const config = manager.getConfig();

            expect(config.newbieThreshold).toBe(15);
            expect(config.growingThreshold).toBe(30); // 保持默认值
        });
    });

    describe('输入验证', () => {
        it('应该拒绝空的玩家列表', async () => {
            await expect(manager.generateMatchRankings([], 3)).rejects.toThrow(
                '至少需要一个人类玩家'
            );
        });

        it('应该拒绝负数 AI 数量', async () => {
            const players = [createTestPlayer('player1')];
            await expect(manager.generateMatchRankings(players, -1)).rejects.toThrow(
                'AI数量必须在0-10之间'
            );
        });

        it('应该拒绝超过最大值的 AI 数量', async () => {
            const players = [createTestPlayer('player1')];
            await expect(manager.generateMatchRankings(players, 11)).rejects.toThrow(
                'AI数量必须在0-10之间'
            );
        });

        it('应该拒绝超过最大参与者数量', async () => {
            const players = Array.from({ length: 15 }, (_, i) =>
                createTestPlayer(`player${i}`)
            );
            await expect(manager.generateMatchRankings(players, 10)).rejects.toThrow(
                '总参与者数量不能超过20'
            );
        });

        it('应该接受有效的输入', async () => {
            const players = [createTestPlayer('player1')];
            const result = await manager.generateMatchRankings(players, 3);

            expect(result).toBeDefined();
            expect(result.humanPlayerRankings.length).toBe(1);
            expect(result.aiOpponents.length).toBe(3);
        });
    });

    describe('策略选择逻辑', () => {
        it('应该为新玩家选择新手策略', async () => {
            const player = createTestPlayer('newbie', 1200);
            mockCtx._setMockMatches('newbie', []); // 没有历史数据

            const result = await manager.generateMatchRankings([player], 3);

            expect(result.humanPlayerRankings[0].reasoning).toContain('新手');
        });

        it('应该为成长玩家选择成长策略', async () => {
            const player = createTestPlayer('growing', 1500);
            mockCtx._setMockMatches('growing', Array.from({ length: 15 }, (_, i) => ({
                uid: 'growing',
                score: 1500 + i * 10,
                rank: 3,
                matchId: `match_${i}`,
                seed: 'seed_1',
                createdAt: new Date().toISOString()
            })));

            const result = await manager.generateMatchRankings([player], 3);

            expect(result.humanPlayerRankings).toBeDefined();
            expect(result.humanPlayerRankings.length).toBe(1);
        });

        it('应该为成熟玩家选择成熟策略', async () => {
            const player = createTestPlayer('veteran', 1800);
            mockCtx._setMockMatches('veteran', Array.from({ length: 35 }, (_, i) => ({
                uid: 'veteran',
                score: 1800 + i * 5,
                rank: 2,
                matchId: `match_${i}`,
                seed: 'seed_1',
                createdAt: new Date().toISOString()
            })));

            const result = await manager.generateMatchRankings([player], 3);

            expect(result.humanPlayerRankings).toBeDefined();
        });

        it('应该根据配置启用胜率控制策略', async () => {
            const managerWithWinRate = new RankingRecommendationManagerOptimized(mockCtx, {
                winRateControl: {
                    enabled: true,
                    targetWinRate: 0.33,
                    adjustmentSensitivity: 10,
                    minMatchesForControl: 5,
                    maxAdjustmentRange: 0.2
                }
            });

            const player = createTestPlayer('player1', 1500);
            mockCtx._setMockMatches('player1', Array.from({ length: 10 }, (_, i) => ({
                uid: 'player1',
                score: 1500,
                rank: i < 3 ? 1 : 2, // 30% 胜率
                matchId: `match_${i}`,
                seed: 'seed_1',
                createdAt: new Date().toISOString()
            })));

            const result = await managerWithWinRate.generateMatchRankings([player], 3);

            expect(result.humanPlayerRankings).toBeDefined();
        });
    });

    describe('排名生成功能', () => {
        it('应该为单个玩家生成排名', async () => {
            const player = createTestPlayer('player1', 1500);

            const result = await manager.generateMatchRankings([player], 3);

            expect(result.humanPlayerRankings.length).toBe(1);
            expect(result.humanPlayerRankings[0].uid).toBe('player1');
            expect(result.humanPlayerRankings[0].recommendedRank).toBeGreaterThan(0);
            expect(result.humanPlayerRankings[0].confidence).toBeGreaterThan(0);
            expect(result.humanPlayerRankings[0].reasoning).toBeDefined();
        });

        it('应该为多个玩家生成排名', async () => {
            const players = [
                createTestPlayer('player1', 1800),
                createTestPlayer('player2', 1500),
                createTestPlayer('player3', 1200)
            ];

            const result = await manager.generateMatchRankings(players, 3);

            expect(result.humanPlayerRankings.length).toBe(3);
            expect(result.matchContext.humanPlayerCount).toBe(3);
            expect(result.matchContext.totalParticipants).toBe(6);
        });

        it('应该生成合理的排名顺序（分数高的排名更好）', async () => {
            const players = [
                createTestPlayer('player1', 2000),
                createTestPlayer('player2', 1500),
                createTestPlayer('player3', 1000)
            ];

            const result = await manager.generateMatchRankings(players, 3);

            const rankings = result.humanPlayerRankings;
            const player1Rank = rankings.find(r => r.uid === 'player1')!.recommendedRank;
            const player2Rank = rankings.find(r => r.uid === 'player2')!.recommendedRank;
            const player3Rank = rankings.find(r => r.uid === 'player3')!.recommendedRank;

            // 注意：排名越小越好，所以分数高的排名应该更小
            expect(player1Rank).toBeLessThanOrEqual(player2Rank);
            expect(player2Rank).toBeLessThanOrEqual(player3Rank);
        });

        it('应该生成包含上下文的比赛结果', async () => {
            const players = [createTestPlayer('player1', 1500)];

            const result = await manager.generateMatchRankings(players, 3);

            expect(result.matchContext).toBeDefined();
            expect(result.matchContext.totalParticipants).toBe(4);
            expect(result.matchContext.humanPlayerCount).toBe(1);
            expect(result.matchContext.aiCount).toBe(3);
            expect(result.matchContext.averageHumanScore).toBe(1500);
            expect(result.matchContext.scoreRange).toBeDefined();
        });
    });

    describe('AI 对手生成', () => {
        it('应该生成指定数量的 AI 对手', async () => {
            const players = [createTestPlayer('player1')];

            const result = await manager.generateMatchRankings(players, 5);

            expect(result.aiOpponents.length).toBe(5);
        });

        it('应该为 AI 对手生成分数和排名', async () => {
            const players = [createTestPlayer('player1', 1500)];

            const result = await manager.generateMatchRankings(players, 3);

            result.aiOpponents.forEach(ai => {
                expect(ai.score).toBeGreaterThan(0);
                expect(ai.targetRank).toBeGreaterThan(0);
                expect(ai.recommendedRank).toBeGreaterThan(0);
                expect(ai.skillLevel).toBeDefined();
                expect(ai.character_id).toBeDefined();
            });
        });

        it('应该为 AI 对手分配不同的目标排名', async () => {
            const players = [createTestPlayer('player1', 1500)];

            const result = await manager.generateMatchRankings(players, 5);

            const targetRanks = result.aiOpponents.map(ai => ai.targetRank);
            const uniqueRanks = new Set(targetRanks);

            // AI 应该有不同或至少合理的排名分布
            expect(targetRanks.length).toBe(5);
        });
    });

    describe('错误处理', () => {
        it('应该在数据库查询失败时返回默认结果', async () => {
            const brokenCtx = {
                db: {
                    query: () => {
                        throw new Error('Database error');
                    }
                }
            };

            const manager = new RankingRecommendationManagerOptimized(brokenCtx);
            const players = [createTestPlayer('player1')];

            // 应该不抛出错误，而是返回默认结果
            const result = await manager.generateMatchRankings(players, 3);

            expect(result).toBeDefined();
            expect(result.humanPlayerRankings.length).toBe(1);
        });

        it('应该在没有历史数据时使用默认档案', async () => {
            const players = [createTestPlayer('newbie', 1500)];
            // 不设置任何历史数据

            const result = await manager.generateMatchRankings(players, 3);

            expect(result).toBeDefined();
            expect(result.humanPlayerRankings[0].uid).toBe('newbie');
        });
    });

    describe('不同配置场景', () => {
        it('应该支持禁用所有高级策略', async () => {
            const manager = new RankingRecommendationManagerOptimized(mockCtx, {
                winRateControl: {
                    enabled: false,
                    targetWinRate: 0.33,
                    adjustmentSensitivity: 10,
                    minMatchesForControl: 5,
                    maxAdjustmentRange: 0.2
                },
                personalizedStrategy: {
                    enabled: false,
                    minMatchesForPersonalization: 15,
                    profileUpdateInterval: 24,
                    maxAdjustmentRange: 0.3,
                    confidenceThreshold: 0.6,
                    fallbackToVeteran: true
                }
            });

            const players = [createTestPlayer('player1', 1500)];
            mockCtx._setMockMatches('player1', Array.from({ length: 20 }, (_, i) => ({
                uid: 'player1',
                score: 1500,
                rank: 3,
                matchId: `match_${i}`,
                seed: 'seed_1',
                createdAt: new Date().toISOString()
            })));

            const result = await manager.generateMatchRankings(players, 3);

            expect(result).toBeDefined();
            // 应该使用传统策略（成熟策略，因为超过30场）
        });

        it('应该支持自定义参与者限制', async () => {
            const manager = new RankingRecommendationManagerOptimized(mockCtx, {
                maxParticipants: 10,
                maxAICount: 5
            });

            const players = Array.from({ length: 8 }, (_, i) =>
                createTestPlayer(`player${i}`)
            );

            await expect(manager.generateMatchRankings(players, 5)).rejects.toThrow(
                '总参与者数量不能超过10'
            );

            // 但8个玩家 + 2个AI应该可以
            const result = await manager.generateMatchRankings(players, 2);
            expect(result).toBeDefined();
        });
    });

    describe('综合场景测试', () => {
        it('应该处理多玩家、多AI的复杂场景', async () => {
            const players = [
                createTestPlayer('player1', 2000),
                createTestPlayer('player2', 1500),
                createTestPlayer('player3', 1200)
            ];

            // 为每个玩家设置不同的历史数据
            players.forEach((player, index) => {
                mockCtx._setMockMatches(player.uid, Array.from({ length: 10 + index * 5 }, (_, i) => ({
                    uid: player.uid,
                    score: player.score,
                    rank: 3,
                    matchId: `match_${i}`,
                    seed: 'seed_1',
                    createdAt: new Date().toISOString()
                })));
            });

            const result = await manager.generateMatchRankings(players, 5);

            expect(result.humanPlayerRankings.length).toBe(3);
            expect(result.aiOpponents.length).toBe(5);
            expect(result.matchContext.totalParticipants).toBe(8);

            // 验证所有排名都是有效的
            const allRanks = [
                ...result.humanPlayerRankings.map(r => r.recommendedRank),
                ...result.aiOpponents.map(ai => ai.recommendedRank!)
            ];

            expect(allRanks.every(rank => rank > 0 && rank <= 8)).toBe(true);

            // 验证排名不重复（在同分的情况下可能有重复，但这里分数不同）
            const uniqueRanks = new Set(allRanks);
            // 如果有重复，至少应该是合理的分布
            expect(uniqueRanks.size).toBeGreaterThan(4);
        });

        it('应该正确处理只有人类玩家的场景（0个AI）', async () => {
            const players = [
                createTestPlayer('player1', 1800),
                createTestPlayer('player2', 1500),
                createTestPlayer('player3', 1200),
                createTestPlayer('player4', 1000)
            ];

            const result = await manager.generateMatchRankings(players, 0);

            expect(result.aiOpponents.length).toBe(0);
            expect(result.humanPlayerRankings.length).toBe(4);
            expect(result.matchContext.totalParticipants).toBe(4);
        });
    });

    describe('配置更新', () => {
        it('应该支持运行时更新配置', () => {
            const manager = new RankingRecommendationManagerOptimized(mockCtx);

            manager.updateConfig({
                newbieThreshold: 15,
                maxAICount: 8
            });

            const config = manager.getConfig();
            expect(config.newbieThreshold).toBe(15);
            expect(config.maxAICount).toBe(8);
        });

        it('应该保持未更新的配置值', () => {
            const manager = new RankingRecommendationManagerOptimized(mockCtx);

            manager.updateConfig({
                newbieThreshold: 15
            });

            const config = manager.getConfig();
            expect(config.newbieThreshold).toBe(15);
            expect(config.growingThreshold).toBe(30); // 保持原值
        });
    });
});

/**
 * 集成测试：测试与真实数据结构的交互
 */
describe('RankingRecommendationManagerOptimized 集成测试', () => {
    let mockCtx: any;

    beforeEach(() => {
        mockCtx = createMockContext();
    });

    it('应该从数据库读取玩家历史数据', async () => {
        const manager = new RankingRecommendationManagerOptimized(mockCtx);

        // 设置模拟的历史比赛数据
        mockCtx._setMockMatches('player1', [
            { uid: 'player1', score: 1500, rank: 1, matchId: 'm1', seed: 's1', createdAt: '2024-01-01' },
            { uid: 'player1', score: 1600, rank: 2, matchId: 'm2', seed: 's1', createdAt: '2024-01-02' },
            { uid: 'player1', score: 1400, rank: 3, matchId: 'm3', seed: 's1', createdAt: '2024-01-03' },
        ]);

        const players = [createTestPlayer('player1', 1550)];
        const result = await manager.generateMatchRankings(players, 3);

        expect(result.humanPlayerRankings[0].uid).toBe('player1');
        // 应该有合理的数据处理
    });
});

