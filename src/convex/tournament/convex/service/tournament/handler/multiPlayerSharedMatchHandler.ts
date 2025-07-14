import { findTypeById } from "../../../dao/tournamentDao";
import { getTorontoDate } from "../../utils";
import {
    TournamentHandler,
    calculatePlayerRankings,
    logPropUsage,
    notifyTournamentChanges,
    shouldSettleImmediately,
    validateScoreSubmission
} from "../common";
import { MatchManager } from "../matchManager";
import { TournamentMatchingService } from "../tournamentMatchingService";
import { multiPlayerHandler } from "./multiPlayerHandler";

/**
 * 多人共享比赛锦标赛处理器
 * 特点：
 * 1. 多个玩家共享同一个比赛实例
 * 2. 支持独立锦标赛（一个比赛实例对应一个锦标赛）和共享锦标赛（多个比赛实例对应一个锦标赛）
 * 3. 实时对战和互动
 * 4. 基于对战结果进行排名
 * 5. 支持智能匹配和队列管理，
 * 5. 立即奖励结算
 */
export const multiPlayerSharedMatchHandler: TournamentHandler = {
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
        // 获取玩家信息
        const player = await ctx.db
            .query("players")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .first();

        if (!player) {
            throw new Error("玩家不存在");
        }
        // 获取锦标赛类型配置
        const tournamentType = await ctx.runQuery(findTypeById, { typeId });
        if (!tournamentType) {
            throw new Error("锦标赛类型不存在");
        }
        // 验证加入资格
        await multiPlayerSharedMatchHandler.validateJoin(ctx, {
            uid,
            gameType,
            tournamentType
        });

        // 获取玩家库存并处理入场费
        const inventory = await ctx.db
            .query("player_inventory")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .first();

        // 扣除入场费
        await multiPlayerSharedMatchHandler.deductJoinCost(ctx, { uid, tournamentType, inventory, now });

        // 检查是否为单一比赛模式
        const isSingleMatch = tournamentType.singleMatch || false;

        let tournament: any;
        let matchResult: any;
        const config = {
            entryRequirements: tournamentType.entryRequirements,
            matchRules: tournamentType.matchRules,
            rewards: tournamentType.rewards,
            schedule: tournamentType.schedule,
            limits: tournamentType.limits,
            advanced: tournamentType.advanced
        }
        if (isSingleMatch) {
            // 单一比赛模式：直接基于tournamentType进行匹配，不创建锦标赛
            console.log(`单一比赛模式：基于tournamentType ${typeId} 进行匹配`);

            matchResult = await TournamentMatchingService.joinMatchingQueue(ctx, {
                uid,
                tournamentId: undefined, // 单一比赛模式下不需要tournamentId
                gameType,
                tournamentType: typeId,
                player,
                config,
                mode: "independent" // 使用独立模式
            });

            // 单一比赛模式下，tournamentId将在匹配成功后由后台任务创建
            tournament = {
                _id: "pending", // 临时ID，将在匹配成功后更新
                tournamentType: typeId
            };
        } else {
            // 传统模式：先创建锦标赛，再进行匹配
            console.log(`传统模式：创建锦标赛后进行匹配`);

            // 查找或创建锦标赛
            tournament = await multiPlayerSharedMatchHandler.findAndJoinTournament(ctx, {
                uid,
                gameType,
                tournamentType
            });

            // 使用匹配服务加入队列
            matchResult = await TournamentMatchingService.joinMatchingQueue(ctx, {
                uid,
                tournamentId: tournament._id,
                gameType,
                tournamentType: typeId,
                player,
                config,
                mode: "traditional"
            });
        }



        return {
            tournamentId: tournament._id,
            queueId: matchResult.queueId,
            status: matchResult.status,
            message: matchResult.message,
            waitTime: matchResult.waitTime,
            estimatedWaitTime: matchResult.estimatedWaitTime,
            isSingleMatch: isSingleMatch,
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
            await multiPlayerSharedMatchHandler.settle(ctx, tournamentId);
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
                    action: "shared_match_completed",
                    rank: player.rank,
                    score: player.score
                }
            });
        }

        console.log(`多人共享比赛锦标赛 ${tournamentId} 结算完成，共 ${sortedPlayers.length} 名玩家参与`);
    }
};

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

