// @ts-nocheck
import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { SoftSegmentSystem } from "./softSegmentSystem";

// 测试软性段位系统
export class TestSoftSegmentSystem {

    /**
     * 测试失败不扣SP机制
     */
    static testNoSPLossOnFailure() {
        console.log("=== 测试失败不扣SP机制 ===");

        const testCases = [
            {
                playerSegment: "bronze",
                opponentSegment: "gold",
                playerScore: 800,
                opponentScore: 1200,
                isWin: false,
                playerStreak: 0,
                description: "青铜段位失败"
            },
            {
                playerSegment: "master",
                opponentSegment: "diamond",
                playerScore: 1000,
                opponentScore: 1500,
                isWin: false,
                playerStreak: 5,
                description: "大师段位失败"
            },
            {
                playerSegment: "gold",
                opponentSegment: "platinum",
                playerScore: 900,
                opponentScore: 1400,
                isWin: false,
                playerStreak: 10,
                description: "黄金段位10连胜后失败"
            }
        ];

        testCases.forEach(testCase => {
            const result = SoftSegmentSystem.calculateSPChange(testCase);
            console.log(`${testCase.description}:`);
            console.log(`  SP变化: ${result.spChange}`);
            console.log(`  原因: ${result.reason}`);
            console.log(`  是否记录比赛: ${result.matchRecorded}`);
            console.log("");
        });
    }

    /**
     * 测试胜利SP奖励
     */
    static testWinSPReward() {
        console.log("=== 测试胜利SP奖励 ===");

        const testCases = [
            {
                playerSegment: "gold",
                opponentSegment: "gold",
                playerScore: 1200,
                opponentScore: 1000,
                isWin: true,
                playerStreak: 0,
                matchType: "normal",
                description: "同段位普通比赛胜利"
            },
            {
                playerSegment: "gold",
                opponentSegment: "platinum",
                playerScore: 1200,
                opponentScore: 1000,
                isWin: true,
                playerStreak: 0,
                matchType: "tournament",
                description: "击败高段位锦标赛胜利"
            },
            {
                playerSegment: "diamond",
                opponentSegment: "master",
                playerScore: 1500,
                opponentScore: 800,
                isWin: true,
                playerStreak: 10,
                matchType: "master_challenge",
                description: "击败大师10连胜挑战赛"
            }
        ];

        testCases.forEach(testCase => {
            const result = SoftSegmentSystem.calculateSPChange(testCase);
            console.log(`${testCase.description}:`);
            console.log(`  SP变化: ${result.spChange}`);
            console.log(`  基础SP: ${result.baseSP}`);
            console.log(`  段位乘数: ${result.segmentMultiplier}`);
            console.log(`  比赛类型乘数: ${result.typeMultiplier}`);
            console.log(`  原因: ${result.reason}`);
            console.log("");
        });
    }

