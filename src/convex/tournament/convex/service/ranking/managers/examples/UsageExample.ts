/**
 * RankingRecommendationManagerOptimized 使用示例
 */

import { RankingRecommendationManagerOptimized } from '../RankingRecommendationManagerOptimized';
import { HumanPlayer, RankingConfig } from '../types';

// 示例：基本使用
export async function basicUsageExample(ctx: any) {
    // 创建管理器实例
    const rankingManager = new RankingRecommendationManagerOptimized(ctx);

    // 准备测试数据
    const humanPlayers: HumanPlayer[] = [
        { uid: 'player1', score: 1500 },
        { uid: 'player2', score: 1200 },
        { uid: 'player3', score: 1800 }
    ];
    const aiCount = 3;

    // 生成排名推荐
    const result = await rankingManager.generateMatchRankings(humanPlayers, aiCount);

    console.log('比赛结果:', result);
    console.log('人类玩家排名:', result.humanPlayerRankings);
    console.log('AI对手:', result.aiOpponents);
    console.log('比赛上下文:', result.matchContext);

    return result;
}

// 示例：自定义配置
export async function customConfigExample(ctx: any) {
    // 自定义配置
    const customConfig: Partial<RankingConfig> = {
        newbieThreshold: 15,        // 新手阈值提高到15场
        growingThreshold: 40,       // 成长阈值提高到40场
        newbieScoreWeight: 0.95,    // 新手更重视当前表现
        newbieSkillWeight: 0.05,    // 新手不太重视历史表现
        maxAICount: 5,              // 最多5个AI
        maxParticipants: 15         // 最多15个参与者
    };

    const rankingManager = new RankingRecommendationManagerOptimized(ctx, customConfig);

    const humanPlayers: HumanPlayer[] = [
        { uid: 'newbie1', score: 2000 },  // 高分新手
        { uid: 'veteran1', score: 1000 }  // 低分老手
    ];

    const result = await rankingManager.generateMatchRankings(humanPlayers, 2);

    console.log('自定义配置结果:', result);
    return result;
}

// 示例：配置管理
export async function configManagementExample(ctx: any) {
    const rankingManager = new RankingRecommendationManagerOptimized(ctx);

    // 获取当前配置
    const currentConfig = rankingManager.getConfig();
    console.log('当前配置:', currentConfig);

    // 更新配置
    rankingManager.updateConfig({
        newbieThreshold: 20
    });

    const updatedConfig = rankingManager.getConfig();
    console.log('更新后配置:', updatedConfig);
}

// 示例：性能测试
export async function performanceTestExample(ctx: any) {
    const rankingManager = new RankingRecommendationManagerOptimized(ctx);

    const humanPlayers: HumanPlayer[] = Array.from({ length: 5 }, (_, i) => ({
        uid: `player${i + 1}`,
        score: 1000 + Math.random() * 1000
    }));

    const aiCount = 3;

    // 第一次调用
    console.time('比赛排名生成');
    const result1 = await rankingManager.generateMatchRankings(humanPlayers, aiCount);
    console.timeEnd('比赛排名生成');

    return result1;
}

// 示例：不同玩家类型的排名策略
export async function differentPlayerTypesExample(ctx: any) {
    const rankingManager = new RankingRecommendationManagerOptimized(ctx);

    // 模拟不同经验水平的玩家
    const humanPlayers: HumanPlayer[] = [
        { uid: 'newbie1', score: 2000 },    // 高分新手（应该得到保护）
        { uid: 'newbie2', score: 800 },     // 低分新手
        { uid: 'growing1', score: 1500 },   // 成长阶段玩家
        { uid: 'veteran1', score: 1200 },   // 成熟玩家
        { uid: 'veteran2', score: 1800 }    // 高分成熟玩家
    ];

    const result = await rankingManager.generateMatchRankings(humanPlayers, 3);

    console.log('不同玩家类型排名结果:');
    result.humanPlayerRankings.forEach(ranking => {
        console.log(`玩家 ${ranking.uid}: 排名 ${ranking.recommendedRank}, 信心度 ${ranking.confidence.toFixed(2)}`);
        console.log(`  推理: ${ranking.reasoning}`);
        console.log(`  相对表现: ${ranking.relativePerformance}`);
        console.log('---');
    });

    return result;
}

// 示例：个性化策略
export async function personalizedStrategyExample(ctx: any) {
    // 启用个性化策略的配置
    const personalizedConfig: Partial<RankingConfig> = {
        personalizedStrategy: {
            enabled: true,
            minMatchesForPersonalization: 15,
            profileUpdateInterval: 24,
            maxAdjustmentRange: 0.3,
            confidenceThreshold: 0.6,
            fallbackToVeteran: true
        }
    };

    const rankingManager = new RankingRecommendationManagerOptimized(ctx, personalizedConfig);

    const humanPlayers: HumanPlayer[] = [
        { uid: 'player1', score: 1500 },  // 假设满足个性化条件
        { uid: 'player2', score: 1200 },  // 假设满足个性化条件
        { uid: 'player3', score: 1800 }   // 假设满足个性化条件
    ];

    const result = await rankingManager.generateMatchRankings(humanPlayers, 3);

    console.log('个性化策略结果:', result);
    result.humanPlayerRankings.forEach(ranking => {
        console.log(`玩家 ${ranking.uid}: 排名 ${ranking.recommendedRank}`);
        console.log(`  推理: ${ranking.reasoning}`);
        console.log(`  信心度: ${ranking.confidence.toFixed(2)}`);
    });

    return result;
}

