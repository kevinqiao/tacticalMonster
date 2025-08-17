/**
 * 分数门槛控制系统示例和测试
 * 展示如何使用系统的各种功能
 * 支持动态N名次配置
 */

import { ScoreThresholdIntegration } from './scoreThresholdIntegration';
import { PlayerScoreThresholdConfig, ScoreThreshold } from './scoreThresholdRankingController';

export class ScoreThresholdExample {
    /**
     * 基础使用示例
     */
    static async basicUsageExample(ctx: any) {
        console.log("=== 基础使用示例 ===");

        try {
            // 1. 初始化玩家
            const playerData = await ScoreThresholdIntegration.initializePlayer(ctx, {
                uid: "player_001",
                segmentName: "gold",
                useHybridMode: true
            });

            console.log("玩家初始化成功:", {
                uid: playerData.uid,
                segment: playerData.segmentName,
                adaptiveMode: playerData.scoreThresholdConfig.adaptiveMode,
                learningRate: playerData.scoreThresholdConfig.learningRate,
                maxRank: playerData.scoreThresholdConfig.maxRank
            });

            // 2. 记录比赛结果
            await ScoreThresholdIntegration.recordMatchResult(ctx, {
                matchId: "match_001",
                uid: "player_001",
                score: 2500,
                rank: 2,
                points: 15
            });

            console.log("比赛结果记录成功");

            // 3. 获取玩家统计
            const stats = await ScoreThresholdIntegration.getPlayerStats(ctx, "player_001");
            console.log("玩家统计:", {
                totalMatches: stats?.performanceMetrics.totalMatches,
                totalWins: stats?.performanceMetrics.totalWins,
                currentWinStreak: stats?.performanceMetrics.currentWinStreak
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
            const segments = ["bronze", "silver", "gold", "platinum", "diamond"];

            for (const segment of segments) {
                const config = ScoreThresholdIntegration.createHybridModeConfig(`player_${segment}`, segment);

                console.log(`${segment} 段位配置:`, {
                    learningRate: config.learningRate,
                    adaptiveMode: config.adaptiveMode,
                    thresholdCount: config.scoreThresholds.length,
                    maxRank: config.maxRank,
                    avgRank1Probability: config.scoreThresholds.reduce((sum, t) => sum + t.rankingProbabilities[0], 0) / config.scoreThresholds.length
                });

                // 初始化玩家
                await ScoreThresholdIntegration.initializePlayer(ctx, {
                    uid: `player_${segment}`,
                    segmentName: segment,
                    useHybridMode: true
                });
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
            // 模拟玩家从青铜升级到白银
            const oldSegment = "bronze";
            const newSegment = "silver";

            // 创建升级配置
            const upgradeConfig = ScoreThresholdIntegration.createSegmentUpgradeConfig(
                "player_upgrade_test",
                oldSegment,
                newSegment
            );

            console.log("段位升级配置:", {
                oldSegment,
                newSegment,
                newLearningRate: upgradeConfig.learningRate,
                newThresholdCount: upgradeConfig.scoreThresholds.length,
                newMaxRank: upgradeConfig.maxRank
            });

            // 比较两个段位的配置差异
            const comparison = ScoreThresholdIntegration.compareSegmentConfigs(oldSegment, newSegment);
            if (comparison) {
                console.log("段位配置对比:", {
                    learningRateDifference: comparison.differences.learningRate.difference,
                    rank1ProbabilityDifference: comparison.differences.avgRank1Probability.difference,
                    protectionLevelDifference: comparison.differences.protectionLevel.difference
                });
            }

            // 初始化升级后的玩家
            await ScoreThresholdIntegration.initializePlayer(ctx, {
                uid: "player_upgrade_test",
                segmentName: newSegment,
                useHybridMode: true
            });

            console.log("段位升级示例完成");

        } catch (error) {
            console.error("段位升级示例执行失败:", error);
        }
    }

    /**
     * 自定义配置示例 - 支持动态N名次
     */
    static async customConfigExample(ctx: any) {
        console.log("=== 自定义配置示例 ===");

        try {
            // 创建自定义分数门槛配置 - 支持5名次
            const customThresholds: ScoreThreshold[] = [
                {
                    minScore: 0,
                    maxScore: 1000,
                    rankingProbabilities: [0.10, 0.20, 0.30, 0.25, 0.15], // 5名次概率
                    priority: 1
                },
                {
                    minScore: 1001,
                    maxScore: 2000,
                    rankingProbabilities: [0.25, 0.30, 0.25, 0.15, 0.05], // 5名次概率
                    priority: 2
                },
                {
                    minScore: 2001,
                    maxScore: 3000,
                    rankingProbabilities: [0.40, 0.30, 0.20, 0.08, 0.02], // 5名次概率
                    priority: 3
                }
            ];

            // 验证配置
            const customConfig: PlayerScoreThresholdConfig = {
                uid: "player_custom",
                segmentName: "gold",
                scoreThresholds: customThresholds,
                baseRankingProbability: [0.25, 0.27, 0.25, 0.16, 0.07], // 5名次基础概率
                maxRank: 5, // 支持5名次
                adaptiveMode: true,
                learningRate: 0.15,
                autoAdjustLearningRate: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            const validation = ScoreThresholdIntegration.validateScoreThresholdConfig(customConfig);
            console.log("配置验证结果:", {
                isValid: validation.isValid,
                errors: validation.errors,
                warnings: validation.warnings
            });

            if (validation.isValid) {
                // 应用自定义配置
                await ScoreThresholdIntegration.adjustScoreThresholds(ctx, {
                    uid: "player_custom",
                    scoreThresholds: customThresholds,
                    adaptiveMode: true,
                    learningRate: 0.15
                });

                console.log("自定义配置应用成功 - 支持5名次");
            }

        } catch (error) {
            console.error("自定义配置示例执行失败:", error);
        }
    }

    /**
     * 比赛结束示例 - 支持动态N名次
     */
    static async endMatchExample(ctx: any) {
        console.log("=== 比赛结束示例 ===");

        try {
            // 模拟结束一场比赛 - 支持5名次
            const matchResult = await ScoreThresholdIntegration.endMatch(ctx, {
                matchId: "match_end_example",
                humanPlayerUid: "player_001",
                humanScore: 2800,
                targetRank: 2, // 目标第2名
                aiPlayerCount: 4 // 4个AI玩家，总共5名次
            });

            console.log("比赛结束结果:", {
                aiScores: matchResult.aiScores,
                finalRankings: matchResult.finalRankings
            });

            // 验证目标名次是否达成
            const humanRanking = matchResult.finalRankings.find(r => r.uid === "player_001");
            if (humanRanking && humanRanking.rank === 2) {
                console.log("✅ 目标名次达成: 玩家获得第2名");
            } else {
                console.log("❌ 目标名次未达成: 玩家实际排名", humanRanking?.rank);
            }

        } catch (error) {
            console.error("比赛结束示例执行失败:", error);
        }
    }

    /**
     * 动态名次配置示例
     */
    static async dynamicRankingExample(ctx: any) {
        console.log("=== 动态名次配置示例 ===");

        try {
            // 测试不同名次数量的配置
            const rankConfigs = [
                { name: "3名次配置", maxRank: 3, probabilities: [0.40, 0.35, 0.25] },
                { name: "4名次配置", maxRank: 4, probabilities: [0.35, 0.30, 0.25, 0.10] },
                { name: "5名次配置", maxRank: 5, probabilities: [0.30, 0.25, 0.20, 0.15, 0.10] },
                { name: "6名次配置", maxRank: 6, probabilities: [0.25, 0.20, 0.18, 0.17, 0.12, 0.08] }
            ];

            for (const config of rankConfigs) {
                const customThresholds: ScoreThreshold[] = [
                    {
                        minScore: 0,
                        maxScore: 1000,
                        rankingProbabilities: config.probabilities,
                        priority: 1
                    }
                ];

                const playerConfig: PlayerScoreThresholdConfig = {
                    uid: `player_${config.maxRank}ranks`,
                    segmentName: "test",
                    scoreThresholds: customThresholds,
                    baseRankingProbability: config.probabilities,
                    maxRank: config.maxRank,
                    adaptiveMode: false,
                    learningRate: 0.1,
                    autoAdjustLearningRate: false,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                console.log(`${config.name}:`, {
                    maxRank: playerConfig.maxRank,
                    probabilities: playerConfig.baseRankingProbability,
                    totalProbability: playerConfig.baseRankingProbability.reduce((sum, p) => sum + p, 0)
                });
            }

            console.log("动态名次配置示例完成");

        } catch (error) {
            console.error("动态名次配置示例执行失败:", error);
        }
    }

    /**
     * 系统状态监控示例
     */
    static async systemMonitoringExample(ctx: any) {
        console.log("=== 系统状态监控示例 ===");

        try {
            // 获取系统状态概览
            const systemStatus = await ScoreThresholdIntegration.getSystemStatus(ctx);

            console.log("系统状态概览:", {
                totalPlayers: systemStatus.totalPlayers,
                activeMatches: systemStatus.activeMatches,
                segmentDistribution: systemStatus.segmentDistribution,
                averageLearningRate: systemStatus.averageLearningRate.toFixed(3),
                adaptiveModeEnabled: systemStatus.adaptiveModeEnabled
            });

            // 分析段位分布
            console.log("段位分布分析:");
            for (const [segment, count] of Object.entries(systemStatus.segmentDistribution)) {
                const percentage = ((count / systemStatus.totalPlayers) * 100).toFixed(1);
                console.log(`  ${segment}: ${count} 人 (${percentage}%)`);
            }

        } catch (error) {
            console.error("系统监控示例执行失败:", error);
        }
    }

    /**
     * 批量操作示例
     */
    static async batchOperationExample(ctx: any) {
        console.log("=== 批量操作示例 ===");

        try {
            // 批量更新多个玩家的学习率
            const updates = [
                { uid: "player_001", learningRate: 0.12 },
                { uid: "player_002", learningRate: 0.15 },
                { uid: "player_003", learningRate: 0.18 },
                { uid: "player_004", adaptiveMode: true },
                { uid: "player_005", adaptiveMode: false }
            ];

            const result = await ScoreThresholdIntegration.batchUpdatePlayerConfigs(ctx, updates);

            console.log("批量更新结果:", {
                success: result.success,
                failed: result.failed,
                errors: result.errors
            });

            if (result.errors.length > 0) {
                console.log("更新失败的玩家:");
                for (const error of result.errors) {
                    console.log(`  ${error.uid}: ${error.error}`);
                }
            }

        } catch (error) {
            console.error("批量操作示例执行失败:", error);
        }
    }

    /**
     * 性能测试示例
     */
    static async performanceTestExample(ctx: any) {
        console.log("=== 性能测试示例 ===");

        try {
            const startTime = Date.now();

            // 模拟大量玩家初始化
            const playerCount = 100;
            const promises = [];

            for (let i = 0; i < playerCount; i++) {
                const uid = `perf_test_player_${i.toString().padStart(3, '0')}`;
                const segment = ["bronze", "silver", "gold"][i % 3];

                promises.push(
                    ScoreThresholdIntegration.initializePlayer(ctx, {
                        uid,
                        segmentName: segment,
                        useHybridMode: true
                    })
                );
            }

            await Promise.all(promises);
            const endTime = Date.now();

            console.log(`性能测试完成: ${playerCount} 个玩家初始化耗时 ${endTime - startTime}ms`);

            // 测试批量查询性能
            const queryStartTime = Date.now();
            const allPlayers = await ScoreThresholdIntegration.getAllPlayers(ctx);
            const queryEndTime = Date.now();

            console.log(`批量查询性能: ${allPlayers.length} 个玩家数据查询耗时 ${queryEndTime - queryStartTime}ms`);

        } catch (error) {
            console.error("性能测试示例执行失败:", error);
        }
    }

    /**
     * 运行所有示例
     */
    static async runAllExamples(ctx: any) {
        console.log("🚀 开始运行所有示例...\n");

        try {
            await this.basicUsageExample(ctx);
            console.log();

            await this.hybridModeExample(ctx);
            console.log();

            await this.segmentUpgradeExample(ctx);
            console.log();

            await this.customConfigExample(ctx);
            console.log();

            await this.endMatchExample(ctx);
            console.log();

            await this.dynamicRankingExample(ctx);
            console.log();

            await this.systemMonitoringExample(ctx);
            console.log();

            await this.batchOperationExample(ctx);
            console.log();

            await this.performanceTestExample(ctx);
            console.log();

            console.log("✅ 所有示例运行完成!");

        } catch (error) {
            console.error("❌ 示例运行过程中出现错误:", error);
        }
    }

    /**
     * 运行特定示例
     */
    static async runSpecificExample(ctx: any, exampleName: string) {
        const examples: Record<string, (ctx: any) => Promise<void>> = {
            "basic": this.basicUsageExample,
            "hybrid": this.hybridModeExample,
            "upgrade": this.segmentUpgradeExample,
            "custom": this.customConfigExample,
            "endMatch": this.endMatchExample,
            "dynamicRanking": this.dynamicRankingExample,
            "monitoring": this.systemMonitoringExample,
            "batch": this.batchOperationExample,
            "performance": this.performanceTestExample
        };

        const example = examples[exampleName];
        if (example) {
            console.log(`🚀 运行示例: ${exampleName}`);
            await example.call(this, ctx);
        } else {
            console.error(`❌ 未知示例: ${exampleName}`);
            console.log("可用示例:", Object.keys(examples).join(", "));
        }
    }
}
