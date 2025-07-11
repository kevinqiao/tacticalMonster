import { getTorontoDate } from "../utils";
import { MatchManager } from "./matchManager";

/**
 * 公共工具函数
 * 包含在多个地方使用的共享函数
 */

/**
 * 获取本周开始日期（周一）
 */
export function getWeekStart(dateStr: string): string {
    const date = new Date(dateStr);
    const day = date.getDay() || 7;
    date.setDate(date.getDate() - (day - 1));
    return date.toISOString().split("T")[0];
}

/**
 * 获取玩家尝试次数
 * 统计玩家在指定时间范围内参与特定类型锦标赛的次数
 */
export async function getPlayerAttempts(ctx: any, { uid, tournamentType, gameType, timeRange }: {
    uid: string;
    tournamentType: string;
    gameType: string;
    timeRange: string; // 必需参数，调用者应该提供 timeRange
}) {
    const now = getTorontoDate();
    let startTime: string;

    // 直接使用提供的 timeRange 参数
    const actualTimeRange = timeRange;

    // 根据时间范围确定开始时间
    switch (actualTimeRange) {
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
        default:
            startTime = "1970-01-01T00:00:00.000Z"; // 从1970年开始
            break;
    }

    // 优化：直接使用新的索引查询，避免关联查询
    const playerTournaments = await ctx.db
        .query("player_tournaments")
        .withIndex("by_uid_tournamentType_gameType", (q: any) =>
            q.eq("uid", uid)
                .eq("tournamentType", tournamentType)
                .eq("gameType", gameType)
        )
        .collect();

    // 根据时间范围过滤
    const filteredTournaments = playerTournaments.filter((pt: any) => {
        const createdAt = pt.createdAt;
        if (!createdAt) return false;

        // 将 createdAt 转换为字符串进行比较
        const createdAtStr = typeof createdAt === 'string' ? createdAt : createdAt.toISOString();

        switch (actualTimeRange) {
            case "daily":
                const today = now.localDate.toISOString().split("T")[0];
                return createdAtStr.startsWith(today);
            case "weekly":
                const weekStart = getWeekStart(now.localDate.toISOString().split("T")[0]);
                const tournamentWeekStart = getWeekStart(createdAtStr.split("T")[0]);
                return tournamentWeekStart === weekStart;
            case "seasonal":
                return createdAtStr >= startTime;
            case "total":
            default:
                return true;
        }
    });

    return filteredTournaments.length;
}

/**
 * 获取时间标识符
 */
export function getTimeIdentifier(now: any, tournamentType: string): string {
    if (tournamentType.startsWith("daily_")) {
        return now.localDate.toISOString().split("T")[0];
    } else if (tournamentType.startsWith("weekly_")) {
        return getWeekStart(now.localDate.toISOString().split("T")[0]);
    } else if (tournamentType.startsWith("seasonal_") || tournamentType.startsWith("monthly_")) {
        return "seasonal";
    }
    return "total";
}

/**
 * 构建参与统计
 */
export function buildParticipationStats(attempts: number, timeRange: string) {
    switch (timeRange) {
        case "daily":
            return {
                dailyAttempts: attempts,
                weeklyAttempts: 0,
                totalAttempts: 0,
                lastParticipation: null
            };
        case "weekly":
            return {
                dailyAttempts: 0,
                weeklyAttempts: attempts,
                totalAttempts: 0,
                lastParticipation: null
            };
        case "seasonal":
            return {
                dailyAttempts: 0,
                weeklyAttempts: 0,
                totalAttempts: attempts,
                lastParticipation: null
            };
        case "total":
        default:
            return {
                dailyAttempts: 0,
                weeklyAttempts: 0,
                totalAttempts: attempts,
                lastParticipation: null
            };
    }
}

/**
 * 检查锦标赛参赛资格
 */
