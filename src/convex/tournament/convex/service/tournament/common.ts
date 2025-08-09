import { Id } from "../../_generated/dataModel";
import { TimeZoneUtils } from "../../util/TimeZoneUtils";
import { LeaderboardSystem } from "../leaderboard/leaderboardSystem";
import { getTorontoMidnight } from "../simpleTimezoneUtils";
import { TicketSystem } from "../ticket/ticketSystem";

/**
 * 公共工具函数
 * 包含在多个地方使用的共享函数
 */


/**
 * 获取玩家尝试次数
 * 统计玩家在指定时间范围内参与特定类型锦标赛的次数
 */
export async function getPlayerAttempts(ctx: any, { uid, tournamentType }: {
    uid: string;
    tournamentType: any;
}) {
    const now = getTorontoMidnight();
    let startTime: string;
    // 根据时间范围确定开始时间
    switch (tournamentType.timeRange) {
        case "daily":
            startTime = now.localDate.toISOString().split("T")[0] + "T00:00:00.000Z";
            break;
        case "weekly":
            const weekStart = new Date(now.localDate);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            weekStart.setHours(0, 0, 0, 0);
            startTime = weekStart.toISOString();
            break;
        case "seasonal":
            // 获取当前赛季开始时间
            const season = await ctx.db
                .query("seasons")
                .withIndex("by_isActive", (q: any) => q.eq("isActive", true))
                .first();
            startTime = season?.startDate || now.localDate.toISOString();
            break;
        case "total":
            startTime = "1970-01-01T00:00:00.000Z";
            break;
        default:
            startTime = "1970-01-01T00:00:00.000Z"; // 从1970年开始
            break;
    }

    // 优化：直接使用新的索引查询，避免关联查询
    const playerMatches = await ctx.db
        .query("player_matches")
        .withIndex("by_tournamentType_uid_createdAt", (q: any) =>
            q.eq("uid", uid)
                .eq("tournamentType", tournamentType.typeId)
                .gte("createdAt", startTime)
        )
        .collect();

    return playerMatches

}


/**
 * 检查锦标赛参赛资格
 */
export async function checkTournamentEligibility(ctx: any, params: {
    tournamentType: any;
    player: any;
    inventory: any;
    attempts: number;
}) {
    const { tournamentType, player, inventory, attempts } = params;
    const entryRequirements = tournamentType.entryRequirements;
    const matchRules = tournamentType.matchRules;
    const reasons: string[] = [];

    // 检查段位要求
    if (entryRequirements?.minSegment) {
        const segments = ["bronze", "silver", "gold", "platinum", "diamond"];
        const playerIndex = segments.indexOf(player.segmentName);
        const minIndex = segments.indexOf(entryRequirements.minSegment);
        if (playerIndex < minIndex) {
            reasons.push(`需要至少 ${entryRequirements.minSegment} 段位`);
        }
    }

    if (entryRequirements?.maxSegment) {
        const segments = ["bronze", "silver", "gold", "platinum", "diamond"];
        const playerIndex = segments.indexOf(player.segmentName);
        const maxIndex = segments.indexOf(entryRequirements.maxSegment);
        if (playerIndex > maxIndex) {
            reasons.push(`段位不能超过 ${entryRequirements.maxSegment}`);
        }
    }

    // 检查订阅要求
    if (entryRequirements?.isSubscribedRequired && !player.isSubscribed) {
        reasons.push("需要订阅会员");
    }

    // 检查入场费
    const entryFee = entryRequirements?.entryFee;
    if (entryFee?.coins && (!inventory || inventory.coins < entryFee.coins)) {
        reasons.push(`需要 ${entryFee.coins} 金币`);
    }

    if (entryFee?.tickets) {
        const ticket = inventory?.tickets?.find((t: any) =>
            t.type === entryFee.tickets.type
        );
        if (!ticket || ticket.quantity < entryFee.tickets.quantity) {
            reasons.push(`需要 ${entryFee.tickets.quantity} 张门票`);
        }
    }

    // 检查参与次数限制
    const timeRange = tournamentType.timeRange || "total";
    // const attempts = await getPlayerAttempts(ctx, {
    //     uid,
    //     tournamentType
    // });

    const maxAttempts = matchRules?.maxAttempts;
    if (maxAttempts && attempts >= maxAttempts) {
        const timeRangeText = timeRange === 'daily' ? '今日' :
            timeRange === 'weekly' ? '本周' :
                timeRange === 'seasonal' ? '本赛季' : '';
        reasons.push(`已达${timeRangeText}最大尝试次数 (${attempts}/${maxAttempts})`);
    }

    return {
        eligible: reasons.length === 0,
        reasons
    };
}





