import { internal } from "../../../_generated/api";
import { getTorontoDate } from "../../utils";

/**
 * 阈值锦标赛集成测试
 * 测试完整的阈值锦标赛流程
 */
export const testThresholdTournamentIntegration = async (ctx: any) => {
    console.log("=== 开始阈值锦标赛集成测试 ===");

    const now = getTorontoDate();
    const testUid = "test_user_threshold_" + Date.now();

    try {
        // 1. 初始化测试数据
        console.log("1. 初始化测试数据...");
        const { player, season, inventory } = await initializeTestData(ctx, testUid);

        // 2. 确保锦标赛类型存在
        console.log("2. 确保锦标赛类型存在...");
        await ensureTournamentTypeExists(ctx);

        // 3. 测试加入阈值锦标赛
        console.log("3. 测试加入阈值锦标赛...");
        const joinResult = await testJoinThresholdTournament(ctx, {
            uid: testUid,
            player,
            season
        });

        // 4. 测试提交分数 - 未达到阈值
        console.log("4. 测试提交分数 - 未达到阈值...");
        const submitResult1 = await testSubmitScore(ctx, {
            tournamentId: joinResult.tournamentId,
            uid: testUid,
            score: 800, // 未达到1000阈值
            gameData: { moves: 50, time: 300 },
            propsUsed: []
        });

        // 5. 测试提交分数 - 达到阈值
        console.log("5. 测试提交分数 - 达到阈值...");
        const submitResult2 = await testSubmitScore(ctx, {
            tournamentId: joinResult.tournamentId,
            uid: testUid,
            score: 1200, // 达到1000阈值
            gameData: { moves: 40, time: 280 },
            propsUsed: ["hint"]
        });

        // 6. 验证结算结果
        console.log("6. 验证结算结果...");
        await verifySettlementResults(ctx, {
            tournamentId: joinResult.tournamentId,
            uid: testUid,
            expectedRank: 1, // 达到阈值应该获得第一名
            expectedScore: 1200
        });

        // 7. 测试多次尝试限制
        console.log("7. 测试多次尝试限制...");
        await testMultipleAttemptsLimit(ctx, {
            uid: testUid,
            player,
            season
        });

        console.log("=== 阈值锦标赛集成测试完成 ===");
        return {
            success: true,
            message: "阈值锦标赛集成测试通过",
            testResults: {
                joinResult,
                submitResult1,
                submitResult2
            }
        };

    } catch (error) {
        console.error("阈值锦标赛集成测试失败:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "未知错误"
        };
    }
};

/**
 * 初始化测试数据
 */
