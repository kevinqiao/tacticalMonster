import { Id } from "../../_generated/dataModel";
import { TimeZoneUtils } from "../../util/TimeZoneUtils";
import { PointCalculationService } from "./pointCalculationService";

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
    let startTime: string;
    switch (tournamentType.timeRange) {
        case "daily":
            startTime = TimeZoneUtils.getTimeZoneDayStartISO("America/Toronto");
            break;
        case "weekly":
            const weekStart = new Date(TimeZoneUtils.getTimeZoneWeekStartISO("America/Toronto"));
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            weekStart.setHours(0, 0, 0, 0);
            startTime = weekStart.toISOString();
            break;
        case "monthly":
            const monthStart = new Date(TimeZoneUtils.getTimeZoneWeekStartISO("America/Toronto"));
            monthStart.setDate(1);
            monthStart.setHours(0, 0, 0, 0);
            startTime = monthStart.toISOString();
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
export async function checkTournamentEligible(ctx: any, params: {
    tournamentType: any;
    uid: string;
}) {
    const { tournamentType, uid } = params;
    if (['daily', 'weekly', 'monthly'].includes(tournamentType.timeRange)) {
        const tournament = await findTournamentByType(ctx, { tournamentType: tournamentType });

        if (!tournament) {
            return false;
        }
    }
    const entryRequirements = tournamentType.entryRequirements;
    const matchRules = tournamentType.matchRules;


    // 检查入场费
    // const entryFee = entryRequirements?.entryFee;
    // if (entryFee) {
    //     return false;
    // }
    // const maxAttempts = matchRules?.maxAttempts;
    // if (maxAttempts) {
    //     const attempts = await getPlayerAttempts(ctx, { uid, tournamentType });
    //     if (attempts >= maxAttempts) {
    //         return false;
    //     }
    // }

    return true;
}


// ==================== 类型定义 ====================
export enum TournamentStatus {
    OPEN = 0,
    COMPLETED = 1,
    SETTLED = 2,
    COLLECTED = 3,
    CANCELLED = 4
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
    tournamentType: any;
}) {
    const tournament = {
        gameType: params.tournamentType.gameType,
        status: TournamentStatus.OPEN,
        type: params.tournamentType.typeId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    }
    if (['daily', 'weekly', 'monthly'].includes(params.tournamentType.timeRange)) {
        let startTime: string;
        // 根据时间范围确定开始时间
        switch (params.tournamentType.timeRange) {
            case "daily":
                startTime = TimeZoneUtils.getTimeZoneDayStartISO("America/Toronto");
                break;
            case "weekly":
                const weekStart = new Date(TimeZoneUtils.getTimeZoneWeekStartISO("America/Toronto"));
                weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                weekStart.setHours(0, 0, 0, 0);
                startTime = weekStart.toISOString();
                break;
            case "monthly":
                const monthStart = new Date(TimeZoneUtils.getTimeZoneWeekStartISO("America/Toronto"));
                monthStart.setDate(1);
                monthStart.setHours(0, 0, 0, 0);
                startTime = monthStart.toISOString();
                break;
            default:
                startTime = "1970-01-01T00:00:00.000Z"; // 从1970年开始
                break;
        }
        const existingTournament = await ctx.db.query("tournaments").withIndex("by_type_status_createdAt", (q: any) => q.eq("type", params.tournamentType.typeId).eq("status", TournamentStatus.OPEN).gte("createdAt", startTime)).first();
        if (!existingTournament) {
            const tournamentId = await ctx.db.insert("tournaments", tournament);
            return { ...tournament, id: tournamentId };
        }
        return { ...existingTournament, id: existingTournament._id, _id: undefined };
    } else {
        const tournamentId = await ctx.db.insert("tournaments", tournament);
        return { ...tournament, id: tournamentId };
    }
}
/**
  * 加入锦标赛
  */
