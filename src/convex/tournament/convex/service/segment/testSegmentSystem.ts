// @ts-nocheck
import { internal } from "../../_generated/api";
import { mutation } from "../../_generated/server";

// 测试段位系统
export const testSegmentSystem = mutation({
    args: {},
    handler: async (ctx: any) => {
        console.log("开始测试段位系统...");

        const testUid = "test_segment_player";
        const results: any[] = [];

        try {
            // 1. 加载段位数据
            console.log("1. 加载段位数据...");
            const loadResult = await ctx.runMutation((internal as any)["service/segment/segmentDataLoader"].loadSegmentData, {});
            results.push({ test: "load_segments", success: true, result: loadResult });

            // 2. 初始化玩家段位
            console.log("2. 初始化玩家段位...");
            const initResult = await ctx.runMutation((internal as any)["service/segment/segmentManager"].initializePlayerSegment, {
                uid: testUid,
                gameType: "solitaire"
            });
            results.push({ test: "initialize_player_segment", success: true, result: initResult });

            // 3. 创建玩家库存
            console.log("3. 创建玩家库存...");
            await ctx.runMutation((internal as any)["service/prop/inventoryManager"].createPlayerInventory, {
                uid: testUid
            });

            // 4. 测试积分更新
            console.log("4. 测试积分更新...");
            const updateResult = await ctx.runMutation((internal as any)["service/segment/segmentManager"].updatePlayerPoints, {
                uid: testUid,
                gameType: "solitaire",
                pointsChange: 1500,
                matchId: "test_match_001"
            });
            results.push({ test: "update_points", success: true, result: updateResult });

            // 5. 测试晋级
            console.log("5. 测试晋级...");
            const promotionResult = await ctx.runMutation((internal as any)["service/segment/segmentManager"].updatePlayerPoints, {
                uid: testUid,
                gameType: "solitaire",
                pointsChange: 2000,
                matchId: "test_match_002"
            });
            results.push({ test: "promotion", success: true, result: promotionResult });

            // 6. 测试排行榜更新
            console.log("6. 测试排行榜更新...");
            const leaderboardResult = await ctx.runMutation((internal as any)["service/segment/leaderboardManager"].updateLeaderboard, {
                gameType: "solitaire"
            });
            results.push({ test: "update_leaderboard", success: true, result: leaderboardResult });

            // 7. 获取玩家排名
            console.log("7. 获取玩家排名...");
            const rankingResult = await ctx.runQuery((internal as any)["service/segment/leaderboardManager"].getPlayerRanking, {
                uid: testUid,
                gameType: "solitaire"
            });
            results.push({ test: "get_player_ranking", success: true, result: rankingResult });

            // 8. 测试每日奖励
            console.log("8. 测试每日奖励...");
            const dailyRewardResult = await ctx.runMutation((internal as any)["service/segment/rewardManager"].grantDailySegmentReward, {
                uid: testUid,
                gameType: "solitaire"
            });
            results.push({ test: "daily_reward", success: true, result: dailyRewardResult });

            // 9. 获取可领取奖励
            console.log("9. 获取可领取奖励...");
            const claimableResult = await ctx.runQuery((internal as any)["service/segment/rewardManager"].getClaimableRewards, {
                uid: testUid
            });
            results.push({ test: "get_claimable_rewards", success: true, result: claimableResult });

            // 10. 获取奖励历史
            console.log("10. 获取奖励历史...");
            const historyResult = await ctx.runQuery((internal as any)["service/segment/rewardManager"].getRewardHistory, {
                uid: testUid,
                limit: 10
            });
            results.push({ test: "get_reward_history", success: true, result: historyResult });

            // 11. 获取段位统计
            console.log("11. 获取段位统计...");
            const statsResult = await ctx.runMutation((internal as any)["service/segment/segmentDataLoader"].getSegmentStatistics, {});
            results.push({ test: "get_segment_stats", success: true, result: statsResult });

            // 12. 清理测试数据
            console.log("12. 清理测试数据...");
            await ctx.runMutation((internal as any)["service/segment/segmentDataLoader"].clearSegmentData, {});

            return {
                success: true,
                message: "段位系统测试完成",
                testUid,
                results,
                summary: {
                    totalTests: results.length,
                    successfulTests: results.filter((r: any) => r.success).length,
                    failedTests: results.filter((r: any) => !r.success).length
                }
            };

        } catch (error: any) {
            console.error("段位系统测试失败:", error);

            // 尝试清理测试数据
            try {
                await ctx.runMutation((internal as any)["service/segment/segmentDataLoader"].clearSegmentData, {});
            } catch (cleanupError) {
                console.error("清理测试数据失败:", cleanupError);
            }

            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                testUid,
                results
            };
        }
    }
});

