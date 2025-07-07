import { getTorontoDate } from "../../utils";
import { TournamentService } from "../tournamentService";
import { TestUtils } from "./testUtils";

/**
 * 测试 getAvailableTournaments 方法
 */
export class TestGetAvailableTournaments {

    /**
     * 运行所有测试
     */
    static async runAllTests(ctx: any) {
        console.log("=== 开始测试 getAvailableTournaments ===");

        const testResults = {
            passed: 0,
            failed: 0,
            tests: [] as any[]
        };

        try {
            // 测试1: 基础功能测试
            await this.testBasicFunctionality(ctx, testResults);

            // 测试2: 游戏类型过滤测试
            // await this.testGameTypeFilter(ctx, testResults);

            // // 测试3: 分类过滤测试
            // await this.testCategoryFilter(ctx, testResults);

            // // 测试4: 参赛资格测试
            // await this.testEligibilityCheck(ctx, testResults);

            // // 测试5: 参与统计测试
            // await this.testParticipationStats(ctx, testResults);

            // // 测试6: 段位限制测试
            // await this.testSegmentRestrictions(ctx, testResults);

            // // 测试7: 订阅要求测试
            // await this.testSubscriptionRequirements(ctx, testResults);

            // // 测试8: 入场费测试
            // await this.testEntryFeeRequirements(ctx, testResults);

        } catch (error) {
            console.error("测试过程中发生错误:", error);
            testResults.failed++;
        }

        console.log("=== 测试结果汇总 ===");
        console.log(`通过: ${testResults.passed}`);
        console.log(`失败: ${testResults.failed}`);
        console.log("详细结果:", testResults.tests);

        return testResults;
    }

    /**
     * 测试1: 基础功能测试
     */
    private static async testBasicFunctionality(ctx: any, testResults: any) {
        const testName = "基础功能测试";
        console.log(`\n--- ${testName} ---`);

        try {
            const testUid = TestUtils.generateTestUid("basic_test");
            const { playerId } = await TestUtils.initializeTestEnvironment(ctx, testUid);

            // 创建多个锦标赛类型
            await this.createTestTournamentTypes(ctx);

            // 调用 getAvailableTournaments
            const result = await TournamentService.getAvailableTournaments(ctx, {
                uid: testUid
            });

            // 验证结果
            if (result.success && Array.isArray(result.tournaments)) {
                console.log(`✓ 成功获取 ${result.tournaments.length} 个可用锦标赛`);
                console.log("result.tournaments", result.tournaments)
                // 验证每个锦标赛都有必要字段
                const validTournaments = result.tournaments.filter((t: any) =>
                    t.typeId && t.name && t.description && t.category && t.gameType
                );
                console.log("validTournaments", validTournaments.length)
                if (validTournaments.length === result.tournaments.length) {
                    console.log("✓ 所有锦标赛都有完整的必要字段");
                    testResults.passed++;
                    testResults.tests.push({ name: testName, status: "PASSED" });
                } else {
                    throw new Error("部分锦标赛缺少必要字段");
                }
            } else {
                throw new Error("返回结果格式不正确");
            }

            // 清理测试数据
            await TestUtils.cleanupTestData(ctx, playerId, testUid);

        } catch (error) {
            console.error(`✗ ${testName} 失败:`, error);
            testResults.failed++;
            testResults.tests.push({ name: testName, status: "FAILED", error: error instanceof Error ? error.message : "未知错误" });
        }
    }

