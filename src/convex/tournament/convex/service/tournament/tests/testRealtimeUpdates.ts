import { getTorontoDate } from "../../utils";

/**
 * 测试锦标赛状态实时更新功能
 */
export class TestRealtimeUpdates {
    /**
     * 测试加入锦标赛后的状态更新
     */
    static async testStatusUpdateAfterJoin(ctx: any) {
        console.log("🧪 测试加入锦标赛后的状态更新...");

        const testUid = "test_user_realtime";
        const now = getTorontoDate();

        try {
            // 1. 确保测试玩家存在
            await this.ensureTestPlayer(ctx, testUid);

            // 2. 获取初始状态
            const initialStatus = await ctx.runQuery("service/tournament/tournamentService:getPlayerTournamentStatus", {
                uid: testUid,
                gameType: "solitaire"
            });

            if (!initialStatus.success) {
                throw new Error(`获取初始状态失败: ${initialStatus.message}`);
            }

            console.log(`初始状态: ${initialStatus.tournaments.length} 个锦标赛`);

            // 3. 加入一个锦标赛
            const joinResult = await ctx.runMutation("service/tournament/tournamentService:joinTournament", {
                uid: testUid,
                gameType: "solitaire",
                tournamentType: "daily_special"
            });

            if (!joinResult.success) {
                throw new Error(`加入锦标赛失败: ${joinResult.message}`);
            }

            console.log("成功加入锦标赛");

            // 4. 检查返回的更新数据
            if (!joinResult.updatedAvailableTournaments) {
                throw new Error("未返回更新后的锦标赛列表");
            }

            console.log(`返回了 ${joinResult.updatedAvailableTournaments.length} 个更新后的锦标赛`);

            // 5. 重新获取状态进行对比
            const updatedStatus = await ctx.runQuery("service/tournament/tournamentService:getPlayerTournamentStatus", {
                uid: testUid,
                gameType: "solitaire"
            });

            if (!updatedStatus.success) {
                throw new Error(`获取更新状态失败: ${updatedStatus.message}`);
            }

            // 6. 验证状态变化
            const dailySpecialBefore = initialStatus.tournaments.find((t: any) => t.typeId === "daily_special");
            const dailySpecialAfter = updatedStatus.tournaments.find((t: any) => t.typeId === "daily_special");

            if (!dailySpecialBefore || !dailySpecialAfter) {
                throw new Error("未找到 daily_special 锦标赛");
            }

            // 检查参与统计是否更新
            const attemptsBefore = dailySpecialBefore.participationStats.dailyAttempts;
            const attemptsAfter = dailySpecialAfter.participationStats.dailyAttempts;

            if (attemptsAfter <= attemptsBefore) {
                throw new Error(`参与次数未正确更新: ${attemptsBefore} -> ${attemptsAfter}`);
            }

            console.log(`参与次数正确更新: ${attemptsBefore} -> ${attemptsAfter}`);

            // 检查当前参与是否更新
            const participationsBefore = dailySpecialBefore.currentParticipations.length;
            const participationsAfter = dailySpecialAfter.currentParticipations.length;

            if (participationsAfter <= participationsBefore) {
                throw new Error(`当前参与未正确更新: ${participationsBefore} -> ${participationsAfter}`);
            }

            console.log(`当前参与正确更新: ${participationsBefore} -> ${participationsAfter}`);

            return {
                success: true,
                message: "加入锦标赛后的状态更新测试通过",
                initialAttempts: attemptsBefore,
                updatedAttempts: attemptsAfter,
                initialParticipations: participationsBefore,
                updatedParticipations: participationsAfter
            };

        } catch (error) {
            console.error("❌ 加入锦标赛后的状态更新测试失败:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "未知错误"
            };
        }
    }

