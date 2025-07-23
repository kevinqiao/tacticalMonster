// @ts-nocheck
import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { SegmentSystem } from "../service/segment/segmentSystem";
import { TournamentMatchingService } from "../service/tournament/tournamentMatchingService";

// ============================================================================
// 段位系统集成示例
// ============================================================================

/**
 * 示例1：初始化玩家段位
 */
export const exampleInitializePlayerSegment = mutation({
    args: {
        uid: v.string(),
        gameType: v.string()
    },
    handler: async (ctx: any, args: any) => {
        console.log("示例1：初始化玩家段位");
        const { uid, gameType } = args;

        try {
            const result = await SegmentSystem.initializePlayerSegment(ctx, uid, gameType);
            console.log(`玩家 ${uid} 段位初始化成功:`, result);
            return { success: true, result };
        } catch (error) {
            console.error(`玩家 ${uid} 段位初始化失败:`, error);
            return { success: false, error: error instanceof Error ? error.message : "未知错误" };
        }
    }
});

/**
 * 示例2：锦标赛结算后更新段位分数
 */
export const exampleTournamentSettlement = mutation({
    args: {
        tournamentId: v.string(),
        tournamentType: v.string(),
        gameType: v.string(),
        playerResults: v.array(v.object({
            uid: v.string(),
            rank: v.number(),
            score: v.number()
        }))
    },
    handler: async (ctx: any, args: any) => {
        console.log("示例2：锦标赛结算后更新段位分数");
        const { tournamentId, tournamentType, gameType, playerResults } = args;
        const totalPlayers = playerResults.length;
        const results = [];

        for (const playerResult of playerResults) {
            try {
                const scoreChange = SegmentSystem.calculateTournamentSegmentReward(
                    tournamentType,
                    playerResult.rank,
                    totalPlayers
                );
                console.log(`玩家 ${playerResult.uid} 排名第 ${playerResult.rank}，获得 ${scoreChange} 段位分数`);

                const segmentResult = await SegmentSystem.updatePlayerSegmentScore(ctx, {
                    uid: playerResult.uid,
                    gameType,
                    scoreChange,
                    tournamentType,
                    tournamentId,
                    rank: playerResult.rank,
                    totalPlayers
                });

                results.push({
                    uid: playerResult.uid,
                    rank: playerResult.rank,
                    scoreChange,
                    segmentResult,
                    success: true
                });
            } catch (error) {
                console.error(`更新玩家 ${playerResult.uid} 段位失败:`, error);
                results.push({
                    uid: playerResult.uid,
                    rank: playerResult.rank,
                    success: false,
                    error: error instanceof Error ? error.message : "未知错误"
                });
            }
        }

        return {
            success: true,
            tournamentId,
            tournamentType,
            gameType,
            totalPlayers,
            results,
            summary: {
                totalPlayers,
                successCount: results.filter(r => r.success).length,
                errorCount: results.filter(r => !r.success).length,
                promotions: results.filter(r => r.success && r.segmentResult.isPromotion).length,
                demotions: results.filter(r => r.success && r.segmentResult.isDemotion).length
            }
        };
    }
});

/**
 * 示例3：获取玩家段位信息
 */
export const exampleGetPlayerSegmentInfo = query({
    args: {
        uid: v.string(),
        gameType: v.string()
    },
    handler: async (ctx: any, args: any) => {
        console.log("示例3：获取玩家段位信息");
        const { uid, gameType } = args;

        try {
            const segmentInfo = await SegmentSystem.getPlayerSegment(ctx, uid, gameType);
            console.log(`玩家 ${uid} 段位信息:`, segmentInfo);
            return { success: true, segmentInfo };
        } catch (error) {
            console.error(`获取玩家 ${uid} 段位信息失败:`, error);
            return { success: false, error: error instanceof Error ? error.message : "未知错误" };
        }
    }
});

/**
 * 示例4：获取段位排行榜
 */
export const exampleGetSegmentLeaderboard = query({
    args: {
        gameType: v.string(),
        segmentName: v.optional(v.string()),
        limit: v.optional(v.number())
    },
    handler: async (ctx: any, args: any) => {
        console.log("示例4：获取段位排行榜");
        const { gameType, segmentName, limit = 50 } = args;

        try {
            const leaderboard = await SegmentSystem.getSegmentLeaderboard(ctx, gameType, segmentName, limit);
            console.log(`${gameType} ${segmentName || '全段位'} 排行榜:`, leaderboard);
            return { success: true, leaderboard };
        } catch (error) {
            console.error(`获取排行榜失败:`, error);
            return { success: false, error: error instanceof Error ? error.message : "未知错误" };
        }
    }
});

