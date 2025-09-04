/**
 * 一致性计算测试的 Convex 函数
 * 用于在 Convex 环境中测试改进后的 calculateConsistency 方法
 */

import { v } from "convex/values";
import { mutation } from "../../../../_generated/server";
import { ConsistencyCalculationTestSuite } from "../test/ConsistencyCalculationTest";

/**
 * 运行所有一致性计算测试
 */
export const runConsistencyTests = mutation({
    args: {},
    handler: async (ctx) => {
        console.log("🧪 开始一致性计算测试...");

        try {
            const testSuite = new ConsistencyCalculationTestSuite();
            await testSuite.runAllConsistencyTests();

            console.log("✅ 所有一致性计算测试通过！");
            return {
                success: true,
                message: "所有一致性计算测试通过",
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error("❌ 一致性计算测试失败:", error);
            return {
                success: false,
                message: `测试失败: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date().toISOString()
            };
        }
    }
});

/**
 * 测试特定的一致性计算场景
 */
export const testSpecificConsistencyScenario = mutation({
    args: {
        scores: v.array(v.number()),
        scenario: v.string()
    },
    handler: async (ctx, { scores, scenario }) => {
        console.log(`🧪 测试特定一致性场景: ${scenario}`);
        console.log(`📊 分数: [${scores.join(', ')}]`);

        try {
            const testSuite = new ConsistencyCalculationTestSuite();

            // 通过反射调用私有方法
            const consistency = (testSuite as any).callPrivateMethod('calculateConsistency', [scores]);

            console.log(`✅ 一致性分数: ${consistency.toFixed(3)}`);

            return {
                success: true,
                scenario,
                scores,
                consistency: consistency,
                interpretation: getConsistencyInterpretation(consistency),
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error("❌ 特定场景测试失败:", error);
            return {
                success: false,
                message: `测试失败: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date().toISOString()
            };
        }
    }
});

/**
 * 比较不同一致性计算方法的差异
 */
export const compareConsistencyMethods = mutation({
    args: {
        scores: v.array(v.number())
    },
    handler: async (ctx, { scores }) => {
        console.log("🧪 比较不同一致性计算方法...");
        console.log(`📊 测试分数: [${scores.join(', ')}]`);

        try {
            const testSuite = new ConsistencyCalculationTestSuite();

            // 新方法（改进后）
            const newConsistency = (testSuite as any).callPrivateMethod('calculateConsistency', [scores]);

            // 旧方法（简单版本）
            const oldConsistency = calculateOldConsistency(scores);

            console.log(`✅ 新方法一致性: ${newConsistency.toFixed(3)}`);
            console.log(`✅ 旧方法一致性: ${oldConsistency.toFixed(3)}`);
            console.log(`📈 差异: ${((newConsistency - oldConsistency) * 100).toFixed(1)}%`);

            return {
                success: true,
                scores,
                newMethod: {
                    consistency: newConsistency,
                    interpretation: getConsistencyInterpretation(newConsistency)
                },
                oldMethod: {
                    consistency: oldConsistency,
                    interpretation: getConsistencyInterpretation(oldConsistency)
                },
                difference: newConsistency - oldConsistency,
                differencePercent: ((newConsistency - oldConsistency) / oldConsistency * 100),
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error("❌ 方法比较测试失败:", error);
            return {
                success: false,
                message: `测试失败: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date().toISOString()
            };
        }
    }
});

/**
 * 测试时间权重对一致性的影响
 */
export const testTimeWeightingImpact = mutation({
    args: {},
    handler: async (ctx) => {
        console.log("🧪 测试时间权重对一致性的影响...");

        try {
            const testSuite = new ConsistencyCalculationTestSuite();

            // 测试场景1：最近表现更好
            const scores1 = [500, 500, 500, 500, 1000, 1000, 1000, 1000, 1000, 1000];
            const consistency1 = (testSuite as any).callPrivateMethod('calculateConsistency', [scores1]);

            // 测试场景2：最近表现更差
            const scores2 = [1000, 1000, 1000, 1000, 1000, 1000, 500, 500, 500, 500];
            const consistency2 = (testSuite as any).callPrivateMethod('calculateConsistency', [scores2]);

            // 测试场景3：表现稳定
            const scores3 = [1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000];
            const consistency3 = (testSuite as any).callPrivateMethod('calculateConsistency', [scores3]);

            console.log(`✅ 最近表现更好: ${consistency1.toFixed(3)}`);
            console.log(`✅ 最近表现更差: ${consistency2.toFixed(3)}`);
            console.log(`✅ 表现稳定: ${consistency3.toFixed(3)}`);

            return {
                success: true,
                scenarios: [
                    {
                        name: "最近表现更好",
                        scores: scores1,
                        consistency: consistency1,
                        interpretation: getConsistencyInterpretation(consistency1)
                    },
                    {
                        name: "最近表现更差",
                        scores: scores2,
                        consistency: consistency2,
                        interpretation: getConsistencyInterpretation(consistency2)
                    },
                    {
                        name: "表现稳定",
                        scores: scores3,
                        consistency: consistency3,
                        interpretation: getConsistencyInterpretation(consistency3)
                    }
                ],
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error("❌ 时间权重影响测试失败:", error);
            return {
                success: false,
                message: `测试失败: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date().toISOString()
            };
        }
    }
});

// ==================== 辅助函数 ====================

/**
 * 旧的一致性计算方法（用于比较）
 */
function calculateOldConsistency(scores: number[]): number {
    if (scores.length < 3) return 0.5;

    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    if (mean === 0) return 0.5;

    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const standardDeviation = Math.sqrt(variance);

    return Math.max(0, Math.min(1, 1 - (standardDeviation / mean)));
}

/**
 * 获取一致性分数的解释
 */
function getConsistencyInterpretation(consistency: number): string {
    if (consistency >= 0.9) return "极高一致性 - 表现非常稳定";
    if (consistency >= 0.8) return "高一致性 - 表现稳定";
    if (consistency >= 0.6) return "中等一致性 - 表现较为稳定";
    if (consistency >= 0.4) return "低一致性 - 表现不够稳定";
    return "极低一致性 - 表现很不稳定";
}