    /**
     * 测试2: 游戏类型过滤测试
     */
    private static async testGameTypeFilter(ctx: any, testResults: any) {
        const testName = "游戏类型过滤测试";
        console.log(`\n--- ${testName} ---`);

        try {
            const testUid = TestUtils.generateTestUid("game_filter_test");
            const { playerId } = await TestUtils.initializeTestEnvironment(ctx, testUid);

            // 测试 solitaire 游戏类型过滤
            const solitaireResult = await TournamentService.getAvailableTournaments(ctx, {
                uid: testUid,
                gameType: "solitaire"
            });

            const allResult = await TournamentService.getAvailableTournaments(ctx, {
                uid: testUid
            });

            // 验证过滤结果
            if (solitaireResult.tournaments.length <= allResult.tournaments.length) {
                console.log("✓ 游戏类型过滤正常工作");

                // 验证所有返回的锦标赛都是指定游戏类型
                const allSolitaire = solitaireResult.tournaments.every((t: any) =>
                    t.gameType === "solitaire"
                );

                if (allSolitaire) {
                    console.log("✓ 所有返回的锦标赛都是 solitaire 类型");
                    testResults.passed++;
                    testResults.tests.push({ name: testName, status: "PASSED" });
                } else {
                    throw new Error("返回了非 solitaire 类型的锦标赛");
                }
            } else {
                throw new Error("过滤后的结果数量异常");
            }

            // 清理测试数据
            await TestUtils.cleanupTestData(ctx, playerId, testUid);

        } catch (error) {
            console.error(`✗ ${testName} 失败:`, error);
            testResults.failed++;
            testResults.tests.push({ name: testName, status: "FAILED", error: error instanceof Error ? error.message : "未知错误" });
        }
    }

    /**
     * 测试3: 分类过滤测试
     */
    private static async testCategoryFilter(ctx: any, testResults: any) {
        const testName = "分类过滤测试";
        console.log(`\n--- ${testName} ---`);

        try {
            const testUid = TestUtils.generateTestUid("category_filter_test");
            const { playerId } = await TestUtils.initializeTestEnvironment(ctx, testUid);

            // 测试 daily 分类过滤
            const dailyResult = await TournamentService.getAvailableTournaments(ctx, {
                uid: testUid,
                category: "daily"
            });

            const allResult = await TournamentService.getAvailableTournaments(ctx, {
                uid: testUid
            });

            // 验证过滤结果
            if (dailyResult.tournaments.length <= allResult.tournaments.length) {
                console.log("✓ 分类过滤正常工作");

                // 验证所有返回的锦标赛都是指定分类
                const allDaily = dailyResult.tournaments.every((t: any) =>
                    t.category === "daily"
                );

                if (allDaily) {
                    console.log("✓ 所有返回的锦标赛都是 daily 分类");
                    testResults.passed++;
                    testResults.tests.push({ name: testName, status: "PASSED" });
                } else {
                    throw new Error("返回了非 daily 分类的锦标赛");
                }
            } else {
                throw new Error("过滤后的结果数量异常");
            }

            // 清理测试数据
            await TestUtils.cleanupTestData(ctx, playerId, testUid);

        } catch (error) {
            console.error(`✗ ${testName} 失败:`, error);
            testResults.failed++;
            testResults.tests.push({ name: testName, status: "FAILED", error: error instanceof Error ? error.message : "未知错误" });
        }
    }

    /**
     * 测试4: 参赛资格测试
     */
    private static async testEligibilityCheck(ctx: any, testResults: any) {
        const testName = "参赛资格测试";
        console.log(`\n--- ${testName} ---`);

        try {
            const testUid = TestUtils.generateTestUid("eligibility_test");
            const { playerId } = await TestUtils.initializeTestEnvironment(ctx, testUid);

            const result = await TournamentService.getAvailableTournaments(ctx, {
                uid: testUid
            });

            // 验证每个锦标赛都有资格检查结果
            const hasEligibility = result.tournaments.every((t: any) =>
                t.eligibility && typeof t.eligibility.eligible === 'boolean'
            );

            if (hasEligibility) {
                console.log("✓ 所有锦标赛都有资格检查结果");

                // 检查是否有不合格的锦标赛
                const ineligibleTournaments = result.tournaments.filter((t: any) =>
                    !t.eligibility.eligible
                );

                if (ineligibleTournaments.length >= 0) {
                    console.log(`✓ 找到 ${ineligibleTournaments.length} 个不合格的锦标赛`);
                    testResults.passed++;
                    testResults.tests.push({ name: testName, status: "PASSED" });
                } else {
                    throw new Error("资格检查逻辑异常");
                }
            } else {
                throw new Error("部分锦标赛缺少资格检查结果");
            }

            // 清理测试数据
            await TestUtils.cleanupTestData(ctx, playerId, testUid);

        } catch (error) {
            console.error(`✗ ${testName} 失败:`, error);
            testResults.failed++;
            testResults.tests.push({ name: testName, status: "FAILED", error: error instanceof Error ? error.message : "未知错误" });
        }
    }