// ==================== 类型定义 ====================
export enum TournamentStatus {
    OPEN = 0,
    COMPLETED = 1,
    COLLECTED = 2,
    CANCELLED = 3
}
export enum MatchStatus {
    MATCHING = 0,
    MATCHED = 1,
    COMPLETED = 2,
    SETTLED = 3,
    CANCELLED = 4
}
export interface TournamentHandler {
    validateJoin(ctx: any, args: any): Promise<any>;
    join(ctx: any, args: JoinArgs): Promise<any>;
    deductJoinCost(ctx: any, args: any): Promise<any>;
    settle(ctx: any, tournamentId: string): Promise<void>;
    validateTournamentForSettlement?(ctx: any, tournamentId: string): Promise<any>;
    getCompletedMatches?(ctx: any, tournamentId: string): Promise<any[]>;
    distributeRewardsToPlayers?(ctx: any, params: any): Promise<void>;
    logRewardDistributionError?(ctx: any, params: any): Promise<void>;
    completeTournament?(ctx: any, tournamentId: string, now: any): Promise<void>;
}

export interface JoinArgs {
    player: any;
    tournamentType: any;
    tournament: any;
}
export interface JoinValidateResult {
    attempted: number;
}

export interface JoinResult {
    tournamentId: string;
    attemptNumber: number;
    matchId?: string;
    playerMatchId?: string;
    gameId?: string;
    serverUrl?: string;
    matchStatus?: any;
    success?: boolean;
}

export interface SubmitScoreArgs {
    tournamentId: string;
    uid: string;
    gameType: string;
    score: number;
    gameData: any;
    propsUsed: string[];
    gameId?: string;
}

export interface SubmitScoreResult {
    success: boolean;
    matchId: string;
    score: number;
    deductionResult?: any;
    message: string;
    settled?: boolean;
    settleReason?: string;
}


// ==================== 通用函数 ====================


/**
  * 创建锦标赛
  */
