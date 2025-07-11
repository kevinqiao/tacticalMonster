import { v } from "convex/values";
import { internalMutation, mutation, query } from "../../_generated/server";
import { TOURNAMENT_CONFIGS } from "../../data/tournamentConfigs";
import { getTorontoDate } from "../utils";
import {
    buildParticipationStats,
    checkTournamentEligibility,
    checkTournamentEligibilityWithAttempts,
    getCommonData,
    getPlayerAttempts,
    getTournamentTypeConfig,
    notifyTournamentChanges
} from "./common";
import { getHandler } from "./handler";

/**
 * 统一锦标赛服务
 * 支持单人、多人锦标赛，只使用远程游戏服务器
 */
export class TournamentService {
    static async loadTournamentConfig(ctx: any) {
        const preconfigs = await ctx.db.query("tournament_types").collect();

        preconfigs.forEach(async (preconfig: any) => {
            await ctx.db.delete(preconfig._id);
        });

        console.log("loadTournamentConfig,TOURNAMENT_CONFIGS", TOURNAMENT_CONFIGS.length)
        const tournamentConfig = TOURNAMENT_CONFIGS.forEach(async (tournamentConfig) => {

            await ctx.db.insert("tournament_types", tournamentConfig);
        });

    }
    /**
     * 加入锦标赛
     */
    static async joinTournament(ctx: any, params: {
        uid: string;
        gameType: string;
        tournamentType: string;
    }) {
        const tournamentType = await getTournamentTypeConfig(ctx, params.tournamentType);
        const now = getTorontoDate();

        // 获取玩家信息
        const { player, season } = await getCommonData(ctx, {
            uid: params.uid,
            requireInventory: false,
            requireSeason: true
        });

        // 获取对应的处理器
        console.log("params.tournamentType", params.tournamentType);
        const handler = getHandler(params.tournamentType);

        // 执行加入逻辑（处理器内部会处理锦标赛创建）
        const result = await handler.join(ctx, {
            uid: params.uid,
            gameType: params.gameType,
            tournamentType: params.tournamentType,
            player,
            season
        });

        return {
            success: true,
            ...result,
            message: "成功加入锦标赛",
        };
    }

    /**
     * 提交分数
     */
    static async submitScore(ctx: any, params: {
        tournamentId: string;
        uid: string;
        gameType: string;
        score: number;
        gameData: any;
        propsUsed: string[];
        gameId?: string;
    }) {
        const now = getTorontoDate();

        // 获取锦标赛信息
        const tournament = await ctx.db.get(params.tournamentId);
        if (!tournament) {
            throw new Error("锦标赛不存在");
        }

        // 获取对应的处理器
        const handler = getHandler(tournament.tournamentType);

        // 执行分数提交
        const result = await handler.submitScore(ctx, {
            tournamentId: params.tournamentId,
            uid: params.uid,
            gameType: params.gameType,
            score: params.score,
            gameData: params.gameData,
            propsUsed: params.propsUsed,
            gameId: params.gameId
        });

        // 通知参与更新
        await notifyTournamentChanges(ctx, {
            uid: params.uid,
            changeType: "participation_update",
            tournamentType: tournament.tournamentType,
            tournamentId: params.tournamentId,
            data: {
                name: tournament.tournamentType,
                action: "score_submitted",
                score: params.score,
                matchId: result.matchId
            }
        });

        // 获取更新后的可参与锦标赛列表
        const updatedAvailableTournaments = await this.getAvailableTournaments(ctx, {
            uid: params.uid,
            gameType: params.gameType
        });

        return {
            ...result,
            updatedAvailableTournaments: updatedAvailableTournaments.tournaments
        };
    }

    /**
     * 结算锦标赛
     */
    static async settleTournament(ctx: any, tournamentId: string) {
        const tournament = await ctx.db.get(tournamentId);
        if (!tournament) {
            throw new Error("锦标赛不存在");
        }

        const handler = getHandler(tournament.tournamentType);
        await handler.settle(ctx, tournamentId);

        return {
            success: true,
            tournamentId,
            message: "锦标赛结算完成"
        };
    }

