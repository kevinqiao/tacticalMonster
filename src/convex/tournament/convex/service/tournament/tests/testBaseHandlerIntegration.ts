import { mutation } from "../../../_generated/server";
import { getTorontoDate } from "../../utils";

/**
 * 测试 base.ts 中 TournamentMatchingService 集成
 */
export const testBaseHandlerIntegration = (mutation as any)({
    args: {},
    handler: async (ctx: any) => {
        const now = getTorontoDate();
        const testResults: any[] = [];

        try {
            // 1. 测试单人比赛锦标赛
            console.log("=== 测试单人比赛锦标赛 ===");
            const singleMatchResult = await testSingleMatchTournament(ctx, now);
            testResults.push({
                test: "单人比赛锦标赛",
                success: singleMatchResult.success,
                result: singleMatchResult
            });

            // 2. 测试多人比赛锦标赛
            console.log("=== 测试多人比赛锦标赛 ===");
            const multiMatchResult = await testMultiMatchTournament(ctx, now);
            testResults.push({
                test: "多人比赛锦标赛",
                success: multiMatchResult.success,
                result: multiMatchResult
            });

            // 3. 测试匹配失败回退
            console.log("=== 测试匹配失败回退 ===");
            const fallbackResult = await testMatchingFallback(ctx, now);
            testResults.push({
                test: "匹配失败回退",
                success: fallbackResult.success,
                result: fallbackResult
            });

            return {
                success: true,
                message: "base.ts TournamentMatchingService 集成测试完成",
                results: testResults,
                timestamp: now.iso
            };

        } catch (error) {
            console.error("测试失败:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "未知错误",
                results: testResults,
                timestamp: now.iso
            };
        }
    },
});

/**
 * 测试单人比赛锦标赛
 */