    /**
     * 测试不活跃惩罚
     */
    static testInactivityPenalty() {
        console.log("=== 测试不活跃惩罚 ===");

        const now = new Date();
        const testCases = [
            {
                lastActivityDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5天前
                currentSegment: "bronze",
                currentSP: 500,
                description: "青铜段位5天未参与"
            },
            {
                lastActivityDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10天前
                currentSegment: "silver",
                currentSP: 1500,
                description: "白银段位10天未参与"
            },
            {
                lastActivityDate: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000).toISOString(), // 21天前
                currentSegment: "gold",
                currentSP: 3000,
                description: "黄金段位3周未参与"
            },
            {
                lastActivityDate: new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000).toISOString(), // 35天前
                currentSegment: "master",
                currentSP: 25000,
                description: "大师段位5周未参与"
            }
        ];

        testCases.forEach(testCase => {
            const result = SoftSegmentSystem.checkInactivityPenalty({
                lastActivityDate: testCase.lastActivityDate,
                currentSegment: testCase.currentSegment,
                currentSP: testCase.currentSP,
                currentDate: now.toISOString()
            });

            console.log(`${testCase.description}:`);
            console.log(`  是否有惩罚: ${result.hasPenalty}`);
            console.log(`  惩罚金额: ${result.penaltyAmount}`);
            console.log(`  原因: ${result.reason}`);
            if (result.hasPenalty) {
                console.log(`  新SP: ${result.newSP}`);
                console.log(`  不活跃周数: ${result.weeksInactive}`);
                console.log(`  惩罚比例: ${result.penaltyPercentage * 100}%`);
            }
            console.log("");
        });
    }

    /**
     * 测试回归奖励
     */
    static testReturnReward() {
        console.log("=== 测试回归奖励 ===");

        const testCases = [
            {
                daysInactive: 5,
                currentSegment: "silver",
                description: "5天未参与回归"
            },
            {
                daysInactive: 14,
                currentSegment: "gold",
                description: "2周未参与回归"
            },
            {
                daysInactive: 35,
                currentSegment: "platinum",
                description: "5周未参与回归"
            },
            {
                daysInactive: 70,
                currentSegment: "diamond",
                description: "10周未参与回归"
            }
        ];

        testCases.forEach(testCase => {
            const result = SoftSegmentSystem.calculateReturnReward({
                daysInactive: testCase.daysInactive,
                currentSegment: testCase.currentSegment
            });

            console.log(`${testCase.description}:`);
            console.log(`  是否有奖励: ${result.hasReward}`);
            if (result.hasReward) {
                console.log(`  SP奖励: ${result.spReward}`);
                console.log(`  门票奖励: ${result.ticketReward}`);
                console.log(`  道具奖励: ${result.propReward}`);
                console.log(`  不活跃周数: ${result.weeksInactive}`);
                console.log(`  奖励倍数: ${result.multiplier}`);
            }
            console.log(`  原因: ${result.reason}`);
            console.log("");
        });
    }

    /**
     * 测试大师维护
     */
    static testMasterMaintenance() {
        console.log("=== 测试大师维护 ===");

        const testCases = [
            {
                currentSegment: "master",
                currentSP: 2500,
                weeklyTournamentCount: 5,
                description: "大师段位维护良好"
            },
            {
                currentSegment: "master",
                currentSP: 1800,
                weeklyTournamentCount: 5,
                description: "大师段位SP不足"
            },
            {
                currentSegment: "master",
                currentSP: 2500,
                weeklyTournamentCount: 1,
                description: "大师段位锦标赛不足"
            },
            {
                currentSegment: "master",
                currentSP: 1500,
                weeklyTournamentCount: 0,
                description: "大师段位SP不足且锦标赛不足"
            },
            {
                currentSegment: "diamond",
                currentSP: 15000,
                weeklyTournamentCount: 3,
                description: "钻石段位（非大师）"
            }
        ];

        testCases.forEach(testCase => {
            const result = SoftSegmentSystem.checkMasterMaintenance({
                currentSegment: testCase.currentSegment,
                currentSP: testCase.currentSP,
                weeklyTournamentCount: testCase.weeklyTournamentCount,
                currentDate: new Date().toISOString()
            });

            console.log(`${testCase.description}:`);
            console.log(`  是否大师: ${result.isMaster}`);
            console.log(`  需要维护: ${result.maintenanceRequired}`);
            console.log(`  原因: ${result.reason}`);

            if (result.demotionRequired) {
                console.log(`  需要降级: 是`);
                console.log(`  新段位: ${result.newSegment}`);
                console.log(`  新SP: ${result.newSP}`);
            }

            if (result.maintenanceReward) {
                console.log(`  维护奖励: ${result.maintenanceReward.spReward} SP + ${result.maintenanceReward.ticketReward} 高级门票 + ${result.maintenanceReward.propReward} 进阶道具`);
            }
            console.log("");
        });
    }

    /**
     * 测试段位晋升
     */
    static testPromotion() {
        console.log("=== 测试段位晋升 ===");

        const testCases = [
            {
                currentSegment: "bronze",
                currentSP: 1200,
                description: "青铜晋升白银"
            },
            {
                currentSegment: "silver",
                currentSP: 3000,
                description: "白银晋升黄金"
            },
            {
                currentSegment: "gold",
                currentSP: 6000,
                description: "黄金晋升铂金"
            },
            {
                currentSegment: "platinum",
                currentSP: 12000,
                description: "铂金晋升钻石"
            },
            {
                currentSegment: "diamond",
                currentSP: 22000,
                description: "钻石晋升大师"
            },
            {
                currentSegment: "gold",
                currentSP: 2000,
                description: "黄金段位SP不足"
            }
        ];

        testCases.forEach(testCase => {
            const result = SoftSegmentSystem.calculatePromotion({
                currentSegment: testCase.currentSegment,
                currentSP: testCase.currentSP,
                currentDate: new Date().toISOString()
            });

            console.log(`${testCase.description}:`);
            console.log(`  可以晋升: ${result.canPromote}`);
            if (result.canPromote) {
                console.log(`  原段位: ${result.oldSegment}`);
                console.log(`  新段位: ${result.newSegment}`);
            }
            console.log(`  原因: ${result.reason}`);
            console.log("");
        });
    }

    /**
     * 运行所有测试
     */
    static runAllTests() {
        console.log("🚀 开始测试软性段位系统");
        console.log("=" * 50);

        this.testNoSPLossOnFailure();
        this.testWinSPReward();
        this.testInactivityPenalty();
        this.testReturnReward();
        this.testMasterMaintenance();
        this.testPromotion();

        console.log("✅ 所有测试完成");
    }

    /**
     * 生成系统特性报告
     */
    static generateSystemReport() {
        const report = {
            systemName: "软性段位系统",
            designPhilosophy: "失败不扣SP，专注长期活跃度管理",
            keyFeatures: {
                noSPLossOnFailure: {
                    description: "失败不扣SP",
                    benefit: "完全消除挫败感，鼓励尝试"
                },
                inactivityPenalty: {
                    description: "不活跃惩罚（仅SP）",
                    benefit: "保持活跃度，不强制降级"
                },
                returnReward: {
                    description: "回归奖励机制",
                    benefit: "鼓励流失玩家回归"
                },
                masterMaintenance: {
                    description: "大师段位维护要求",
                    benefit: "保持大师段位价值"
                }
            },
            advantages: [
                "完全消除失败挫败感",
                "鼓励玩家尝试新策略",
                "保持段位稳定性",
                "通过活跃度管理而非强制降级",
                "回归奖励促进玩家回流",
                "大师段位有明确维护要求"
            ],
            targetAudience: {
                casual: "休闲玩家 - 无压力游戏",
                competitive: "竞技玩家 - 通过活跃度保持段位",
                returning: "回归玩家 - 获得奖励鼓励"
            }
        };

        return report;
    }
}

