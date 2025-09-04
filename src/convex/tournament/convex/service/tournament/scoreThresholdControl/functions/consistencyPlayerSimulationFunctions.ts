/**
 * 一致性玩家历史数据模拟测试的 Convex 函数
 * 用于在 Convex 环境中运行不同一致性玩家的模拟测试
 */

import { v } from "convex/values";
import { mutation } from "../../../../_generated/server";
import { ConsistencyPlayerSimulation } from "../test/ConsistencyPlayerSimulation";

/**
 * 运行所有一致性玩家模拟测试
 */
export const runConsistencyPlayerSimulations = mutation({
    args: {},
    handler: async (ctx) => {
        console.log("🎯 开始一致性玩家历史数据模拟测试...");

        try {
            const simulation = new ConsistencyPlayerSimulation();
            await simulation.runAllSimulations();

            console.log("✅ 所有一致性玩家模拟测试运行完成！");
            return {
                success: true,
                message: "所有一致性玩家模拟测试运行完成",
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error("❌ 一致性玩家模拟测试运行失败:", error);
            return {
                success: false,
                message: `模拟测试运行失败: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date().toISOString()
            };
        }
    }
});

/**
 * 模拟特定类型的一致性玩家
 */
export const simulateSpecificConsistencyPlayer = mutation({
    args: {
        playerType: v.string(),
        historicalScores: v.array(v.number()),
        currentScore: v.number()
    },
    handler: async (ctx, { playerType, historicalScores, currentScore }) => {
        console.log(`🧪 模拟特定类型的一致性玩家: ${playerType}`);
        console.log(`📊 历史分数: [${historicalScores.join(', ')}]`);
        console.log(`🎯 当前分数: ${currentScore}`);

        try {
            const simulation = new ConsistencyPlayerSimulation();

            const player = {
                uid: `simulated_${playerType}`,
                description: playerType,
                historicalScores,
                currentScore
            };

            // 计算基础统计
            const averageScore = historicalScores.reduce((sum, score) => sum + score, 0) / historicalScores.length;
            const scoreRange = Math.max(...historicalScores) - Math.min(...historicalScores);
            const standardDeviation = Math.sqrt(
                historicalScores.reduce((sum, score) => sum + Math.pow(score - averageScore, 2), 0) / historicalScores.length
            );

            // 计算一致性
            const consistency = (simulation as any).calculateConsistency(historicalScores);

            // 计算一致性对排名推荐的影响
            const skillImpact = (consistency - 0.5) * 0.2;
            const confidenceImpact = consistency * 0.2;

            // 分析趋势
            const trend = (simulation as any).analyzeTrend(historicalScores);

            // 生成排名推荐
            const rankingRecommendation = (simulation as any).getRankingRecommendation(consistency, skillImpact, trend);

            // 生成详细分析
            const detailedAnalysis = (simulation as any).generateDetailedAnalysis(
                player, consistency, skillImpact, confidenceImpact, trend
            );

            console.log(`✅ 玩家模拟分析完成:`);
            console.log(`   一致性分数: ${consistency.toFixed(3)}`);
            console.log(`   技能因子影响: ${skillImpact > 0 ? '+' : ''}${skillImpact.toFixed(3)}`);
            console.log(`   信心度影响: +${confidenceImpact.toFixed(3)}`);
            console.log(`   表现趋势: ${trend}`);
            console.log(`   排名推荐: ${rankingRecommendation}`);

            return {
                success: true,
                playerType,
                player,
                analysis: {
                    averageScore: averageScore,
                    scoreRange: scoreRange,
                    standardDeviation: standardDeviation,
                    consistency: consistency,
                    consistencyDescription: (simulation as any).getConsistencyDescription(consistency),
                    skillFactorImpact: skillImpact,
                    confidenceImpact: confidenceImpact,
                    trend: trend,
                    rankingRecommendation: rankingRecommendation,
                    detailedAnalysis: detailedAnalysis
                },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error("❌ 特定玩家模拟失败:", error);
            return {
                success: false,
                message: `模拟失败: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date().toISOString()
            };
        }
    }
});

/**
 * 批量模拟不同一致性水平的玩家
 */
export const batchSimulateConsistencyPlayers = mutation({
    args: {
        players: v.array(v.object({
            playerType: v.string(),
            historicalScores: v.array(v.number()),
            currentScore: v.number()
        }))
    },
    handler: async (ctx, { players }) => {
        console.log(`🧪 批量模拟 ${players.length} 个不同一致性水平的玩家...`);

        try {
            const simulation = new ConsistencyPlayerSimulation();
            const results = [];

            for (const playerData of players) {
                console.log(`\n📊 分析玩家: ${playerData.playerType}`);

                const player = {
                    uid: `batch_${playerData.playerType}`,
                    description: playerData.playerType,
                    historicalScores: playerData.historicalScores,
                    currentScore: playerData.currentScore
                };

                // 计算基础统计
                const averageScore = playerData.historicalScores.reduce((sum, score) => sum + score, 0) / playerData.historicalScores.length;
                const scoreRange = Math.max(...playerData.historicalScores) - Math.min(...playerData.historicalScores);
                const standardDeviation = Math.sqrt(
                    playerData.historicalScores.reduce((sum, score) => sum + Math.pow(score - averageScore, 2), 0) / playerData.historicalScores.length
                );

                // 计算一致性
                const consistency = (simulation as any).calculateConsistency(playerData.historicalScores);

                // 计算一致性对排名推荐的影响
                const skillImpact = (consistency - 0.5) * 0.2;
                const confidenceImpact = consistency * 0.2;

                // 分析趋势
                const trend = (simulation as any).analyzeTrend(playerData.historicalScores);

                // 生成排名推荐
                const rankingRecommendation = (simulation as any).getRankingRecommendation(consistency, skillImpact, trend);

                // 生成详细分析
                const detailedAnalysis = (simulation as any).generateDetailedAnalysis(
                    player, consistency, skillImpact, confidenceImpact, trend
                );

                results.push({
                    playerType: playerData.playerType,
                    player,
                    analysis: {
                        averageScore: averageScore,
                        scoreRange: scoreRange,
                        standardDeviation: standardDeviation,
                        consistency: consistency,
                        consistencyDescription: (simulation as any).getConsistencyDescription(consistency),
                        skillFactorImpact: skillImpact,
                        confidenceImpact: confidenceImpact,
                        trend: trend,
                        rankingRecommendation: rankingRecommendation,
                        detailedAnalysis: detailedAnalysis
                    }
                });

                console.log(`   一致性: ${consistency.toFixed(3)} (${(simulation as any).getConsistencyDescription(consistency)})`);
                console.log(`   技能因子影响: ${skillImpact > 0 ? '+' : ''}${skillImpact.toFixed(3)}`);
                console.log(`   信心度影响: +${confidenceImpact.toFixed(3)}`);
                console.log(`   排名推荐: ${rankingRecommendation}`);
            }

            // 按一致性排序
            const sortedResults = results.sort((a, b) => b.analysis.consistency - a.analysis.consistency);

            console.log(`\n✅ 批量模拟完成，按一致性排序:`);
            sortedResults.forEach((result, index) => {
                console.log(`第${index + 1}名: ${result.playerType} - 一致性 ${result.analysis.consistency.toFixed(3)}`);
            });

            return {
                success: true,
                totalPlayers: players.length,
                results: results,
                sortedResults: sortedResults,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error("❌ 批量玩家模拟失败:", error);
            return {
                success: false,
                message: `批量模拟失败: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date().toISOString()
            };
        }
    }
});

/**
 * 生成预设的一致性玩家测试数据
 */
export const generatePresetConsistencyPlayers = mutation({
    args: {},
    handler: async (ctx) => {
        console.log("🧪 生成预设的一致性玩家测试数据...");

        try {
            const presetPlayers = [
                {
                    playerType: '完美一致性玩家',
                    historicalScores: [10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000],
                    currentScore: 10000
                },
                {
                    playerType: '高一致性玩家',
                    historicalScores: [10000, 10200, 9800, 10100, 9900, 10050, 9950, 10150, 9850, 10080],
                    currentScore: 10000
                },
                {
                    playerType: '中等一致性玩家',
                    historicalScores: [10000, 9500, 10500, 9000, 11000, 8500, 11500, 8000, 12000, 7500],
                    currentScore: 10000
                },
                {
                    playerType: '低一致性玩家',
                    historicalScores: [10000, 8000, 12000, 6000, 14000, 4000, 16000, 2000, 18000, 0],
                    currentScore: 10000
                },
                {
                    playerType: '极低一致性玩家',
                    historicalScores: [10000, 5000, 15000, 2000, 18000, 1000, 20000, 500, 22000, 0],
                    currentScore: 10000
                },
                {
                    playerType: '进步型玩家',
                    historicalScores: [5000, 5500, 6000, 6500, 7000, 7500, 8000, 8500, 9000, 9500],
                    currentScore: 10000
                },
                {
                    playerType: '退步型玩家',
                    historicalScores: [15000, 14500, 14000, 13500, 13000, 12500, 12000, 11500, 11000, 10500],
                    currentScore: 10000
                },
                {
                    playerType: '波动型玩家',
                    historicalScores: [10000, 15000, 5000, 12000, 8000, 14000, 6000, 13000, 7000, 11000],
                    currentScore: 10000
                },
                {
                    playerType: '稳定专家玩家',
                    historicalScores: [12000, 12100, 11900, 12050, 11950, 12150, 11850, 12080, 11920, 12120],
                    currentScore: 12000
                },
                {
                    playerType: '不稳定专家玩家',
                    historicalScores: [12000, 8000, 16000, 6000, 18000, 4000, 20000, 2000, 22000, 0],
                    currentScore: 12000
                }
            ];

            console.log(`✅ 生成了 ${presetPlayers.length} 个预设玩家数据`);

            return {
                success: true,
                presetPlayers: presetPlayers,
                count: presetPlayers.length,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error("❌ 生成预设玩家数据失败:", error);
            return {
                success: false,
                message: `生成失败: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date().toISOString()
            };
        }
    }
});

/**
 * 运行预设的一致性玩家模拟测试
 */
export const runPresetConsistencyPlayerSimulations = mutation({
    args: {},
    handler: async (ctx) => {
        console.log("🧪 运行预设的一致性玩家模拟测试...");

        try {
            // 首先生成预设数据
            const presetResult = await generatePresetData();

            if (!presetResult.success) {
                throw new Error("生成预设数据失败");
            }

            // 然后批量模拟
            const simulationResult = await batchSimulatePlayers(presetResult.presetPlayers);

            if (!simulationResult.success) {
                throw new Error("批量模拟失败");
            }

            console.log("✅ 预设一致性玩家模拟测试运行完成！");

            return {
                success: true,
                message: "预设一致性玩家模拟测试运行完成",
                presetData: presetResult,
                simulationResults: simulationResult,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error("❌ 预设一致性玩家模拟测试运行失败:", error);
            return {
                success: false,
                message: `预设模拟测试运行失败: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date().toISOString()
            };
        }
    }
});

// Helper functions
async function generatePresetData() {
    const presetPlayers = [
        {
            playerType: '完美一致性玩家',
            historicalScores: [10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000],
            currentScore: 10000
        },
        {
            playerType: '高一致性玩家',
            historicalScores: [10000, 10200, 9800, 10100, 9900, 10050, 9950, 10150, 9850, 10080],
            currentScore: 10000
        },
        {
            playerType: '中等一致性玩家',
            historicalScores: [10000, 9500, 10500, 9000, 11000, 8500, 11500, 8000, 12000, 7500],
            currentScore: 10000
        },
        {
            playerType: '低一致性玩家',
            historicalScores: [10000, 8000, 12000, 6000, 14000, 4000, 16000, 2000, 18000, 0],
            currentScore: 10000
        },
        {
            playerType: '极低一致性玩家',
            historicalScores: [10000, 5000, 15000, 2000, 18000, 1000, 20000, 500, 22000, 0],
            currentScore: 10000
        },
        {
            playerType: '进步型玩家',
            historicalScores: [5000, 5500, 6000, 6500, 7000, 7500, 8000, 8500, 9000, 9500],
            currentScore: 10000
        },
        {
            playerType: '退步型玩家',
            historicalScores: [15000, 14500, 14000, 13500, 13000, 12500, 12000, 11500, 11000, 10500],
            currentScore: 10000
        },
        {
            playerType: '波动型玩家',
            historicalScores: [10000, 15000, 5000, 12000, 8000, 14000, 6000, 13000, 7000, 11000],
            currentScore: 10000
        },
        {
            playerType: '稳定专家玩家',
            historicalScores: [12000, 12100, 11900, 12050, 11950, 12150, 11850, 12080, 11920, 12120],
            currentScore: 12000
        },
        {
            playerType: '不稳定专家玩家',
            historicalScores: [12000, 8000, 16000, 6000, 18000, 4000, 20000, 2000, 22000, 0],
            currentScore: 12000
        }
    ];

    return {
        success: true,
        presetPlayers: presetPlayers,
        count: presetPlayers.length,
        timestamp: new Date().toISOString()
    };
}

async function batchSimulatePlayers(players: any[]) {
    const simulation = new ConsistencyPlayerSimulation();
    const results = [];

    for (const playerData of players) {
        const player = {
            uid: `batch_${playerData.playerType}`,
            description: playerData.playerType,
            historicalScores: playerData.historicalScores,
            currentScore: playerData.currentScore
        };

        const averageScore = playerData.historicalScores.reduce((sum: number, score: number) => sum + score, 0) / playerData.historicalScores.length;
        const scoreRange = Math.max(...playerData.historicalScores) - Math.min(...playerData.historicalScores);
        const standardDeviation = Math.sqrt(
            playerData.historicalScores.reduce((sum: number, score: number) => sum + Math.pow(score - averageScore, 2), 0) / playerData.historicalScores.length
        );

        const consistency = (simulation as any).calculateConsistency(playerData.historicalScores);
        const skillImpact = (consistency - 0.5) * 0.2;
        const confidenceImpact = consistency * 0.2;
        const trend = (simulation as any).analyzeTrend(playerData.historicalScores);
        const rankingRecommendation = (simulation as any).getRankingRecommendation(consistency, skillImpact, trend);
        const detailedAnalysis = (simulation as any).generateDetailedAnalysis(
            player, consistency, skillImpact, confidenceImpact, trend
        );

        results.push({
            playerType: playerData.playerType,
            player,
            analysis: {
                averageScore: averageScore,
                scoreRange: scoreRange,
                standardDeviation: standardDeviation,
                consistency: consistency,
                consistencyDescription: (simulation as any).getConsistencyDescription(consistency),
                skillFactorImpact: skillImpact,
                confidenceImpact: confidenceImpact,
                trend: trend,
                rankingRecommendation: rankingRecommendation,
                detailedAnalysis: detailedAnalysis
            }
        });
    }

    const sortedResults = results.sort((a, b) => b.analysis.consistency - a.analysis.consistency);

    return {
        success: true,
        totalPlayers: players.length,
        results: results,
        sortedResults: sortedResults,
        timestamp: new Date().toISOString()
    };
}
