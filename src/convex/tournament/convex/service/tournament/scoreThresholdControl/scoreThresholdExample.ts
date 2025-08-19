/**
 * 分数门槛控制系统示例和测试
 * 展示如何使用系统的各种功能
 * 支持动态N名次配置
 */

import { SegmentName } from '../../segment/types';
import { createDefaultHybridConfig } from './config';
import { ScoreThresholdPlayerController } from './ScoreThresholdPlayerController';
import { ScoreThresholdSystemController } from './ScoreThresholdSystemController';

export class ScoreThresholdExample {
    /**
     * 基础使用示例
     */
    static async basicUsageExample(ctx: any) {
        console.log("=== 基础使用示例 ===");

        try {
            // 1. 初始化玩家
            const playerController = new ScoreThresholdPlayerController(ctx);
            const defaultConfig = await playerController.createPlayerDefaultConfig("player_001", "gold");

            console.log("玩家初始化成功:", {
                uid: defaultConfig.uid,
                segment: defaultConfig.segmentName,
                adaptiveMode: defaultConfig.adaptiveMode,
                learningRate: defaultConfig.learningRate,
                maxRank: defaultConfig.maxRank
            });

            // 2. 获取玩家排名
            const rankInfo = await playerController.getRankByScore("player_001", 2500);
            console.log("玩家排名信息:", {
                rank: rankInfo.rank,
                probability: rankInfo.rankingProbability,
                reason: rankInfo.reason
            });

            // 3. 获取玩家统计
            const metrics = await playerController.getPlayerPerformanceMetrics("player_001");
            console.log("玩家统计:", {
                totalMatches: metrics?.totalMatches || 0,
                totalWins: metrics?.totalWins || 0,
                currentWinStreak: metrics?.currentWinStreak || 0
            });

        } catch (error) {
            console.error("基础示例执行失败:", error);
        }
    }

    /**
     * 混合模式示例
     */
    static async hybridModeExample(ctx: any) {
        console.log("=== 混合模式示例 ===");

        try {
            // 为不同段位创建混合模式配置
            const segments: SegmentName[] = ["bronze", "silver", "gold", "platinum", "diamond"];

            for (const segment of segments) {
                const config = createDefaultHybridConfig(`player_${segment}`, segment);

                console.log(`${segment} 段位配置:`, {
                    learningRate: config.learningRate,
                    adaptiveMode: config.adaptiveMode,
                    thresholdCount: config.scoreThresholds.length,
                    maxRank: config.maxRank,
                    avgRank1Probability: config.scoreThresholds.reduce((sum, t) => sum + t.rankingProbabilities[0], 0) / config.scoreThresholds.length
                });

                // 初始化玩家
                const playerController = new ScoreThresholdPlayerController(ctx);
                await playerController.createPlayerDefaultConfig(`player_${segment}`, segment);
            }

            console.log("混合模式配置完成");

        } catch (error) {
            console.error("混合模式示例执行失败:", error);
        }
    }

    /**
     * 段位升级示例
     */
    static async segmentUpgradeExample(ctx: any) {
        console.log("=== 段位升级示例 ===");

        try {
            const playerController = new ScoreThresholdPlayerController(ctx);
            const systemController = new ScoreThresholdSystemController(ctx);

            // 1. 创建玩家配置
            const config = await playerController.createPlayerDefaultConfig("upgrade_player", "bronze");
            console.log("初始段位:", config.segmentName);

            // 2. 模拟多次胜利
            for (let i = 1; i <= 5; i++) {
                const rankInfo = await playerController.getRankByScore("upgrade_player", 1500 + i * 100);
                console.log(`第${i}次比赛: 排名${rankInfo.rank}, 概率${rankInfo.rankingProbability.toFixed(2)}`);
            }

            // 3. 检查升级条件
            const canPromote = await playerController.canPlayerPromote("upgrade_player");
            console.log("是否可以升级:", canPromote);

            // 4. 检查段位变化
            const segmentChange = await playerController.checkSegmentChange("upgrade_player", 50);
            console.log("段位变化检查:", segmentChange);

        } catch (error) {
            console.error("段位升级示例执行失败:", error);
        }
    }

    /**
     * 自适应学习示例
     */
    static async adaptiveLearningExample(ctx: any) {
        console.log("=== 自适应学习示例 ===");

        try {
            const playerController = new ScoreThresholdPlayerController(ctx);

            // 1. 创建学习模式配置
            const config = await playerController.createPlayerDefaultConfig("learning_player", "gold");
            console.log("初始学习率:", config.learningRate);

            // 2. 模拟不同表现
            const scenarios = [
                { score: 3000, expectedRank: 1, description: "优秀表现" },
                { score: 2500, expectedRank: 2, description: "良好表现" },
                { score: 2000, expectedRank: 3, description: "一般表现" },
                { score: 1500, expectedRank: 4, description: "需要改进" }
            ];

            for (const scenario of scenarios) {
                const rankInfo = await playerController.getRankByScore("learning_player", scenario.score);
                console.log(`${scenario.description}: 分数${scenario.score}, 实际排名${rankInfo.rank}, 预期排名${scenario.expectedRank}`);

                // 自动调整学习率
                await playerController.autoAdjustLearningRate("learning_player");
            }

            // 3. 查看调整后的配置
            const updatedConfig = await playerController.getPlayerConfig("learning_player");
            console.log("调整后学习率:", updatedConfig?.learningRate);

        } catch (error) {
            console.error("自适应学习示例执行失败:", error);
        }
    }