export async function checkTournamentEligibility(ctx: any, params: {
    uid: string;
    tournamentType: any;
    player: any;
    inventory: any;
    season: any;
}) {
    const { uid, tournamentType, player, inventory, season } = params;
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
            t.gameType === entryFee.tickets.gameType &&
            t.tournamentType === entryFee.tickets.tournamentType
        );
        if (!ticket || ticket.quantity < entryFee.tickets.quantity) {
            reasons.push(`需要 ${entryFee.tickets.quantity} 张门票`);
        }
    }

    // 检查参与次数限制
    const timeRange = tournamentType.timeRange || "total";
    const attempts = await getPlayerAttempts(ctx, {
        uid,
        tournamentType: tournamentType.typeId,
        gameType: tournamentType.gameType,
        timeRange
    });

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

/**
 * 检查参赛资格（使用预计算的尝试次数）
 */
export async function checkTournamentEligibilityWithAttempts(ctx: any, params: {
    uid: string;
    tournamentType: any;
    player: any;
    inventory: any;
    season: any;
    attempts: number;
    timeRange: string;
}) {
    const { uid, tournamentType, player, inventory, season, attempts, timeRange } = params;
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
            t.gameType === entryFee.tickets.gameType &&
            t.tournamentType === entryFee.tickets.tournamentType
        );
        if (!ticket || ticket.quantity < entryFee.tickets.quantity) {
            reasons.push(`需要 ${entryFee.tickets.quantity} 张门票`);
        }
    }

    // 检查参与次数限制（使用预计算的attempts）
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

/**
 * 查找现有锦标赛
 */
export async function findExistingTournament(ctx: any, params: {
    tournamentType: any;
    season: any;
    now: any;
}) {
    const { tournamentType, season, now } = params;

    // 基础查询：同类型的开放锦标赛
    let query = ctx.db
        .query("tournaments")
        .withIndex("by_type_status", (q: any) =>
            q.eq("tournamentType", tournamentType.typeId)
                .eq("status", "open")
        );

    // 根据锦标赛类型添加时间过滤
    switch (tournamentType.category) {
        case "daily":
            const today = now.localDate.toISOString().split("T")[0];
            const dailyTournaments = await query.collect();
            return dailyTournaments.find((tournament: any) => {
                const createdAt = tournament.createdAt;
                if (!createdAt) return false;
                const createdAtStr = typeof createdAt === 'string' ? createdAt : createdAt.toISOString();
                return createdAtStr.startsWith(today);
            });

        case "weekly":
            const weekStart = getWeekStart(now.localDate.toISOString().split("T")[0]);
            const weeklyTournaments = await query.collect();
            return weeklyTournaments.find((tournament: any) => {
                const createdAt = tournament.createdAt;
                if (!createdAt) return false;
                const createdAtStr = typeof createdAt === 'string' ? createdAt : createdAt.toISOString();
                const tournamentWeekStart = getWeekStart(createdAtStr.split("T")[0]);
                return tournamentWeekStart === weekStart;
            });

        case "seasonal":
            return await query
                .filter((q: any) => q.eq(q.field("seasonId"), season._id))
                .first();

        default:
            return null;
    }
}

/**
 * 创建锦标赛（如果需要）
 */
export async function createTournamentIfNeeded(ctx: any, params: {
    tournamentType: any;
    season: any;
    player: any;
    now: any;
}) {
    const { tournamentType, season, player, now } = params;
    const entryRequirements = tournamentType.entryRequirements;
    const matchRules = tournamentType.matchRules;
    const schedule = tournamentType.schedule;

    console.log(`自动创建锦标赛: ${tournamentType.typeId}`);

    // 计算结束时间
    let endTime: string;
    switch (tournamentType.category) {
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
        gameType: tournamentType.gameType,
        segmentName: "all", // 对所有段位开放
        status: "open",
        tournamentType: tournamentType.typeId,
        isSubscribedRequired: entryRequirements?.isSubscribedRequired || false,
        isSingleMatch: matchRules?.isSingleMatch || false,
        prizePool: entryRequirements?.entryFee?.coins ? entryRequirements.entryFee.coins * 0.8 : 0,
        config: {
            entryRequirements: tournamentType.entryRequirements,
            matchRules: tournamentType.matchRules,
            rewards: tournamentType.rewards,
            schedule: tournamentType.schedule,
            limits: tournamentType.limits,
            advanced: tournamentType.advanced
        },
        createdAt: now.iso,
        updatedAt: now.iso,
        endTime: endTime,
    });

    console.log(`成功创建锦标赛 ${tournamentType.typeId}: ${tournamentId}`);
    return tournamentId;
}