/**
 * 示例5：赛季结束段位重置
 */
export const exampleSeasonReset = mutation({
    args: {
        seasonId: v.string()
    },
    handler: async (ctx: any, args: any) => {
        console.log("示例5：赛季结束段位重置");
        const { seasonId } = args;

        try {
            const resetResult = await SegmentSystem.resetSeasonSegments(ctx, seasonId);
            console.log(`赛季 ${seasonId} 段位重置完成:`, resetResult);
            return { success: true, resetResult };
        } catch (error) {
            console.error(`赛季 ${seasonId} 段位重置失败:`, error);
            return { success: false, error: error instanceof Error ? error.message : "未知错误" };
        }
    }
});

/**
 * 示例6：检查锦标赛参与资格
 */
export const exampleCheckTournamentEligibility = query({
    args: {
        uid: v.string(),
        gameType: v.string(),
        requiredSegment: v.string()
    },
    handler: async (ctx: any, args: any) => {
        console.log("示例6：检查锦标赛参与资格");
        const { uid, gameType, requiredSegment } = args;

        try {
            // 获取玩家段位
            const playerSegment = await SegmentSystem.getPlayerSegment(ctx, uid, gameType);
            const playerTier = SegmentSystem.getSegmentTier(playerSegment.segmentName);
            const requiredTier = SegmentSystem.getSegmentTier(requiredSegment);

            const isEligible = playerTier >= requiredTier;
            console.log(`玩家 ${uid} 段位资格检查:`, {
                playerSegment: playerSegment.segmentName,
                playerTier,
                requiredSegment,
                requiredTier,
                isEligible
            });

            return {
                success: true,
                isEligible,
                playerSegment: playerSegment.segmentName,
                playerTier,
                requiredSegment,
                requiredTier
            };
        } catch (error) {
            console.error(`检查玩家 ${uid} 资格失败:`, error);
            return { success: false, error: error instanceof Error ? error.message : "未知错误" };
        }
    }
});

/**
 * 示例7：完整锦标赛流程（从匹配到结算）
 */
export const exampleCompleteTournamentFlow = mutation({
    args: {
        gameType: v.string(),
        tournamentType: v.string(),
        players: v.array(v.object({
            uid: v.string(),
            totalPoints: v.number(),
            isSubscribed: v.boolean()
        }))
    },
    handler: async (ctx: any, args: any) => {
        console.log("示例7：完整锦标赛流程");
        const { gameType, tournamentType, players } = args;

        try {
            const results = [];

            // 1. 初始化所有玩家段位
            for (const player of players) {
                await SegmentSystem.initializePlayerSegment(ctx, player.uid, gameType);
                console.log(`玩家 ${player.uid} 段位初始化完成`);
            }

            // 2. 模拟锦标赛匹配
            const tournamentConfig = {
                gameType,
                typeId: tournamentType,
                config: {
                    advanced: {
                        matching: {
                            algorithm: "segment_based",
                            skillRange: 200,
                            segmentRange: 1
                        }
                    }
                }
            };

            for (const player of players) {
                const joinResult = await TournamentMatchingService.joinMatchingQueue(ctx, {
                    tournament: null,
                    tournamentType: tournamentConfig,
                    player
                });
                console.log(`玩家 ${player.uid} 加入匹配队列:`, joinResult);
                results.push({ step: "join_queue", player: player.uid, result: joinResult });
            }

            // 3. 模拟锦标赛结算
            const playerResults = players.map((player, index) => ({
                uid: player.uid,
                rank: index + 1,
                score: 1000 - index * 50
            }));

            const settlementResult = await exampleTournamentSettlement.action(ctx, {
                tournamentId: "example_tournament_id",
                tournamentType,
                gameType,
                playerResults
            });

            results.push({ step: "settlement", result: settlementResult });

            return { success: true, results };
        } catch (error) {
            console.error("完整锦标赛流程失败:", error);
            return { success: false, error: error instanceof Error ? error.message : "未知错误" };
        }
    }
});

/**
 * 示例8：获取段位系统配置
 */