    /**
     * 批量操作示例
     */
    static async batchOperationExample(ctx: any) {
        console.log("=== 批量操作示例 ===");

        try {
            const systemController = new ScoreThresholdSystemController(ctx);

            // 1. 批量处理比赛
            const matches = [
                {
                    matchId: "batch_001", playerScores: [
                        { uid: "player_001", score: 2500, points: 15 },
                        { uid: "player_002", score: 2300, points: 10 },
                        { uid: "player_003", score: 2100, points: 5 }
                    ]
                },
                {
                    matchId: "batch_002", playerScores: [
                        { uid: "player_004", score: 2800, points: 20 },
                        { uid: "player_005", score: 2600, points: 15 },
                        { uid: "player_006", score: 2400, points: 10 }
                    ]
                }
            ];

            // 逐个处理比赛
            const batchResults = [];
            for (const match of matches) {
                try {
                    const result = await systemController.processMatchEnd(match.matchId, match.playerScores);
                    batchResults.push({ matchId: match.matchId, success: true, result });
                } catch (error) {
                    batchResults.push({
                        matchId: match.matchId,
                        success: false,
                        error: error instanceof Error ? error.message : String(error)
                    });
                }
            }
            console.log("批量处理结果:", batchResults);

            // 2. 批量获取排名
            const playerScores = [
                { uid: "player_001", score: 2500 },
                { uid: "player_002", score: 2300 },
                { uid: "player_003", score: 2100 }
            ];

            const batchRanks = await systemController.getBatchRanksByScores(playerScores);
            console.log("批量排名结果:", batchRanks);

        } catch (error) {
            console.error("批量操作示例执行失败:", error);
        }
    }

    /**
     * 配置优化示例
     */
    static async configOptimizationExample(ctx: any) {
        console.log("=== 配置优化示例 ===");

        try {
            const playerController = new ScoreThresholdPlayerController(ctx);

            // 1. 创建基础配置
            const config = await playerController.createPlayerDefaultConfig("optimize_player", "platinum");
            console.log("原始配置:", {
                learningRate: config.learningRate,
                adaptiveMode: config.adaptiveMode,
                thresholdCount: config.scoreThresholds.length
            });

            // 2. 切换自适应模式
            await playerController.toggleAdaptiveMode("optimize_player");
            const updatedConfig = await playerController.getPlayerConfig("optimize_player");
            console.log("切换后模式:", updatedConfig?.adaptiveMode);

            // 3. 调整分数门槛
            const adjustments = {
                learningRate: 0.2,
                adaptiveMode: "learning" as const
            };

            const adjustResult = await playerController.adjustScoreThresholds("optimize_player", adjustments);
            console.log("调整结果:", adjustResult);

        } catch (error) {
            console.error("配置优化示例执行失败:", error);
        }
    }

    /**
     * 性能测试示例
     */
    static async performanceTestExample(ctx: any) {
        console.log("=== 性能测试示例 ===");

        try {
            const playerController = new ScoreThresholdPlayerController(ctx);
            const systemController = new ScoreThresholdSystemController(ctx);

            const startTime = Date.now();

            // 1. 批量创建玩家
            const playerCount = 100;
            const players = [];
            for (let i = 0; i < playerCount; i++) {
                const uid = `perf_player_${i.toString().padStart(3, '0')}`;
                const segment = ["bronze", "silver", "gold"][i % 3] as SegmentName;
                players.push({ uid, segment });
            }

            // 2. 批量初始化
            for (const player of players) {
                await playerController.createPlayerDefaultConfig(player.uid, player.segment);
            }

            // 3. 批量排名计算
            const scores = players.map(player => ({
                uid: player.uid,
                score: Math.floor(Math.random() * 5000) + 1000
            }));

            const ranks = await systemController.getBatchRanksByScores(scores);

            const endTime = Date.now();
            const duration = endTime - startTime;

            console.log("性能测试结果:", {
                playerCount,
                duration: `${duration}ms`,
                avgTimePerPlayer: `${duration / playerCount}ms`,
                successCount: ranks.length
            });

        } catch (error) {
            console.error("性能测试示例执行失败:", error);
        }
    }

    /**
     * 运行所有示例
     */
    static async runAllExamples(ctx: any) {
        console.log("🚀 开始运行所有示例...");

        try {
            await this.basicUsageExample(ctx);
            await this.hybridModeExample(ctx);
            await this.segmentUpgradeExample(ctx);
            await this.adaptiveLearningExample(ctx);
            await this.batchOperationExample(ctx);
            await this.configOptimizationExample(ctx);
            await this.performanceTestExample(ctx);

            console.log("✅ 所有示例运行完成！");
        } catch (error) {
            console.error("❌ 示例运行失败:", error);
        }
    }
}
