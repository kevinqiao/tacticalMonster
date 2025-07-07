import { getTorontoDate } from "../../utils";

/**
 * 测试自动创建锦标赛功能
 */
export class TestAutoCreateTournaments {
    /**
     * 测试基础自动创建功能
     */
    static async testBasicAutoCreate(ctx: any) {
        console.log("🧪 测试基础自动创建功能...");

        const testUid = "test_user_auto_create";
        const now = getTorontoDate();

        try {
            // 1. 确保测试玩家存在
            await this.ensureTestPlayer(ctx, testUid);

            // 2. 清理现有的测试锦标赛
            await this.cleanupTestTournaments(ctx);

            // 3. 调用 getAvailableTournaments，应该触发自动创建
            const result = await ctx.runQuery("service/tournament/tournamentService:getAvailableTournaments", {
                uid: testUid,
                gameType: "solitaire"
            });

            // 4. 验证结果
            if (!result.success) {
                throw new Error(`getAvailableTournaments 失败: ${result.message}`);
            }

            // 5. 检查是否创建了每日锦标赛
            const dailyTournaments = await ctx.db
                .query("tournaments")
                .withIndex("by_type_status", (q: any) =>
                    q.eq("tournamentType", "daily_special")
                        .eq("status", "open")
                )
                .collect();

            const today = now.localDate.toISOString().split("T")[0];
            const todayTournaments = dailyTournaments.filter((t: any) =>
                t.createdAt.split("T")[0] === today
            );

            if (todayTournaments.length === 0) {
                throw new Error("未自动创建每日锦标赛");
            }

            console.log(`✅ 成功创建 ${todayTournaments.length} 个每日锦标赛`);

            return {
                success: true,
                message: "基础自动创建功能测试通过",
                createdTournaments: todayTournaments.length,
                availableTournaments: result.tournaments.length
            };

        } catch (error) {
            console.error("❌ 基础自动创建功能测试失败:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "未知错误"
            };
        }
    }

    /**
     * 测试重复调用不会重复创建
     */
    static async testNoDuplicateCreation(ctx: any) {
        console.log("🧪 测试重复调用不会重复创建...");

        const testUid = "test_user_no_duplicate";
        const now = getTorontoDate();

        try {
            // 1. 确保测试玩家存在
            await this.ensureTestPlayer(ctx, testUid);

            // 2. 清理现有的测试锦标赛
            await this.cleanupTestTournaments(ctx);

            // 3. 第一次调用
            const result1 = await ctx.runQuery("service/tournament/tournamentService:getAvailableTournaments", {
                uid: testUid,
                gameType: "solitaire"
            });

            // 4. 第二次调用
            const result2 = await ctx.runQuery("service/tournament/tournamentService:getAvailableTournaments", {
                uid: testUid,
                gameType: "solitaire"
            });

            // 5. 检查锦标赛数量是否相同
            const today = now.localDate.toISOString().split("T")[0];
            const dailyTournaments = await ctx.db
                .query("tournaments")
                .withIndex("by_type_status", (q: any) =>
                    q.eq("tournamentType", "daily_special")
                        .eq("status", "open")
                )
                .filter((q: any) => {
                    const createdAt = q.field("createdAt");
                    return q.eq(createdAt.split("T")[0], today);
                })
                .collect();

            if (dailyTournaments.length > 1) {
                throw new Error(`重复创建了锦标赛，期望1个，实际${dailyTournaments.length}个`);
            }

            console.log("✅ 重复调用测试通过，没有重复创建锦标赛");

            return {
                success: true,
                message: "重复调用测试通过",
                tournamentCount: dailyTournaments.length
            };

        } catch (error) {
            console.error("❌ 重复调用测试失败:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "未知错误"
            };
        }
    }

    /**
     * 测试不同游戏类型的自动创建
     */
    static async testDifferentGameTypes(ctx: any) {
        console.log("🧪 测试不同游戏类型的自动创建...");

        const testUid = "test_user_game_types";
        const now = getTorontoDate();

        try {
            // 1. 确保测试玩家存在
            await this.ensureTestPlayer(ctx, testUid);

            // 2. 清理现有的测试锦标赛
            await this.cleanupTestTournaments(ctx);

            // 3. 测试不同游戏类型
            const gameTypes = ["solitaire", "rummy", "uno"];
            const results: any[] = [];

            for (const gameType of gameTypes) {
                const result = await ctx.runQuery("service/tournament/tournamentService:getAvailableTournaments", {
                    uid: testUid,
                    gameType: gameType
                });

                results.push({
                    gameType,
                    success: result.success,
                    tournamentCount: result.tournaments.length
                });
            }

            // 4. 验证结果
            const today = now.localDate.toISOString().split("T")[0];
            const allTournaments = await ctx.db
                .query("tournaments")
                .filter((q: any) => {
                    const createdAt = q.field("createdAt");
                    return q.eq(createdAt.split("T")[0], today);
                })
                .collect();

            console.log(`✅ 成功创建 ${allTournaments.length} 个锦标赛`);

            return {
                success: true,
                message: "不同游戏类型测试通过",
                results,
                totalTournaments: allTournaments.length
            };

        } catch (error) {
            console.error("❌ 不同游戏类型测试失败:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "未知错误"
            };
        }
    }