// ===== Convex 函数接口 =====

// 运行软性段位系统测试
export const runSoftSegmentTests = (mutation as any)({
    args: {},
    handler: async (ctx: any) => {
        try {
            // 在服务器端运行测试
            TestSoftSegmentSystem.runAllTests();

            return {
                success: true,
                message: "软性段位系统测试完成",
                report: TestSoftSegmentSystem.generateSystemReport()
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

// 获取软性段位系统报告
export const getSoftSegmentReport = (query as any)({
    args: {},
    handler: async (ctx: any) => {
        return {
            success: true,
            report: TestSoftSegmentSystem.generateSystemReport()
        };
    }
});

// 测试特定场景
export const testSoftSegmentScenario = (mutation as any)({
    args: {
        playerSegment: v.string(),
        opponentSegment: v.string(),
        playerScore: v.number(),
        opponentScore: v.number(),
        isWin: v.boolean(),
        playerStreak: v.number(),
        matchType: v.optional(v.string()),
        daysInactive: v.optional(v.number()),
        weeklyTournamentCount: v.optional(v.number())
    },
    handler: async (ctx: any, args: any) => {
        try {
            const spResult = SoftSegmentSystem.calculateSPChange(args);

            let inactivityResult = null;
            if (args.daysInactive) {
                inactivityResult = SoftSegmentSystem.checkInactivityPenalty({
                    lastActivityDate: new Date(Date.now() - args.daysInactive * 24 * 60 * 60 * 1000).toISOString(),
                    currentSegment: args.playerSegment,
                    currentSP: 2000, // 假设当前SP
                    currentDate: new Date().toISOString()
                });
            }

            let maintenanceResult = null;
            if (args.weeklyTournamentCount !== undefined) {
                maintenanceResult = SoftSegmentSystem.checkMasterMaintenance({
                    currentSegment: args.playerSegment,
                    currentSP: 2000, // 假设当前SP
                    weeklyTournamentCount: args.weeklyTournamentCount,
                    currentDate: new Date().toISOString()
                });
            }

            return {
                success: true,
                scenario: {
                    playerSegment: args.playerSegment,
                    opponentSegment: args.opponentSegment,
                    playerScore: args.playerScore,
                    opponentScore: args.opponentScore,
                    isWin: args.isWin,
                    playerStreak: args.playerStreak,
                    matchType: args.matchType || "normal",
                    daysInactive: args.daysInactive,
                    weeklyTournamentCount: args.weeklyTournamentCount
                },
                spResult: spResult,
                inactivityResult: inactivityResult,
                maintenanceResult: maintenanceResult,
                analysis: {
                    noSPLoss: spResult.spChange === 0 && !args.isWin,
                    systemBenefit: "失败不扣SP，专注长期活跃度管理"
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