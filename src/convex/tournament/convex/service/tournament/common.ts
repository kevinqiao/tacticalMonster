import { Id } from "../../_generated/dataModel";
import { getTournamentConfig, resolveTournamentMode } from "../../data/tournamentConfigs";
import { TimeZoneUtils } from "../../util/TimeZoneUtils";
import { TournamentErrorCode } from "./errorCodes";

/**
 * 公共工具函数
 * 包含在多个地方使用的共享函数
 */
export async function validateJoinTournament(ctx: any, params: {
    uid: string;
    tournamentType: any;
}) {
    const { uid, tournamentType } = params;
    const player = await ctx.db.query("players").withIndex("by_uid", (q: any) => q.eq("uid", uid)).first();
    if (!player) {
        return { ok: false, errorCode: TournamentErrorCode.PLAYER_NOT_FOUND, message: "玩家不存在" };
    }
    const entryRequirements = tournamentType.entryRequirements;
    if (entryRequirements) {
        const minLevel = entryRequirements.playerLevel;
        console.log("minLevel", minLevel);
        console.log("player.level", player.level);
        if (player.level < minLevel) {
            return { ok: false, errorCode: TournamentErrorCode.PLAYER_LEVEL_NOT_ENOUGH, message: "玩家等级不足" };
        }
        if (entryRequirements.entryFee) {
            if (entryRequirements.entryFee.coins && entryRequirements.entryFee.coins > player.coins) {
                return { ok: false, errorCode: TournamentErrorCode.INSUFFICIENT_COINS, message: "金币不足" };
            }
            if (entryRequirements.entryFee.gems && entryRequirements.entryFee.gems > player.gems) {
                return { ok: false, errorCode: TournamentErrorCode.INSUFFICIENT_GEMS, message: "宝石不足" };
            }
            if (entryRequirements.entryFee.energy && entryRequirements.entryFee.energy > player.energy) {
                return { ok: false, errorCode: TournamentErrorCode.INSUFFICIENT_ENERGY, message: "能量不足" };
            }
        }
    }
    return { ok: true, message: "玩家等级符合要求" };
}

/**
 * 增量更新玩家尝试次数统计
 * 在创建 player_match 记录时调用，用于维护增量统计缓存
 */
export async function incrementPlayerAttempts(
    ctx: any,
    params: {
        uid: string;
        tournamentType: any;
        createdAt?: string; // player_match 的创建时间
    }
): Promise<number> {
    const { uid, tournamentType, createdAt } = params;
    const nowISO = createdAt || new Date().toISOString();

    // 计算时间段标识（与 getPlayerAttempts 保持完全一致）
    let periodStart: string;
    const timeRange = tournamentType.timeRange || "permanent";

    switch (timeRange) {
        case "daily":
            periodStart = TimeZoneUtils.getTimeZoneDayStartISO("America/Toronto");
            break;
        case "weekly":
            const weekStart = new Date(TimeZoneUtils.getTimeZoneWeekStartISO("America/Toronto"));
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            weekStart.setHours(0, 0, 0, 0);
            periodStart = weekStart.toISOString();
            break;
        case "monthly":
            const monthStart = new Date(TimeZoneUtils.getTimeZoneWeekStartISO("America/Toronto"));
            monthStart.setDate(1);
            monthStart.setHours(0, 0, 0, 0);
            periodStart = monthStart.toISOString();
            break;
        default:
            periodStart = "1970-01-01T00:00:00.000Z"; // permanent
            break;
    }

    try {
        // 查找现有统计记录
        const existing = await ctx.db
            .query("player_attempt_stats")
            .withIndex("by_uid_tournamentType_period", (q: any) =>
                q
                    .eq("uid", uid)
                    .eq("tournamentType", tournamentType.typeId)
                    .eq("timeRange", timeRange)
                    .eq("periodStart", periodStart)
            )
            .unique();

        if (existing) {
            // 增量更新
            await ctx.db.patch(existing._id, {
                attemptCount: existing.attemptCount + 1,
                lastUpdated: nowISO,
            });
            return existing.attemptCount + 1;
        } else {
            // 创建新记录
            await ctx.db.insert("player_attempt_stats", {
                uid,
                tournamentType: tournamentType.typeId,
                timeRange,
                periodStart,
                attemptCount: 1,
                lastUpdated: nowISO,
                createdAt: nowISO,
            });
            return 1;
        }
    } catch (error) {
        // 统计更新失败不应影响主要流程，记录错误并返回当前计数
        console.error(`增量更新玩家尝试次数统计失败 (uid: ${uid}, tournamentType: ${tournamentType.typeId}):`, error);
        // 降级到查询实际记录数（作为后备方案）
        const playerMatches = await ctx.db
            .query("player_matches")
            .withIndex("by_tournamentType_uid_createdAt", (q: any) =>
                q.eq("uid", uid)
                    .eq("tournamentType", tournamentType.typeId)
                    .gte("createdAt", periodStart)
            )
            .collect();
        return playerMatches.length;
    }
}