/**
 * 通知玩家锦标赛变化
 */
export async function notifyTournamentChanges(ctx: any, params: {
    uid: string;
    changeType: "new_tournament" | "eligibility_change" | "participation_update" | "tournament_completed";
    tournamentType?: string;
    tournamentId?: string;
    data?: any;
}) {
    const { getTorontoDate } = await import("../utils.js");
    const now = getTorontoDate();
    const { uid, changeType, tournamentType, tournamentId, data } = params;

    let message = "";
    let notificationData: any = {
        changeType,
        timestamp: now.iso
    };

    switch (changeType) {
        case "new_tournament":
            message = `新的锦标赛 "${data?.name || tournamentType}" 已开始！`;
            notificationData = {
                ...notificationData,
                tournamentType,
                tournamentId: data?.tournamentId,
                name: data?.name,
                description: data?.description,
                gameType: data?.gameType
            };
            break;

        case "eligibility_change":
            message = `锦标赛 "${data?.name || tournamentType}" 的参与条件已更新`;
            notificationData = {
                ...notificationData,
                tournamentType,
                tournamentId,
                eligibility: data?.eligibility,
                reasons: data?.reasons
            };
            break;

        case "participation_update":
            message = `您在锦标赛 "${data?.name || tournamentType}" 中的状态已更新`;
            notificationData = {
                ...notificationData,
                tournamentType,
                tournamentId,
                participationStats: data?.participationStats,
                currentParticipations: data?.currentParticipations
            };
            break;

        case "tournament_completed":
            message = `锦标赛 "${data?.name || tournamentType}" 已结束，请查看结果！`;
            notificationData = {
                ...notificationData,
                tournamentType,
                tournamentId,
                results: data?.results,
                rewards: data?.rewards
            };
            break;
    }

    // 创建通知记录
    await ctx.db.insert("notifications", {
        uid,
        message,
        type: "tournament_update",
        read: false,
        createdAt: now.iso
    });

    console.log(`已通知玩家 ${uid} 关于锦标赛变化: ${changeType}`);
}

// ==================== 类型定义 ====================

export interface TournamentHandler {
    validateJoin(ctx: any, args: JoinArgs): Promise<void>;
    join(ctx: any, args: JoinArgs): Promise<JoinResult>;
    validateScore(ctx: any, args: SubmitScoreArgs): Promise<void>;
    submitScore(ctx: any, args: SubmitScoreArgs): Promise<SubmitScoreResult>;
    settle(ctx: any, tournamentId: string): Promise<void>;
    distributeRewards?(ctx: any, data: DistributeRewardsArgs): Promise<void>;
    getTimeIdentifier?(now: any, tournamentType: string): string;
    findOrCreateTournament?(ctx: any, params: any): Promise<any>;
    handleSingleMatchTournament?(ctx: any, params: SingleMatchParams): Promise<JoinResult>;
    handleMultiMatchTournament?(ctx: any, params: MultiMatchParams): Promise<JoinResult>;
    prepareScoreSubmission?(ctx: any, params: any): Promise<any>;
    handlePropDeduction?(ctx: any, params: any): Promise<any>;
    handleTournamentSettlement?(ctx: any, params: any): Promise<any>;
    logPropUsageIfNeeded?(ctx: any, params: any): Promise<void>;
    buildSubmitScoreResult?(params: any): any;
    handleScoreSubmissionError?(ctx: any, params: any): Promise<void>;
    validateTournamentForSettlement?(ctx: any, tournamentId: string): Promise<any>;
    getCompletedMatches?(ctx: any, tournamentId: string): Promise<any[]>;
    distributeRewardsToPlayers?(ctx: any, params: any): Promise<void>;
    logRewardDistributionError?(ctx: any, params: any): Promise<void>;
    completeTournament?(ctx: any, tournamentId: string, now: any): Promise<void>;
}

