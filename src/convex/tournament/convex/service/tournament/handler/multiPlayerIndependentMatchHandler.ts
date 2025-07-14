import { findTypeById } from "../../../dao/tournamentDao";
import { getTorontoDate } from "../../utils";
import {
    TournamentHandler,
    calculatePlayerRankings,
    getPlayerAttempts,
    logPropUsage,
    notifyTournamentChanges,
    shouldSettleImmediately,
    validateScoreSubmission
} from "../common";
import { MatchManager } from "../matchManager";
import { multiPlayerHandler } from "./multiPlayerHandler";

/**
 * 多人独立比赛锦标赛处理器
 * 特点：
 * 1. 多个玩家共享同一个锦标赛实例
 * 2. 每个玩家进行独立的单人比赛
 * 3. 根据所有玩家的独立比赛成绩进行排名
 * 4. 支持多次尝试和每场奖励
 */
export const multiPlayerIndependentMatchHandler: TournamentHandler = {
    ...multiPlayerHandler,


    /**
     * 验证分数提交
     */
    validateScore: async (ctx: any, params: {
        tournamentId: string;
        uid: string;
        gameType: string;
        score: number;
        gameData: any;
        propsUsed: string[];
        gameId?: string;
    }) => {
        await validateScoreSubmission(ctx, params);
    },

    /**
     * 加入锦标赛
     */
    join: async (ctx: any, params: {
        uid: string;
        gameType: string;
        typeId: string;
    }) => {
        const { uid, gameType, typeId } = params;
        const now = getTorontoDate();

        // 获取锦标赛类型配置
        const tournamentType = await ctx.runQuery(findTypeById, { typeId });
        if (!tournamentType) {
            throw new Error("锦标赛类型不存在");
        }

        // 验证加入资格
        await multiPlayerIndependentMatchHandler.validateJoin(ctx, {
            uid,
            gameType,
            tournamentType
        });

        // 获取玩家信息
        const player = await ctx.db
            .query("players")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .first();

        if (!player) {
            throw new Error("玩家不存在");
        }

        // 获取玩家库存并处理入场费
        const inventory = await ctx.db
            .query("player_inventory")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .first();

        // 扣除入场费
        await deductEntryFee(ctx, { uid, tournamentType, inventory, now });

        // 获取玩家尝试次数
        const timeRange = tournamentType.timeRange || "total";
        const attempts = await getPlayerAttempts(ctx, {
            uid,
            tournamentType
        });

        // 查找或创建锦标赛
        const tournament = await multiPlayerIndependentMatchHandler.findAndJoinTournament(ctx, {
            uid,
            gameType,
            tournamentType,
            player,
            now,
            attemptNumber: attempts + 1
        });

        // 创建独立的单人比赛
        const matchId = await MatchManager.createMatch(ctx, {
            tournamentId: tournament._id,
            gameType,
            matchType: "single_player",
            maxPlayers: 1,
            minPlayers: 1,
            gameData: {
                tournamentType: typeId,
                attemptNumber: attempts + 1,
                independentMatch: {
                    playerUid: uid,
                    isIndependent: true
                }
            }
        });

        // 玩家加入比赛
        const playerMatchId = await MatchManager.joinMatch(ctx, {
            matchId,
            tournamentId: tournament._id,
            uid,
            gameType
        });

        return {
            tournamentId: tournament._id,
            attemptNumber: attempts + 1,
            matchId,
            playerMatchId,
            gameId: `independent_match_${matchId}`,
            serverUrl: "remote_server_url",
            matchStatus: "pending",
            success: true
        };
    },

    /**
     * 提交分数
     */
    submitScore: async (ctx: any, params: {
        tournamentId: string;
        uid: string;
        gameType: string;
        score: number;
        gameData: any;
        propsUsed: string[];
        gameId?: string;
    }) => {
        const { tournamentId, uid, gameType, score, gameData, propsUsed, gameId } = params;
        const now = getTorontoDate();

        // 验证分数提交
        await validateScoreSubmission(ctx, { tournamentId, uid, gameType, score, gameData, propsUsed, gameId });

        // 获取玩家的比赛记录
        const playerMatch = await ctx.db
            .query("player_matches")
            .withIndex("by_tournament_uid", (q: any) =>
                q.eq("tournamentId", tournamentId).eq("uid", uid)
            )
            .order("desc")
            .first();

        if (!playerMatch) {
            throw new Error("未找到比赛记录");
        }

        // 验证分数
        if (score < 0) {
            throw new Error("分数不能为负数");
        }

        // 检查是否已经提交过分数
        if (playerMatch.completed) {
            throw new Error("比赛已完成，无法再次提交分数");
        }

        // 处理道具扣除
        let deductionResult: any = { success: true, deductedProps: [] };
        if (propsUsed.length > 0) {
            try {
                // 临时简化处理
                deductionResult = {
                    success: true,
                    deductedProps: propsUsed,
                    deductionId: `temp_${Date.now()}`
                };
            } catch (error) {
                console.error("道具扣除失败:", error);
                deductionResult = {
                    success: false,
                    error: error instanceof Error ? error.message : "道具扣除失败",
                    deductedProps: []
                };
            }
        }

        // 更新比赛记录
        await MatchManager.submitScore(ctx, {
            matchId: playerMatch.matchId,
            tournamentId,
            uid,
            gameType,
            score,
            gameData,
            propsUsed,
            attemptNumber: playerMatch.attemptNumber || 1
        });

        // 获取锦标赛信息
        const tournament = await ctx.db.get(tournamentId);
        if (!tournament) {
            throw new Error("锦标赛不存在");
        }

        // 检查是否需要立即结算
        const shouldSettle = await shouldSettleImmediately(ctx, tournament, tournamentId);

        let settleResult = { settled: false, settleReason: "delayed_settlement" };
        if (shouldSettle) {
            // 立即结算锦标赛
            await multiPlayerIndependentMatchHandler.settle(ctx, tournamentId);
            settleResult = { settled: true, settleReason: "immediate_settlement" };
        }

        // 记录道具使用日志
        if (propsUsed.length > 0) {
            await logPropUsage(ctx, {
                uid,
                tournamentId,
                matchId: playerMatch.matchId,
                propsUsed,
                gameId,
                deductionResult
            });
        }

        return {
            success: true,
            matchId: playerMatch.matchId,
            score,
            deductionResult,
            message: "分数提交成功",
            settled: settleResult.settled,
            settleReason: settleResult.settleReason
        };
    },

    /**
     * 结算锦标赛
     */
    settle: async (ctx: any, tournamentId: string) => {
        const now = getTorontoDate();

        // 验证锦标赛是否可以结算
        const tournament = await ctx.db.get(tournamentId);
        if (!tournament) {
            throw new Error("锦标赛不存在");
        }

        if (tournament.status !== "open") {
            throw new Error("锦标赛状态不允许结算");
        }

        // 获取完成的比赛
        const completedMatches = await ctx.db
            .query("player_matches")
            .withIndex("by_tournament", (q: any) => q.eq("tournamentId", tournamentId))
            .filter((q: any) => q.eq(q.field("completed"), true))
            .collect();

        if (completedMatches.length === 0) {
            throw new Error("没有完成的比赛，无法结算锦标赛");
        }

        // 计算玩家排名
        const sortedPlayers = await calculatePlayerRankings(ctx, tournamentId);

        // 分配奖励
        for (const player of sortedPlayers) {
            try {
                // 计算奖励
                const reward = calculateReward(player.rank, tournament.config.rewards);

                // 分配奖励
                await distributeReward(ctx, {
                    uid: player.uid,
                    rank: player.rank,
                    score: player.score,
                    tournament,
                    matches: completedMatches,
                    reward
                });
            } catch (error) {
                console.error(`奖励分配失败 (${player.uid}):`, error);
                await ctx.db.insert("error_logs", {
                    error: error instanceof Error ? error.message : "未知错误",
                    context: "reward_distribution",
                    uid: player.uid,
                    createdAt: now.iso
                });
            }
        }

        // 完成锦标赛
        await ctx.db.patch(tournamentId, {
            status: "completed",
            updatedAt: now.iso
        });

        // 通知所有参与者
        for (const player of sortedPlayers) {
            await notifyTournamentChanges(ctx, {
                uid: player.uid,
                changeType: "tournament_completed",
                tournamentType: tournament.tournamentType,
                tournamentId,
                data: {
                    name: tournament.tournamentType,
                    action: "independent_match_completed",
                    rank: player.rank,
                    score: player.score
                }
            });
        }

        console.log(`多人独立比赛锦标赛 ${tournamentId} 结算完成，共 ${sortedPlayers.length} 名玩家参与`);
    }
};