    /**
     * 测试5: 参与统计测试
     */
    private static async testParticipationStats(ctx: any, testResults: any) {
        const testName = "参与统计测试";
        console.log(`\n--- ${testName} ---`);

        try {
            const testUid = TestUtils.generateTestUid("participation_test");
            const { playerId } = await TestUtils.initializeTestEnvironment(ctx, testUid);

            const result = await TournamentService.getAvailableTournaments(ctx, {
                uid: testUid
            });

            // 验证每个锦标赛都有参与统计
            const hasStats = result.tournaments.every((t: any) =>
                t.participationStats &&
                typeof t.participationStats.dailyAttempts === 'number' &&
                typeof t.participationStats.weeklyAttempts === 'number' &&
                typeof t.participationStats.totalAttempts === 'number'
            );

            if (hasStats) {
                console.log("✓ 所有锦标赛都有参与统计");

                // 验证统计数据的合理性
                const validStats = result.tournaments.every((t: any) =>
                    t.participationStats.dailyAttempts >= 0 &&
                    t.participationStats.weeklyAttempts >= 0 &&
                    t.participationStats.totalAttempts >= 0
                );

                if (validStats) {
                    console.log("✓ 参与统计数据合理");
                    testResults.passed++;
                    testResults.tests.push({ name: testName, status: "PASSED" });
                } else {
                    throw new Error("参与统计数据不合理");
                }
            } else {
                throw new Error("部分锦标赛缺少参与统计");
            }

            // 清理测试数据
            await TestUtils.cleanupTestData(ctx, playerId, testUid);

        } catch (error) {
            console.error(`✗ ${testName} 失败:`, error);
            testResults.failed++;
            testResults.tests.push({ name: testName, status: "FAILED", error: error instanceof Error ? error.message : "未知错误" });
        }
    }

    /**
     * 测试6: 段位限制测试
     */
    private static async testSegmentRestrictions(ctx: any, testResults: any) {
        const testName = "段位限制测试";
        console.log(`\n--- ${testName} ---`);

        try {
            const testUid = TestUtils.generateTestUid("segment_test");

            // 创建青铜段位玩家
            const now = getTorontoDate();
            const playerId = await ctx.db.insert("players", {
                uid: testUid,
                displayName: "青铜测试用户",
                segmentName: "bronze",
                isActive: true,
                isSubscribed: false,
                totalPoints: 1000,
                eloScore: 1000,
                lastActive: now.iso,
                createdAt: now.iso,
                updatedAt: now.iso
            });

            // 创建用户库存
            await ctx.db.insert("player_inventory", {
                uid: testUid,
                coins: 1000,
                props: [],
                tickets: [],
                createdAt: now.iso,
                updatedAt: now.iso
            });

            // 创建高段位要求的锦标赛类型
            await ctx.db.insert("tournament_types", {
                typeId: "high_segment_tournament",
                name: "高段位锦标赛",
                description: "仅限高段位玩家参与",
                category: "ranked",
                handlerModule: "single_player_tournament",
                defaultConfig: {
                    entryRequirements: {
                        minSegment: "gold",
                        isSubscribedRequired: false,
                        entryFee: { coins: 100 }
                    },
                    rules: {
                        maxAttempts: 3,
                        isSingleMatch: true
                    },
                    duration: 24 * 60 * 60 * 1000
                },
                isActive: true,
                createdAt: now.iso,
                updatedAt: now.iso
            });

            const result = await TournamentService.getAvailableTournaments(ctx, {
                uid: testUid
            });

            // 查找高段位锦标赛
            const highSegmentTournament = result.tournaments.find((t: any) =>
                t.typeId === "high_segment_tournament"
            );

            if (highSegmentTournament && !highSegmentTournament.eligibility.eligible) {
                console.log("✓ 段位限制正确工作");
                testResults.passed++;
                testResults.tests.push({ name: testName, status: "PASSED" });
            } else {
                throw new Error("段位限制未正确工作");
            }

            // 清理测试数据
            await TestUtils.cleanupTestData(ctx, playerId, testUid);

        } catch (error) {
            console.error(`✗ ${testName} 失败:`, error);
            testResults.failed++;
            testResults.tests.push({ name: testName, status: "FAILED", error: error instanceof Error ? error.message : "未知错误" });
        }
    }

