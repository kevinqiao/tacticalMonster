// @ts-nocheck
import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { SegmentScoringSystem } from "./segmentScoringSystem";

// 测试段位积分系统
export class TestSegmentScoring {

    /**
     * 测试新手保护机制
     */
    static testNewPlayerProtection() {
        console.log("=== 测试新手保护机制 ===");

        const testCases = [
            {
                playerSegment: "bronze",
                opponentSegment: "silver",
                playerScore: 800,
                opponentScore: 1200,
                isWin: false,
                playerStreak: 0,
                description: "青铜段位挑战白银失败"
            },
            {
                playerSegment: "bronze",
                opponentSegment: "gold",
                playerScore: 600,
                opponentScore: 1400,
                isWin: false,
                playerStreak: 0,
                description: "青铜段位挑战黄金失败"
            }
        ];

        testCases.forEach(testCase => {
            const result = SegmentScoringSystem.calculatePointsChange(null, testCase);
            console.log(`${testCase.description}:`);
            console.log(`  积分变化: ${result.pointsChange}`);
            console.log(`  原因: ${result.reason}`);
            console.log(`  是否保护: ${result.pointsChange === 0 ? "是" : "否"}`);
            console.log("");
        });
    }

    /**
     * 测试连胜保护机制
     */
    static testStreakProtection() {
        console.log("=== 测试连胜保护机制 ===");

        const testCases = [
            {
                playerSegment: "gold",
                opponentSegment: "gold",
                playerScore: 1000,
                opponentScore: 1200,
                isWin: false,
                playerStreak: 3,
                description: "3连胜后失败"
            },
            {
                playerSegment: "gold",
                opponentSegment: "gold",
                playerScore: 1000,
                opponentScore: 1200,
                isWin: false,
                playerStreak: 5,
                description: "5连胜后失败"
            },
            {
                playerSegment: "gold",
                opponentSegment: "gold",
                playerScore: 1000,
                opponentScore: 1200,
                isWin: false,
                playerStreak: 10,
                description: "10连胜后失败"
            },
            {
                playerSegment: "gold",
                opponentSegment: "gold",
                playerScore: 1000,
                opponentScore: 1200,
                isWin: false,
                playerStreak: 0,
                description: "无连胜失败"
            }
        ];

        testCases.forEach(testCase => {
            const result = SegmentScoringSystem.calculatePointsChange(null, testCase);
            console.log(`${testCase.description}:`);
            console.log(`  积分变化: ${result.pointsChange}`);
            console.log(`  原因: ${result.reason}`);
            console.log(`  连胜奖励: ${result.streakBonus}`);
            console.log("");
        });
    }

    /**
     * 测试挑战高段位保护
     */
    static testChallengeHigherProtection() {
        console.log("=== 测试挑战高段位保护 ===");

        const testCases = [
            {
                playerSegment: "silver",
                opponentSegment: "gold",
                playerScore: 1000,
                opponentScore: 1200,
                isWin: false,
                playerStreak: 0,
                description: "白银挑战黄金失败"
            },
            {
                playerSegment: "silver",
                opponentSegment: "platinum",
                playerScore: 1000,
                opponentScore: 1200,
                isWin: false,
                playerStreak: 0,
                description: "白银挑战铂金失败"
            },
            {
                playerSegment: "gold",
                opponentSegment: "master",
                playerScore: 1000,
                opponentScore: 1200,
                isWin: false,
                playerStreak: 0,
                description: "黄金挑战大师失败"
            }
        ];

        testCases.forEach(testCase => {
            const result = SegmentScoringSystem.calculatePointsChange(null, testCase);
            console.log(`${testCase.description}:`);
            console.log(`  积分变化: ${result.pointsChange}`);
            console.log(`  原因: ${result.reason}`);
            console.log(`  段位乘数: ${result.segmentMultiplier}`);
            console.log("");
        });
    }

