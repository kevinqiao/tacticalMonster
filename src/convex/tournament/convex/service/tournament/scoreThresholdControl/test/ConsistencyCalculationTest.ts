/**
 * 一致性计算测试
 * 测试改进后的 calculateConsistency 方法的各种场景
 */

import { RankingRecommendationManager } from '../managers/RankingRecommendationManager';

/**
 * 模拟数据库上下文
 */
class MockDatabaseContext {
    db = {
        query: () => ({
            withIndex: () => ({
                order: () => ({
                    take: () => Promise.resolve([])
                })
            })
        })
    };
}

/**
 * 一致性计算测试套件
 */
export class ConsistencyCalculationTestSuite {
    private mockCtx: MockDatabaseContext;
    private rankingManager: RankingRecommendationManager;

    constructor() {
        this.mockCtx = new MockDatabaseContext();
        this.rankingManager = new RankingRecommendationManager(this.mockCtx);
    }

    /**
     * 运行所有一致性测试
     */
    async runAllConsistencyTests(): Promise<void> {
        console.log('🧪 开始一致性计算测试...\n');

        // 基础功能测试
        await this.testHighConsistency();
        await this.testLowConsistency();
        await this.testMediumConsistency();

        // 边界条件测试
        await this.testEdgeCases();
        await this.testInvalidData();
        await this.testSmallDataset();

        // 时间权重测试
        await this.testTimeWeighting();

        // 分数范围调整测试
        await this.testRangeAdjustment();

        console.log('✅ 所有一致性测试完成！');
    }

    /**
     * 测试高一致性场景
     */
    private async testHighConsistency(): Promise<void> {
        console.log('=== 测试1: 高一致性场景 ===');

        // 通过反射访问私有方法进行测试
        const consistency = this.callPrivateMethod('calculateConsistency', [
            [1000, 1020, 980, 1010, 990, 1005, 995, 1015, 985, 1008]
        ]);

        console.log(`✅ 高一致性分数: ${consistency.toFixed(3)}`);
        console.log('   分数: [1000, 1020, 980, 1010, 990, 1005, 995, 1015, 985, 1008]');
        console.log('   预期: 接近1.0（高一致性）');

        this.assert(consistency > 0.8, '高一致性分数应该大于0.8');
        this.assert(consistency <= 1.0, '一致性分数不应超过1.0');
        console.log('');
    }

    /**
     * 测试低一致性场景
     */
    private async testLowConsistency(): Promise<void> {
        console.log('=== 测试2: 低一致性场景 ===');

        const consistency = this.callPrivateMethod('calculateConsistency', [
            [500, 1500, 800, 1200, 300, 1800, 200, 1600, 400, 1400]
        ]);

        console.log(`✅ 低一致性分数: ${consistency.toFixed(3)}`);
        console.log('   分数: [500, 1500, 800, 1200, 300, 1800, 200, 1600, 400, 1400]');
        console.log('   预期: 接近0.0（低一致性）');

        this.assert(consistency < 0.5, '低一致性分数应该小于0.5');
        this.assert(consistency >= 0.0, '一致性分数不应小于0.0');
        console.log('');
    }

    /**
     * 测试中等一致性场景
     */
    private async testMediumConsistency(): Promise<void> {
        console.log('=== 测试3: 中等一致性场景 ===');

        const consistency = this.callPrivateMethod('calculateConsistency', [
            [800, 900, 850, 920, 880, 870, 910, 860, 890, 840]
        ]);

        console.log(`✅ 中等一致性分数: ${consistency.toFixed(3)}`);
        console.log('   分数: [800, 900, 850, 920, 880, 870, 910, 860, 890, 840]');
        console.log('   预期: 0.5-0.8之间（中等一致性）');

        this.assert(consistency >= 0.5, '中等一致性分数应该大于等于0.5');
        this.assert(consistency <= 0.8, '中等一致性分数应该小于等于0.8');
        console.log('');
    }

    /**
     * 测试边界条件
     */
    private async testEdgeCases(): Promise<void> {
        console.log('=== 测试4: 边界条件 ===');

        // 测试平均分为0的情况
        const consistency1 = this.callPrivateMethod('calculateConsistency', [
            [0, 0, 0, 0, 0]
        ]);
        console.log(`✅ 全零分数一致性: ${consistency1.toFixed(3)} (应为0.5)`);
        this.assert(consistency1 === 0.5, '全零分数应返回0.5');

        // 测试相同分数
        const consistency2 = this.callPrivateMethod('calculateConsistency', [
            [1000, 1000, 1000, 1000, 1000]
        ]);
        console.log(`✅ 相同分数一致性: ${consistency2.toFixed(3)} (应为1.0)`);
        this.assert(consistency2 === 1.0, '相同分数应返回1.0');

        // 测试极大分数
        const consistency3 = this.callPrivateMethod('calculateConsistency', [
            [100000, 100100, 99900, 100050, 99950]
        ]);
        console.log(`✅ 极大分数一致性: ${consistency3.toFixed(3)}`);
        this.assert(consistency3 > 0.8, '极大分数的一致性应该很高');

        console.log('');
    }