// 测试段位变更
export const testSegmentChanges = mutation({
    args: {},
    handler: async (ctx: any) => {
        console.log("开始测试段位变更...");

        const testUid = "test_segment_change_player";
        const results: any[] = [];

        try {
            // 1. 加载段位数据
            await ctx.runMutation((internal as any)["service/segment/segmentDataLoader"].loadSegmentData, {});

            // 2. 初始化玩家段位
            await ctx.runMutation((internal as any)["service/segment/segmentManager"].initializePlayerSegment, {
                uid: testUid,
                gameType: "solitaire"
            });

            // 3. 创建玩家库存
            await ctx.runMutation((internal as any)["service/prop/inventoryManager"].createPlayerInventory, {
                uid: testUid
            });

            // 4. 测试积分变化（不触发段位变更）
            console.log("4. 测试积分变化（不触发段位变更）...");
            const pointsResult = await ctx.runMutation((internal as any)["service/segment/segmentManager"].updatePlayerPoints, {
                uid: testUid,
                gameType: "solitaire",
                pointsChange: 500,
                matchId: "test_match_001"
            });
            results.push({ test: "points_change", success: true, result: pointsResult });

            // 5. 测试晋级（青铜到白银）
            console.log("5. 测试晋级（青铜到白银）...");
            const promotionResult = await ctx.runMutation((internal as any)["service/segment/segmentManager"].updatePlayerPoints, {
                uid: testUid,
                gameType: "solitaire",
                pointsChange: 1500,
                matchId: "test_match_002"
            });
            results.push({ test: "promotion_bronze_to_silver", success: true, result: promotionResult });

            // 6. 测试继续晋级（白银到黄金）
            console.log("6. 测试继续晋级（白银到黄金）...");
            const promotion2Result = await ctx.runMutation((internal as any)["service/segment/segmentManager"].updatePlayerPoints, {
                uid: testUid,
                gameType: "solitaire",
                pointsChange: 2000,
                matchId: "test_match_003"
            });
            results.push({ test: "promotion_silver_to_gold", success: true, result: promotion2Result });

            // 7. 测试降级（黄金到白银）
            console.log("7. 测试降级（黄金到白银）...");
            const demotionResult = await ctx.runMutation((internal as any)["service/segment/segmentManager"].updatePlayerPoints, {
                uid: testUid,
                gameType: "solitaire",
                pointsChange: -1000,
                matchId: "test_match_004"
            });
            results.push({ test: "demotion_gold_to_silver", success: true, result: demotionResult });

            // 8. 获取段位变更记录
            console.log("8. 获取段位变更记录...");
            const changes = await ctx.db
                .query("segment_changes")
                .withIndex("by_uid_game", (q: any) => q.eq("uid", testUid).eq("gameType", "solitaire"))
                .order("desc")
                .collect();
            results.push({ test: "get_segment_changes", success: true, changes: changes.length });

            // 9. 清理测试数据
            await ctx.runMutation((internal as any)["service/segment/segmentDataLoader"].clearSegmentData, {});

            return {
                success: true,
                message: "段位变更测试完成",
                testUid,
                results,
                summary: {
                    totalTests: results.length,
                    successfulTests: results.filter((r: any) => r.success).length,
                    segmentChanges: changes.length
                }
            };

        } catch (error: any) {
            console.error("段位变更测试失败:", error);

            try {
                await ctx.runMutation((internal as any)["service/segment/segmentDataLoader"].clearSegmentData, {});
            } catch (cleanupError) {
                console.error("清理测试数据失败:", cleanupError);
            }

            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                testUid,
                results
            };
        }
    }
});

