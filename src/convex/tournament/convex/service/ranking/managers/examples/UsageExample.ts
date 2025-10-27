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
        cacheEnabled: true,         // 启用缓存
        cacheExpiration: 600000,    // 缓存10分钟
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
        newbieThreshold: 20,
        cacheEnabled: false
    });

    const updatedConfig = rankingManager.getConfig();
    console.log('更新后配置:', updatedConfig);

    // 清理缓存
    rankingManager.clearCache();
    console.log('缓存已清理');

    // 获取缓存统计
    const cacheStats = rankingManager.getCacheStats();
    console.log('缓存统计:', cacheStats);
}

// 示例：性能测试
export async function performanceTestExample(ctx: any) {
    const rankingManager = new RankingRecommendationManagerOptimized(ctx);

    const humanPlayers: HumanPlayer[] = Array.from({ length: 5 }, (_, i) => ({
        uid: `player${i + 1}`,
        score: 1000 + Math.random() * 1000
    }));

    const aiCount = 3;

    // 第一次调用（冷启动）
    console.time('第一次调用');
    const result1 = await rankingManager.generateMatchRankings(humanPlayers, aiCount);
    console.timeEnd('第一次调用');

    // 第二次调用（应该使用缓存）
    console.time('第二次调用');
    const result2 = await rankingManager.generateMatchRankings(humanPlayers, aiCount);
    console.timeEnd('第二次调用');

    // 验证结果一致性
    const isConsistent = JSON.stringify(result1) === JSON.stringify(result2);
    console.log('结果一致性:', isConsistent);

    return { result1, result2, isConsistent };
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

// 示例：错误处理
export async function errorHandlingExample(ctx: any) {
    const rankingManager = new RankingRecommendationManagerOptimized(ctx);

    try {
        // 测试无效输入
        await rankingManager.generateMatchRankings([], 5); // 空玩家列表
    } catch (error) {
        console.log('捕获到预期错误:', error.message);
    }

    try {
        // 测试AI数量超限
        await rankingManager.generateMatchRankings(
            [{ uid: 'player1', score: 1000 }],
            15 // 超过最大AI数量
        );
    } catch (error) {
        console.log('捕获到预期错误:', error.message);
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

        console.log('\n6. 错误处理示例');
        await errorHandlingExample(ctx);

        console.log('\n7. 批量处理示例');
        await batchProcessingExample(ctx);

        console.log('\n=== 所有示例执行完成 ===');

    } catch (error) {
        console.error('示例执行失败:', error);
    }
}