export async function createTournament(ctx: any, params: {
    config: any;
    uids?: string[];
}) {
    const { config, uids } = params;
    const now = getTorontoMidnight();
    const season = await ctx.db
        .query("seasons")
        .withIndex("by_isActive", (q: any) => q.eq("isActive", true))
        .first();

    // 计算结束时间
    let endTime: string;
    switch (config.timeRange) {
        case "daily":
            endTime = new Date(now.localDate.getTime() + 24 * 60 * 60 * 1000).toISOString();
            break;
        case "weekly":
            endTime = new Date(now.localDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
            break;
        case "seasonal":
            endTime = new Date(now.localDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
            break;
        default:
            endTime = new Date(now.localDate.getTime() + 24 * 60 * 60 * 1000).toISOString();
    }

    // 创建锦标赛
    const tournamentId = await ctx.db.insert("tournaments", {
        seasonId: season._id,
        gameType: config.gameType,
        segmentName: "all", // 对所有段位开放
        status: TournamentStatus.OPEN,
        tournamentType: config.typeId,
        createdAt: now.iso,
        updatedAt: now.iso,
        endTime: endTime,
    });

    if (uids) {
        await Promise.all(uids.map(async (uid: string) => {
            await ctx.db.insert("player_tournaments", {
                uid,
                tournamentId,
                tournamentType: config.typeId,
                gameType: config.gameType,
                score: 0,
                gamePoint: 0,
                status: TournamentStatus.OPEN,
                createdAt: now.iso,
                updatedAt: now.iso,
            });
        }));
    }
    console.log(`成功创建锦标赛 ${config.typeId}: ${tournamentId}`);
    return tournamentId;
}


/**
 * 通用的数据获取函数
 */
export async function getCommonData(ctx: any, params: {
    uid: string;
    requireInventory?: boolean;
    requireSeason?: boolean;
}) {
    const { uid, requireInventory = true, requireSeason = true } = params;

    // 获取玩家信息
    const player = await ctx.db
        .query("players")
        .withIndex("by_uid", (q: any) => q.eq("uid", uid))
        .first();
    if (!player) {
        throw new Error("玩家不存在");
    }

    // 获取玩家库存
    let inventory = null;
    if (requireInventory) {
        inventory = await ctx.db
            .query("player_inventory")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .first();
    }

    // 获取当前赛季
    let season = null;
    if (requireSeason) {
        season = await ctx.db
            .query("seasons")
            .withIndex("by_isActive", (q: any) => q.eq("isActive", true))
            .first();
        if (!season) {
            throw new Error("无活跃赛季");
        }
    }

    return { player, inventory, season };
}


/**
 * 验证入场费
 * 检查玩家是否满足入场费要求，不进行实际扣除
 */
export async function validateEntryFee(ctx: any, params: {
    uid: string;
    tournamentType: any;
}) {
    const { uid, tournamentType } = params;

    if (!tournamentType.entryRequirements?.entryFee) {
        return; // 没有入场费要求
    }

    const entryFee = tournamentType.entryRequirements.entryFee;

    // 检查门票入场费
    if (entryFee.tickets && entryFee.tickets.length > 0) {
        const tickets = await TicketSystem.getPlayerTickets(ctx, uid);

        for (const requiredTicket of entryFee.tickets) {
            const hasTicket = tickets.some((ticket: any) =>
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
 * 扣除入场费并记录日志
 */
export async function deductEntryFee(ctx: any, params: {
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
export async function findTournamentByType(ctx: any, params: { tournamentType: any }) {
    const now = getTorontoMidnight();
    let startTime: string;
    // 根据时间范围确定开始时间

    switch (params.tournamentType.timeRange) {
        case "daily":
            startTime = now.localDate.toISOString().split("T")[0] + "T00:00:00.000Z";
            break;
        case "weekly":
            const weekStart = new Date(now.localDate);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            weekStart.setHours(0, 0, 0, 0);
            startTime = weekStart.toISOString();
            break;
        case "seasonal":
            // 获取当前赛季开始时间
            const season = await ctx.db
                .query("seasons")
                .withIndex("by_isActive", (q: any) => q.eq("isActive", true))
                .first();
            startTime = season?.startDate || now.localDate.toISOString();
            break;
        case "total":
            startTime = "1970-01-01T00:00:00.000Z";
            break;
        default:
            startTime = "1970-01-01T00:00:00.000Z"; // 从1970年开始
            break;
    }
    const tournament = await ctx.db.query("tournaments").withIndex("by_type_status_createdAt", (q: any) => q.eq("tournamentType", params.tournamentType.typeId).eq("status", TournamentStatus.OPEN).gte("createdAt", startTime)).first();
    return tournament;
}
export async function findPlayerRank(ctx: any, params: { uid: string; tournamentId: string }) {
    const { uid, tournamentId } = params;
    const playerTournament = await ctx.db.query("player_tournaments").withIndex("by_tournament_uid", (q: any) => q.eq("tournamentId", tournamentId).eq("uid", uid)).unique();
    if (!playerTournament) {
        return -1
    }
    const tournamentType = await ctx.db.query("tournamentTypes").withIndex("by_typeId", (q: any) => q.eq("typeId", playerTournament.tournamentType)).unique();
    const playerScore = tournamentType.matchRules.pointsPerMatch ? playerTournament.gamePoint : playerTournament.score;

    const batchSize = 1000; // 每批加载 1000 条记录
    let currentRank = 0; // 当前累计排名
    let currentScore = 1000000; // 当前分数，用于处理并列
    let rank = null;
    let tournaments: any[] = [];
    while (true) {
        // 按 score 降序获取一批数据
        if (tournamentType.matchRules.pointsPerMatch) {
            tournaments = await ctx.db
                .query("player_tournaments")
                .withIndex("by_tournament_gamePoint", (q: any) => q.eq("tournamentId", tournamentId).lte("gamePoint", currentScore))
                .order("desc")
                .take(batchSize)
                .collect();
        } else {
            tournaments = await ctx.db
                .query("player_tournaments")
                .withIndex("by_tournament_score", (q: any) => q.eq("tournamentId", tournamentId).lte("score", currentScore))
                .order("desc")
                .take(batchSize)
                .collect();
        }
        // 如果本批次为空，说明已遍历完所有数据
        if (tournaments.length === 0) {
            break;
        }

        currentScore = tournamentType.matchRules.pointsPerMatch ? currentScore = tournaments[tournaments.length - 1].gamePoint : currentScore = tournaments[tournaments.length - 1].score;
        if (playerScore >= currentScore) {
            const aboveTournaments = tournaments.filter((t: any) => {
                if (tournamentType.matchRules.pointsPerMatch) {
                    return t.gamePoint > playerScore;
                } else {
                    return t.score > playerScore;
                }
            })
            let sameScoreTournaments;
            if (tournamentType.matchRules.pointsPerMatch) {
                sameScoreTournaments = await ctx.db
                    .query("player_tournaments")
                    .withIndex("by_tournament_gamePoint", (q: any) => q.eq("tournamentId", tournamentId).eq("gamePoint", playerScore))
                    .collect();
            } else {
                sameScoreTournaments = await ctx.db
                    .query("player_tournaments")
                    .withIndex("by_tournament_score", (q: any) => q.eq("tournamentId", tournamentId).eq("score", playerScore))
                    .collect();
            }
            const index = sameScoreTournaments.sort((a: any, b: any) => a.updatedAt - b.updatedAt).findIndex((t: any) => t.uid === uid);
            rank = currentRank + aboveTournaments.length + index;
            break;
        }
        currentRank += tournaments.length;
    }
    return rank;
}
export async function settleTournament(ctx: any, tournament: any) {
    const tournamentId = tournament._id;
    const tournamentType = await ctx.db.query("tournament_types").withIndex("by_typeId", (q: any) => q.eq("typeId", tournament.tournamentType)).unique();
    let playerTournaments;
    tournamentType.rewards.rankRewards.sort((a: any, b: any) => b.rankRange[0] - a.rankRange[0]);
    const maxRank = tournamentType.rewards.rankRewards[0].rankRange[1]
    if (tournamentType.matchRules.pointsPerMatch) {
        playerTournaments = await ctx.db.query("player_tournaments").withIndex("by_tournament_point", (q: any) => q.eq("tournamentId", tournamentId)).order("desc").take(maxRank);
    } else {
        playerTournaments = await ctx.db.query("player_tournaments").withIndex("by_tournament_score", (q: any) => q.eq("tournamentId", tournamentId)).order("desc").take(maxRank);
    }

    let rank = 0;
    for (const playerTournament of playerTournaments) {
        rank++;
        playerTournament.rank = rank;
        const rewards = await calculateRewards(ctx, { tournamentType, playerTournament });
        playerTournament.rewards = rewards;
        await ctx.db.patch(playerTournament._id, {
            rank,
            rewards
        });

        // 如果是快速对局锦标赛（single_match类型），累积排行榜积分
        if (tournamentType.matchRules.matchType === "single_match" && tournamentType.matchRules.matchPoints) {
            await accumulateLeaderboardPoints(ctx, {
                uid: playerTournament.uid,
                gameType: tournamentType.gameType,
                score: playerTournament.score, // 传递实际排名
            });
        }
    }
    await ctx.db.patch(tournamentId as Id<"tournaments">, {
        status: TournamentStatus.COMPLETED
    });
}

/**
 * 为快速对局累积排行榜积分
 */
async function accumulateLeaderboardPoints(ctx: any, params: {
    uid: string;
    gameType: string;
    score: number; // 对局中的排名
}) {
    try {
        // 使用便捷的积分更新方法
        const result = await LeaderboardSystem.updatePoints(ctx, params);

        if (result.success) {
            console.log(`快速对局积分累积完成：玩家 ${params.uid}，排名 ${params.score}，游戏类型 ${params.gameType}`);
        } else {
            console.error("积分累积失败:", result.message);
        }

        return result;
    } catch (error) {
        console.error("累积排行榜积分失败:", error);
        return {
            success: false,
            message: "累积排行榜积分失败"
        };
    }
}
export async function collectRewards(ctx: any, playerTournament: any) {
    const player = await ctx.db.query("players").withIndex("by_uid", (q: any) => q.eq("uid", playerTournament.uid)).unique();
    const coins = player.coins ?? 0 + (playerTournament.rewards.coins ?? 0);
    const gamePoints = player.gamePoints ?? 0 + (playerTournament.rewards.gamePoints ?? 0);
    await ctx.db.patch(player._id, {
        coins,
        gamePoints
    });
    if (playerTournament.rewards.tickets) {
        await Promise.all(playerTournament.rewards.tickets.forEach(async (ticket: any) => {
            await TicketSystem.grantTicketReward(ctx, {
                uid: playerTournament.uid,
                type: ticket.type,
                quantity: ticket.quantity
            });
        }));
    }
    // if (playerTournament.rewards.props) {
    //     await Promise.all(playerTournament.rewards.props.forEach(async (prop: any) => {
    //         await PropSystem.addPropToPlayer(ctx, playerTournament.uid, prop.propId, prop.quantity)
    //     }));
    // }

}
export async function calculateRewards(ctx: any, params: {
    tournamentType: any;
    playerTournament: any;
}) {
    const { tournamentType, playerTournament } = params;
    const reward: any = { coins: tournamentType.rewards.baseRewards.coins ?? 0, gamePoints: tournamentType.rewards.baseRewards.gamePoints ?? 0, props: [], tickets: [] };
    if (tournamentType.rewards.baseRewards.props)
        reward.props = [...tournamentType.rewards.baseRewards.props];
    if (tournamentType.rewards.baseRewards.tickets)
        reward.tickets = [...tournamentType.rewards.baseRewards.tickets];
    if (tournamentType.rewards.rankRewards) {
        const rankReward = tournamentType.rewards.rankRewards.find((reward: any) => playerTournament.rank >= reward.rankRange[0] && playerTournament.rank <= reward.rankRange[1]);
        if (rankReward?.multiplier) {
            reward.coins *= rankReward.multiplier;
            reward.gamePoints *= rankReward.multiplier;
        }
        await Promise.all(rankReward?.bonusProps?.forEach(async (prop: any) => {
            const propIndex = reward.props.findIndex((p: any) => p.propId === prop.propId);
            if (propIndex !== -1) {
                reward.props[propIndex].quantity += prop.quantity;
            } else {
                reward.props.push(prop);
            }
        }));

        await Promise.all(rankReward?.bonusTickets?.forEach(async (ticket: any) => {
            const ticketIndex = reward.tickets.findIndex((t: any) => t.type === ticket.type);
            if (ticketIndex !== -1) {
                reward.tickets[ticketIndex].quantity += ticket.quantity;
            } else {
                reward.tickets.push(ticket);
            }
        }));
    }


    // if (rewards.segmentBonus) {
    //     const segmentBonus = rewards.segmentBonus;
    //     const segment = playerTournament.segment;
    //     if (segmentBonus[segment]) {
    //         playerTournament.coins += segmentBonus[segment];
    //     }
    // }
    // if (rewards.subscriptionBonus) {
    //     const subscriptionBonus = rewards.subscriptionBonus;
    //     if (playerTournament.isSubscribed) {
    //         playerTournament.coins += subscriptionBonus;
    //     }
    // }
    // if (rewards.participationReward) {
    //     return playerTournament;
    // }
    // if (rewards.streakBonus) {
    //     const streakBonus = rewards.streakBonus;
    //     if (playerTournament.streak >= streakBonus.minStreak) {
    //         playerTournament.coins += streakBonus.bonusMultiplier;
    //     }
    // }
    return reward;
}

export async function scheduleIsOpen(ctx: any,
    tournamentType: any
) {
    const schedule = tournamentType.schedule;
    if (schedule) {
        switch (tournamentType.timeRange) {
            case "daily":
                const today = TimeZoneUtils.getCurrentDate(schedule.timeZone);
                const openISO = TimeZoneUtils.getSpecificTimeZoneISO({ timeZone: schedule.timeZone, date: today, time: schedule.open.time });
                const now = new Date();
                return openISO && now.toISOString() >= openISO
            case "weekly":
                return TimeZoneUtils.getSpecificTimeZoneISO({ timeZone: schedule.timeZone, date: schedule.open.day, time: schedule.open.time });
            case "seasonal":
                break;
            default:
                break;
        }
    }
    return true;
}
export async function scheduleIsStart(ctx: any,
    tournamentType: any
) {
    const schedule = tournamentType.schedule;
    if (schedule) {
        switch (tournamentType.timeRange) {
            case "daily":
                const today = TimeZoneUtils.getCurrentDate(schedule.timeZone);
                const startISO = TimeZoneUtils.getSpecificTimeZoneISO({ timeZone: schedule.timeZone, date: today, time: schedule.start.time });
                const now = new Date();
                return startISO && now.toISOString() >= startISO
            case "weekly":
                return TimeZoneUtils.getSpecificTimeZoneISO({ timeZone: schedule.timeZone, date: schedule.start.day, time: schedule.start.time });
            case "seasonal":
                break;
            default:
                break;
        }
    }
    return true;
}