    /**
     * 测试胜利积分奖励
     */
    static testWinPointsReward() {
        console.log("=== 测试胜利积分奖励 ===");

        const testCases = [
            {
                playerSegment: "gold",
                opponentSegment: "gold",
                playerScore: 1200,
                opponentScore: 1000,
                isWin: true,
                playerStreak: 0,
                description: "同段位胜利"
            },
            {
                playerSegment: "gold",
                opponentSegment: "platinum",
                playerScore: 1200,
                opponentScore: 1000,
                isWin: true,
                playerStreak: 0,
                description: "击败高段位"
            },
            {
                playerSegment: "gold",
                opponentSegment: "gold",
                playerScore: 1500,
                opponentScore: 800,
                isWin: true,
                playerStreak: 5,
                description: "大胜+连胜"
            },
            {
                playerSegment: "gold",
                opponentSegment: "master",
                playerScore: 1400,
                opponentScore: 900,
                isWin: true,
                playerStreak: 10,
                description: "击败大师+10连胜"
            }
        ];

        testCases.forEach(testCase => {
            const result = SegmentScoringSystem.calculatePointsChange(null, testCase);
            console.log(`${testCase.description}:`);
            console.log(`  积分变化: ${result.pointsChange}`);
            console.log(`  基础积分: ${result.basePoints}`);
            console.log(`  段位乘数: ${result.segmentMultiplier}`);
            console.log(`  连胜奖励: ${result.streakBonus}`);
            console.log(`  原因: ${result.reason}`);
            console.log("");
        });
    }

    /**
     * 测试不同段位的失败扣分
     */
    static testSegmentLosePoints() {
        console.log("=== 测试不同段位失败扣分 ===");

        const segments = ["silver", "gold", "platinum", "diamond", "master"];

        segments.forEach(segment => {
            const testCase = {
                playerSegment: segment,
                opponentSegment: segment,
                playerScore: 1000,
                opponentScore: 1200,
                isWin: false,
                playerStreak: 0,
                description: `${segment}段位失败`
            };

            const result = SegmentScoringSystem.calculatePointsChange(null, testCase);
            console.log(`${testCase.description}:`);
            console.log(`  积分变化: ${result.pointsChange}`);
            console.log(`  基础积分: ${result.basePoints}`);
            console.log(`  段位乘数: ${result.segmentMultiplier}`);
            console.log("");
        });
    }

    /**
     * 测试连胜状态更新
     */
    static testStreakUpdate() {
        console.log("=== 测试连胜状态更新 ===");

        const testCases = [
            { currentStreak: 0, isWin: true, description: "无连胜状态胜利" },
            { currentStreak: 2, isWin: true, description: "2连胜后继续胜利" },
            { currentStreak: 5, isWin: true, description: "5连胜后继续胜利" },
            { currentStreak: 10, isWin: true, description: "10连胜后继续胜利" },
            { currentStreak: 3, isWin: false, description: "3连胜后失败" },
            { currentStreak: 0, isWin: false, description: "无连胜状态失败" },
            { currentStreak: -2, isWin: false, description: "2连败后继续失败" }
        ];

        testCases.forEach(testCase => {
            const result = SegmentScoringSystem.updateStreak(testCase.currentStreak, testCase.isWin);
            console.log(`${testCase.description}:`);
            console.log(`  原连胜: ${testCase.currentStreak}`);
            console.log(`  新连胜: ${result.newStreak}`);
            console.log(`  连胜类型: ${result.streakType}`);
            console.log("");
        });
    }