export async function joinTournament(ctx: any, params: {
    tournamentId: string;
    uids: string[];
}) {
    const { tournamentId, uids } = params;
    if (uids.length === 0) {
        throw new Error("玩家列表不能为空");
    }
    const tournament = await ctx.db.get(tournamentId as Id<"tournaments">);
    if (!tournament) {
        throw new Error("锦标赛不存在");
    }
    const nowISO = new Date().toISOString();
    for (const uid of uids) {
        const playerTournament = await ctx.db.query("player_tournaments").withIndex("by_tournament_uid", (q: any) => q.eq("tournamentId", tournamentId).eq("uid", uid)).unique();
        if (!playerTournament) {
            await ctx.db.insert("player_tournaments", {
                uid,
                score: 0,
                status: TournamentStatus.OPEN,
                tournamentId,
                tournamentType: tournament.type,
                createdAt: nowISO,
                updatedAt: nowISO,
            });
        }
    }
}
export async function joinMatch(ctx: any, params: {
    matchId: string;
    uids: string[];
}) {

    const { matchId, uids } = params;
    if (uids.length === 0) {
        throw new Error("玩家列表不能为空");
    }
    const match = await ctx.db.get(matchId as Id<"matches">);
    if (!match) {
        throw new Error("比赛不存在");
    }
    const playerMatches = await ctx.db.query("player_matches").withIndex("by_match", (q: any) => q.eq("matchId", matchId)).collect();
    if ((playerMatches.length + uids.length) > match.maxPlayers) {
        throw new Error("比赛已满");
    }
    const nowISO = new Date().toISOString();
    await Promise.all(uids.map(async (uid: string) => {
        const playerMatch = await ctx.db.query("player_matches").withIndex("by_match_uid", (q: any) => q.eq("matchId", matchId).eq("uid", uid)).unique();
        if (!playerMatch) {
            await ctx.db.insert("player_matches", {
                matchId,
                uid,
                createdAt: nowISO,
                updatedAt: nowISO,
            });
        }
    }));

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
export async function validateLimits(ctx: any, params: {
    uid: string;
    tournamentType: any;
}) {
    const { uid, tournamentType } = params;
    const attempts = await getPlayerAttempts(ctx, { uid, tournamentType });
    const maxAttempts = tournamentType.limits?.maxAttempts;
    if (maxAttempts && attempts >= maxAttempts) {
        throw new Error(`已达最大尝试次数 (${attempts}/${maxAttempts})`);
    }
    const maxTournaments = tournamentType.limits?.maxTournaments;
    if (maxTournaments) {
        const playerTournaments = await ctx.db
            .query("player_tournaments")
            .withIndex("by_tournament_uid", (q: any) =>
                q.eq("uid", uid)
                    .eq("tournamentType", tournamentType.typeId)
            )
            .collect();
        if (playerTournaments.length >= maxTournaments) {
            throw new Error(`已达最大锦标赛次数 (${playerTournaments.length}/${maxTournaments})`);
        }
    }

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

    // 门票系统已移除，不再检查门票入场费
    if (entryFee.tickets && entryFee.tickets.length > 0) {
        // 门票系统已移除，暂时跳过门票检查
        console.warn("门票系统已移除，跳过门票入场费检查");
    }
}

/**
 * 扣除入场费
 * 扣除入场费并记录日志
 */
export async function deductEntryFee(ctx: any, params: {
    player: any;
    tournamentType: any;
}) {
    const { player, tournamentType } = params;


    const entryFee = tournamentType.entryRequirements.entryFee;

    // 扣除金币入场费（从 player_inventory 扣除）
    if (entryFee.coins && entryFee.coins > 0) {
        const inventory = await ctx.db
            .query("player_inventory")
            .withIndex("by_uid", (q: any) => q.eq("uid", player.uid))
            .first();

        if (!inventory) {
            throw new Error("玩家库存不存在");
        }

        const currentCoins = inventory.coins || 0;
        if (currentCoins < entryFee.coins) {
            throw new Error(`金币不足: ${entryFee.coins}，当前只有 ${currentCoins}`);
        }

        await ctx.db.patch(inventory._id, {
            coins: currentCoins - entryFee.coins,
            updatedAt: new Date().toISOString(),
        });
    }

    // 门票系统已移除，不再扣除门票入场费
    if (entryFee.tickets && entryFee.tickets.length > 0) {
        // 门票系统已移除，暂时跳过门票扣除
        console.warn("门票系统已移除，跳过门票入场费扣除");
    }


}
export async function findTournamentByType(ctx: any, params: { tournamentType: any }) {

    let startTime: string;
    // 根据时间范围确定开始时间

    switch (params.tournamentType.timeRange) {
        case "daily":
            startTime = TimeZoneUtils.getTimeZoneDayStartISO("America/Toronto");
            break;
        case "weekly":
            const weekStart = new Date(TimeZoneUtils.getTimeZoneWeekStartISO("America/Toronto"));
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            weekStart.setHours(0, 0, 0, 0);
            startTime = weekStart.toISOString();
            break;
        case "monthly":
            const monthStart = new Date(TimeZoneUtils.getTimeZoneWeekStartISO("America/Toronto"));
            monthStart.setDate(1);
            monthStart.setHours(0, 0, 0, 0);
            startTime = monthStart.toISOString();
            break;
        default:
            startTime = "1970-01-01T00:00:00.000Z"; // 从1970年开始
            break;
    }
    const tournament = await ctx.db.query("tournaments").withIndex("by_type_status_createdAt", (q: any) => q.eq("type", params.tournamentType.typeId).eq("status", TournamentStatus.OPEN).gte("createdAt", startTime)).first();
    return tournament;
}
export async function findPlayerRank(ctx: any, params: { uid: string; tournament: any }) {
    const { uid, tournament } = params;
    const batchSize = 1000; // 每批加载 1000 条记录
    let currentRank = 0; // 当前累计排名
    let currentScore = 1000000; // 当前分数，用于处理并列
    let rank = null;
    let tournaments: any[] = [];
    const playerScore = tournament.score ?? 0;
    const tournamentId = tournament._id;
    let count = 0;
    while (true) {
        count++;
        if (count > 6) {
            break;
        }

        // 按 score 降序获取一批数据
        tournaments = await ctx.db
            .query("player_tournaments")
            .withIndex("by_tournament_score", (q: any) => q.eq("tournamentId", tournamentId).lte("score", currentScore))
            .order("desc")
            .take(batchSize)
        // console.log("tournaments", count, tournaments.length)
        // 如果本批次为空，说明已遍历完所有数据
        if (tournaments.length === 0) {
            break;
        }

        currentScore = tournaments[tournaments.length - 1].score;
        console.log("rank:", playerScore, currentScore, count)
        if (playerScore >= currentScore) {
            const aboveTournaments = tournaments.filter((t: any) => t.score > playerScore);
            const sameScoreTournaments = await ctx.db
                .query("player_tournaments")
                .withIndex("by_tournament_score", (q: any) => q.eq("tournamentId", tournamentId).eq("score", playerScore))
                .collect();
            const index = sameScoreTournaments.sort((a: any, b: any) => a.updatedAt - b.updatedAt).findIndex((t: any) => t.uid === uid);
            rank = currentRank + aboveTournaments.length + index;
            break;
        }
        currentRank += tournaments.length;
    }
    return { rank, tournamentId };
}
export async function settleTournament(ctx: any, tournamentId: string) {
    const tournament = await ctx.db.get(tournamentId as Id<"tournaments">);
    if (!tournament) {
        throw new Error("锦标赛不存在");
    }

    const tournamentType = await ctx.db.query("tournament_types").withIndex("by_typeId", (q: any) => q.eq("typeId", tournament.type)).unique();
    if (!tournamentType) {
        throw new Error("锦标赛类型不存在");
    }

    // 获取所有参与玩家，按分数排序
    const playerTournaments = await ctx.db.query("player_tournaments")
        .withIndex("by_tournament_score", (q: any) => q.eq("tournamentId", tournamentId))
        .order("desc")
        .collect();

    if (playerTournaments.length === 0) {
        console.log(`锦标赛 ${tournamentId} 没有参与者`);
        return;
    }

    console.log(`开始结算锦标赛 ${tournamentId}，共 ${playerTournaments.length} 名参与者`);

    // 计算排名并分配积分
    for (let i = 0; i < playerTournaments.length; i++) {
        const playerTournament = playerTournaments[i];
        const rank = i + 1;

        try {
            // 使用新的积分系统计算各类积分
            const tournamentPoints = await PointCalculationService.calculatePlayerTournamentPoints(ctx, {
                tournamentId,
                uid: playerTournament.uid,
                matchRank: rank,
                matchScore: playerTournament.score || 0,
                matchDuration: tournament.duration || 0,
                segmentName: playerTournament.segment || "bronze"
            });

            if (tournamentPoints.success) {
                // 更新玩家锦标赛记录：只保存结算结果，不发放奖励
                // 奖励将在玩家主动 claim 时通过 collectRewards 发放
                await ctx.db.patch(playerTournament._id, {
                    rank,
                    status: TournamentStatus.SETTLED,
                    rewards: tournamentPoints.points,
                    settledAt: new Date().toISOString()
                });

                // 记录积分计算日志
                console.log(`玩家 ${playerTournament.uid} 排名 ${rank}，积分计算完成并已保存到 player_tournaments:`, tournamentPoints.points);
                // 注意：不在这里更新玩家积分统计，等待玩家主动 claim 时才发放

            } else {
                throw new Error(tournamentPoints.message || "积分计算失败");
            }

        } catch (error) {
            console.error(`玩家 ${playerTournament.uid} 积分计算失败:`, error);

            // 即使积分计算失败，也要标记为已结算
            await ctx.db.patch(playerTournament._id, {
                rank,
                status: TournamentStatus.SETTLED,
                rewards: {
                    rankPoints: 0,
                    seasonPoints: 0,
                    prestigePoints: 0,
                    achievementPoints: 0,
                    tournamentPoints: 0
                },
                settledAt: new Date().toISOString(),
                error: error instanceof Error ? error.message : "未知错误"
            });
        }
    }

    // 更新锦标赛状态
    await ctx.db.patch(tournamentId as Id<"tournaments">, {
        status: TournamentStatus.SETTLED,
        settledAt: new Date().toISOString(),
        participantCount: playerTournaments.length
    });

    console.log(`锦标赛 ${tournamentId} 结算完成，共处理 ${playerTournaments.length} 名玩家`);
}


export async function collectRewards(ctx: any, playerTournament: any) {
    const player = await ctx.db.query("players").withIndex("by_uid", (q: any) => q.eq("uid", playerTournament.uid)).unique();

    if (!player) {
        throw new Error("玩家不存在");
    }

    // 计算并发放经验值
    try {
        const tournament = await ctx.db.get(playerTournament.tournamentId as Id<"tournaments">);
        if (tournament) {
            const { PlayerExpRewardHandler } = await import("../reward/rewardHandlers/playerExpRewardHandler");
            const { RewardService } = await import("../reward/rewardService");

            const expReward = await PlayerExpRewardHandler.calculateTournamentExp(
                playerTournament.rank || 1,
                tournament.participantCount || playerTournament.totalParticipants || 1,
                tournament.tier || playerTournament.segment || "bronze"
            );

            // 发放经验值
            if (expReward > 0) {
                await RewardService.grantRewards(ctx, {
                    uid: playerTournament.uid,
                    rewards: { exp: expReward },
                    source: {
                        source: "tournament",
                        sourceId: playerTournament.tournamentId,
                    },
                });
            }
        }
    } catch (error: any) {
        console.error("计算或发放锦标赛经验值失败:", error);
        // 经验值发放失败不影响其他奖励收集
    }

    // 收集新积分类型
    const rankPoints = (player.rankPoints || 0) + (playerTournament.rewards?.rankPoints || 0);
    const seasonPoints = (player.seasonPoints || 0) + (playerTournament.rewards?.seasonPoints || 0);
    const prestigePoints = (player.prestigePoints || 0) + (playerTournament.rewards?.prestigePoints || 0);
    const achievementPoints = (player.achievementPoints || 0) + (playerTournament.rewards?.achievementPoints || 0);
    const tournamentPoints = (player.tournamentPoints || 0) + (playerTournament.rewards?.tournamentPoints || 0);

    // 更新玩家积分
    await ctx.db.patch(player._id, {
        rankPoints,
        seasonPoints,
        prestigePoints,
        achievementPoints,
        tournamentPoints,
        lastUpdated: new Date().toISOString()
    });

    // 更新玩家积分统计（实际发放积分）
    if (playerTournament.rewards) {
        await updatePlayerPointStats(ctx, playerTournament.uid, playerTournament.tournamentId, playerTournament.rewards);
    }

    // 记录积分收集日志
    console.log(`玩家 ${playerTournament.uid} 收集奖励完成:`, {
        rankPoints: playerTournament.rewards?.rankPoints || 0,
        seasonPoints: playerTournament.rewards?.seasonPoints || 0,
        prestigePoints: playerTournament.rewards?.prestigePoints || 0,
        achievementPoints: playerTournament.rewards?.achievementPoints || 0,
        tournamentPoints: playerTournament.rewards?.tournamentPoints || 0
    });

    // 标记奖励已收集
    await ctx.db.patch(playerTournament._id, {
        status: TournamentStatus.COLLECTED,
        collectedAt: new Date().toISOString()
    });
}

/**
 * 更新玩家积分统计
 * 使用新的积分系统更新玩家各类积分
 */
async function updatePlayerPointStats(ctx: any, uid: string, tournamentId: string, points: any) {
    const nowISO = new Date().toISOString();
    const seasonId = getCurrentSeasonId();

    try {
        // 查找现有统计记录
        const existingStats = await ctx.db
            .query("player_point_stats")
            .withIndex("by_uid_season", (q: any) => q.eq("uid", uid).eq("seasonId", seasonId))
            .unique();

        if (existingStats) {
            // 更新现有记录
            await ctx.db.patch(existingStats._id, {
                totalRankPoints: existingStats.totalRankPoints + (points.rankPoints || 0),
                totalSeasonPoints: existingStats.totalSeasonPoints + (points.seasonPoints || 0),
                totalPrestigePoints: existingStats.totalPrestigePoints + (points.prestigePoints || 0),
                totalAchievementPoints: existingStats.totalAchievementPoints + (points.achievementPoints || 0),
                totalTournamentPoints: existingStats.totalTournamentPoints + (points.tournamentPoints || 0),
                tournamentCount: existingStats.tournamentCount + 1,
                tournamentWins: existingStats.tournamentWins + (points.rankPoints > 0 ? 1 : 0),
                lastUpdated: nowISO
            });
        } else {
            // 创建新记录
            await ctx.db.insert("player_point_stats", {
                uid,
                seasonId,
                totalRankPoints: points.rankPoints || 0,
                totalSeasonPoints: points.seasonPoints || 0,
                totalPrestigePoints: points.prestigePoints || 0,
                totalAchievementPoints: points.achievementPoints || 0,
                totalTournamentPoints: points.tournamentPoints || 0,
                currentSegment: "bronze",
                segmentProgress: 0,
                segmentMatches: 1,
                tournamentCount: 1,
                tournamentWins: points.rankPoints > 0 ? 1 : 0,
                bestTournamentRank: 1,
                lastUpdated: nowISO,
                seasonStartDate: getSeasonStartDate(),
                seasonEndDate: getSeasonEndDate()
            });
        }

        // 记录积分历史（在玩家 claim 时记录）
        await recordPointHistory(ctx, uid, tournamentId, `tournament_${tournamentId}`, points, "tournament_claim");

        console.log(`玩家 ${uid} 积分统计更新完成:`, points);

    } catch (error) {
        console.error(`更新玩家 ${uid} 积分统计失败:`, error);
        throw error;
    }
}

/**
 * 获取当前赛季ID
 */
function getCurrentSeasonId(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `season_${year}_${month}`;
}

/**
 * 获取赛季开始日期
 */
function getSeasonStartDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    return new Date(year, month, 1).toISOString();
}

