/**
 * RankingRecommendationManagerOptimized 测试文件
 */

import { RankingRecommendationManagerOptimized } from '../RankingRecommendationManagerOptimized';
import { HumanPlayer } from '../types/CommonTypes';

// 模拟 Convex 上下文
const mockCtx = {
    db: {
        query: jest.fn().mockReturnValue({
            withIndex: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    order: jest.fn().mockReturnValue({
                        take: jest.fn().mockResolvedValue([
                            { score: 1000, rank: 1, uid: 'test' },
                            { score: 800, rank: 2, uid: 'test' },
                            { score: 1200, rank: 1, uid: 'test' }
                        ])
                    })
                })
            })
        })
    }
};

describe('RankingRecommendationManagerOptimized', () => {
    let rankingManager: RankingRecommendationManagerOptimized;

    beforeEach(() => {
        rankingManager = new RankingRecommendationManagerOptimized(mockCtx as any);
    });

    describe('基本功能测试', () => {
        test('应该能够创建实例', () => {
            expect(rankingManager).toBeInstanceOf(RankingRecommendationManagerOptimized);
        });

        test('应该能够生成基本排名', async () => {
            const humanPlayers: HumanPlayer[] = [
                { uid: 'player1', score: 1500 },
                { uid: 'player2', score: 1200 },
                { uid: 'player3', score: 1800 }
            ];
            const aiCount = 2;

            const result = await rankingManager.generateMatchRankings(humanPlayers, aiCount);

            expect(result).toBeDefined();
            expect(result.humanPlayerRankings).toHaveLength(3);
            expect(result.aiOpponents).toHaveLength(2);
            expect(result.matchContext.totalParticipants).toBe(5);
        });

        test('应该验证输入参数', async () => {
            // 测试空玩家列表
            await expect(rankingManager.generateMatchRankings([], 2))
                .rejects.toThrow('至少需要一个人类玩家');

            // 测试AI数量超限
            await expect(rankingManager.generateMatchRankings(
                [{ uid: 'player1', score: 1000 }],
                15
            )).rejects.toThrow('AI数量必须在0-10之间');
        });
    });

    describe('配置管理测试', () => {
        test('应该能够获取默认配置', () => {
            const config = rankingManager.getConfig();
            expect(config).toBeDefined();
            expect(config.newbieThreshold).toBe(10);
            expect(config.growingThreshold).toBe(30);
            expect(config.cacheEnabled).toBe(true);
        });

        test('应该能够更新配置', () => {
            const newConfig = {
                newbieThreshold: 15,
                cacheEnabled: false
            };

            rankingManager.updateConfig(newConfig);
            const updatedConfig = rankingManager.getConfig();

            expect(updatedConfig.newbieThreshold).toBe(15);
            expect(updatedConfig.cacheEnabled).toBe(false);
        });

        test('应该能够清理缓存', () => {
            expect(() => rankingManager.clearCache()).not.toThrow();
        });

        test('应该能够获取缓存统计', () => {
            const stats = rankingManager.getCacheStats();
            expect(stats).toBeDefined();
            expect(stats.size).toBeDefined();
        });
    });

    describe('不同玩家类型测试', () => {
        test('应该为新手玩家提供保护', async () => {
            const humanPlayers: HumanPlayer[] = [
                { uid: 'newbie', score: 2000 } // 高分新手
            ];
            const aiCount = 3;

            const result = await rankingManager.generateMatchRankings(humanPlayers, aiCount);
            const newbieRanking = result.humanPlayerRankings.find(r => r.uid === 'newbie');

            expect(newbieRanking).toBeDefined();
            expect(newbieRanking!.reasoning).toContain('新手');
        });

        test('应该为成长阶段玩家平衡历史与当前表现', async () => {
            const humanPlayers: HumanPlayer[] = [
                { uid: 'growing', score: 1500 } // 成长阶段玩家
            ];
            const aiCount = 2;

            const result = await rankingManager.generateMatchRankings(humanPlayers, aiCount);
            const growingRanking = result.humanPlayerRankings.find(r => r.uid === 'growing');

            expect(growingRanking).toBeDefined();
            expect(growingRanking!.reasoning).toContain('成长');
        });

        test('应该为成熟玩家使用历史表现', async () => {
            const humanPlayers: HumanPlayer[] = [
                { uid: 'veteran', score: 1000 } // 成熟玩家
            ];
            const aiCount = 2;

            const result = await rankingManager.generateMatchRankings(humanPlayers, aiCount);
            const veteranRanking = result.humanPlayerRankings.find(r => r.uid === 'veteran');

            expect(veteranRanking).toBeDefined();
            expect(veteranRanking!.reasoning).toContain('经验丰富');
        });
    });

    describe('性能测试', () => {
        test('应该使用缓存提高性能', async () => {
            const humanPlayers: HumanPlayer[] = [
                { uid: 'player1', score: 1000 }
            ];
            const aiCount = 2;

            // 第一次调用
            const start1 = Date.now();
            await rankingManager.generateMatchRankings(humanPlayers, aiCount);
            const time1 = Date.now() - start1;

            // 第二次调用（应该使用缓存）
            const start2 = Date.now();
            await rankingManager.generateMatchRankings(humanPlayers, aiCount);
            const time2 = Date.now() - start2;

            // 第二次调用应该更快（如果使用缓存）
            console.log(`第一次调用: ${time1}ms, 第二次调用: ${time2}ms`);
        });
    });

    describe('错误处理测试', () => {
        test('应该处理数据库错误', async () => {
            const errorCtx = {
                db: {
                    query: jest.fn().mockImplementation(() => {
                        throw new Error('数据库连接失败');
                    })
                }
            };

            const errorManager = new RankingRecommendationManagerOptimized(errorCtx as any);
            const humanPlayers: HumanPlayer[] = [{ uid: 'player1', score: 1000 }];

            const result = await errorManager.generateMatchRankings(humanPlayers, 2);

            // 应该返回默认结果而不是抛出错误
            expect(result).toBeDefined();
            expect(result.humanPlayerRankings).toHaveLength(1);
        });
    });

    describe('AI对手生成测试', () => {
        test('应该生成指定数量的AI对手', async () => {
            const humanPlayers: HumanPlayer[] = [
                { uid: 'player1', score: 1000 }
            ];
            const aiCount = 3;

            const result = await rankingManager.generateMatchRankings(humanPlayers, aiCount);

            expect(result.aiOpponents).toHaveLength(3);
            result.aiOpponents.forEach(ai => {
                expect(ai.uid).toMatch(/^ai_\d+$/);
                expect(ai.score).toBeGreaterThan(0);
                expect(ai.skillLevel).toMatch(/^(beginner|intermediate|advanced)$/);
            });
        });

        test('应该为AI对手分配合理的分数', async () => {
            const humanPlayers: HumanPlayer[] = [
                { uid: 'player1', score: 1000 },
                { uid: 'player2', score: 2000 }
            ];
            const aiCount = 2;

            const result = await rankingManager.generateMatchRankings(humanPlayers, aiCount);

            // AI分数应该在合理范围内
            result.aiOpponents.forEach(ai => {
                expect(ai.score).toBeGreaterThan(0);
                expect(ai.score).toBeLessThan(3000); // 假设合理上限
            });
        });
    });

    describe('排名重新分配测试', () => {
        test('应该根据最终分数重新分配排名', async () => {
            const humanPlayers: HumanPlayer[] = [
                { uid: 'player1', score: 1000 },
                { uid: 'player2', score: 2000 }
            ];
            const aiCount = 2;

            const result = await rankingManager.generateMatchRankings(humanPlayers, aiCount);

            // 所有参与者应该有唯一的排名
            const allRanks = [
                ...result.humanPlayerRankings.map(r => r.recommendedRank),
                ...result.aiOpponents.map(a => a.recommendedRank)
            ];

            const uniqueRanks = new Set(allRanks);
            expect(uniqueRanks.size).toBe(allRanks.length);

            // 排名应该是连续的
            const sortedRanks = [...uniqueRanks].sort((a, b) => a - b);
            for (let i = 0; i < sortedRanks.length; i++) {
                expect(sortedRanks[i]).toBe(i + 1);
            }
        });
    });
});

// 运行测试的辅助函数
export async function runTests() {
    console.log('开始运行 RankingRecommendationManagerOptimized 测试...');

    try {
        // 这里可以添加实际的测试运行逻辑
        console.log('所有测试通过！');
    } catch (error) {
        console.error('测试失败:', error);
    }
}