export interface JoinArgs {
    uid: string;
    gameType: string;
    tournamentType: string;
    player: any;
    season: any;
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

export interface DistributeRewardsArgs {
    uid: string;
    rank: number;
    score: number;
    tournament: any;
    matches: any[];
}

export interface TournamentCreationParams {
    uid: string;
    gameType: string;
    tournamentType: string;
    player: any;
    season: any;
    config: any;
    now: any;
    timeIdentifier?: string;
    isIndependent?: boolean;
    attemptNumber?: number;
}

export interface SingleMatchParams {
    tournamentId: string;
    uid: string;
    gameType: string;
    player: any;
    config: any;
    attemptNumber: number;
    timeIdentifier?: string;
}

export interface MultiMatchParams {
    tournamentId: string;
    uid: string;
    gameType: string;
    player: any;
    config: any;
    attemptNumber: number;
}

// ==================== 通用函数 ====================

export async function findExistingNonIndependentTournament(ctx: any, params: {
    tournamentType: string;
    gameType: string;
    segmentName?: string;
    now: any;
}) {
    const { tournamentType, gameType, segmentName, now } = params;
    const existingTournaments = await ctx.db
        .query("tournaments")
        .withIndex("by_type_status", (q: any) =>
            q.eq("tournamentType", tournamentType)
                .eq("status", "open")
                .eq("gameType", gameType)
        )
        .collect();
    const nonIndependentTournaments = existingTournaments.filter((tournament: any) => {
        const isIndependent = tournament.config?.independent === true;
        return !isIndependent;
    });
    if (segmentName) {
        const segmentTournaments = nonIndependentTournaments.filter((tournament: any) => {
            return tournament.segmentName === segmentName || !tournament.segmentName;
        });
        if (segmentTournaments.length > 0) {
            return segmentTournaments.sort((a: any, b: any) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )[0];
        }
    }
    if (nonIndependentTournaments.length > 0) {
        return nonIndependentTournaments.sort((a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];
    }
    return null;
}

export async function isTournamentFull(ctx: any, tournamentId: string, maxPlayers: number): Promise<boolean> {
    const activePlayers = await ctx.db
        .query("player_tournaments")
        .withIndex("by_tournament", (q: any) => q.eq("tournamentId", tournamentId))
        .filter((q: any) => q.eq(q.field("status"), "active"))
        .collect();
    return activePlayers.length >= maxPlayers;
}

export async function isPlayerInTournament(ctx: any, params: {
    uid: string;
    tournamentId: string;
}): Promise<boolean> {
    const { uid, tournamentId } = params;
    const playerTournament = await ctx.db
        .query("player_tournaments")
        .withIndex("by_uid_tournament", (q: any) =>
            q.eq("uid", uid).eq("tournamentId", tournamentId)
        )
        .first();
    return playerTournament !== null && playerTournament.status === "active";
}

export async function findOrCreateTournament(ctx: any, params: {
    uid: string;
    gameType: string;
    tournamentType: string;
    player: any;
    season: any;
    config: any;
    now: any;
    isIndependent: boolean;
    attemptNumber: number;
}) {
    const { uid, gameType, tournamentType, player, season, config, now, isIndependent, attemptNumber } = params;
    if (isIndependent) {
        const tournamentId = await createIndependentTournament(ctx, {
            uid,
            gameType,
            tournamentType,
            player,
            season,
            config,
            now,
            attemptNumber
        });
        return await ctx.db.get(tournamentId);
    } else {
        const existingTournament = await findExistingNonIndependentTournament(ctx, {
            tournamentType,
            gameType,
            segmentName: player.segmentName,
            now
        });
        if (existingTournament) {
            const alreadyJoined = await isPlayerInTournament(ctx, {
                uid,
                tournamentId: existingTournament._id
            });
            if (alreadyJoined) {
                throw new Error("您已经参与了这个锦标赛");
            }
            const maxPlayers = config.matchRules?.maxPlayers || 1;
            const isFull = await isTournamentFull(ctx, existingTournament._id, maxPlayers);
            if (isFull) {
                const tournamentId = await createTournament(ctx, {
                    uid,
                    gameType,
                    tournamentType,
                    player,
                    season,
                    config,
                    now
                });
                return await ctx.db.get(tournamentId);
            } else {
                await ctx.db.insert("player_tournaments", {
                    uid,
                    tournamentId: existingTournament._id,
                    status: "active",
                    joinedAt: now.iso,
                    createdAt: now.iso,
                    updatedAt: now.iso,
                });
                return existingTournament;
            }
        } else {
            const tournamentId = await createTournament(ctx, {
                uid,
                gameType,
                tournamentType,
                player,
                season,
                config,
                now
            });
            return await ctx.db.get(tournamentId);
        }
    }
}

export async function updateTournamentTimestamp(ctx: any, tournament: any, score: number) {
    const now = getTorontoDate();
    await ctx.db.patch(tournament._id, {
        updatedAt: now.iso
    });
}

export async function logPropUsage(ctx: any, data: {
    uid: string;
    tournamentId: string;
    matchId: string;
    propsUsed: string[];
    gameId?: string;
    deductionResult?: any;
}) {
    const now = getTorontoDate();
    const logData: any = {
        uid: data.uid,
        gameType: "tournament",
        propType: data.propsUsed.join(","),
        gameState: {
            tournamentId: data.tournamentId,
            matchId: data.matchId,
            gameId: data.gameId
        },
        newGameState: {},
        params: {},
        deductionMode: "delayed",
        gameId: data.gameId,
        createdAt: now.iso
    };
    if (data.deductionResult?.deductionId) {
        logData.deductionId = data.deductionResult.deductionId;
    }
    await ctx.db.insert("prop_usage_logs", logData);
}

export async function createTournament(ctx: any, { uid, gameType, tournamentType, player, season, config, now }: {
    uid: string;
    gameType: string;
    tournamentType: string;
    player: any;
    season: any;
    config: any;
    now: any;
}) {
    const entryRequirements = config.entryRequirements;
    const matchRules = config.matchRules;
    const schedule = config.schedule;
    const { getIndependentFromTournamentType } = await import("./utils/tournamentTypeUtils");
    const isIndependent = await getIndependentFromTournamentType(ctx, tournamentType);
    const tournamentId = await ctx.db.insert("tournaments", {
        seasonId: season._id,
        gameType,
        segmentName: player.segmentName,
        status: "open",
        tournamentType,
        isSubscribedRequired: entryRequirements?.isSubscribedRequired || false,
        isSingleMatch: matchRules?.isSingleMatch || false,
        prizePool: entryRequirements?.entryFee?.coins ? entryRequirements.entryFee.coins * 0.8 : 0,
        config: {
            entryRequirements: config.entryRequirements,
            matchRules: config.matchRules,
            rewards: config.rewards,
            schedule: config.schedule,
            limits: config.limits,
            advanced: config.advanced
        },
        createdAt: now.iso,
        updatedAt: now.iso
    });
    await ctx.db.insert("player_tournaments", {
        uid,
        tournamentId,
        tournamentType,
        gameType,
        status: "active",
        joinedAt: now.iso,
        createdAt: now.iso,
        updatedAt: now.iso,
    });
    return tournamentId;
}

export async function createIndependentTournament(ctx: any, { uid, gameType, tournamentType, player, season, config, now, attemptNumber }: {
    uid: string;
    gameType: string;
    tournamentType: string;
    player: any;
    season: any;
    config: any;
    now: any;
    attemptNumber: number;
}) {
    const entryRequirements = config.entryRequirements;
    const matchRules = config.matchRules;
    const schedule = config.schedule;
    const tournamentId = await ctx.db.insert("tournaments", {
        seasonId: season._id,
        gameType,
        segmentName: player.segmentName,
        status: "open",
        tournamentType,
        isSubscribedRequired: entryRequirements?.isSubscribedRequired || false,
        isSingleMatch: matchRules?.isSingleMatch || false,
        prizePool: entryRequirements?.entryFee?.coins ? entryRequirements.entryFee.coins * 0.8 : 0,
        config: {
            entryRequirements: config.entryRequirements,
            matchRules: config.matchRules,
            rewards: config.rewards,
            schedule: config.schedule,
            limits: config.limits,
            advanced: config.advanced
        },
        createdAt: now.iso,
        updatedAt: now.iso
    });
    await ctx.db.insert("player_tournaments", {
        uid,
        tournamentId,
        tournamentType,
        gameType,
        status: "active",
        joinedAt: now.iso,
        createdAt: now.iso,
        updatedAt: now.iso,
    });
    return tournamentId;
}

export async function validateJoinConditions(ctx: any, { uid, gameType, tournamentType, player, season }: JoinArgs) {
    // 可根据需要扩展更多校验逻辑
    return await ctx.db
        .query("tournament_types")
        .withIndex("by_typeId", (q: any) => q.eq("typeId", tournamentType))
        .first();
}

export async function validateScoreSubmission(ctx: any, { tournamentId, gameType, score, gameData, propsUsed }: SubmitScoreArgs) {
    // 可根据需要扩展更多校验逻辑
    return true;
}

export async function calculatePlayerRankings(ctx: any, tournamentId: string) {
    const matches = await ctx.db
        .query("player_matches")
        .withIndex("by_tournament", (q: any) => q.eq("tournamentId", tournamentId))
        .collect();
    const playerScores: Record<string, number> = {};
    for (const match of matches) {
        if (!playerScores[match.uid]) {
            playerScores[match.uid] = 0;
        }
        playerScores[match.uid] = Math.max(playerScores[match.uid], match.score);
    }
    const sorted = Object.entries(playerScores)
        .sort((a, b) => b[1] - a[1])
        .map(([uid, score], idx) => ({ uid, score, rank: idx + 1 }));
    return sorted;
}

export async function shouldSettleImmediately(ctx: any, tournament: any, tournamentId: string) {
    // 可根据需要扩展更多结算时机判断逻辑
    return false;
}

// ==================== 通用工具函数 ====================

/**
 * 通用的锦标赛创建函数
 */
export async function createTournamentCommon(ctx: any, params: {
    uid: string;
    gameType: string;
    tournamentType: string;
    player: any;
    season: any;
    config: any;
    now: any;
    duration?: number;
    isIndependent?: boolean;
}) {
    const { uid, gameType, tournamentType, player, season, config, now, duration = 24 * 60 * 60 * 1000, isIndependent = true } = params;

    // 创建锦标赛
    const tournamentId = await ctx.db.insert("tournaments", {
        seasonId: season._id,
        gameType,
        segmentName: player.segmentName,
        status: "open",
        tournamentType,
        isSubscribedRequired: config.entryRequirements?.isSubscribedRequired || false,
        isSingleMatch: config.matchRules?.isSingleMatch || false,
        prizePool: config.entryRequirements?.entryFee?.coins ? config.entryRequirements.entryFee.coins * 0.8 : 0,
        config: {
            entryRequirements: config.entryRequirements,
            matchRules: config.matchRules,
            rewards: config.rewards,
            schedule: config.schedule,
            limits: config.limits,
            advanced: config.advanced
        },
        createdAt: now.iso,
        updatedAt: now.iso,
        endTime: new Date(now.localDate.getTime() + duration).toISOString(),
    });

    // 创建玩家参与关系
    await ctx.db.insert("player_tournaments", {
        uid,
        tournamentId,
        tournamentType,
        gameType,
        status: "active",
        joinedAt: now.iso,
        createdAt: now.iso,
        updatedAt: now.iso,
    });

    return await ctx.db.get(tournamentId);
}

/**
 * 通用的锦标赛查找函数
 */
export async function findTournamentByTimeRange(ctx: any, params: {
    tournamentType: string;
    gameType: string;
    segmentName: string;
    timeFilter: (tournament: any) => boolean;
}) {
    const { tournamentType, gameType, segmentName, timeFilter } = params;

    const existingTournaments = await ctx.db
        .query("tournaments")
        .withIndex("by_type_status", (q: any) =>
            q.eq("tournamentType", tournamentType)
                .eq("status", "open")
                .eq("gameType", gameType)
                .eq("segmentName", segmentName)
        )
        .collect();

    return existingTournaments.find(timeFilter);
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
 * 通用的锦标赛类型获取函数
 */
export async function getTournamentTypeConfig(ctx: any, tournamentType: string) {
    const config = await ctx.db
        .query("tournament_types")
        .withIndex("by_typeId", (q: any) => q.eq("typeId", tournamentType))
        .first();

    if (!config) {
        throw new Error("锦标赛类型不存在");
    }

    return config;
}

/**
 * 通用的入场费扣除函数
 */
export async function deductEntryFeeCommon(ctx: any, params: {
    uid: string;
    gameType: string;
    tournamentType: string;
    entryFee: any;
    inventory: any;
}) {
    const { uid, gameType, tournamentType, entryFee, inventory } = params;

    if (!entryFee) return;

    // 检查库存是否足够
    if (entryFee.coins && inventory.coins < entryFee.coins) {
        throw new Error("金币不足");
    }

    if (entryFee.tickets && (!inventory.tickets || inventory.tickets.length < entryFee.tickets.length)) {
        throw new Error("门票不足");
    }

    // 扣除费用
    const updateData: any = {};
    if (entryFee.coins) {
        updateData.coins = inventory.coins - entryFee.coins;
    }
    if (entryFee.tickets) {
        updateData.tickets = inventory.tickets.filter((ticket: string) =>
            !entryFee.tickets.includes(ticket)
        );
    }

    if (Object.keys(updateData).length > 0) {
        updateData.updatedAt = new Date().toISOString();
        await ctx.db.patch(inventory._id, updateData);
    }
}

/**
 * 通用的比赛创建函数
 */
export async function createMatchCommon(ctx: any, params: {
    tournamentId: string;
    gameType: string;
    tournamentType: string;
    attemptNumber: number;
    timeIdentifier?: string;
}) {
    const { tournamentId, gameType, tournamentType, attemptNumber, timeIdentifier } = params;

    const gameData: any = { tournamentType, attemptNumber };
    if (timeIdentifier) {
        gameData.timeIdentifier = timeIdentifier;
    }

    // 创建比赛
    const matchId = await MatchManager.createMatch(ctx, {
        tournamentId,
        gameType,
        matchType: "tournament",
        maxPlayers: 1,
        minPlayers: 1,
        gameData
    });

    return matchId;
}

/**
 * 通用的玩家加入比赛函数
 */
export async function joinMatchCommon(ctx: any, params: {
    matchId: string;
    tournamentId: string;
    uid: string;
    gameType: string;
}) {
    const { matchId, tournamentId, uid, gameType } = params;

    // 玩家加入比赛
    const playerMatchId = await MatchManager.joinMatch(ctx, {
        matchId,
        tournamentId,
        uid,
        gameType
    });

    return {
        matchId,
        playerMatchId,
        gameId: `game_${matchId}`,
        serverUrl: "remote_server_url",
        matchStatus: "pending"
    };
}

/**
 * 通用的分数提交验证函数
 */
export async function validateScoreSubmissionCommon(ctx: any, params: {
    tournamentId: string;
    uid: string;
    gameType: string;
    score: number;
    gameData: any;
    propsUsed: string[];
    gameId?: string;
}) {
    const { tournamentId, uid, gameType, score, gameData, propsUsed, gameId } = params;

    // 验证分数
    if (score < 0) {
        throw new Error("分数不能为负数");
    }

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

    // 检查是否已经提交过分数
    if (playerMatch.completed) {
        throw new Error("比赛已完成，无法再次提交分数");
    }

    return {
        matchId: playerMatch.matchId,
        playerMatchId: playerMatch._id,
        currentScore: playerMatch.score || 0
    };
}

/**
 * 通用的奖励计算函数
 */
export function calculateRewardCommon(rank: number, rewards: any) {
    if (!rewards || !rewards.rankRewards) {
        return {
            coins: 0,
            gamePoints: 0,
            props: [],
            tickets: []
        };
    }

    // 根据排名计算奖励
    const rankReward = rewards.rankRewards.find((r: any) =>
        rank >= r.rankRange[0] && rank <= r.rankRange[1]
    );

    const baseRewards = rewards.baseRewards || { coins: 0, gamePoints: 0, props: [], tickets: [] };

    return {
        coins: baseRewards.coins * (rankReward?.multiplier || 1),
        gamePoints: baseRewards.gamePoints * (rankReward?.multiplier || 1),
        props: [...baseRewards.props, ...(rankReward?.bonusProps || [])],
        tickets: [...baseRewards.tickets, ...(rankReward?.bonusTickets || [])]
    };
}

/**
 * 通用的奖励分配函数
 */
export async function distributeRewardCommon(ctx: any, params: {
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
        const updateData: any = {
            updatedAt: new Date().toISOString()
        };

        if (reward.coins) {
            updateData.coins = inventory.coins + reward.coins;
        }
        if (reward.gamePoints) {
            updateData.gamePoints = (inventory.gamePoints || 0) + reward.gamePoints;
        }
        if (reward.props && reward.props.length > 0) {
            updateData.props = [...(inventory.props || []), ...reward.props];
        }
        if (reward.tickets && reward.tickets.length > 0) {
            updateData.tickets = [...(inventory.tickets || []), ...reward.tickets];
        }

        await ctx.db.patch(inventory._id, updateData);
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
 * 通用的错误日志记录函数
 */
export async function logErrorCommon(ctx: any, params: {
    error: any;
    context: string;
    uid?: string;
    tournamentId?: string;
    gameId?: string;
    now?: any;
}) {
    const { error, context, uid, tournamentId, gameId, now = getTorontoDate() } = params;

    console.error(`${context} 错误:`, error);

    await ctx.db.insert("error_logs", {
        error: error instanceof Error ? error.message : "未知错误",
        context,
        uid,
        tournamentId,
        gameId,
        createdAt: now.iso
    });
}

/**
 * 通用的锦标赛状态更新函数
 */
export async function updateTournamentStatus(ctx: any, params: {
    tournamentId: string;
    status: string;
    now?: any;
}) {
    const { tournamentId, status, now = getTorontoDate() } = params;

    await ctx.db.patch(tournamentId, {
        status,
        updatedAt: now.iso
    });
}

/**
 * 通用的玩家参与状态更新函数
 */
export async function updatePlayerTournamentStatusCommon(ctx: any, params: {
    uid: string;
    tournamentId: string;
    status: string;
    now?: any;
}) {
    const { uid, tournamentId, status, now = getTorontoDate() } = params;

    const playerTournament = await ctx.db
        .query("player_tournaments")
        .withIndex("by_uid_tournament", (q: any) =>
            q.eq("uid", uid).eq("tournamentId", tournamentId)
        )
        .first();

    if (playerTournament) {
        await ctx.db.patch(playerTournament._id, {
            status,
            updatedAt: now.iso
        });
    }
} 