async function initializeTestData(ctx: any, uid: string) {
    const now = getTorontoDate();

    // 创建测试玩家
    const playerId = await ctx.db.insert("players", {
        uid,
        segmentName: "gold",
        isSubscribed: true,
        totalPoints: 1500,
        eloScore: 1200,
        createdAt: now.iso,
        lastActive: now.iso
    });

    // 创建测试赛季
    const seasonId = await ctx.db.insert("seasons", {
        name: "测试赛季",
        startDate: now.iso,
        endDate: new Date(now.localDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        isActive: true,
        createdAt: now.iso,
        updatedAt: now.iso
    });

    // 创建玩家赛季数据
    await ctx.db.insert("player_seasons", {
        uid,
        seasonId,
        seasonPoints: 0,
        gamePoints: { solitaire: 0, uno: 0, ludo: 0, rummy: 0 },
        matchesPlayed: 0,
        matchesWon: 0,
        winRate: 0,
        lastMatchAt: now.iso,
        createdAt: now.iso,
        updatedAt: now.iso
    });

    // 创建玩家库存
    const inventoryId = await ctx.db.insert("player_inventory", {
        uid,
        coins: 1000,
        props: [
            { gameType: "solitaire", propType: "hint", quantity: 10 },
            { gameType: "solitaire", propType: "undo", quantity: 5 }
        ],
        tickets: [
            { gameType: "solitaire", tournamentType: "single_player_threshold_tournament", quantity: 5 }
        ],
        createdAt: now.iso,
        updatedAt: now.iso
    });

    return {
        player: await ctx.db.get(playerId),
        season: await ctx.db.get(seasonId),
        inventory: await ctx.db.get(inventoryId)
    };
}

/**
 * 确保锦标赛类型存在
 */
async function ensureTournamentTypeExists(ctx: any) {
    const existingType = await ctx.db
        .query("tournament_types")
        .withIndex("by_typeId", (q: any) => q.eq("typeId", "single_player_threshold_tournament"))
        .first();

    if (!existingType) {
        const now = getTorontoDate();
        await ctx.db.insert("tournament_types", {
            typeId: "single_player_threshold_tournament",
            name: "单人阈值锦标赛",
            description: "达到目标分数即可获胜，挑战你的极限",
            category: "casual",
            gameType: "solitaire",
            isActive: true,
            priority: 2,
            defaultConfig: {
                entryFee: {
                    coins: 30
                },
                rules: {
                    maxAttempts: 3,
                    isSingleMatch: true,
                    rankingMethod: "threshold",
                    scoreThreshold: 1000
                },
                duration: 86400,
                isSubscribedRequired: false
            },
            createdAt: now.iso,
            updatedAt: now.iso
        });
        console.log("创建阈值锦标赛类型");
    }
}

/**
 * 测试加入阈值锦标赛
 */
async function testJoinThresholdTournament(ctx: any, params: {
    uid: string;
    player: any;
    season: any;
}) {
    const joinResult = await ctx.runMutation(
        (internal as any)["service/tournament/tournamentService"].joinTournament,
        {
            uid: params.uid,
            gameType: "solitaire",
            tournamentType: "single_player_threshold_tournament"
        }
    );

    console.log("加入锦标赛结果:", joinResult);

    if (!joinResult.success) {
        throw new Error(`加入锦标赛失败: ${joinResult.message}`);
    }

    return joinResult;
}

/**
 * 测试提交分数
 */
async function testSubmitScore(ctx: any, params: {
    tournamentId: string;
    uid: string;
    score: number;
    gameData: any;
    propsUsed: string[];
}) {
    const submitResult = await ctx.runMutation(
        (internal as any)["service/tournament/tournamentService"].submitScore,
        {
            tournamentId: params.tournamentId,
            uid: params.uid,
            gameType: "solitaire",
            score: params.score,
            gameData: params.gameData,
            propsUsed: params.propsUsed
        }
    );

    console.log("提交分数结果:", submitResult);

    if (!submitResult.success) {
        throw new Error(`提交分数失败: ${submitResult.message}`);
    }

    return submitResult;
}

/**
 * 验证结算结果
 */
async function verifySettlementResults(ctx: any, params: {
    tournamentId: string;
    uid: string;
    expectedRank: number;
    expectedScore: number;
}) {
    // 获取锦标赛详情
    const tournamentDetails = await ctx.runQuery(
        (internal as any)["service/tournament/tournamentService"].getTournamentDetails,
        {
            tournamentId: params.tournamentId
        }
    );

    console.log("锦标赛详情:", tournamentDetails);

    // 验证锦标赛状态
    if (tournamentDetails.tournament.status !== "completed") {
        throw new Error("锦标赛应该已完成");
    }

    // 验证玩家排名
    const playerResult = tournamentDetails.players.find((p: any) => p.uid === params.uid);
    if (!playerResult) {
        throw new Error("未找到玩家结果");
    }

    if (playerResult.rank !== params.expectedRank) {
        throw new Error(`期望排名 ${params.expectedRank}，实际排名 ${playerResult.rank}`);
    }

    if (playerResult.bestScore !== params.expectedScore) {
        throw new Error(`期望最高分 ${params.expectedScore}，实际最高分 ${playerResult.bestScore}`);
    }

    console.log("结算结果验证通过");
}

/**
 * 测试多次尝试限制
 */
async function testMultipleAttemptsLimit(ctx: any, params: {
    uid: string;
    player: any;
    season: any;
}) {
    console.log("测试多次尝试限制...");

    // 尝试加入第4次（超过限制）
    try {
        const joinResult = await ctx.runMutation(
            (internal as any)["service/tournament/tournamentService"].joinTournament,
            {
                uid: params.uid,
                gameType: "solitaire",
                tournamentType: "single_player_threshold_tournament"
            }
        );

        if (joinResult.success) {
            throw new Error("应该拒绝第4次尝试");
        }
    } catch (error) {
        if (error instanceof Error && error.message.includes("最大尝试次数")) {
            console.log("多次尝试限制测试通过");
        } else {
            throw error;
        }
    }
}

/**
 * 测试阈值排名逻辑
 */
export const testThresholdRankingLogic = async (ctx: any) => {
    console.log("=== 测试阈值排名逻辑 ===");

    const testCases = [
        { score: 800, expectedRank: 2, description: "未达到阈值" },
        { score: 1000, expectedRank: 1, description: "刚好达到阈值" },
        { score: 1200, expectedRank: 1, description: "超过阈值" },
        { score: 900, expectedRank: 2, description: "接近但未达到阈值" }
    ];

    for (const testCase of testCases) {
        console.log(`测试: ${testCase.description} (分数: ${testCase.score})`);

        const uid = `test_threshold_${testCase.score}_${Date.now()}`;

        try {
            // 初始化测试数据
            const { player, season } = await initializeTestData(ctx, uid);
            await ensureTournamentTypeExists(ctx);

            // 加入锦标赛
            const joinResult = await testJoinThresholdTournament(ctx, {
                uid,
                player,
                season
            });

            // 提交分数
            const submitResult = await testSubmitScore(ctx, {
                tournamentId: joinResult.tournamentId,
                uid,
                score: testCase.score,
                gameData: { moves: 50, time: 300 },
                propsUsed: []
            });

            // 验证排名
            await verifySettlementResults(ctx, {
                tournamentId: joinResult.tournamentId,
                uid,
                expectedRank: testCase.expectedRank,
                expectedScore: testCase.score
            });

            console.log(`✓ ${testCase.description} 测试通过`);

        } catch (error) {
            console.error(`✗ ${testCase.description} 测试失败:`, error);
            throw error;
        }
    }

    console.log("=== 阈值排名逻辑测试完成 ===");
}; 