export const exampleGetSegmentSystemConfig = query({
    args: {},
    handler: async (ctx: any, args: any) => {
        console.log("示例8：获取段位系统配置");

        try {
            const config = {
                segmentLevels: SegmentSystem.SEGMENT_LEVELS,
                tournamentRewards: SegmentSystem.TOURNAMENT_SEGMENT_REWARDS,
                description: {
                    segmentLevels: "段位等级定义，包含分数范围和颜色",
                    tournamentRewards: "锦标赛段位分数奖励配置",
                    algorithms: {
                        skill_based: "基于技能分数的匹配",
                        segment_based: "基于段位的匹配",
                        elo_based: "基于ELO分数的匹配",
                        random: "随机匹配"
                    }
                }
            };

            console.log("段位系统配置:", config);
            return { success: true, config };
        } catch (error) {
            console.error("获取段位系统配置失败:", error);
            return { success: false, error: error instanceof Error ? error.message : "未知错误" };
        }
    }
});

/**
 * 示例9：段位兼容性测试
 */
export const exampleSegmentCompatibilityTest = query({
    args: {
        player1: v.object({
            uid: v.string(),
            segmentName: v.string(),
            segmentPoints: v.number()
        }),
        player2: v.object({
            uid: v.string(),
            segmentName: v.string(),
            segmentPoints: v.number()
        })
    },
    handler: async (ctx: any, args: any) => {
        console.log("示例9：段位兼容性测试");
        const { player1, player2 } = args;

        try {
            // 计算段位兼容性
            const tier1 = SegmentSystem.getSegmentTier(player1.segmentName);
            const tier2 = SegmentSystem.getSegmentTier(player2.segmentName);
            const segmentDiff = Math.abs(tier1 - tier2);
            const pointsDiff = Math.abs(player1.segmentPoints - player2.segmentPoints);

            const tierCompatibility = Math.max(0, 1 - segmentDiff / 8);
            const pointsCompatibility = Math.max(0, 1 - pointsDiff / 1000);
            const overallCompatibility = tierCompatibility * 0.7 + pointsCompatibility * 0.3;

            const result = {
                player1: {
                    uid: player1.uid,
                    segmentName: player1.segmentName,
                    tier: tier1,
                    points: player1.segmentPoints
                },
                player2: {
                    uid: player2.uid,
                    segmentName: player2.segmentName,
                    tier: tier2,
                    points: player2.segmentPoints
                },
                compatibility: {
                    tierCompatibility,
                    pointsCompatibility,
                    overallCompatibility,
                    segmentDiff,
                    pointsDiff,
                    isCompatible: overallCompatibility >= 0.5
                }
            };

            console.log("段位兼容性测试结果:", result);
            return { success: true, result };
        } catch (error) {
            console.error("段位兼容性测试失败:", error);
            return { success: false, error: error instanceof Error ? error.message : "未知错误" };
        }
    }
});

/**
 * 示例10：批量段位更新
 */
export const exampleBatchSegmentUpdate = mutation({
    args: {
        updates: v.array(v.object({
            uid: v.string(),
            gameType: v.string(),
            scoreChange: v.number(),
            reason: v.string()
        }))
    },
    handler: async (ctx: any, args: any) => {
        console.log("示例10：批量段位更新");
        const { updates } = args;

        try {
            const results = [];

            for (const update of updates) {
                try {
                    const segmentResult = await SegmentSystem.updatePlayerSegmentScore(ctx, {
                        uid: update.uid,
                        gameType: update.gameType,
                        scoreChange: update.scoreChange,
                        tournamentType: "batch_update",
                        matchId: "batch_update",
                        rank: 0,
                        totalPlayers: 1
                    });

                    results.push({
                        uid: update.uid,
                        success: true,
                        segmentResult,
                        reason: update.reason
                    });
                } catch (error) {
                    results.push({
                        uid: update.uid,
                        success: false,
                        error: error instanceof Error ? error.message : "未知错误",
                        reason: update.reason
                    });
                }
            }

            const summary = {
                total: updates.length,
                success: results.filter(r => r.success).length,
                failed: results.filter(r => !r.success).length,
                promotions: results.filter(r => r.success && r.segmentResult.isPromotion).length,
                demotions: results.filter(r => r.success && r.segmentResult.isDemotion).length
            };

            console.log("批量段位更新完成:", summary);
            return { success: true, results, summary };
        } catch (error) {
            console.error("批量段位更新失败:", error);
            return { success: false, error: error instanceof Error ? error.message : "未知错误" };
        }
    }
}); 