/**
 * 获取玩家尝试次数（使用增量统计）
 * 从缓存表读取，性能优于查询所有记录
 * 
 * @returns 尝试次数（数字）
 */
export async function getPlayerAttempts(ctx: any, { uid, tournamentType }: {
    uid: string;
    tournamentType: any;
}): Promise<number> {
    const timeRange = tournamentType.timeRange || "permanent";

    // 计算时间段标识（与 incrementPlayerAttempts 保持完全一致）
    let periodStart: string;
    switch (timeRange) {
        case "daily":
            periodStart = TimeZoneUtils.getTimeZoneDayStartISO("America/Toronto");
            break;
        case "weekly":
            const weekStart = new Date(TimeZoneUtils.getTimeZoneWeekStartISO("America/Toronto"));
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            weekStart.setHours(0, 0, 0, 0);
            periodStart = weekStart.toISOString();
            break;
        case "monthly":
            const monthStart = new Date(TimeZoneUtils.getTimeZoneWeekStartISO("America/Toronto"));
            monthStart.setDate(1);
            monthStart.setHours(0, 0, 0, 0);
            periodStart = monthStart.toISOString();
            break;
        default:
            periodStart = "1970-01-01T00:00:00.000Z";
            break;
    }

    try {
        // 从缓存表读取
        const stats = await ctx.db
            .query("player_attempt_stats")
            .withIndex("by_uid_tournamentType_period", (q: any) =>
                q
                    .eq("uid", uid)
                    .eq("tournamentType", tournamentType.typeId)
                    .eq("timeRange", timeRange)
                    .eq("periodStart", periodStart)
            )
            .unique();

        if (stats) {
            return stats.attemptCount;
        }

        // 如果没有缓存记录，降级到查询实际记录（用于历史数据或迁移期间）
        const playerMatches = await ctx.db
            .query("player_matches")
            .withIndex("by_tournamentType_uid_createdAt", (q: any) =>
                q.eq("uid", uid)
                    .eq("tournamentType", tournamentType.typeId)
                    .gte("createdAt", periodStart)
            )
            .collect();

        return playerMatches.length;
    } catch (error) {
        // 查询失败时降级到直接查询 player_matches
        console.error(`获取玩家尝试次数统计失败 (uid: ${uid}, tournamentType: ${tournamentType.typeId}):`, error);
        const playerMatches = await ctx.db
            .query("player_matches")
            .withIndex("by_tournamentType_uid_createdAt", (q: any) =>
                q.eq("uid", uid)
                    .eq("tournamentType", tournamentType.typeId)
                    .gte("createdAt", periodStart)
            )
            .collect();
        return playerMatches.length;
    }
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
    OPEN = 0,
    COMPLETED = 1,
    CANCELLED = 2
}

/** player_matches.status：对局进行中 / 已交分待全场结算 / 已结算排名 */
export const PlayerMatchStatus = {
    open: "open",
    finished: "finished",
    settled: "settled",
} as const;