    /**
     * 测试无效数据
     */
    private async testInvalidData(): Promise<void> {
        console.log('=== 测试5: 无效数据处理 ===');

        // 测试包含NaN的分数
        const consistency1 = this.callPrivateMethod('calculateConsistency', [
            [1000, NaN, 980, 1010, 990]
        ]);
        console.log(`✅ 包含NaN的一致性: ${consistency1.toFixed(3)}`);
        this.assert(consistency1 > 0.8, '过滤NaN后应该计算正确');

        // 测试包含负数的分数
        const consistency2 = this.callPrivateMethod('calculateConsistency', [
            [1000, -100, 980, 1010, 990]
        ]);
        console.log(`✅ 包含负数的一致性: ${consistency2.toFixed(3)}`);
        this.assert(consistency2 > 0.8, '过滤负数后应该计算正确');

        // 测试数据不足
        const consistency3 = this.callPrivateMethod('calculateConsistency', [
            [1000, 980]
        ]);
        console.log(`✅ 数据不足的一致性: ${consistency3.toFixed(3)} (应为0.5)`);
        this.assert(consistency3 === 0.5, '数据不足应返回0.5');

        console.log('');
    }

    /**
     * 测试小数据集
     */
    private async testSmallDataset(): Promise<void> {
        console.log('=== 测试6: 小数据集 ===');

        // 测试最小有效数据集
        const consistency = this.callPrivateMethod('calculateConsistency', [
            [1000, 1020, 980]
        ]);

        console.log(`✅ 最小数据集一致性: ${consistency.toFixed(3)}`);
        console.log('   分数: [1000, 1020, 980]');
        console.log('   预期: 合理的一致性分数');

        this.assert(consistency >= 0.0, '一致性分数不应小于0.0');
        this.assert(consistency <= 1.0, '一致性分数不应大于1.0');
        console.log('');
    }

    /**
     * 测试时间权重效果
     */
    private async testTimeWeighting(): Promise<void> {
        console.log('=== 测试7: 时间权重效果 ===');

        // 测试最近表现更好的一致性
        const consistency1 = this.callPrivateMethod('calculateConsistency', [
            [500, 500, 500, 500, 1000, 1000, 1000, 1000, 1000, 1000] // 最近表现更好
        ]);

        // 测试最近表现更差的一致性
        const consistency2 = this.callPrivateMethod('calculateConsistency', [
            [1000, 1000, 1000, 1000, 1000, 1000, 500, 500, 500, 500] // 最近表现更差
        ]);

        console.log(`✅ 最近表现更好的一致性: ${consistency1.toFixed(3)}`);
        console.log(`✅ 最近表现更差的一致性: ${consistency2.toFixed(3)}`);
        console.log('   预期: 最近表现更好的应该有一致性奖励');

        // 注意：由于时间权重的影响，这两个值可能不同
        console.log('');
    }

    /**
     * 测试分数范围调整
     */
    private async testRangeAdjustment(): Promise<void> {
        console.log('=== 测试8: 分数范围调整 ===');

        // 测试分数范围很小的情况（应该获得奖励）
        const consistency1 = this.callPrivateMethod('calculateConsistency', [
            [1000, 1005, 995, 1002, 998, 1001, 999, 1003, 997, 1004]
        ]);

        // 测试分数范围很大的情况（应该获得惩罚）
        const consistency2 = this.callPrivateMethod('calculateConsistency', [
            [1000, 2000, 500, 1500, 800, 1200, 300, 1800, 600, 1400]
        ]);

        console.log(`✅ 小范围分数一致性: ${consistency1.toFixed(3)}`);
        console.log(`✅ 大范围分数一致性: ${consistency2.toFixed(3)}`);
        console.log('   预期: 小范围分数应该获得一致性奖励');

        this.assert(consistency1 > 0.8, '小范围分数应该有一致性奖励');
        this.assert(consistency2 < 0.5, '大范围分数应该有一致性惩罚');
        console.log('');
    }

    /**
     * 通过反射调用私有方法
     */
    private callPrivateMethod(methodName: string, args: any[]): any {
        const method = (this.rankingManager as any)[methodName];
        if (typeof method === 'function') {
            return method.apply(this.rankingManager, args);
        }
        throw new Error(`Method ${methodName} not found`);
    }

    /**
     * 断言工具
     */
    private assert(condition: boolean, message: string): void {
        if (!condition) {
            throw new Error(`断言失败: ${message}`);
        }
    }
}

/**
 * 运行一致性测试的主函数
 */
export async function runConsistencyTests(): Promise<void> {
    const testSuite = new ConsistencyCalculationTestSuite();

    try {
        await testSuite.runAllConsistencyTests();
        console.log('🎉 所有一致性计算测试通过！');
    } catch (error) {
        console.error('💥 测试过程中出现错误:', error);
    }
}

// 如果直接运行此文件，执行测试
// if (require.main === module) {
//     runConsistencyTests();
// }