// 测试排行榜系统
export const testLeaderboardSystem = mutation({
    args: {},
    handler: async (ctx: any) => {
        console.log("开始测试排行榜系统...");

        const results: any[] = [];

        try {
            // 1. 加载段位数据
            await ctx.runMutation((internal as any)["service/segment/segmentDataLoader"].loadSegmentData, {});

            // 2. 创建测试玩家
            const playerCount = 20;
            await ctx.runMutation((internal as any)["service/segment/segmentDataLoader"].createTestPlayerSegments, {
                playerCount
            });

            // 3. 更新排行榜
            console.log("3. 更新排行榜...");
            const updateResult = await ctx.runMutation((internal as any)["service/segment/leaderboardManager"].updateAllLeaderboards, {});
            results.push({ test: "update_all_leaderboards", success: true, result: updateResult });

            // 4. 获取全局排行榜
            console.log("4. 获取全局排行榜...");
            const globalResult = await ctx.runQuery((internal as any)["service/segment/leaderboardManager"].getGlobalLeaderboard, {
                gameType: "solitaire",
                limit: 10
            });
            results.push({ test: "get_global_leaderboard", success: true, result: globalResult });

            // 5. 获取段位排行榜
            console.log("5. 获取段位排行榜...");
            const segmentResult = await ctx.runQuery((internal as any)["service/segment/leaderboardManager"].getSegmentLeaderboard, {
                gameType: "solitaire",
                segmentId: "gold",
                limit: 10
            });
            results.push({ test: "get_segment_leaderboard", success: true, result: segmentResult });

            // 6. 获取排行榜统计
            console.log("6. 获取排行榜统计...");
            const statsResult = await ctx.runQuery((internal as any)["service/segment/leaderboardManager"].getLeaderboardStats, {
                gameType: "solitaire"
            });
            results.push({ test: "get_leaderboard_stats", success: true, result: statsResult });

            // 7. 清理测试数据
            await ctx.runMutation((internal as any)["service/segment/segmentDataLoader"].clearSegmentData, {});

            return {
                success: true,
                message: "排行榜系统测试完成",
                results,
                summary: {
                    totalTests: results.length,
                    successfulTests: results.filter((r: any) => r.success).length,
                    playerCount
                }
            };

        } catch (error: any) {
            console.error("排行榜系统测试失败:", error);

            try {
                await ctx.runMutation((internal as any)["service/segment/segmentDataLoader"].clearSegmentData, {});
            } catch (cleanupError) {
                console.error("清理测试数据失败:", cleanupError);
            }

            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                results
            };
        }
    }
});

// 测试奖励系统
export const testRewardSystem = mutation({
    args: {},
    handler: async (ctx: any) => {
        console.log("开始测试奖励系统...");

        const testUid = "test_reward_player";
        const results: any[] = [];

        try {
            // 1. 加载段位数据
            await ctx.runMutation((internal as any)["service/segment/segmentDataLoader"].loadSegmentData, {});

            // 2. 初始化玩家段位
            await ctx.runMutation((internal as any)["service/segment/segmentManager"].initializePlayerSegment, {
                uid: testUid,
                gameType: "solitaire"
            });

            // 3. 创建玩家库存
            await ctx.runMutation((internal as any)["service/prop/inventoryManager"].createPlayerInventory, {
                uid: testUid
            });

            // 4. 测试晋级奖励
            console.log("4. 测试晋级奖励...");
            await ctx.runMutation((internal as any)["service/segment/segmentManager"].updatePlayerPoints, {
                uid: testUid,
                gameType: "solitaire",
                pointsChange: 1500,
                matchId: "test_match_001"
            });

            const promotionRewardResult = await ctx.runMutation((internal as any)["service/segment/rewardManager"].grantPromotionReward, {
                uid: testUid,
                gameType: "solitaire",
                oldSegment: "bronze",
                newSegment: "silver"
            });
            results.push({ test: "promotion_reward", success: true, result: promotionRewardResult });

            // 5. 测试每日奖励
            console.log("5. 测试每日奖励...");
            const dailyRewardResult = await ctx.runMutation((internal as any)["service/segment/rewardManager"].grantDailySegmentReward, {
                uid: testUid,
                gameType: "solitaire"
            });
            results.push({ test: "daily_reward", success: true, result: dailyRewardResult });

            // 6. 获取可领取奖励
            console.log("6. 获取可领取奖励...");
            const claimableResult = await ctx.runQuery((internal as any)["service/segment/rewardManager"].getClaimableRewards, {
                uid: testUid
            });
            results.push({ test: "get_claimable_rewards", success: true, result: claimableResult });

            // 7. 测试重复领取每日奖励（应该失败）
            console.log("7. 测试重复领取每日奖励...");
            try {
                await ctx.runMutation((internal as any)["service/segment/rewardManager"].grantDailySegmentReward, {
                    uid: testUid,
                    gameType: "solitaire"
                });
                results.push({ test: "duplicate_daily_reward", success: false, error: "应该失败但没有失败" });
            } catch (error) {
                results.push({ test: "duplicate_daily_reward", success: true, error: error instanceof Error ? error.message : String(error) });
            }

            // 8. 清理测试数据
            await ctx.runMutation((internal as any)["service/segment/segmentDataLoader"].clearSegmentData, {});

            return {
                success: true,
                message: "奖励系统测试完成",
                testUid,
                results,
                summary: {
                    totalTests: results.length,
                    successfulTests: results.filter((r: any) => r.success).length,
                    failedTests: results.filter((r: any) => !r.success).length
                }
            };

        } catch (error: any) {
            console.error("奖励系统测试失败:", error);

            try {
                await ctx.runMutation((internal as any)["service/segment/segmentDataLoader"].clearSegmentData, {});
            } catch (cleanupError) {
                console.error("清理测试数据失败:", cleanupError);
            }

            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                testUid,
                results
            };
        }
    }
}); 