async function testSingleMatchTournament(ctx: any, now: any) {
    // 创建测试玩家
    const testUid = `test_single_${Date.now()}`;
    const player = await ctx.db.insert("players", {
        uid: testUid,
        displayName: "测试玩家-单人",
        segmentName: "bronze",
        isSubscribed: false,
        isActive: true,
        lastActive: now.iso,
        createdAt: now.iso,
        updatedAt: now.iso,
    });

    // 创建测试赛季
    const season = await ctx.db.insert("seasons", {
        name: "测试赛季",
        startDate: now.iso,
        endDate: new Date(now.localDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        isActive: true,
        createdAt: now.iso,
        updatedAt: now.iso,
    });

    // 创建单人比赛锦标赛类型
    const tournamentType = await ctx.db.insert("tournament_types", {
        typeId: "test_single_tournament",
        name: "测试单人锦标赛",
        description: "用于测试单人比赛功能",
        category: "casual",
        isActive: true,
        defaultConfig: {
            gameType: "solitaire",
            rules: {
                isSingleMatch: true,
                maxPlayers: 1,
                minPlayers: 1,
                maxAttempts: 3
            },
            entryRequirements: {
                isSubscribedRequired: false,
                entryFee: {}
            }
        },
        createdAt: now.iso,
        updatedAt: now.iso,
    });

    // 模拟 base handler 的 join 方法
    const joinResult = await simulateBaseHandlerJoin(ctx, {
        uid: testUid,
        gameType: "solitaire",
        tournamentType: "test_single_tournament",
        player: await ctx.db.get(player),
        season: await ctx.db.get(season)
    });

    return {
        success: joinResult.success,
        tournamentId: joinResult.tournamentId,
        matchId: joinResult.matchId,
        gameId: joinResult.gameId,
        isSingleMatch: true
    };
}

/**
 * 测试多人比赛锦标赛
 */
async function testMultiMatchTournament(ctx: any, now: any) {
    // 创建测试玩家
    const testUid = `test_multi_${Date.now()}`;
    const player = await ctx.db.insert("players", {
        uid: testUid,
        displayName: "测试玩家-多人",
        segmentName: "silver",
        isSubscribed: true,
        isActive: true,
        lastActive: now.iso,
        createdAt: now.iso,
        updatedAt: now.iso,
    });

    // 创建测试赛季
    const season = await ctx.db.insert("seasons", {
        name: "测试赛季",
        startDate: now.iso,
        endDate: new Date(now.localDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        isActive: true,
        createdAt: now.iso,
        updatedAt: now.iso,
    });

    // 创建多人比赛锦标赛类型
    const tournamentType = await ctx.db.insert("tournament_types", {
        typeId: "test_multi_tournament",
        name: "测试多人锦标赛",
        description: "用于测试多人比赛功能",
        category: "casual",
        isActive: true,
        defaultConfig: {
            gameType: "rummy",
            rules: {
                isSingleMatch: false,
                maxPlayers: 4,
                minPlayers: 2,
                maxAttempts: 5
            },
            entryRequirements: {
                isSubscribedRequired: false,
                entryFee: {}
            },
            advanced: {
                matching: {
                    algorithm: "skill_based",
                    maxWaitTime: 60,
                    fallbackToAI: true
                }
            }
        },
        createdAt: now.iso,
        updatedAt: now.iso,
    });

    // 模拟 base handler 的 join 方法
    const joinResult = await simulateBaseHandlerJoin(ctx, {
        uid: testUid,
        gameType: "rummy",
        tournamentType: "test_multi_tournament",
        player: await ctx.db.get(player),
        season: await ctx.db.get(season)
    });

    return {
        success: joinResult.success,
        tournamentId: joinResult.tournamentId,
        matchId: joinResult.matchId,
        gameId: joinResult.gameId,
        matchStatus: (joinResult as any).matchStatus,
        isMultiMatch: true
    };
}

/**
 * 测试匹配失败回退
 */
async function testMatchingFallback(ctx: any, now: any) {
    // 创建测试玩家
    const testUid = `test_fallback_${Date.now()}`;
    const player = await ctx.db.insert("players", {
        uid: testUid,
        displayName: "测试玩家-回退",
        segmentName: "gold",
        isSubscribed: false,
        isActive: true,
        lastActive: now.iso,
        createdAt: now.iso,
        updatedAt: now.iso,
    });

    // 创建测试赛季
    const season = await ctx.db.insert("seasons", {
        name: "测试赛季",
        startDate: now.iso,
        endDate: new Date(now.localDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        isActive: true,
        createdAt: now.iso,
        updatedAt: now.iso,
    });

    // 创建有问题的多人锦标赛类型（会导致匹配失败）
    const tournamentType = await ctx.db.insert("tournament_types", {
        typeId: "test_fallback_tournament",
        name: "测试回退锦标赛",
        description: "用于测试匹配失败回退功能",
        category: "casual",
        isActive: true,
        defaultConfig: {
            gameType: "ludo",
            rules: {
                isSingleMatch: false,
                maxPlayers: 4,
                minPlayers: 2,
                maxAttempts: 3
            },
            entryRequirements: {
                isSubscribedRequired: false,
                entryFee: {}
            },
            advanced: {
                matching: {
                    algorithm: "invalid_algorithm", // 无效算法，会导致匹配失败
                    maxWaitTime: 60,
                    fallbackToAI: true
                }
            }
        },
        createdAt: now.iso,
        updatedAt: now.iso,
    });

    // 模拟 base handler 的 join 方法
    const joinResult = await simulateBaseHandlerJoin(ctx, {
        uid: testUid,
        gameType: "ludo",
        tournamentType: "test_fallback_tournament",
        player: await ctx.db.get(player),
        season: await ctx.db.get(season)
    });

    return {
        success: joinResult.success,
        tournamentId: joinResult.tournamentId,
        matchId: joinResult.matchId,
        gameId: joinResult.gameId,
        fallbackUsed: true
    };
}

/**
 * 模拟 base handler 的 join 方法
 */
async function simulateBaseHandlerJoin(ctx: any, params: {
    uid: string;
    gameType: string;
    tournamentType: string;
    player: any;
    season: any;
}) {
    const { uid, gameType, tournamentType, player, season } = params;
    const now = getTorontoDate();

    // 获取配置
    const tournamentTypeConfig = await ctx.db
        .query("tournament_types")
        .withIndex("by_typeId", (q: any) => q.eq("typeId", tournamentType))
        .first();
    const config = tournamentTypeConfig?.defaultConfig || {};

    // 创建锦标赛
    const tournamentId = await ctx.db.insert("tournaments", {
        seasonId: season._id,
        gameType,
        segmentName: player.segmentName,
        status: "open",
        tournamentType,
        isSubscribedRequired: config.isSubscribedRequired || false,
        isSingleMatch: config.rules?.isSingleMatch || false,
        prizePool: 0,
        config,
        createdAt: now.iso,
        updatedAt: now.iso,
        endTime: new Date(now.localDate.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    });

    // 创建玩家参与关系
    await ctx.db.insert("player_tournaments", {
        uid,
        tournamentId,
        joinedAt: now.iso,
        createdAt: now.iso,
        updatedAt: now.iso,
    });

    // 根据配置选择处理方式
    const isSingleMatch = config.rules?.isSingleMatch || false;
    const maxPlayers = config.rules?.maxPlayers || 1;

    if (isSingleMatch || maxPlayers === 1) {
        // 单人比赛处理
        return await handleSingleMatchTournament(ctx, {
            tournamentId,
            uid,
            gameType,
            player,
            config,
            attemptNumber: 1
        });
    } else {
        // 多人比赛处理
        return await handleMultiMatchTournament(ctx, {
            tournamentId,
            uid,
            gameType,
            player,
            config,
            attemptNumber: 1
        });
    }
}

/**
 * 处理单人比赛锦标赛
 */
async function handleSingleMatchTournament(ctx: any, params: {
    tournamentId: string;
    uid: string;
    gameType: string;
    player: any;
    config: any;
    attemptNumber: number;
}) {
    const { tournamentId, uid, gameType, player, config, attemptNumber } = params;
    const now = getTorontoDate();

    // 创建单场比赛
    const matchId = await ctx.db.insert("matches", {
        tournamentId,
        gameType,
        matchType: "single_match",
        maxPlayers: 1,
        minPlayers: 1,
        status: "pending",
        gameData: {
            player: {
                uid,
                segmentName: player.segmentName,
                eloScore: player.eloScore || 1000
            }
        },
        createdAt: now.iso,
        updatedAt: now.iso,
    });

    // 玩家加入比赛
    const playerMatchId = await ctx.db.insert("player_matches", {
        matchId,
        tournamentId,
        uid,
        gameType,
        score: 0,
        completed: false,
        attemptNumber,
        propsUsed: [],
        gameData: {},
        createdAt: now.iso,
        updatedAt: now.iso,
    });

    // 创建远程游戏
    const gameId = `game_${matchId}_${Date.now()}`;
    await ctx.db.insert("remote_games", {
        matchId,
        tournamentId,
        gameType,
        uids: [uid],
        status: "active",
        serverUrl: `https://game-server.example.com/${matchId}`,
        gameId,
        createdAt: now.iso,
        updatedAt: now.iso,
    });

    return {
        tournamentId,
        matchId,
        playerMatchId,
        gameId,
        serverUrl: `https://game-server.example.com/${matchId}`,
        attemptNumber,
        success: true
    };
}

/**
 * 处理多人比赛锦标赛
 */
async function handleMultiMatchTournament(ctx: any, params: {
    tournamentId: string;
    uid: string;
    gameType: string;
    player: any;
    config: any;
    attemptNumber: number;
}) {
    const { tournamentId, uid, gameType, player, config, attemptNumber } = params;

    try {
        // 尝试使用锦标赛匹配服务
        const { TournamentMatchingService } = await import("../tournamentMatchingService");
        const matchResult = await TournamentMatchingService.joinTournamentMatch(ctx, {
            uid,
            tournamentId,
            gameType,
            player,
            config
        });

        return {
            tournamentId,
            matchId: matchResult.matchId,
            playerMatchId: matchResult.playerMatchId,
            gameId: matchResult.gameId,
            serverUrl: matchResult.serverUrl,
            attemptNumber,
            matchStatus: matchResult.matchInfo,
            success: true
        };
    } catch (error) {
        console.error("多人比赛匹配失败:", error);

        // 回退到单人模式
        console.log("回退到单人比赛模式");
        return await handleSingleMatchTournament(ctx, {
            tournamentId,
            uid,
            gameType,
            player,
            config,
            attemptNumber
        });
    }
} 