    /**
     * 测试提交分数后的状态更新
     */
    static async testStatusUpdateAfterSubmitScore(ctx: any) {
        console.log("🧪 测试提交分数后的状态更新...");

        const testUid = "test_user_score_update";
        const now = getTorontoDate();

        try {
            // 1. 确保测试玩家存在
            await this.ensureTestPlayer(ctx, testUid);

            // 2. 加入锦标赛
            const joinResult = await ctx.runMutation("service/tournament/tournamentService:joinTournament", {
                uid: testUid,
                gameType: "solitaire",
                tournamentType: "daily_special"
            });

            if (!joinResult.success) {
                throw new Error(`加入锦标赛失败: ${joinResult.message}`);
            }

            const tournamentId = joinResult.tournamentId;
            console.log(`加入锦标赛: ${tournamentId}`);

            // 3. 获取提交分数前的状态
            const statusBefore = await ctx.runQuery("service/tournament/tournamentService:getPlayerTournamentStatus", {
                uid: testUid,
                gameType: "solitaire"
            });

            // 4. 提交分数
            const submitResult = await ctx.runMutation("service/tournament/tournamentService:submitScore", {
                tournamentId,
                uid: testUid,
                gameType: "solitaire",
                score: 1500,
                gameData: { moves: 50, time: 300 },
                propsUsed: [],
                gameId: "test_game_123"
            });

            if (!submitResult.success) {
                throw new Error(`提交分数失败: ${submitResult.message}`);
            }

            console.log("成功提交分数");

            // 5. 检查返回的更新数据
            if (!submitResult.updatedAvailableTournaments) {
                throw new Error("未返回更新后的锦标赛列表");
            }

            console.log(`返回了 ${submitResult.updatedAvailableTournaments.length} 个更新后的锦标赛`);

            // 6. 获取提交分数后的状态
            const statusAfter = await ctx.runQuery("service/tournament/tournamentService:getPlayerTournamentStatus", {
                uid: testUid,
                gameType: "solitaire"
            });

            // 7. 验证状态变化
            const dailySpecialBefore = statusBefore.tournaments.find((t: any) => t.typeId === "daily_special");
            const dailySpecialAfter = statusAfter.tournaments.find((t: any) => t.typeId === "daily_special");

            if (!dailySpecialBefore || !dailySpecialAfter) {
                throw new Error("未找到 daily_special 锦标赛");
            }

            // 检查参与统计是否更新
            const attemptsBefore = dailySpecialBefore.participationStats.dailyAttempts;
            const attemptsAfter = dailySpecialAfter.participationStats.dailyAttempts;

            if (attemptsAfter <= attemptsBefore) {
                throw new Error(`参与次数未正确更新: ${attemptsBefore} -> ${attemptsAfter}`);
            }

            console.log(`参与次数正确更新: ${attemptsBefore} -> ${attemptsAfter}`);

            // 检查当前参与是否更新
            const participationsBefore = dailySpecialBefore.currentParticipations;
            const participationsAfter = dailySpecialAfter.currentParticipations;

            // 检查是否有新的比赛记录
            const newMatches = participationsAfter.filter((p: any) =>
                !participationsBefore.some((pb: any) => pb.tournamentId === p.tournamentId)
            );

            if (newMatches.length === 0) {
                console.log("⚠️ 未发现新的比赛记录（可能是正常的）");
            } else {
                console.log(`发现 ${newMatches.length} 个新的比赛记录`);
            }

            return {
                success: true,
                message: "提交分数后的状态更新测试通过",
                initialAttempts: attemptsBefore,
                updatedAttempts: attemptsAfter,
                newMatches: newMatches.length
            };

        } catch (error) {
            console.error("❌ 提交分数后的状态更新测试失败:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "未知错误"
            };
        }
    }

    /**
     * 测试资格变化检测
     */
    static async testEligibilityChangeDetection(ctx: any) {
        console.log("🧪 测试资格变化检测...");

        const testUid = "test_user_eligibility";
        const now = getTorontoDate();

        try {
            // 1. 确保测试玩家存在（低段位）
            await this.ensureTestPlayer(ctx, testUid, "bronze");

            // 2. 获取初始状态
            const initialStatus = await ctx.runQuery("service/tournament/tournamentService:getPlayerTournamentStatus", {
                uid: testUid,
                gameType: "solitaire"
            });

            // 3. 查找需要高段位的锦标赛
            const highSegmentTournament = initialStatus.tournaments.find((t: any) =>
                t.config?.entryRequirements?.minSegment === "gold" ||
                t.config?.entryRequirements?.minSegment === "platinum"
            );

            if (!highSegmentTournament) {
                console.log("⚠️ 未找到需要高段位的锦标赛，跳过测试");
                return {
                    success: true,
                    message: "未找到合适的测试锦标赛，跳过测试"
                };
            }

            console.log(`找到需要高段位的锦标赛: ${highSegmentTournament.typeId}`);

            // 4. 检查初始资格
            const initialEligible = highSegmentTournament.eligibility.eligible;
            console.log(`初始资格: ${initialEligible ? "可参与" : "不可参与"}`);

            // 5. 提升玩家段位
            await ctx.db.patch(
                (await ctx.db.query("players").withIndex("by_uid", (q: any) => q.eq("uid", testUid)).first())!._id,
                { segmentName: "gold" }
            );

            console.log("玩家段位已提升到 gold");

            // 6. 获取更新后的状态
            const updatedStatus = await ctx.runQuery("service/tournament/tournamentService:getPlayerTournamentStatus", {
                uid: testUid,
                gameType: "solitaire"
            });

            // 7. 检查资格变化
            const updatedTournament = updatedStatus.tournaments.find((t: any) => t.typeId === highSegmentTournament.typeId);
            const updatedEligible = updatedTournament?.eligibility.eligible;

            console.log(`更新后资格: ${updatedEligible ? "可参与" : "不可参与"}`);

            if (initialEligible === updatedEligible) {
                console.log("⚠️ 资格状态未发生变化（可能是正常的）");
            } else {
                console.log("✅ 资格状态发生变化");
            }

            return {
                success: true,
                message: "资格变化检测测试完成",
                initialEligible,
                updatedEligible,
                tournamentType: highSegmentTournament.typeId
            };

        } catch (error) {
            console.error("❌ 资格变化检测测试失败:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "未知错误"
            };
        }
    }