    /**
     * 测试7: 订阅要求测试
     */
    private static async testSubscriptionRequirements(ctx: any, testResults: any) {
        const testName = "订阅要求测试";
        console.log(`\n--- ${testName} ---`);

        try {
            const testUid = TestUtils.generateTestUid("subscription_test");

            // 创建非订阅玩家
            const now = getTorontoDate();
            const playerId = await ctx.db.insert("players", {
                uid: testUid,
                displayName: "非订阅测试用户",
                segmentName: "gold",
                isActive: true,
                isSubscribed: false, // 非订阅
                totalPoints: 1000,
                eloScore: 1000,
                lastActive: now.iso,
                createdAt: now.iso,
                updatedAt: now.iso
            });

            // 创建用户库存
            await ctx.db.insert("player_inventory", {
                uid: testUid,
                coins: 1000,
                props: [],
                tickets: [],
                createdAt: now.iso,
                updatedAt: now.iso
            });

            // 创建需要订阅的锦标赛类型
            await ctx.db.insert("tournament_types", {
                typeId: "subscription_required_tournament",
                name: "订阅专属锦标赛",
                description: "仅限订阅用户参与",
                category: "special",
                handlerModule: "single_player_tournament",
                defaultConfig: {
                    entryRequirements: {
                        minSegment: "bronze",
                        isSubscribedRequired: true, // 需要订阅
                        entryFee: { coins: 50 }
                    },
                    rules: {
                        maxAttempts: 3,
                        isSingleMatch: true
                    },
                    duration: 24 * 60 * 60 * 1000
                },
                isActive: true,
                createdAt: now.iso,
                updatedAt: now.iso
            });

            const result = await TournamentService.getAvailableTournaments(ctx, {
                uid: testUid
            });

            // 查找订阅要求锦标赛
            const subscriptionTournament = result.tournaments.find((t: any) =>
                t.typeId === "subscription_required_tournament"
            );

            if (subscriptionTournament && !subscriptionTournament.eligibility.eligible) {
                console.log("✓ 订阅要求正确工作");
                testResults.passed++;
                testResults.tests.push({ name: testName, status: "PASSED" });
            } else {
                throw new Error("订阅要求未正确工作");
            }

            // 清理测试数据
            await TestUtils.cleanupTestData(ctx, playerId, testUid);

        } catch (error) {
            console.error(`✗ ${testName} 失败:`, error);
            testResults.failed++;
            testResults.tests.push({ name: testName, status: "FAILED", error: error instanceof Error ? error.message : "未知错误" });
        }
    }