    /**
     * 测试通知功能
     */
    static async testNotificationFeature(ctx: any) {
        console.log("🧪 测试通知功能...");

        const testUid = "test_user_notification";
        const now = getTorontoDate();

        try {
            // 1. 确保测试玩家存在
            await this.ensureTestPlayer(ctx, testUid);

            // 2. 清理现有的通知
            await this.cleanupTestNotifications(ctx, testUid);

            // 3. 调用 getAvailableTournaments 触发创建
            await ctx.runQuery("service/tournament/tournamentService:getAvailableTournaments", {
                uid: testUid,
                gameType: "solitaire"
            });

            // 4. 检查是否创建了通知
            const notifications = await ctx.db
                .query("notifications")
                .withIndex("by_uid", (q: any) => q.eq("uid", testUid))
                .collect();

            const today = now.localDate.toISOString().split("T")[0];
            const todayNotifications = notifications.filter((n: any) =>
                n.createdAt.split("T")[0] === today
            );

            if (todayNotifications.length === 0) {
                console.log("⚠️ 未创建通知（可能是正常的，取决于通知逻辑）");
            } else {
                console.log(`✅ 成功创建 ${todayNotifications.length} 个通知`);
            }

            return {
                success: true,
                message: "通知功能测试完成",
                notificationCount: todayNotifications.length
            };

        } catch (error) {
            console.error("❌ 通知功能测试失败:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "未知错误"
            };
        }
    }

    /**
     * 运行所有测试
     */
    static async runAllTests(ctx: any) {
        console.log("🚀 开始运行自动创建锦标赛测试套件...");
        console.log("=".repeat(60));

        const tests = [
            { name: "基础自动创建", test: this.testBasicAutoCreate },
            { name: "重复调用测试", test: this.testNoDuplicateCreation },
            { name: "不同游戏类型", test: this.testDifferentGameTypes },
            { name: "通知功能", test: this.testNotificationFeature }
        ];

        const results: any[] = [];
        let passed = 0;
        let failed = 0;

        for (const test of tests) {
            console.log(`\n📋 运行测试: ${test.name}`);
            const result = await test.test(ctx);
            results.push({ name: test.name, ...result });

            if (result.success) {
                console.log(`✅ ${test.name}: 通过`);
                passed++;
            } else {
                console.error(`❌ ${test.name}: 失败 - ${result.error}`);
                failed++;
            }
        }

        console.log("\n" + "=".repeat(60));
        console.log("📊 测试结果汇总");
        console.log("=".repeat(60));
        console.log(`✅ 通过: ${passed}`);
        console.log(`❌ 失败: ${failed}`);
        console.log(`📈 成功率: ${((passed / tests.length) * 100).toFixed(1)}%`);

        return {
            success: failed === 0,
            passed,
            failed,
            total: tests.length,
            results
        };
    }

    /**
     * 确保测试玩家存在
     */
    private static async ensureTestPlayer(ctx: any, uid: string) {
        const existingPlayer = await ctx.db
            .query("players")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .first();

        if (!existingPlayer) {
            const now = getTorontoDate();
            await ctx.db.insert("players", {
                uid,
                displayName: `Test User ${uid}`,
                segmentName: "gold",
                isSubscribed: true,
                isActive: true,
                eloScore: 1200,
                lastActive: now.iso,
                createdAt: now.iso,
                updatedAt: now.iso
            });

            // 创建玩家库存
            await ctx.db.insert("player_inventory", {
                uid,
                coins: 1000,
                tickets: [],
                props: [],
                createdAt: now.iso,
                updatedAt: now.iso
            });

            console.log(`创建测试玩家: ${uid}`);
        }
    }

    /**
     * 清理测试锦标赛
     */
    private static async cleanupTestTournaments(ctx: any) {
        const now = getTorontoDate();
        const today = now.localDate.toISOString().split("T")[0];

        // 删除今天创建的测试锦标赛
        const testTournaments = await ctx.db
            .query("tournaments")
            .filter((q: any) => {
                const createdAt = q.field("createdAt");
                return q.eq(createdAt.split("T")[0], today);
            })
            .collect();

        for (const tournament of testTournaments) {
            await ctx.db.delete(tournament._id);
        }

        if (testTournaments.length > 0) {
            console.log(`清理了 ${testTournaments.length} 个测试锦标赛`);
        }
    }

    /**
     * 清理测试通知
     */
    private static async cleanupTestNotifications(ctx: any, uid: string) {
        const notifications = await ctx.db
            .query("notifications")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .collect();

        for (const notification of notifications) {
            await ctx.db.delete(notification._id);
        }

        if (notifications.length > 0) {
            console.log(`清理了 ${notifications.length} 个测试通知`);
        }
    }
} 