/**
 * 验证入场费
 */
async function validateEntryFee(ctx: any, params: {
    uid: string;
    tournamentType: any;
    inventory: any;
}) {
    const { uid, tournamentType, inventory } = params;

    // 检查入场费
    if (tournamentType.entryRequirements?.entryFee) {
        const entryFee = tournamentType.entryRequirements.entryFee;

        if (entryFee.coins && (!inventory || inventory.coins < entryFee.coins)) {
            throw new Error("金币不足");
        }
    }
}

/**
 * 扣除入场费
 */
async function deductEntryFee(ctx: any, params: {
    uid: string;
    tournamentType: any;
    inventory: any;
    now: any;
}) {
    const { uid, tournamentType, inventory, now } = params;

    if (tournamentType.entryRequirements?.entryFee) {
        const entryFee = tournamentType.entryRequirements.entryFee;

        if (entryFee.coins && inventory) {
            await ctx.db.patch(inventory._id, {
                coins: inventory.coins - entryFee.coins,
                updatedAt: now.iso
            });
        }
    }
}

/**
 * 计算奖励
 */
function calculateReward(rank: number, rewards: any) {
    const rankReward = rewards.rankRewards.find((r: any) =>
        rank >= r.rankRange[0] && rank <= r.rankRange[1]
    );

    return {
        coins: rewards.baseRewards.coins * (rankReward?.multiplier || 1),
        gamePoints: rewards.baseRewards.gamePoints * (rankReward?.multiplier || 1),
        props: [...rewards.baseRewards.props, ...(rankReward?.bonusProps || [])],
        tickets: [...rewards.baseRewards.tickets, ...(rankReward?.bonusTickets || [])]
    };
}

/**
 * 分配奖励
 */
async function distributeReward(ctx: any, params: {
    uid: string;
    rank: number;
    score: number;
    tournament: any;
    matches: any[];
    reward: any;
}) {
    const { uid, rank, score, tournament, matches, reward } = params;

    // 更新玩家库存
    const inventory = await ctx.db
        .query("player_inventory")
        .withIndex("by_uid", (q: any) => q.eq("uid", uid))
        .first();

    if (inventory) {
        await ctx.db.patch(inventory._id, {
            coins: inventory.coins + reward.coins,
            gamePoints: inventory.gamePoints + reward.gamePoints,
            updatedAt: new Date().toISOString()
        });
    }

    // 记录奖励分配
    await ctx.db.insert("reward_distributions", {
        uid,
        tournamentId: tournament._id,
        rank,
        score,
        reward,
        createdAt: new Date().toISOString()
    });
} 