// 示例：不同策略对比
export async function strategyComparisonExample(ctx: any) {
    const humanPlayers: HumanPlayer[] = [
        { uid: 'player1', score: 1500 },
        { uid: 'player2', score: 1200 }
    ];

    // 1. 默认策略
    const defaultManager = new RankingRecommendationManagerOptimized(ctx);
    const defaultResult = await defaultManager.generateMatchRankings(humanPlayers, 3);

    // 2. 胜率控制策略
    const winRateConfig: Partial<RankingConfig> = {
        winRateControl: {
            enabled: true,
            targetWinRate: 0.33,
            adjustmentSensitivity: 10,
            minMatchesForControl: 5,
            maxAdjustmentRange: 0.2
        }
    };
    const winRateManager = new RankingRecommendationManagerOptimized(ctx, winRateConfig);
    const winRateResult = await winRateManager.generateMatchRankings(humanPlayers, 3);

    // 3. 个性化策略
    const personalizedConfig: Partial<RankingConfig> = {
        personalizedStrategy: {
            enabled: true,
            minMatchesForPersonalization: 15,
            profileUpdateInterval: 24,
            maxAdjustmentRange: 0.3,
            confidenceThreshold: 0.6,
            fallbackToVeteran: true
        }
    };
    const personalizedManager = new RankingRecommendationManagerOptimized(ctx, personalizedConfig);
    const personalizedResult = await personalizedManager.generateMatchRankings(humanPlayers, 3);

    console.log('=== 策略对比结果 ===');
    console.log('默认策略:', defaultResult.humanPlayerRankings.map(r => `${r.uid}:${r.recommendedRank}`));
    console.log('胜率控制策略:', winRateResult.humanPlayerRankings.map(r => `${r.uid}:${r.recommendedRank}`));
    console.log('个性化策略:', personalizedResult.humanPlayerRankings.map(r => `${r.uid}:${r.recommendedRank}`));

    return {
        default: defaultResult,
        winRate: winRateResult,
        personalized: personalizedResult
    };
}

// 示例：错误处理
export async function errorHandlingExample(ctx: any) {
    const rankingManager = new RankingRecommendationManagerOptimized(ctx);

    try {
        // 测试无效输入
        await rankingManager.generateMatchRankings([], 5); // 空玩家列表
    } catch (error) {
        console.log('捕获到预期错误:', error instanceof Error ? error.message : String(error));
    }

    try {
        // 测试AI数量超限
        await rankingManager.generateMatchRankings(
            [{ uid: 'player1', score: 1000 }],
            15 // 超过最大AI数量
        );
    } catch (error) {
        console.log('捕获到预期错误:', error instanceof Error ? error.message : String(error));
    }

    // 正常情况
    const result = await rankingManager.generateMatchRankings(
        [{ uid: 'player1', score: 1000 }],
        2
    );
    console.log('正常结果:', result);
}

// 示例：批量处理
export async function batchProcessingExample(ctx: any) {
    const rankingManager = new RankingRecommendationManagerOptimized(ctx);

    // 模拟多个比赛场景
    const scenarios = [
        { players: [{ uid: 'p1', score: 1000 }], aiCount: 3 },
        { players: [{ uid: 'p2', score: 1500 }], aiCount: 2 },
        { players: [{ uid: 'p3', score: 800 }], aiCount: 4 }
    ];

    const results = [];

    for (const scenario of scenarios) {
        const result = await rankingManager.generateMatchRankings(
            scenario.players,
            scenario.aiCount
        );
        results.push(result);
    }

    console.log('批量处理结果:', results);
    return results;
}

// 主函数：运行所有示例
export async function runAllExamples(ctx: any) {
    console.log('=== RankingRecommendationManagerOptimized 使用示例 ===\n');

    try {
        console.log('1. 基本使用示例');
        await basicUsageExample(ctx);

        console.log('\n2. 自定义配置示例');
        await customConfigExample(ctx);

        console.log('\n3. 配置管理示例');
        await configManagementExample(ctx);

        console.log('\n4. 性能测试示例');
        await performanceTestExample(ctx);

        console.log('\n5. 不同玩家类型示例');
        await differentPlayerTypesExample(ctx);

        console.log('\n6. 个性化策略示例');
        await personalizedStrategyExample(ctx);

        console.log('\n7. 策略对比示例');
        await strategyComparisonExample(ctx);

        console.log('\n8. 错误处理示例');
        await errorHandlingExample(ctx);

        console.log('\n9. 批量处理示例');
        await batchProcessingExample(ctx);

        console.log('\n=== 所有示例执行完成 ===');

    } catch (error) {
        console.error('示例执行失败:', error);
    }
}