/**
 * 验证入场费
 */
async function validateEntryFee(ctx: any, params: {
    uid: string;
    tournamentType: any;
    inventory: any;
}) {
    const { uid, tournamentType, inventory } = params;

    if (!tournamentType.entryRequirements?.entryFee) {
        return; // 没有入场费要求
    }

    const entryFee = tournamentType.entryRequirements.entryFee;

    // 检查金币入场费
    if (entryFee.coins) {
        if (!inventory || inventory.coins < entryFee.coins) {
            throw new Error(`金币不足，需要 ${entryFee.coins} 金币，当前拥有 ${inventory?.coins || 0} 金币`);
        }
    }

    // 检查游戏点数入场费
    if (entryFee.gamePoints) {
        if (!inventory || inventory.gamePoints < entryFee.gamePoints) {
            throw new Error(`游戏点数不足，需要 ${entryFee.gamePoints} 点数，当前拥有 ${inventory?.gamePoints || 0} 点数`);
        }
    }

    // 检查道具入场费
    if (entryFee.props && entryFee.props.length > 0) {
        if (!inventory || !inventory.props) {
            throw new Error(`需要道具入场费，但玩家没有道具库存`);
        }

        for (const requiredProp of entryFee.props) {
            const hasProp = inventory.props.some((prop: any) =>
                prop.id === requiredProp.id || prop.name === requiredProp.name
            );
            if (!hasProp) {
                throw new Error(`缺少必需道具: ${requiredProp.name || requiredProp.id}`);
            }
        }
    }

    // 检查门票入场费
    if (entryFee.tickets && entryFee.tickets.length > 0) {
        if (!inventory || !inventory.tickets) {
            throw new Error(`需要门票入场费，但玩家没有门票库存`);
        }

        for (const requiredTicket of entryFee.tickets) {
            const hasTicket = inventory.tickets.some((ticket: any) =>
                ticket.id === requiredTicket.id || ticket.name === requiredTicket.name
            );
            if (!hasTicket) {
                throw new Error(`缺少必需门票: ${requiredTicket.name || requiredTicket.id}`);
            }
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

    if (!tournamentType.entryRequirements?.entryFee || !inventory) {
        return; // 没有入场费要求或没有库存
    }

    const entryFee = tournamentType.entryRequirements.entryFee;
    const updateData: any = { updatedAt: now.iso };

    // 扣除金币入场费
    if (entryFee.coins) {
        updateData.coins = inventory.coins - entryFee.coins;
    }

    // 扣除游戏点数入场费
    if (entryFee.gamePoints) {
        updateData.gamePoints = inventory.gamePoints - entryFee.gamePoints;
    }

    // 扣除道具入场费
    if (entryFee.props && entryFee.props.length > 0) {
        const updatedProps = [...(inventory.props || [])];
        for (const requiredProp of entryFee.props) {
            const propIndex = updatedProps.findIndex((prop: any) =>
                prop.id === requiredProp.id || prop.name === requiredProp.name
            );
            if (propIndex !== -1) {
                updatedProps.splice(propIndex, 1);
            }
        }
        updateData.props = updatedProps;
    }

    // 扣除门票入场费
    if (entryFee.tickets && entryFee.tickets.length > 0) {
        const updatedTickets = [...(inventory.tickets || [])];
        for (const requiredTicket of entryFee.tickets) {
            const ticketIndex = updatedTickets.findIndex((ticket: any) =>
                ticket.id === requiredTicket.id || ticket.name === requiredTicket.name
            );
            if (ticketIndex !== -1) {
                updatedTickets.splice(ticketIndex, 1);
            }
        }
        updateData.tickets = updatedTickets;
    }

    // 更新库存
    await ctx.db.patch(inventory._id, updateData);

    // 记录入场费扣除日志
    await ctx.db.insert("entry_fee_logs", {
        uid,
        tournamentType: tournamentType.typeId,
        gameType: tournamentType.gameType,
        entryFee,
        deductedAt: now.iso,
        createdAt: now.iso
    });
} 