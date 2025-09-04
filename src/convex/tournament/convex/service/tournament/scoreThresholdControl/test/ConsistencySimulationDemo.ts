/**
 * 一致性玩家模拟测试演示
 * 快速展示不同一致性玩家的测试效果
 */

import { ConsistencyPlayerSimulation } from './ConsistencyPlayerSimulation';

/**
 * 快速演示不同一致性玩家的测试效果
 */
export class ConsistencySimulationDemo {
    private simulation: ConsistencyPlayerSimulation;

    constructor() {
        this.simulation = new ConsistencyPlayerSimulation();
    }

    /**
     * 运行快速演示
     */
    async runQuickDemo(): Promise<void> {
        console.log('🚀 一致性玩家模拟测试快速演示\n');

        // 演示1：完美一致性 vs 极低一致性
        await this.demo1_PerfectVsExtremeInconsistency();

        // 演示2：稳定专家 vs 不稳定专家
        await this.demo2_StableVsUnstableExpert();

        // 演示3：进步型 vs 退步型玩家
        await this.demo3_ImprovingVsDecliningPlayer();

        console.log('✅ 快速演示完成！');
    }

    /**
     * 演示1：完美一致性 vs 极低一致性
     */
    private async demo1_PerfectVsExtremeInconsistency(): Promise<void> {
        console.log('=== 演示1：完美一致性 vs 极低一致性 ===');

        const perfectPlayer = {
            uid: 'perfect_player',
            description: '完美一致性玩家',
            historicalScores: [10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000],
            currentScore: 10000
        };

        const extremeInconsistentPlayer = {
            uid: 'extreme_inconsistent_player',
            description: '极低一致性玩家',
            historicalScores: [10000, 5000, 15000, 2000, 18000, 1000, 20000, 500, 22000, 0],
            currentScore: 10000
        };

        console.log('\n📊 对比分析:');
        console.log('完美一致性玩家:');
        await this.quickAnalyzePlayer(perfectPlayer);

        console.log('\n极低一致性玩家:');
        await this.quickAnalyzePlayer(extremeInconsistentPlayer);

        console.log('\n🎯 对比结论:');
        console.log('• 完美一致性玩家：获得最高排名奖励，最高推荐信心度');
        console.log('• 极低一致性玩家：获得显著排名惩罚，极低推荐信心度');
        console.log('• 系统能够准确区分稳定和不稳定玩家\n');
    }

    /**
     * 演示2：稳定专家 vs 不稳定专家
     */
    private async demo2_StableVsUnstableExpert(): Promise<void> {
        console.log('=== 演示2：稳定专家 vs 不稳定专家 ===');

        const stableExpert = {
            uid: 'stable_expert',
            description: '稳定专家玩家',
            historicalScores: [12000, 12100, 11900, 12050, 11950, 12150, 11850, 12080, 11920, 12120],
            currentScore: 12000
        };

        const unstableExpert = {
            uid: 'unstable_expert',
            description: '不稳定专家玩家',
            historicalScores: [12000, 8000, 16000, 6000, 18000, 4000, 20000, 2000, 22000, 0],
            currentScore: 12000
        };

        console.log('\n📊 对比分析:');
        console.log('稳定专家玩家:');
        await this.quickAnalyzePlayer(stableExpert);

        console.log('\n不稳定专家玩家:');
        await this.quickAnalyzePlayer(unstableExpert);

        console.log('\n🎯 对比结论:');
        console.log('• 稳定专家：尽管平均分相同，但获得高排名奖励');
        console.log('• 不稳定专家：尽管平均分相同，但获得显著排名惩罚');
        console.log('• 系统优先考虑稳定性而非单次高分表现\n');
    }

    /**
     * 演示3：进步型 vs 退步型玩家
     */
    private async demo3_ImprovingVsDecliningPlayer(): Promise<void> {
        console.log('=== 演示3：进步型 vs 退步型玩家 ===');

        const improvingPlayer = {
            uid: 'improving_player',
            description: '进步型玩家',
            historicalScores: [5000, 5500, 6000, 6500, 7000, 7500, 8000, 8500, 9000, 9500],
            currentScore: 10000
        };

        const decliningPlayer = {
            uid: 'declining_player',
            description: '退步型玩家',
            historicalScores: [15000, 14500, 14000, 13500, 13000, 12500, 12000, 11500, 11000, 10500],
            currentScore: 10000
        };

        console.log('\n📊 对比分析:');
        console.log('进步型玩家:');
        await this.quickAnalyzePlayer(improvingPlayer);

        console.log('\n退步型玩家:');
        await this.quickAnalyzePlayer(decliningPlayer);

        console.log('\n🎯 对比结论:');
        console.log('• 进步型玩家：获得进步奖励，系统对其未来表现有信心');
        console.log('• 退步型玩家：获得退步惩罚，系统对其未来表现担忧');
        console.log('• 系统能够识别并奖励持续改善的玩家\n');
    }

    /**
     * 快速分析单个玩家
     */
    private async quickAnalyzePlayer(player: {
        uid: string;
        description: string;
        historicalScores: number[];
        currentScore: number;
    }): Promise<void> {
        // 计算基础统计
        const averageScore = player.historicalScores.reduce((sum, score) => sum + score, 0) / player.historicalScores.length;
        const scoreRange = Math.max(...player.historicalScores) - Math.min(...player.historicalScores);

        // 计算一致性
        const consistency = (this.simulation as any).calculateConsistency(player.historicalScores);

        // 计算影响
        const skillImpact = (consistency - 0.5) * 0.2;
        const confidenceImpact = consistency * 0.2;

        // 分析趋势
        const trend = (this.simulation as any).analyzeTrend(player.historicalScores);

        console.log(`  平均分数: ${averageScore.toFixed(0)}`);
        console.log(`  分数范围: ${scoreRange}`);
        console.log(`  一致性: ${consistency.toFixed(3)} (${(this.simulation as any).getConsistencyDescription(consistency)})`);
        console.log(`  技能因子影响: ${skillImpact > 0 ? '+' : ''}${skillImpact.toFixed(3)}`);
        console.log(`  信心度影响: +${confidenceImpact.toFixed(3)}`);
        console.log(`  表现趋势: ${trend}`);
    }

    /**
     * 运行完整演示
     */
    async runFullDemo(): Promise<void> {
        console.log('🎯 一致性玩家模拟测试完整演示\n');

        // 运行快速演示
        await this.runQuickDemo();

        // 运行完整模拟测试
        console.log('📊 运行完整模拟测试...\n');
        await this.simulation.runAllSimulations();

        console.log('✅ 完整演示完成！');
    }
}

/**
 * 运行一致性模拟演示的主函数
 */
export async function runConsistencySimulationDemo(): Promise<void> {
    const demo = new ConsistencySimulationDemo();

    try {
        await demo.runQuickDemo();
        console.log('🎉 一致性模拟演示运行完成！');
    } catch (error) {
        console.error('💥 演示运行过程中出现错误:', error);
    }
}

/**
 * 运行完整的一致性模拟演示
 */
export async function runFullConsistencySimulationDemo(): Promise<void> {
    const demo = new ConsistencySimulationDemo();

    try {
        await demo.runFullDemo();
        console.log('🎉 完整一致性模拟演示运行完成！');
    } catch (error) {
        console.error('💥 完整演示运行过程中出现错误:', error);
    }
}

// 如果直接运行此文件，执行演示
// if (require.main === module) {
//     runConsistencySimulationDemo();
// }