    /**
     * 测试降级保护机制
     */
    static testDemotionProtection() {
        console.log("=== 测试降级保护机制 ===");

        const testCases = [
            {
                currentSegment: "gold",
                currentPoints: 2500,
                newPoints: 2400,
                protectionMatchesRemaining: 3,
                description: "黄金段位积分不足但有保护"
            },
            {
                currentSegment: "gold",
                currentPoints: 2500,
                newPoints: 2400,
                protectionMatchesRemaining: 0,
                description: "黄金段位积分不足且无保护"
            },
            {
                currentSegment: "platinum",
                currentPoints: 5000,
                newPoints: 4900,
                protectionMatchesRemaining: 1,
                description: "铂金段位积分不足但有保护"
            }
        ];

        testCases.forEach(testCase => {
            const result = SegmentScoringSystem.checkDemotionProtection(testCase);
            console.log(`${testCase.description}:`);
            console.log(`  需要保护: ${result.needsProtection}`);
            console.log(`  使用保护: ${result.protectionUsed}`);
            console.log(`  最终积分: ${result.finalPoints}`);
            console.log("");
        });
    }

    /**
     * 运行所有测试
     */
    static runAllTests() {
        console.log("🚀 开始测试段位积分系统");
        console.log("=" * 50);

        this.testNewPlayerProtection();
        this.testStreakProtection();
        this.testChallengeHigherProtection();
        this.testWinPointsReward();
        this.testSegmentLosePoints();
        this.testStreakUpdate();
        this.testDemotionProtection();

        console.log("✅ 所有测试完成");
    }

    /**
     * 生成测试报告
     */
    static generateTestReport() {
        const report = {
            systemName: "段位积分系统",
            designPhilosophy: "混合设计 - 平衡玩家体验与竞争性",
            keyFeatures: {
                newPlayerProtection: {
                    description: "青铜段位失败不扣分",
                    benefit: "降低新手挫败感，鼓励尝试"
                },
                streakProtection: {
                    description: "连胜后失败扣分减少",
                    benefit: "奖励持续表现，保持动力"
                },
                challengeProtection: {
                    description: "挑战高段位失败不扣分",
                    benefit: "鼓励挑战，提升竞争性"
                },
                segmentMultiplier: {
                    description: "段位差异影响积分",
                    benefit: "保持段位价值，反映真实实力"
                }
            },
            balanceMechanisms: {
                winPoints: "胜利积分适中，避免通货膨胀",
                losePoints: "失败扣分合理，保持竞争压力",
                protectionLimits: "保护机制有限制，防止滥用"
            }
        };

        return report;
    }
}

// ===== Convex 函数接口 =====

// 运行积分系统测试
export const runSegmentScoringTests = (mutation as any)({
    args: {},
    handler: async (ctx: any) => {
        try {
            // 在服务器端运行测试
            TestSegmentScoring.runAllTests();

            return {
                success: true,
                message: "段位积分系统测试完成",
                report: TestSegmentScoring.generateTestReport()
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: "测试执行失败"
            };
        }
    }
});

// 获取测试报告
export const getSegmentScoringReport = (query as any)({
    args: {},
    handler: async (ctx: any) => {
        return {
            success: true,
            report: TestSegmentScoring.generateTestReport()
        };
    }
});

// 测试特定场景
export const testSpecificScenario = (mutation as any)({
    args: {
        playerSegment: v.string(),
        opponentSegment: v.string(),
        playerScore: v.number(),
        opponentScore: v.number(),
        isWin: v.boolean(),
        playerStreak: v.number(),
        matchType: v.optional(v.string())
    },
    handler: async (ctx: any, args: any) => {
        try {
            const result = SegmentScoringSystem.calculatePointsChange(ctx, args);

            return {
                success: true,
                scenario: {
                    playerSegment: args.playerSegment,
                    opponentSegment: args.opponentSegment,
                    playerScore: args.playerScore,
                    opponentScore: args.opponentScore,
                    isWin: args.isWin,
                    playerStreak: args.playerStreak,
                    matchType: args.matchType || "normal"
                },
                result: result,
                analysis: {
                    isProtected: result.pointsChange === 0,
                    protectionType: result.reason.includes("保护") ? result.reason : "无保护",
                    competitiveness: result.pointsChange < 0 ? "保持竞争性" : "降低竞争性"
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}); 