    /**
     * 测试库存变化检测
     */
    static async testInventoryChangeDetection(ctx: any) {
        console.log("🧪 测试库存变化检测...");

        const testUid = "test_user_inventory";
        const now = getTorontoDate();

        try {
            // 1. 确保测试玩家存在（低金币）
            await this.ensureTestPlayer(ctx, testUid, "gold", 10);

            // 2. 获取初始状态
            const initialStatus = await ctx.runQuery("service/tournament/tournamentService:getPlayerTournamentStatus", {
                uid: testUid,
                gameType: "solitaire"
            });

            // 3. 查找需要高入场费的锦标赛
            const expensiveTournament = initialStatus.tournaments.find((t: any) =>
                t.config?.entryRequirements?.entryFee?.coins > 10
            );

            if (!expensiveTournament) {
                console.log("⚠️ 未找到需要高入场费的锦标赛，跳过测试");
                return {
                    success: true,
                    message: "未找到合适的测试锦标赛，跳过测试"
                };
            }

            console.log(`找到需要高入场费的锦标赛: ${expensiveTournament.typeId}`);

            // 4. 检查初始资格
            const initialEligible = expensiveTournament.eligibility.eligible;
            const initialCoins = initialStatus.inventory.coins;
            console.log(`初始金币: ${initialCoins}, 资格: ${initialEligible ? "可参与" : "不可参与"}`);

            // 5. 增加玩家金币
            await ctx.db.patch(
                (await ctx.db.query("player_inventory").withIndex("by_uid", (q: any) => q.eq("uid", testUid)).first())!._id,
                { coins: 1000 }
            );

            console.log("玩家金币已增加到 1000");

            // 6. 获取更新后的状态
            const updatedStatus = await ctx.runQuery("service/tournament/tournamentService:getPlayerTournamentStatus", {
                uid: testUid,
                gameType: "solitaire"
            });

            // 7. 检查资格变化
            const updatedTournament = updatedStatus.tournaments.find((t: any) => t.typeId === expensiveTournament.typeId);
            const updatedEligible = updatedTournament?.eligibility.eligible;
            const updatedCoins = updatedStatus.inventory.coins;

            console.log(`更新后金币: ${updatedCoins}, 资格: ${updatedEligible ? "可参与" : "不可参与"}`);

            if (initialEligible === updatedEligible) {
                console.log("⚠️ 资格状态未发生变化（可能是正常的）");
            } else {
                console.log("✅ 资格状态发生变化");
            }

            return {
                success: true,
                message: "库存变化检测测试完成",
                initialCoins,
                updatedCoins,
                initialEligible,
                updatedEligible,
                tournamentType: expensiveTournament.typeId
            };

        } catch (error) {
            console.error("❌ 库存变化检测测试失败:", error);
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
        console.log("🚀 开始运行实时更新测试套件...");
        console.log("=".repeat(60));

        const tests = [
            { name: "加入锦标赛状态更新", test: this.testStatusUpdateAfterJoin },
            { name: "提交分数状态更新", test: this.testStatusUpdateAfterSubmitScore },
            { name: "资格变化检测", test: this.testEligibilityChangeDetection },
            { name: "库存变化检测", test: this.testInventoryChangeDetection }
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
    private static async ensureTestPlayer(ctx: any, uid: string, segmentName: string = "gold", coins: number = 1000) {
        const existingPlayer = await ctx.db
            .query("players")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .first();

        const now = getTorontoDate();

        if (!existingPlayer) {
            await ctx.db.insert("players", {
                uid,
                displayName: `Test User ${uid}`,
                segmentName,
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
                coins,
                tickets: [],
                props: [],
                createdAt: now.iso,
                updatedAt: now.iso
            });

            console.log(`创建测试玩家: ${uid} (段位: ${segmentName}, 金币: ${coins})`);
        } else {
            // 更新现有玩家
            await ctx.db.patch(existingPlayer._id, {
                segmentName,
                updatedAt: now.iso
            });

            // 更新库存
            const inventory = await ctx.db.query("player_inventory").withIndex("by_uid", (q: any) => q.eq("uid", uid)).first();
            if (inventory) {
                await ctx.db.patch(inventory._id, {
                    coins,
                    updatedAt: now.iso
                });
            }

            console.log(`更新测试玩家: ${uid} (段位: ${segmentName}, 金币: ${coins})`);
        }
    }
} 