    /**
     * 获取锦标赛详情
     */
    static async getTournamentDetails(ctx: any, tournamentId: string) {
        const tournament = await ctx.db.get(tournamentId);
        if (!tournament) {
            throw new Error("锦标赛不存在");
        }

        // 获取比赛列表
        const matches = await ctx.db
            .query("matches")
            .withIndex("by_tournament", (q: any) => q.eq("tournamentId", tournamentId))
            .collect();

        // 获取玩家比赛记录
        const playerMatches = await ctx.db
            .query("player_matches")
            .withIndex("by_tournament", (q: any) => q.eq("tournamentId", tournamentId))
            .collect();

        // 获取参与锦标赛的玩家信息 - 使用player_tournaments表
        const playerTournaments = await ctx.db
            .query("player_tournaments")
            .withIndex("by_tournament", (q: any) => q.eq("tournamentId", tournamentId))
            .collect();

        const players: any[] = [];
        for (const pt of playerTournaments) {
            const player = await ctx.db.query("players")
                .withIndex("by_uid", (q: any) => q.eq("uid", pt.uid))
                .first();
            if (player) {
                players.push(player);
            }
        }

        // 计算玩家统计
        const playerStats = new Map<string, any>();

        for (const playerMatch of playerMatches) {
            if (!playerMatch.completed) continue;

            const current = playerStats.get(playerMatch.uid) || {
                totalScore: 0,
                matchCount: 0,
                bestScore: 0,
                averageScore: 0
            };

            const newTotal = current.totalScore + playerMatch.score;
            const newCount = current.matchCount + 1;

            playerStats.set(playerMatch.uid, {
                totalScore: newTotal,
                matchCount: newCount,
                bestScore: Math.max(current.bestScore, playerMatch.score),
                averageScore: newTotal / newCount
            });
        }

        // 排序玩家 - 简化版本
        const entries = Array.from(playerStats.entries());
        const playerArray: any[] = [];

        for (const [uid, stats] of entries) {
            const player = players.find((p: any) => p?.uid === uid);
            playerArray.push({
                uid,
                ...stats,
                player
            });
        }

        playerArray.sort((a: any, b: any) => b.bestScore - a.bestScore);

        // 排序玩家
        const sortedPlayers: any[] = [];
        for (let i = 0; i < playerArray.length; i++) {
            const player = playerArray[i];
            sortedPlayers.push({
                ...player,
                rank: i + 1
            });
        }

        return {
            tournament,
            matches,
            players: sortedPlayers,
            totalMatches: matches.length,
            totalPlayers: playerTournaments.length
        };
    }