export function playerMatchModeFromTournamentTypeDoc(tournamentTypeDoc: any): "tutorial" | "solo_tournament" | "multiplayer_tournament" {
    const cfg = getTournamentConfig(tournamentTypeDoc.typeId);
    const mr = tournamentTypeDoc.matchRules as { mode?: string; modeType?: string } | undefined;
    const mode =
        resolveTournamentMode(cfg) ??
        tournamentTypeDoc.mode ??
        tournamentTypeDoc.modeType ??
        mr?.mode ??
        mr?.modeType;
    if (mode === "tutorial") return "tutorial";
    if (mode === "multiplayer_tournament") return "multiplayer_tournament";
    return "solo_tournament";
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

    // 获取 tournamentType 配置（用于增量统计）
    let tournamentType: any = null;
    if (match.tournamentType) {
        tournamentType = await ctx.db
            .query("tournament_types")
            .withIndex("by_typeId", (q: any) => q.eq("typeId", match.tournamentType))
            .unique();
    }

    await Promise.all(uids.map(async (uid: string) => {
        const playerMatch = await ctx.db.query("player_matches").withIndex("by_match_uid", (q: any) => q.eq("matchId", matchId).eq("uid", uid)).unique();
        if (!playerMatch) {
            // 创建 player_match 记录
            await ctx.db.insert("player_matches", {
                matchId,
                uid,
                tournamentId: match.tournamentId,
                tournamentType: match.tournamentType,
                gameType: match.gameType,
                mode: tournamentType ? playerMatchModeFromTournamentTypeDoc(tournamentType) : "multiplayer_tournament",
                score: 0,
                rank: -1,
                status: PlayerMatchStatus.open,
                createdAt: nowISO,
                updatedAt: nowISO,
            });

            // 增量更新尝试次数统计
            if (tournamentType) {
                try {
                    await incrementPlayerAttempts(ctx, {
                        uid,
                        tournamentType,
                        createdAt: nowISO,
                    });
                } catch (error) {
                    // 统计更新失败不应影响主要流程
                    console.error(`增量更新尝试次数统计失败 (uid: ${uid}, matchId: ${matchId}):`, error);
                }
            }
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
    // 注意：maxTournaments 已从 LimitConfig 中移除，不再验证

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
export async function settleTournament(ctx: any, tournamentId: string, matchId?: string) {
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

    // 获取锦标赛配置
    const tournamentConfig = getTournamentConfig(tournamentType.typeId);
    if (!tournamentConfig) {
        throw new Error(`锦标赛配置不存在: ${tournamentType.typeId}`);
    }

    // 准备排名数据
    const rankings = playerTournaments.map((pt: any, index: number) => ({
        uid: pt.uid,
        rank: index + 1,
        score: pt.score || 0,
    }));

    // 获取 isFirstClear 与 performanceLevels（单人关卡）
    let isFirstClear: Record<string, boolean> = {};
    let performanceLevels: Record<string, string> = {};
    const isSinglePlayer = tournamentConfig.matchRules?.minPlayers === 1 && tournamentConfig.matchRules?.maxPlayers === 1;
    const effectiveMatchId = matchId || (tournament as any).matchId;
    if (isSinglePlayer && effectiveMatchId) {
        const playerMatches = await ctx.db
            .query("player_matches")
            .withIndex("by_match", (q: any) => q.eq("matchId", effectiveMatchId))
            .collect();
        for (const pm of playerMatches) {
            if (pm.isFirstClear === true) {
                isFirstClear[pm.uid] = true;
            }
        }
        const thresholds = tournamentConfig.rewards?.performanceRewards?.scoreThresholds;
        if (thresholds && thresholds.length > 0) {
            const sorted = [...thresholds].sort((a, b) => b.minScore - a.minScore);
            for (const r of rankings) {
                const entry = sorted.find((t) => r.score >= t.minScore);
                if (entry) {
                    performanceLevels[r.uid] = entry.level;
                }
            }
        }
    }

    // 获取玩家订阅状态（用于计算订阅加成）
    const isSubscribed: Record<string, boolean> = {};
    for (const playerTournament of playerTournaments) {
        const player = await ctx.db.query("players")
            .withIndex("by_uid", (q: any) => q.eq("uid", playerTournament.uid))
            .first();
        isSubscribed[playerTournament.uid] = player?.isSubscribed || false;
    }

    // 计算奖励决策（不发放）
    const { TournamentRewardService } = await import("./tournamentRewardService");
    const rewardDecision = await TournamentRewardService.processTournamentRewards({
        tournamentConfig: tournamentConfig,
        rankings: rankings,
        gameId: `tournament_${tournamentId}`,
        matchId: effectiveMatchId || (tournament as any).matchId || null,
        isSubscribed: isSubscribed,
        isFirstClear,
        performanceLevels,
    });

    // 计算排名并分配积分
    for (let i = 0; i < playerTournaments.length; i++) {
        const playerTournament = playerTournaments[i];
        const rank = i + 1;
        const uid = playerTournament.uid;

        try {
            // 保存所有奖励信息（包括金币和宝箱）
            await ctx.db.patch(playerTournament._id, {
                rank,
                status: TournamentStatus.SETTLED,
                rewards: {
                    // 积分系统已移除，所有积分设置为 0
                    rankPoints: 0,
                    seasonPoints: 0,
                    prestigePoints: 0,
                    achievementPoints: 0,
                    tournamentPoints: 0,
                    // 合并所有金币奖励
                    coins: (rewardDecision.baseRewards[uid]?.coins || 0) +
                        (rewardDecision.rankRewards?.[uid]?.coins || 0) +
                        (rewardDecision.subscribedPlayerExtraByUid?.[uid]?.coins || 0) +
                        (rewardDecision.firstClearRewards?.[uid]?.coins || 0),
                    // 合并其他奖励
                    energy: (rewardDecision.baseRewards[uid]?.energy || 0) +
                        (rewardDecision.rankRewards?.[uid]?.energy || 0) +
                        (rewardDecision.subscribedPlayerExtraByUid?.[uid]?.energy || 0) +
                        (rewardDecision.firstClearRewards?.[uid]?.energy || 0),
                    monsterShards: [
                        ...(rewardDecision.rankRewards?.[uid]?.monsterShards || []),
                        ...(rewardDecision.subscribedPlayerExtraByUid?.[uid]?.monsterShards || []),
                        ...(rewardDecision.firstClearRewards?.[uid]?.monsterShards || [])
                    ],
                    monsters: rewardDecision.firstClearRewards?.[uid]?.monsters || [],
                    chestInfo: rewardDecision.chestInfo[uid] || {
                        chestTriggered: false,
                        rank: rank,
                        gameId: `tournament_${tournamentId}`,
                        matchId: tournament.matchId || null,
                    }
                },
                settledAt: new Date().toISOString()
            });

            // 记录奖励计算日志
            console.log(`玩家 ${playerTournament.uid} 排名 ${rank}，奖励计算完成并已保存到 player_tournaments`);
            // 注意：不在这里发放奖励，等待玩家主动 claim 时才发放

        } catch (error) {
            console.error(`玩家 ${playerTournament.uid} 奖励计算失败:`, error);

            // 即使奖励计算失败，也要标记为已结算
            await ctx.db.patch(playerTournament._id, {
                rank,
                status: TournamentStatus.SETTLED,
                rewards: {
                    rankPoints: 0,
                    seasonPoints: 0,
                    prestigePoints: 0,
                    achievementPoints: 0,
                    tournamentPoints: 0,
                    coins: (rewardDecision.baseRewards[uid]?.coins || 0) +
                        (rewardDecision.rankRewards?.[uid]?.coins || 0) +
                        (rewardDecision.subscribedPlayerExtraByUid?.[uid]?.coins || 0) +
                        (rewardDecision.firstClearRewards?.[uid]?.coins || 0),
                    chestInfo: rewardDecision.chestInfo[uid] || {
                        chestTriggered: false,
                        rank: rank,
                        gameId: `tournament_${tournamentId}`,
                        matchId: tournament.matchId || null,
                    }
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
                "bronze"  // 使用默认值，tier/segment 系统已移除
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

    // 积分系统已移除，不再收集积分
    // 所有积分字段保持为 0

    // 标记奖励已收集
    await ctx.db.patch(playerTournament._id, {
        status: TournamentStatus.COLLECTED,
        collectedAt: new Date().toISOString()
    });
}

/**
 * 更新玩家积分统计
 * @deprecated 积分系统已移除，此函数不再使用
 */
async function updatePlayerPointStats(ctx: any, uid: string, tournamentId: string, points: any) {
    // 积分系统已移除，不再更新积分统计
    console.log(`积分系统已移除，跳过玩家 ${uid} 的积分统计更新`);
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
 * @deprecated 积分系统已移除，此函数不再使用
 */
async function recordPointHistory(ctx: any, uid: string, tournamentId: string, matchId: string, points: any, source: string) {
    // 积分系统已移除，不再记录积分历史
    console.log(`积分系统已移除，跳过积分历史记录`);
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