    /**
     * 测试8: 入场费测试
     */
    private static async testEntryFeeRequirements(ctx: any, testResults: any) {
        const testName = "入场费测试";
        console.log(`\n--- ${testName} ---`);

        try {
            const testUid = TestUtils.generateTestUid("entry_fee_test");

            // 创建金币不足的玩家
            const now = getTorontoDate();
            const playerId = await ctx.db.insert("players", {
                uid: testUid,
                displayName: "金币不足测试用户",
                segmentName: "gold",
                isActive: true,
                isSubscribed: false,
                totalPoints: 1000,
                eloScore: 1000,
                lastActive: now.iso,
                createdAt: now.iso,
                updatedAt: now.iso
            });

            // 创建金币不足的库存
            await ctx.db.insert("player_inventory", {
                uid: testUid,
                coins: 10, // 金币不足
                props: [],
                tickets: [],
                createdAt: now.iso,
                updatedAt: now.iso
            });

            // 创建高入场费的锦标赛类型
            await ctx.db.insert("tournament_types", {
                typeId: "high_entry_fee_tournament",
                name: "高入场费锦标赛",
                description: "需要大量金币参与",
                category: "special",
                handlerModule: "single_player_tournament",
                defaultConfig: {
                    entryRequirements: {
                        minSegment: "bronze",
                        isSubscribedRequired: false,
                        entryFee: { coins: 1000 } // 高入场费
                    },
                    rules: {
                        maxAttempts: 3,
                        isSingleMatch: true
                    },
                    duration: 24 * 60 * 60 * 1000
                },
                isActive: true,
                createdAt: now.iso,
                updatedAt: now.iso
            });

            const result = await TournamentService.getAvailableTournaments(ctx, {
                uid: testUid
            });

            // 查找高入场费锦标赛
            const highEntryFeeTournament = result.tournaments.find((t: any) =>
                t.typeId === "high_entry_fee_tournament"
            );

            if (highEntryFeeTournament && !highEntryFeeTournament.eligibility.eligible) {
                console.log("✓ 入场费要求正确工作");
                testResults.passed++;
                testResults.tests.push({ name: testName, status: "PASSED" });
            } else {
                throw new Error("入场费要求未正确工作");
            }

            // 清理测试数据
            await TestUtils.cleanupTestData(ctx, playerId, testUid);

        } catch (error) {
            console.error(`✗ ${testName} 失败:`, error);
            testResults.failed++;
            testResults.tests.push({ name: testName, status: "FAILED", error: error instanceof Error ? error.message : "未知错误" });
        }
    }

    /**
     * 创建测试用的锦标赛类型
     */
    private static async createTestTournamentTypes(ctx: any) {
        const now = getTorontoDate();

        // 检查是否已存在
        const existingTypes = await ctx.db
            .query("tournament_types")
            .filter((q: any) => q.eq(q.field("typeId"), "test_daily_solitaire"))
            .collect();

        if (existingTypes.length === 0) {
            // 创建测试用的锦标赛类型
            await ctx.db.insert("tournament_types", {
                typeId: "test_daily_solitaire",
                name: "测试每日纸牌锦标赛",
                description: "用于测试的每日纸牌锦标赛",
                gameType: "solitaire",
                category: "daily",
                handlerModule: "single_player_tournament",
                defaultConfig: {
                    entryRequirements: {
                        minSegment: "bronze",
                        isSubscribedRequired: false,
                        entryFee: { coins: 50 }
                    },
                    rules: {
                        maxAttempts: 3,
                        isSingleMatch: true
                    },
                    duration: 24 * 60 * 60 * 1000
                },
                isActive: true,
                createdAt: now.iso,
                updatedAt: now.iso
            });

            await ctx.db.insert("tournament_types", {
                typeId: "test_weekly_rummy",
                name: "测试每周拉米锦标赛",
                description: "用于测试的每周拉米锦标赛",
                category: "weekly",
                gameType: "rummy",
                handlerModule: "multi_player_tournament",
                defaultConfig: {
                    entryRequirements: {
                        minSegment: "bronze",
                        isSubscribedRequired: false,
                        entryFee: { coins: 100 }
                    },
                    rules: {
                        maxAttempts: 1,
                        isSingleMatch: false
                    },
                    duration: 7 * 24 * 60 * 60 * 1000
                },
                isActive: true,
                createdAt: now.iso,
                updatedAt: now.iso
            });

            console.log("创建了测试用的锦标赛类型");
        }
    }
} 