    /**
     * 获取玩家锦标赛历史
     */
    static async getPlayerTournamentHistory(ctx: any, params: {
        uid: string;
        limit?: number;
    }) {
        const { uid, limit = 20 } = params;

        // 获取玩家参与的所有锦标赛
        const playerMatches = await ctx.db
            .query("player_matches")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .order("desc")
            .take(limit);

        // 收集唯一的锦标赛和比赛ID
        const tournamentIdSet = new Set<string>();
        const matchIdSet = new Set<string>();

        for (const pm of playerMatches) {
            tournamentIdSet.add(pm.tournamentId);
            matchIdSet.add(pm.matchId);
        }

        const tournamentIds = Array.from(tournamentIdSet);
        const matchIds = Array.from(matchIdSet);

        // 获取锦标赛和比赛数据
        const tournaments: any[] = [];
        const matches: any[] = [];

        for (const id of tournamentIds) {
            const tournament = await ctx.db.get(id);
            if (tournament) {
                tournaments.push(tournament);
            }
        }

        for (const id of matchIds) {
            const match = await ctx.db.get(id);
            if (match) {
                matches.push(match);
            }
        }

        // 构建历史记录
        const history: any[] = [];
        for (const pm of playerMatches) {
            const tournament = tournaments.find((t: any) => t?._id === pm.tournamentId);
            const match = matches.find((m: any) => m?._id === pm.matchId);

            history.push({
                playerMatch: pm,
                tournament,
                match,
                gameType: pm.gameType,
                score: pm.score,
                rank: pm.rank,
                completed: pm.completed,
                createdAt: pm.createdAt
            });
        }

        // 排序历史记录
        history.sort((a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        return history;
    }

    /**
     * 清理过期锦标赛
     */
    static async cleanupExpiredTournaments(ctx: any) {
        const now = getTorontoDate();

        console.log("开始清理过期锦标赛");

        try {
            // 查找所有过期的开放锦标赛
            const expiredTournaments = await ctx.db
                .query("tournaments")
                .filter((q: any) => q.eq(q.field("status"), "open"))
                .filter((q: any) => q.lt(q.field("endTime"), now.iso))
                .collect();

            let cleanedCount = 0;

            for (const tournament of expiredTournaments) {
                // 检查是否有未完成的比赛
                const incompleteMatches = await ctx.db
                    .query("matches")
                    .withIndex("by_tournament", (q: any) => q.eq("tournamentId", tournament._id))
                    .filter((q: any) => q.neq(q.field("status"), "completed"))
                    .collect();

                if (incompleteMatches.length > 0) {
                    console.log(`锦标赛 ${tournament._id} 有未完成的比赛，跳过清理`);
                    continue;
                }

                // 关闭锦标赛
                await ctx.db.patch(tournament._id, {
                    status: "expired",
                    updatedAt: now.iso
                });

                cleanedCount++;
                console.log(`已关闭过期锦标赛: ${tournament._id}`);
            }

            return {
                success: true,
                message: `过期锦标赛清理完成`,
                cleanedCount
            };

        } catch (error) {
            console.error("清理过期锦标赛失败:", error);
            throw error;
        }
    }

    /**
     * 结算完成的锦标赛
     */
    static async settleCompletedTournaments(ctx: any) {
        const now = getTorontoDate();

        console.log("开始结算完成的锦标赛");

        try {
            // 查找所有开放且已过期的锦标赛
            const completedTournaments = await ctx.db
                .query("tournaments")
                .filter((q: any) => q.eq(q.field("status"), "open"))
                .filter((q: any) => q.lt(q.field("endTime"), now.iso))
                .collect();

            let settledCount = 0;

            for (const tournament of completedTournaments) {
                try {
                    // 获取对应的处理器
                    const handler = getHandler(tournament.tournamentType);

                    // 执行结算
                    await handler.settle(ctx, tournament._id);

                    settledCount++;
                    console.log(`已结算锦标赛: ${tournament._id}`);
                } catch (error) {
                    console.error(`结算锦标赛 ${tournament._id} 失败:`, error);

                    // 记录错误日志
                    await ctx.db.insert("error_logs", {
                        error: `结算锦标赛失败: ${error instanceof Error ? error.message : "未知错误"}`,
                        context: "settleCompletedTournaments",
                        tournamentId: tournament._id,
                        createdAt: now.iso
                    });
                }
            }

            return {
                success: true,
                message: `完成锦标赛结算`,
                settledCount
            };

        } catch (error) {
            console.error("结算完成锦标赛失败:", error);
            throw error;
        }
    }

    /**
     * 获取当前玩家可参与的锦标赛列表
     */
    static async getAvailableTournaments(ctx: any, params: {
        uid: string;
        gameType?: string; // 可选，过滤特定游戏类型
        category?: string; // 可选，过滤特定分类
    }) {
        const { uid, gameType, category } = params;

        // 获取玩家信息
        const { player, inventory, season } = await getCommonData(ctx, {
            uid,
            requireInventory: true,
            requireSeason: true
        });

        // 获取所有活跃的锦标赛类型
        let tournamentTypes = await ctx.db
            .query("tournament_types")
            .filter((q: any) => q.eq(q.field("isActive"), true))
            .collect();

        // 应用过滤条件
        if (gameType) {
            tournamentTypes = tournamentTypes.filter((tt: any) =>
                tt.gameType === gameType
            );
        }

        if (category) {
            tournamentTypes = tournamentTypes.filter((tt: any) =>
                tt.category === category
            );
        }

        const availableTournaments: any[] = [];

        for (const tournamentType of tournamentTypes) {
            try {
                // 检查参赛资格
                const eligibility = await checkTournamentEligibility(ctx, {
                    uid,
                    tournamentType,
                    player,
                    inventory,
                    season
                });

                let participationStats: any;
                if (eligibility.eligible) {
                    // 优化：直接从 tournamentType 对象获取 timeRange，避免重复查询
                    const timeRange = tournamentType.timeRange || "total";
                    const attempts = await getPlayerAttempts(ctx, {
                        uid,
                        tournamentType: tournamentType.typeId,
                        gameType: tournamentType.gameType,
                        timeRange
                    });

                    // 构建参与统计
                    participationStats = buildParticipationStats(attempts, timeRange);
                }
                availableTournaments.push({
                    typeId: tournamentType.typeId,
                    name: tournamentType.name,
                    description: tournamentType.description,
                    category: tournamentType.category,
                    gameType: tournamentType.gameType,
                    config: {
                        entryRequirements: tournamentType.entryRequirements,
                        matchRules: tournamentType.matchRules,
                        rewards: tournamentType.rewards,
                        schedule: tournamentType.schedule,
                        limits: tournamentType.limits,
                        advanced: tournamentType.advanced
                    },
                    eligibility,
                    participationStats,
                    priority: tournamentType.priority || 5
                });
            } catch (error) {
                console.error(`检查锦标赛资格失败 (${tournamentType.typeId}):`, error);
                // 继续检查其他锦标赛，不中断整个流程
            }
        }

        // 按优先级排序
        availableTournaments.sort((a: any, b: any) => a.priority - b.priority);

        return {
            success: true,
            tournaments: availableTournaments,
            totalCount: availableTournaments.length
        };
    }


    /**
     * 创建锦标赛（如果需要）
     */
    static async createTournamentIfNeeded(ctx: any, params: {
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


    }

    /**
     * 获取玩家锦标赛实时状态
     * 用于前端实时更新，包含参与统计和资格变化
     */
    static async getPlayerTournamentStatus(ctx: any, params: {
        uid: string;
        gameType?: string;
        category?: string;
    }) {
        const { uid, gameType, category } = params;

        try {
            // 获取玩家信息
            const { player, inventory, season } = await getCommonData(ctx, {
                uid,
                requireInventory: true,
                requireSeason: true
            });

            // 获取所有活跃的锦标赛类型
            let tournamentTypes = await ctx.db
                .query("tournament_types")
                .filter((q: any) => q.eq(q.field("isActive"), true))
                .collect();

            // 应用过滤条件
            if (gameType) {
                tournamentTypes = tournamentTypes.filter((tt: any) =>
                    tt.gameType === gameType
                );
            }

            if (category) {
                tournamentTypes = tournamentTypes.filter((tt: any) =>
                    tt.category === category
                );
            }

            const tournamentStatus: any[] = [];

            for (const tournamentType of tournamentTypes) {
                try {
                    // 优化：直接从 tournamentType 对象获取 timeRange，避免重复查询
                    const timeRange = tournamentType.timeRange || "total";
                    const attempts = await getPlayerAttempts(ctx, {
                        uid,
                        tournamentType: tournamentType.typeId,
                        gameType: tournamentType.gameType,
                        timeRange
                    });

                    // 构建参与统计
                    const participationStats = buildParticipationStats(attempts, timeRange);

                    // 检查参赛资格（使用已获取的attempts数据）
                    const eligibility = await checkTournamentEligibilityWithAttempts(ctx, {
                        uid,
                        tournamentType,
                        player,
                        inventory,
                        season,
                        attempts,
                        timeRange
                    });

                    // 获取当前参与的锦标赛
                    const currentTournaments = await this.getCurrentParticipations(ctx, {
                        uid,
                        tournamentType: tournamentType.typeId,
                        gameType: tournamentType.gameType
                    });

                    tournamentStatus.push({
                        typeId: tournamentType.typeId,
                        name: tournamentType.name,
                        description: tournamentType.description,
                        category: tournamentType.category,
                        gameType: tournamentType.gameType,
                        config: {
                            entryRequirements: tournamentType.entryRequirements,
                            matchRules: tournamentType.matchRules,
                            rewards: tournamentType.rewards,
                            schedule: tournamentType.schedule,
                            limits: tournamentType.limits,
                            advanced: tournamentType.advanced
                        },
                        eligibility,
                        participationStats,
                        currentParticipations: currentTournaments,
                        priority: tournamentType.priority || 5, // 确保priority字段存在
                        lastUpdated: new Date().toISOString()
                    });
                } catch (error) {
                    console.error(`获取锦标赛状态失败 (${tournamentType.typeId}):`, error);
                    // 继续处理其他锦标赛，不中断整个流程
                }
            }

            // 按优先级排序
            tournamentStatus.sort((a: any, b: any) => (a.priority || 5) - (b.priority || 5));

            return {
                success: true,
                player: {
                    uid: player.uid,
                    segmentName: player.segmentName,
                    isSubscribed: player.isSubscribed,
                    lastActive: player.lastActive
                },
                inventory: {
                    coins: inventory?.coins || 0,
                    tickets: inventory?.tickets || [],
                    props: inventory?.props || []
                },
                season: season ? {
                    id: season._id,
                    name: season.name,
                    isActive: season.isActive
                } : null,
                tournaments: tournamentStatus,
                totalCount: tournamentStatus.length,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error("getPlayerTournamentStatus error:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "未知错误",
                tournaments: [],
                totalCount: 0,
                timestamp: new Date().toISOString()
            };
        }
    }



    /**
     * 获取玩家当前参与的锦标赛
     */
    private static async getCurrentParticipations(ctx: any, params: {
        uid: string;
        tournamentType: string;
        gameType: string;
    }) {
        const { uid, tournamentType, gameType } = params;

        try {
            // 首先检查是否为独立赛
            const tournamentTypeConfig = await ctx.db
                .query("tournament_types")
                .withIndex("by_typeId", (q: any) => q.eq("typeId", tournamentType))
                .first();

            const isIndependent = tournamentTypeConfig?.config?.independent || false;

            // 优化：直接使用新的索引查询，避免关联查询
            const activeParticipations = await ctx.db
                .query("player_tournaments")
                .withIndex("by_uid_tournamentType_gameType", (q: any) =>
                    q.eq("uid", uid)
                        .eq("tournamentType", tournamentType)
                        .eq("gameType", gameType)
                )
                .filter((q: any) => q.eq(q.field("status"), "active"))
                .collect();

            if (activeParticipations.length === 0) {
                return [];
            }

            // 获取相关的锦标赛信息
            const tournamentIds = activeParticipations.map((pt: any) => pt.tournamentId);
            const tournaments = await Promise.all(
                tournamentIds.map((id: string) => ctx.db.get(id))
            );

            // 过滤出符合条件的锦标赛
            const validTournaments = tournaments.filter((tournament: any) =>
                tournament &&
                tournament.status === "open"
            );

            if (validTournaments.length === 0) {
                return [];
            }

            // 构建参与信息
            const currentParticipations: any[] = [];

            for (const pt of activeParticipations) {
                const tournament = validTournaments.find((t: any) => t._id === pt.tournamentId);
                if (!tournament) continue;

                // 获取该锦标赛中的比赛统计
                const playerMatches = await ctx.db
                    .query("player_matches")
                    .withIndex("by_tournament_uid", (q: any) =>
                        q.eq("tournamentId", pt.tournamentId).eq("uid", uid)
                    )
                    .collect();

                // 计算统计信息
                const matchCount = playerMatches.length;
                const completedMatches = playerMatches.filter((pm: any) => pm.completed).length;
                const scores = playerMatches
                    .filter((pm: any) => pm.score)
                    .map((pm: any) => pm.score);

                currentParticipations.push({
                    tournamentId: tournament._id,
                    tournamentName: tournament.tournamentType,
                    status: tournament.status,
                    participationStatus: pt.status, // 新增：参与状态
                    joinedAt: pt.joinedAt || pt.createdAt,
                    matchCount,
                    completedMatches,
                    bestScore: scores.length > 0 ? Math.max(...scores) : 0,
                    averageScore: scores.length > 0 ?
                        scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0,
                    isIndependent: isIndependent
                });
            }

            return currentParticipations;
        } catch (error) {
            console.error("getCurrentParticipations error:", error);
            return [];
        }
    }

    /**
 * 更新玩家锦标赛参与状态
 */
    static async updatePlayerTournamentStatus(ctx: any, params: {
        uid: string;
        tournamentId: string;
        newStatus: "active" | "completed" | "withdrawn" | "disqualified" | "expired";
        reason?: string;
        metadata?: any;
    }) {
        const { PlayerTournamentStatusManager, PlayerTournamentStatus } = await import("./playerTournamentStatusManager.js");

        return await PlayerTournamentStatusManager.updatePlayerTournamentStatus(ctx, {
            ...params,
            newStatus: params.newStatus as any
        });
    }

    /**
     * 玩家退出锦标赛
     */
    static async withdrawPlayerFromTournament(ctx: any, params: {
        uid: string;
        tournamentId: string;
        reason?: string;
    }) {
        const { PlayerTournamentStatusManager } = await import("./playerTournamentStatusManager.js");

        return await PlayerTournamentStatusManager.withdrawPlayerFromTournament(ctx, params);
    }

    /**
     * 取消玩家锦标赛资格
     */
    static async disqualifyPlayerFromTournament(ctx: any, params: {
        uid: string;
        tournamentId: string;
        reason: string;
        metadata?: any;
    }) {
        const { PlayerTournamentStatusManager } = await import("./playerTournamentStatusManager.js");

        return await PlayerTournamentStatusManager.disqualifyPlayerFromTournament(ctx, params);
    }

    /**
     * 获取玩家参与统计
     */
    static async getPlayerParticipationStats(ctx: any, params: {
        uid: string;
        timeRange?: "daily" | "weekly" | "seasonal" | "total";
    }) {
        const { PlayerTournamentStatusManager } = await import("./playerTournamentStatusManager.js");

        return await PlayerTournamentStatusManager.getPlayerParticipationStats(ctx, params);
    }

    /**
 * 清理过期参与记录
 */
    static async cleanupExpiredParticipations(ctx: any, params: {
        daysToKeep?: number;
    }) {
        const { PlayerTournamentStatusManager } = await import("./playerTournamentStatusManager.js");

        return await PlayerTournamentStatusManager.cleanupExpiredParticipations(ctx, params);
    }

    /**
     * 批量处理每日锦标赛完成状态
     */
    static async batchCompleteDailyTournament(ctx: any, params: {
        tournamentId: string;
        batchSize?: number;
        maxConcurrency?: number;
    }) {
        const { PlayerTournamentStatusManager } = await import("./playerTournamentStatusManager.js");

        return await PlayerTournamentStatusManager.batchCompleteDailyTournament(ctx, params);
    }

    /**
     * 异步批量处理每日锦标赛完成状态
     */
    static async asyncBatchCompleteDailyTournament(ctx: any, params: {
        tournamentId: string;
        batchSize?: number;
        maxConcurrency?: number;
    }) {
        const { PlayerTournamentStatusManager } = await import("./playerTournamentStatusManager.js");

        return await PlayerTournamentStatusManager.asyncBatchCompleteDailyTournament(ctx, params);
    }

    /**
     * 查询锦标赛结算任务状态
     */
    static async getTournamentSettlementStatus(ctx: any, tournamentId: string) {
        const task = await ctx.db
            .query("tournament_settlement_tasks")
            .withIndex("by_tournament", (q: any) => q.eq("tournamentId", tournamentId))
            .order("desc")
            .first();

        if (!task) {
            return {
                hasTask: false,
                message: "没有找到结算任务"
            };
        }

        // 如果任务正在运行，获取详细状态
        if (task.status === "running") {
            try {
                const { PlayerTournamentStatusManager } = await import("./playerTournamentStatusManager.js");
                const batchStatus = await PlayerTournamentStatusManager.getBatchProcessingStatus(ctx, task.taskId);
                return {
                    hasTask: true,
                    taskId: task.taskId,
                    status: task.status,
                    totalPlayers: task.totalPlayers,
                    progress: batchStatus.progress,
                    processed: batchStatus.processed,
                    completed: batchStatus.completed,
                    expired: batchStatus.expired,
                    errors: batchStatus.errors,
                    createdAt: task.createdAt,
                    updatedAt: task.updatedAt
                };
            } catch (error) {
                return {
                    hasTask: true,
                    taskId: task.taskId,
                    status: task.status,
                    totalPlayers: task.totalPlayers,
                    progress: 0,
                    error: "无法获取详细状态",
                    createdAt: task.createdAt,
                    updatedAt: task.updatedAt
                };
            }
        }

        return {
            hasTask: true,
            taskId: task.taskId,
            status: task.status,
            totalPlayers: task.totalPlayers,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt
        };
    }

    /**
     * 查询批量处理任务状态
     */
    static async getBatchProcessingStatus(ctx: any, taskId: string) {
        const { PlayerTournamentStatusManager } = await import("./playerTournamentStatusManager.js");
        return await PlayerTournamentStatusManager.getBatchProcessingStatus(ctx, taskId);
    }

    /**
     * 清理过期的结算任务记录
     */
    static async cleanupExpiredSettlementTasks(ctx: any, params: {
        daysToKeep?: number;
    }) {
        const { daysToKeep = 7 } = params;
        const now = getTorontoDate();
        const cutoffDate = new Date(now.localDate.getTime() - daysToKeep * 24 * 60 * 60 * 1000);

        const expiredTasks = await ctx.db
            .query("tournament_settlement_tasks")
            .filter((q: any) =>
                q.and(
                    q.or(
                        q.eq(q.field("status"), "completed"),
                        q.eq(q.field("status"), "failed")
                    ),
                    q.lt(q.field("updatedAt"), cutoffDate.toISOString())
                )
            )
            .collect();

        let deletedCount = 0;
        for (const task of expiredTasks) {
            await ctx.db.delete(task._id);
            deletedCount++;
        }

        console.log(`清理了 ${deletedCount} 条过期的结算任务记录`);
        return deletedCount;
    }





}

// Convex 函数接口
export const joinTournament = (mutation as any)({
    args: {
        uid: v.string(),
        gameType: v.string(),
        tournamentType: v.string(),
    },
    handler: async (ctx: any, args: any) => {
        const result = await TournamentService.joinTournament(ctx, args);
        return result;
    },
});

export const submitScore = (mutation as any)({
    args: {
        tournamentId: v.id("tournaments"),
        uid: v.string(),
        gameType: v.string(),
        score: v.number(),
        gameData: v.any(),
        propsUsed: v.any(),
        gameId: v.optional(v.string()),
    },
    handler: async (ctx: any, args: any) => {
        const result = await TournamentService.submitScore(ctx, args);
        return result;
    },
});

export const settleTournament = (mutation as any)({
    args: {
        tournamentId: v.id("tournaments"),
    },
    handler: async (ctx: any, args: any) => {
        const result = await TournamentService.settleTournament(ctx, args.tournamentId);
        return result;
    },
});

export const getTournamentDetails = (query as any)({
    args: {
        tournamentId: v.id("tournaments"),
    },
    handler: async (ctx: any, args: any) => {
        const result = await TournamentService.getTournamentDetails(ctx, args.tournamentId);
        return result;
    },
});

export const getPlayerTournamentHistory = (query as any)({
    args: {
        uid: v.string(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx: any, args: any) => {
        const result = await TournamentService.getPlayerTournamentHistory(ctx, args);
        return result;
    },
});

export const cleanupExpiredTournaments = (mutation as any)({
    args: {},
    handler: async (ctx: any, args: any) => {
        const result = await TournamentService.cleanupExpiredTournaments(ctx);
        return result;
    },
});

export const settleCompletedTournaments = (mutation as any)({
    args: {},
    handler: async (ctx: any, args: any) => {
        const result = await TournamentService.settleCompletedTournaments(ctx);
        return result;
    },
});

export const getAvailableTournaments = (query as any)({
    args: {
        uid: v.string(),
        gameType: v.optional(v.string()),
        category: v.optional(v.string()),
    },
    handler: async (ctx: any, args: any) => {
        const result = await TournamentService.getAvailableTournaments(ctx, args);
        return result;
    },
});

export const getPlayerTournamentStatus = (query as any)({
    args: {
        uid: v.optional(v.string()),
        gameType: v.optional(v.string()),
        category: v.optional(v.string()),
    },
    handler: async (ctx: any, args: any) => {
        console.log("getPlayerTournamentStatus", args);
        if (!args.uid) return [];
        const result = await TournamentService.getPlayerTournamentStatus(ctx, args);
        return result;
    },
});
export const loadTournamentConfig = (internalMutation as any)({
    args: {

    },
    handler: async (ctx: any, args: any) => {
        const result = await TournamentService.loadTournamentConfig(ctx);
        return result;
    },
});



// 玩家锦标赛状态管理API
export const updatePlayerTournamentStatus = (mutation as any)({
    args: {
        uid: v.string(),
        tournamentId: v.string(),
        newStatus: v.union(
            v.literal("active"),
            v.literal("completed"),
            v.literal("withdrawn"),
            v.literal("disqualified"),
            v.literal("expired")
        ),
        reason: v.optional(v.string()),
        metadata: v.optional(v.any())
    },
    handler: async (ctx: any, args: any) => {
        const result = await TournamentService.updatePlayerTournamentStatus(ctx, args);
        return result;
    }
});

export const withdrawPlayerFromTournament = (mutation as any)({
    args: {
        uid: v.string(),
        tournamentId: v.string(),
        reason: v.optional(v.string())
    },
    handler: async (ctx: any, args: any) => {
        const result = await TournamentService.withdrawPlayerFromTournament(ctx, args);
        return result;
    }
});

export const disqualifyPlayerFromTournament = (mutation as any)({
    args: {
        uid: v.string(),
        tournamentId: v.string(),
        reason: v.string(),
        metadata: v.optional(v.any())
    },
    handler: async (ctx: any, args: any) => {
        const result = await TournamentService.disqualifyPlayerFromTournament(ctx, args);
        return result;
    }
});

export const getPlayerParticipationStats = (query as any)({
    args: {
        uid: v.string(),
        timeRange: v.optional(v.union(
            v.literal("daily"),
            v.literal("weekly"),
            v.literal("seasonal"),
            v.literal("total")
        ))
    },
    handler: async (ctx: any, args: any) => {
        const result = await TournamentService.getPlayerParticipationStats(ctx, args);
        return result;
    }
});

export const cleanupExpiredParticipations = (mutation as any)({
    args: {
        daysToKeep: v.optional(v.number())
    },
    handler: async (ctx: any, args: any) => {
        const result = await TournamentService.cleanupExpiredParticipations(ctx, args);
        return result;
    }
});

// 批量处理每日锦标赛API
export const batchCompleteDailyTournament = (mutation as any)({
    args: {
        tournamentId: v.string(),
        batchSize: v.optional(v.number()),
        maxConcurrency: v.optional(v.number())
    },
    handler: async (ctx: any, args: any) => {
        const result = await TournamentService.batchCompleteDailyTournament(ctx, args);
        return result;
    }
});

export const asyncBatchCompleteDailyTournament = (mutation as any)({
    args: {
        tournamentId: v.string(),
        batchSize: v.optional(v.number()),
        maxConcurrency: v.optional(v.number())
    },
    handler: async (ctx: any, args: any) => {
        const result = await TournamentService.asyncBatchCompleteDailyTournament(ctx, args);
        return result;
    }
});

export const getBatchProcessingStatus = (query as any)({
    args: {
        taskId: v.string()
    },
    handler: async (ctx: any, args: any) => {
        const result = await TournamentService.getBatchProcessingStatus(ctx, args.taskId);
        return result;
    }
});

export const getTournamentSettlementStatus = (query as any)({
    args: {
        tournamentId: v.string()
    },
    handler: async (ctx: any, args: any) => {
        const result = await TournamentService.getTournamentSettlementStatus(ctx, args.tournamentId);
        return result;
    }
});

export const cleanupExpiredSettlementTasks = (mutation as any)({
    args: {
        daysToKeep: v.optional(v.number())
    },
    handler: async (ctx: any, args: any) => {
        const result = await TournamentService.cleanupExpiredSettlementTasks(ctx, args);
        return result;
    }
});