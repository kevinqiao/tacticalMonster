import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { getTorontoDate } from "../utils";
import { getHandler } from "./handler";

/**
 * 统一锦标赛服务
 * 支持单人、多人锦标赛，只使用远程游戏服务器
 */
export class TournamentService {
    /**
     * 加入锦标赛
     */
    static async joinTournament(ctx: any, params: {
        uid: string;
        gameType: string;
        tournamentType: string;
    }) {
        const tournamentType = await ctx.db.query("tournament_types").withIndex("by_typeId", (q: any) => q.eq("typeId", params.tournamentType)).first();
        if (!tournamentType) {
            throw new Error("锦标赛类型不存在");
        }
        const now = getTorontoDate();

        // 获取玩家信息
        const player = await ctx.db
            .query("players")
            .withIndex("by_uid", (q: any) => q.eq("uid", params.uid))
            .first();
        if (!player) {
            throw new Error("玩家不存在");
        }

        // 获取当前赛季
        const season = await ctx.db
            .query("seasons")
            .withIndex("by_isActive", (q: any) => q.eq("isActive", true))
            .first();
        if (!season) {
            throw new Error("无活跃赛季");
        }

        // 获取对应的处理器
        const handler = getHandler(params.tournamentType);

        // 执行加入逻辑
        const result = await handler.join(ctx, {
            uid: params.uid,
            gameType: params.gameType,
            tournamentType: params.tournamentType,
            player,
            season
        });

        // 通知参与更新
        await this.notifyTournamentChanges(ctx, {
            uid: params.uid,
            changeType: "participation_update",
            tournamentType: params.tournamentType,
            tournamentId: result.tournamentId,
            data: {
                name: tournamentType.name,
                action: "joined",
                matchId: result.matchId,
                gameId: result.gameId
            }
        });

        // 获取更新后的可参与锦标赛列表
        const updatedAvailableTournaments = await this.getAvailableTournaments(ctx, {
            uid: params.uid,
            gameType: params.gameType
        });

        return {
            success: true,
            ...result,
            message: "成功加入锦标赛",
            updatedAvailableTournaments: updatedAvailableTournaments.tournaments
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
        await this.notifyTournamentChanges(ctx, {
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
        const player = await ctx.db
            .query("players")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .first();
        if (!player) {
            throw new Error("玩家不存在");
        }

        // 获取玩家库存
        const inventory = await ctx.db
            .query("player_inventory")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .first();

        // 获取当前赛季
        const season = await ctx.db
            .query("seasons")
            .withIndex("by_isActive", (q: any) => q.eq("isActive", true))
            .first();

        // 获取所有活跃的锦标赛类型
        let tournamentTypes = await ctx.db
            .query("tournament_types")
            .filter((q: any) => q.eq(q.field("isActive"), true))
            .collect();

        // 应用过滤条件
        if (gameType) {
            tournamentTypes = tournamentTypes.filter((tt: any) =>
                tt.defaultConfig?.gameType === gameType
            );
        }

        if (category) {
            tournamentTypes = tournamentTypes.filter((tt: any) =>
                tt.category === category
            );
        }

        // 自动创建缺失的锦标赛
        await this.ensureTournamentsExist(ctx, {
            tournamentTypes,
            season,
            player
        });

        const availableTournaments: any[] = [];

        for (const tournamentType of tournamentTypes) {
            try {
                // 检查参赛资格
                const eligibility = await this.checkTournamentEligibility(ctx, {
                    uid,
                    tournamentType,
                    player,
                    inventory,
                    season
                });

                if (eligibility.eligible) {
                    // 获取参与统计
                    const participationStats = await this.getParticipationStats(ctx, {
                        uid,
                        tournamentType: tournamentType.typeId,
                        gameType: tournamentType.defaultConfig?.gameType
                    });

                    availableTournaments.push({
                        typeId: tournamentType.typeId,
                        name: tournamentType.name,
                        description: tournamentType.description,
                        category: tournamentType.category,
                        gameType: tournamentType.gameType,
                        config: tournamentType.defaultConfig,
                        eligibility,
                        participationStats,
                        priority: tournamentType.defaultConfig?.priority || 5
                    });
                }
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
     * 确保锦标赛存在，如果不存在则自动创建
     */
    private static async ensureTournamentsExist(ctx: any, params: {
        tournamentTypes: any[];
        season: any;
        player: any;
    }) {
        const { tournamentTypes, season, player } = params;
        const now = getTorontoDate();

        for (const tournamentType of tournamentTypes) {
            try {
                // 检查是否需要自动创建锦标赛
                if (await this.shouldCreateTournament(ctx, { tournamentType, season, now })) {
                    await this.createTournamentIfNeeded(ctx, {
                        tournamentType,
                        season,
                        player,
                        now
                    });
                }
            } catch (error) {
                console.error(`自动创建锦标赛失败 (${tournamentType.typeId}):`, error);
                // 继续处理其他锦标赛，不中断整个流程
            }
        }
    }

    /**
     * 判断是否需要创建锦标赛
     */
    private static async shouldCreateTournament(ctx: any, params: {
        tournamentType: any;
        season: any;
        now: any;
    }) {
        const { tournamentType, season, now } = params;

        // 根据锦标赛类型判断是否需要创建
        switch (tournamentType.category) {
            case "daily":
                return await this.shouldCreateDailyTournament(ctx, { tournamentType, now });
            case "weekly":
                return await this.shouldCreateWeeklyTournament(ctx, { tournamentType, now });
            case "seasonal":
                return await this.shouldCreateSeasonalTournament(ctx, { tournamentType, season });
            default:
                // 其他类型（如 casual, special 等）不需要预创建
                return false;
        }
    }

    /**
     * 判断是否需要创建每日锦标赛
     */
    private static async shouldCreateDailyTournament(ctx: any, params: {
        tournamentType: any;
        now: any;
    }) {
        const { tournamentType, now } = params;
        const today = now.localDate.toISOString().split("T")[0];

        // 检查是否已创建今日锦标赛
        const existingTournaments = await ctx.db
            .query("tournaments")
            .withIndex("by_type_status", (q: any) =>
                q.eq("tournamentType", tournamentType.typeId)
                    .eq("status", "open")
            )
            .collect();

        // 在 JavaScript 中过滤今日创建的锦标赛
        const todayTournament = existingTournaments.find((tournament: any) => {
            const createdAt = tournament.createdAt;
            if (!createdAt) return false;
            const createdAtStr = typeof createdAt === 'string' ? createdAt : createdAt.toISOString();
            return createdAtStr.startsWith(today);
        });

        return !todayTournament;
    }

    /**
     * 判断是否需要创建每周锦标赛
     */
    private static async shouldCreateWeeklyTournament(ctx: any, params: {
        tournamentType: any;
        now: any;
    }) {
        const { tournamentType, now } = params;
        const weekStart = this.getWeekStart(now.localDate.toISOString().split("T")[0]);

        // 检查是否已创建本周锦标赛
        const existingTournaments = await ctx.db
            .query("tournaments")
            .withIndex("by_type_status", (q: any) =>
                q.eq("tournamentType", tournamentType.typeId)
                    .eq("status", "open")
            )
            .collect();

        // 在 JavaScript 中过滤本周创建的锦标赛
        const thisWeekTournament = existingTournaments.find((tournament: any) => {
            const createdAt = tournament.createdAt;
            if (!createdAt) return false;
            const createdAtStr = typeof createdAt === 'string' ? createdAt : createdAt.toISOString();
            const tournamentWeekStart = this.getWeekStart(createdAtStr.split("T")[0]);
            return tournamentWeekStart === weekStart;
        });

        return !thisWeekTournament;
    }

    /**
     * 判断是否需要创建赛季锦标赛
     */
    private static async shouldCreateSeasonalTournament(ctx: any, params: {
        tournamentType: any;
        season: any;
    }) {
        const { tournamentType, season } = params;

        // 检查是否已创建本赛季锦标赛
        const existingTournament = await ctx.db
            .query("tournaments")
            .withIndex("by_type_status", (q: any) =>
                q.eq("tournamentType", tournamentType.typeId)
                    .eq("status", "open")
            )
            .filter((q: any) => q.eq(q.field("seasonId"), season._id))
            .first();

        return !existingTournament;
    }

    /**
     * 创建锦标赛（如果需要）
     */
    private static async createTournamentIfNeeded(ctx: any, params: {
        tournamentType: any;
        season: any;
        player: any;
        now: any;
    }) {
        const { tournamentType, season, player, now } = params;

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
            gameType: tournamentType.defaultConfig?.gameType || "solitaire",
            segmentName: "all", // 对所有段位开放
            status: "open",
            tournamentType: tournamentType.typeId,
            isSubscribedRequired: tournamentType.defaultConfig?.isSubscribedRequired || false,
            isSingleMatch: tournamentType.defaultConfig?.rules?.isSingleMatch || false,
            prizePool: tournamentType.defaultConfig?.entryFee?.coins ? tournamentType.defaultConfig.entryFee.coins * 0.8 : 0,
            config: tournamentType.defaultConfig,
            createdAt: now.iso,
            updatedAt: now.iso,
            endTime: endTime,
        });

        console.log(`成功创建锦标赛 ${tournamentType.typeId}: ${tournamentId}`);

        // 可选：发送通知给所有玩家
        await this.notifyPlayersAboutNewTournament(ctx, {
            tournamentId,
            tournamentType: tournamentType.typeId,
            name: tournamentType.name,
            description: tournamentType.description,
            gameType: tournamentType.defaultConfig?.gameType || "solitaire"
        });
    }

    /**
     * 获取本周开始日期（周一）
     */
    private static getWeekStart(dateStr: string): string {
        const date = new Date(dateStr);
        const day = date.getDay() || 7;
        date.setDate(date.getDate() - (day - 1));
        return date.toISOString().split("T")[0];
    }

    /**
     * 通知玩家新锦标赛
     */
    private static async notifyPlayersAboutNewTournament(ctx: any, params: {
        tournamentId: string;
        tournamentType: string;
        name: string;
        description: string;
        gameType: string;
    }) {
        const now = getTorontoDate();

        try {
            // 获取所有活跃玩家
            const players = await ctx.db
                .query("players")
                .filter((q: any) => q.eq(q.field("isActive"), true))
                .collect();

            // 为每个玩家创建通知
            for (const player of players) {
                await ctx.db.insert("notifications", {
                    uid: player.uid,
                    message: `新的${params.name}已开始！快来参与吧！`,
                    createdAt: now.iso
                });
            }

            console.log(`已通知 ${players.length} 个玩家关于新锦标赛 ${params.tournamentType}`);

        } catch (error) {
            console.error("通知玩家失败:", error);
            // 不抛出错误，避免影响主要流程
        }
    }

    /**
     * 检查锦标赛参赛资格
     */
    private static async checkTournamentEligibility(ctx: any, params: {
        uid: string;
        tournamentType: any;
        player: any;
        inventory: any;
        season: any;
    }) {
        const { uid, tournamentType, player, inventory, season } = params;
        const config = tournamentType.defaultConfig;
        const reasons: string[] = [];

        // 检查段位要求
        if (config.entryRequirements?.minSegment) {
            const segments = ["bronze", "silver", "gold", "platinum", "diamond"];
            const playerIndex = segments.indexOf(player.segmentName);
            const minIndex = segments.indexOf(config.entryRequirements.minSegment);
            if (playerIndex < minIndex) {
                reasons.push(`需要至少 ${config.entryRequirements.minSegment} 段位`);
            }
        }

        if (config.entryRequirements?.maxSegment) {
            const segments = ["bronze", "silver", "gold", "platinum", "diamond"];
            const playerIndex = segments.indexOf(player.segmentName);
            const maxIndex = segments.indexOf(config.entryRequirements.maxSegment);
            if (playerIndex > maxIndex) {
                reasons.push(`段位不能超过 ${config.entryRequirements.maxSegment}`);
            }
        }

        // 检查订阅要求
        if (config.entryRequirements?.isSubscribedRequired && !player.isSubscribed) {
            reasons.push("需要订阅会员");
        }

        // 检查入场费
        const entryFee = config.entryRequirements?.entryFee;
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
        const timeRange = this.getTimeRangeForTournament(tournamentType.typeId);
        const attempts = await this.getPlayerAttempts(ctx, {
            uid,
            tournamentType: tournamentType.typeId,
            gameType: config.gameType,
            timeRange
        });

        const maxAttempts = config.matchRules?.maxAttempts;
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
     * 获取参与统计
     */
    private static async getParticipationStats(ctx: any, params: {
        uid: string;
        tournamentType: string;
        gameType: string;
    }) {
        const { uid, tournamentType, gameType } = params;

        // 根据锦标赛类型确定需要查询的时间范围
        const timeRange = this.getTimeRangeForTournament(tournamentType);

        // 只查询相关的时间范围
        const attempts = await this.getPlayerAttempts(ctx, {
            uid, tournamentType, gameType, timeRange
        });

        // 根据锦标赛类型返回相应的统计
        switch (timeRange) {
            case "daily":
                return {
                    dailyAttempts: attempts,
                    weeklyAttempts: 0, // 不需要查询
                    totalAttempts: 0,   // 不需要查询
                    lastParticipation: null
                };
            case "weekly":
                return {
                    dailyAttempts: 0,   // 不需要查询
                    weeklyAttempts: attempts,
                    totalAttempts: 0,   // 不需要查询
                    lastParticipation: null
                };
            case "seasonal":
                return {
                    dailyAttempts: 0,   // 不需要查询
                    weeklyAttempts: 0,  // 不需要查询
                    totalAttempts: attempts,
                    lastParticipation: null
                };
            case "total":
            default:
                return {
                    dailyAttempts: 0,   // 不需要查询
                    weeklyAttempts: 0,  // 不需要查询
                    totalAttempts: attempts,
                    lastParticipation: null
                };
        }
    }

    /**
     * 获取锦标赛时间范围
     */
    private static getTimeRangeForTournament(tournamentType: string): "daily" | "weekly" | "seasonal" | "total" {
        if (tournamentType.startsWith("daily_")) {
            return "daily";
        } else if (tournamentType.startsWith("weekly_")) {
            return "weekly";
        } else if (tournamentType.startsWith("seasonal_") || tournamentType.startsWith("monthly_")) {
            return "seasonal";
        } else {
            return "total";
        }
    }

    /**
     * 获取玩家尝试次数
     */
    private static async getPlayerAttempts(ctx: any, params: {
        uid: string;
        tournamentType: string;
        gameType: string;
        timeRange?: "daily" | "weekly" | "seasonal" | "total";
    }) {
        const { uid, tournamentType, gameType, timeRange } = params;
        const now = getTorontoDate();
        let startTime: string;

        switch (timeRange) {
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
                const season = await ctx.db
                    .query("seasons")
                    .withIndex("by_isActive", (q: any) => q.eq("isActive", true))
                    .first();
                startTime = season?.startDate || now.localDate.toISOString();
                break;
            case "total":
            default:
                startTime = "1970-01-01T00:00:00.000Z";
                break;
        }

        // 使用player_tournaments关系表查询玩家参与的锦标赛
        const playerTournaments = await ctx.db
            .query("player_tournaments")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .collect();

        // 获取这些锦标赛的详细信息
        const tournamentIds = playerTournaments.map((pt: any) => pt.tournamentId);

        // 如果没有参与的锦标赛，直接返回0
        if (tournamentIds.length === 0) {
            return 0;
        }

        // 分批查询锦标赛，避免查询条件过于复杂
        let totalCount = 0;
        for (const tournamentId of tournamentIds) {
            const tournament = await ctx.db.get(tournamentId);
            if (tournament &&
                tournament.tournamentType === tournamentType &&
                tournament.gameType === gameType &&
                tournament.createdAt >= startTime) {
                totalCount++;
            }
        }

        return totalCount;
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

        // 获取玩家信息
        const player = await ctx.db
            .query("players")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .first();
        if (!player) {
            throw new Error("玩家不存在");
        }

        // 获取玩家库存
        const inventory = await ctx.db
            .query("player_inventory")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .first();

        // 获取当前赛季
        const season = await ctx.db
            .query("seasons")
            .withIndex("by_isActive", (q: any) => q.eq("isActive", true))
            .first();

        // 获取所有活跃的锦标赛类型
        let tournamentTypes = await ctx.db
            .query("tournament_types")
            .filter((q: any) => q.eq(q.field("isActive"), true))
            .collect();

        // 应用过滤条件
        if (gameType) {
            tournamentTypes = tournamentTypes.filter((tt: any) =>
                tt.defaultConfig?.gameType === gameType
            );
        }

        if (category) {
            tournamentTypes = tournamentTypes.filter((tt: any) =>
                tt.category === category
            );
        }

        // 自动创建缺失的锦标赛
        await this.ensureTournamentsExist(ctx, {
            tournamentTypes,
            season,
            player
        });

        const tournamentStatus: any[] = [];

        for (const tournamentType of tournamentTypes) {
            try {
                // 检查参赛资格
                const eligibility = await this.checkTournamentEligibility(ctx, {
                    uid,
                    tournamentType,
                    player,
                    inventory,
                    season
                });

                // 获取参与统计
                const participationStats = await this.getParticipationStats(ctx, {
                    uid,
                    tournamentType: tournamentType.typeId,
                    gameType: tournamentType.defaultConfig?.gameType
                });

                // 获取当前参与的锦标赛
                const currentTournaments = await this.getCurrentParticipations(ctx, {
                    uid,
                    tournamentType: tournamentType.typeId,
                    gameType: tournamentType.defaultConfig?.gameType
                });

                tournamentStatus.push({
                    typeId: tournamentType.typeId,
                    name: tournamentType.name,
                    description: tournamentType.description,
                    category: tournamentType.category,
                    gameType: tournamentType.defaultConfig?.gameType,
                    config: tournamentType.defaultConfig,
                    eligibility,
                    participationStats,
                    currentParticipations: currentTournaments,
                    priority: tournamentType.defaultConfig?.priority || 5,
                    lastUpdated: new Date().toISOString()
                });
            } catch (error) {
                console.error(`获取锦标赛状态失败 (${tournamentType.typeId}):`, error);
                // 继续处理其他锦标赛
            }
        }

        // 按优先级排序
        tournamentStatus.sort((a: any, b: any) => a.priority - b.priority);

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

        // 首先获取所有状态为 open 的锦标赛
        const openTournaments = await ctx.db
            .query("tournaments")
            .filter((q: any) => q.eq(q.field("status"), "open"))
            .filter((q: any) => q.eq(q.field("tournamentType"), tournamentType))
            .filter((q: any) => q.eq(q.field("gameType"), gameType))
            .collect();

        if (openTournaments.length === 0) {
            return [];
        }

        // 获取这些锦标赛的ID列表
        const tournamentIds = openTournaments.map((t: any) => t._id);

        // 查询玩家在这些锦标赛中的参与记录
        const playerTournaments = await ctx.db
            .query("player_tournaments")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .collect();

        // 过滤出玩家参与的开放锦标赛
        const userParticipations = playerTournaments.filter((pt: any) =>
            tournamentIds.includes(pt.tournamentId)
        );

        const currentParticipations: any[] = [];

        for (const pt of userParticipations) {
            const tournament = openTournaments.find((t: any) => t._id === pt.tournamentId);
            if (!tournament) continue;

            // 获取该锦标赛的比赛记录
            const matches = await ctx.db
                .query("matches")
                .withIndex("by_tournament", (q: any) => q.eq("tournamentId", tournament._id))
                .collect();

            // 获取玩家在该锦标赛中的比赛记录
            const playerMatches = await ctx.db
                .query("player_matches")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .collect();

            const tournamentMatches = playerMatches.filter((pm: any) =>
                matches.some((m: any) => m._id === pm.matchId)
            );

            currentParticipations.push({
                tournamentId: tournament._id,
                tournamentName: tournament.tournamentType,
                status: tournament.status,
                joinedAt: pt.joinedAt,
                matchCount: tournamentMatches.length,
                completedMatches: tournamentMatches.filter((m: any) => m.completed).length,
                bestScore: Math.max(...tournamentMatches.map((m: any) => m.score || 0), 0)
            });
        }

        return currentParticipations;
    }

    /**
     * 通知玩家锦标赛变化
     */
    private static async notifyTournamentChanges(ctx: any, params: {
        uid: string;
        changeType: "new_tournament" | "eligibility_change" | "participation_update" | "tournament_completed";
        tournamentType?: string;
        tournamentId?: string;
        data?: any;
    }) {
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

    /**
     * 获取通知消息
     */
    private static getNotificationMessage(changeType: string, data?: any): string {
        switch (changeType) {
            case "new_tournament":
                return `新的锦标赛 "${data?.name || '未知'}" 已开始！`;
            case "eligibility_change":
                return `锦标赛 "${data?.name || '未知'}" 的参与条件已更新`;
            case "participation_update":
                return `您在锦标赛 "${data?.name || '未知'}" 中的状态已更新`;
            case "tournament_completed":
                return `锦标赛 "${data?.name || '未知'}" 已结束，请查看结果！`;
            default:
                return "锦标赛状态已更新";
        }
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
        uid: v.string(),
        gameType: v.optional(v.string()),
        category: v.optional(v.string()),
    },
    handler: async (ctx: any, args: any) => {
        const result = await TournamentService.getPlayerTournamentStatus(ctx, args);
        return result;
    },
}); 