/**
 * 获取赛季结束日期
 */
function getSeasonEndDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    return new Date(year, month + 1, 0).toISOString();
}

/**
 * 记录积分历史
 */
async function recordPointHistory(ctx: any, uid: string, tournamentId: string, matchId: string, points: any, source: string) {
    const nowISO = new Date().toISOString();

    try {
        await ctx.db.insert("point_history", {
            uid,
            tournamentId,
            matchId,
            pointChanges: points,
            changeReason: "锦标赛结算",
            changeType: "increase",
            changeSource: source,
            createdAt: nowISO,
            processedAt: nowISO
        });
    } catch (error) {
        console.error(`记录积分历史失败:`, error);
        // 不抛出错误，避免影响主要流程
    }
}

export async function scheduleIsOpen(ctx: any,
    tournamentType: any
) {
    const schedule = tournamentType.schedule;
    console.log("schedule", schedule)
    if (schedule) {
        switch (tournamentType.timeRange) {
            case "daily":
                const today = TimeZoneUtils.getCurrentDate(schedule.timeZone);
                const openISO = TimeZoneUtils.getSpecificTimeZoneISO({ timeZone: schedule.timeZone, date: today, time: schedule.open.time });
                const now = new Date();
                const isOpen = openISO && now.toISOString() >= openISO
                console.log("isOpen", isOpen, openISO, now.toISOString())
                return isOpen
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