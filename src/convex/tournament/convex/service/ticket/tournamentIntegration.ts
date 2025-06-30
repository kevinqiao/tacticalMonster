import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { getTorontoDate } from "../utils";
import { TicketSystem } from "./ticketSystem";

// 门票与锦标赛集成系统
export class TournamentTicketIntegration {

    /**
     * 验证玩家是否可以参加锦标赛
     */
    static async validateTournamentEntry({
        ctx,
        uid,
        gameType,
        tournamentId,
        ticketId
    }: {
        ctx: any;
        uid: string;
        gameType: string;
        tournamentId: string;
        ticketId: string;
    }) {
        const now = getTorontoDate();

        try {
            // 1. 获取门票信息
            const ticket = await ctx.db.get(ticketId);
            if (!ticket) {
                return {
                    valid: false,
                    reason: "门票不存在"
                };
            }

            if (ticket.uid !== uid) {
                return {
                    valid: false,
                    reason: "门票不属于该玩家"
                };
            }

            // 2. 获取玩家段位信息
            const playerSegment = await ctx.db
                .query("player_segments")
                .withIndex("by_uid_game", (q: any) => q.eq("uid", uid).eq("gameType", gameType))
                .first();

            if (!playerSegment) {
                return {
                    valid: false,
                    reason: "玩家段位信息不存在"
                };
            }

            // 3. 获取锦标赛信息
            const tournament = await ctx.db
                .query("tournaments")
                .withIndex("by_tournament_id", (q: any) => q.eq("tournamentId", tournamentId))
                .first();

            if (!tournament) {
                return {
                    valid: false,
                    reason: "锦标赛不存在"
                };
            }

            // 4. 验证门票有效性
            const playerMS = playerSegment.points || 0;
            const playerELO = playerSegment.elo || 1000;

            const ticketValidation = TicketSystem.validateTicket({
                ticket,
                playerMS,
                playerSegment: playerSegment.segment,
                playerELO,
                currentDate: now.iso
            });

            if (!ticketValidation.valid) {
                return {
                    valid: false,
                    reason: ticketValidation.reason
                };
            }

            // 5. 检查锦标赛是否适用该门票类型
            const ticketConfig = TicketSystem.TICKET_TYPES[ticket.ticketType.toUpperCase() as keyof typeof TicketSystem.TICKET_TYPES];
            if (!ticketConfig) {
                return {
                    valid: false,
                    reason: "无效门票类型"
                };
            }

            const tournamentType = tournament.tournamentType || "基础";
            if (!ticketConfig.tournaments.includes(tournamentType)) {
                return {
                    valid: false,
                    reason: `该门票不适用于${tournamentType}锦标赛`
                };
            }

            // 6. 检查锦标赛是否已满员
            const currentParticipants = tournament.currentParticipants || 0;
            const maxParticipants = tournament.maxParticipants || 100;

            if (currentParticipants >= maxParticipants) {
                return {
                    valid: false,
                    reason: "锦标赛已满员"
                };
            }

            // 7. 检查玩家是否已参加该锦标赛
            const existingParticipation = await ctx.db
                .query("tournament_participants")
                .withIndex("by_uid_tournament", (q: any) => q.eq("uid", uid).eq("tournamentId", tournamentId))
                .first();

            if (existingParticipation) {
                return {
                    valid: false,
                    reason: "玩家已参加该锦标赛"
                };
            }

            return {
                valid: true,
                reason: "验证通过",
                ticket,
                tournament,
                playerInfo: {
                    ms: playerMS,
                    segment: playerSegment.segment,
                    elo: playerELO
                }
            };

        } catch (error: any) {
            return {
                valid: false,
                reason: `验证失败: ${error.message}`
            };
        }
    }

    /**
     * 使用门票参加锦标赛
     */
    static async joinTournamentWithTicket({
        ctx,
        uid,
        gameType,
        tournamentId,
        ticketId
    }: {
        ctx: any;
        uid: string;
        gameType: string;
        tournamentId: string;
        ticketId: string;
    }) {
        const now = getTorontoDate();

        try {
            // 1. 验证参赛资格
            const validation = await this.validateTournamentEntry({
                ctx,
                uid,
                gameType,
                tournamentId,
                ticketId
            });

            if (!validation.valid) {
                return {
                    success: false,
                    error: validation.reason
                };
            }

            const { ticket, tournament, playerInfo } = validation;

            // 2. 使用门票
            const useResult = TicketSystem.useTicket({
                ticketId,
                tournamentId,
                uid,
                gameType
            });

            // 3. 更新门票状态
            await ctx.db.patch(ticketId, {
                isUsed: true,
                usedAt: useResult.usedAt,
                tournamentId: tournamentId
            });

            // 4. 记录门票使用日志
            await ctx.db.insert("ticket_usage_logs", {
                ticketId,
                uid,
                gameType,
                tournamentId,
                usedAt: useResult.usedAt,
                playerMS: playerInfo?.ms,
                playerSegment: playerInfo?.segment,
                playerELO: playerInfo?.elo,
                eligibilityCheck: {
                    msEligible: true,
                    segmentEligible: true,
                    eloEligible: true,
                    overallEligible: true
                },
                rewardInfo: {
                    baseReward: tournament.baseReward || 100,
                    ticketMultiplier: TicketSystem.getTicketRewardMultiplier(ticket.ticketType),
                    performanceMultiplier: 1.0,
                    finalReward: (tournament.baseReward || 100) * TicketSystem.getTicketRewardMultiplier(ticket.ticketType)
                },
                createdAt: now.iso
            });

            // 5. 添加玩家到锦标赛参与者
            const participantId = await ctx.db.insert("tournament_participants", {
                uid,
                tournamentId,
                gameType,
                ticketId,
                ticketType: ticket.ticketType,
                playerMS: playerInfo?.ms,
                playerSegment: playerInfo?.segment,
                playerELO: playerInfo?.elo,
                joinedAt: now.iso,
                isActive: true,
                createdAt: now.iso
            });

            // 6. 更新锦标赛参与人数
            await ctx.db.patch(tournament._id, {
                currentParticipants: (tournament.currentParticipants || 0) + 1
            });

            // 7. 更新门票统计
            await this.updateTicketStatistics(ctx, uid, gameType);

            return {
                success: true,
                participantId,
                ticketId,
                tournamentId,
                message: "成功使用门票参加锦标赛",
                rewardMultiplier: TicketSystem.getTicketRewardMultiplier(ticket.ticketType)
            };

        } catch (error: any) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 处理锦标赛结果和奖励分配
     */
    static async processTournamentResult({
        ctx,
        tournamentId,
        participantId,
        result,
        performance
    }: {
        ctx: any;
        tournamentId: string;
        participantId: string;
        result: "win" | "lose" | "draw";
        performance: number;
    }) {
        const now = getTorontoDate();

        try {
            // 1. 获取参与者信息
            const participant = await ctx.db.get(participantId);
            if (!participant) {
                return {
                    success: false,
                    error: "参与者信息不存在"
                };
            }

            // 2. 获取门票信息
            const ticket = await ctx.db.get(participant.ticketId);
            if (!ticket) {
                return {
                    success: false,
                    error: "门票信息不存在"
                };
            }

            // 3. 获取锦标赛信息
            const tournament = await ctx.db.get(tournamentId);
            if (!tournament) {
                return {
                    success: false,
                    error: "锦标赛信息不存在"
                };
            }

            // 4. 计算奖励
            const baseReward = tournament.baseReward || 100;
            const ticketMultiplier = TicketSystem.getTicketRewardMultiplier(ticket.ticketType);
            const performanceMultiplier = this.calculatePerformanceMultiplier(performance);
            const finalReward = Math.round(baseReward * ticketMultiplier * performanceMultiplier);

            // 5. 更新参与者结果
            await ctx.db.patch(participantId, {
                result,
                performance,
                reward: finalReward,
                completedAt: now.iso
            });

            // 6. 记录奖励分配
            await ctx.db.insert("tournament_rewards", {
                tournamentId,
                participantId,
                uid: participant.uid,
                ticketId: participant.ticketId,
                ticketType: ticket.ticketType,
                baseReward,
                ticketMultiplier,
                performanceMultiplier,
                finalReward,
                result,
                performance,
                distributedAt: now.iso,
                createdAt: now.iso
            });

            // 7. 更新玩家段位和积分
            await this.updatePlayerStats(ctx, participant.uid, participant.gameType, result, finalReward);

            return {
                success: true,
                reward: finalReward,
                ticketMultiplier,
                performanceMultiplier,
                message: "锦标赛结果处理完成"
            };

        } catch (error: any) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 计算表现倍数
     */
    private static calculatePerformanceMultiplier(performance: number): number {
        if (performance >= 90) return 1.5; // 优秀表现
        if (performance >= 80) return 1.3; // 良好表现
        if (performance >= 70) return 1.1; // 一般表现
        if (performance >= 60) return 1.0; // 及格表现
        return 0.8; // 不及格表现
    }

    /**
     * 更新玩家统计
     */
    private static async updatePlayerStats(
        ctx: any,
        uid: string,
        gameType: string,
        result: "win" | "lose" | "draw",
        reward: number
    ) {
        const now = getTorontoDate();

        // 获取玩家段位信息
        const playerSegment = await ctx.db
            .query("player_segments")
            .withIndex("by_uid_game", (q: any) => q.eq("uid", uid).eq("gameType", gameType))
            .first();

        if (playerSegment) {
            // 计算积分变化
            let pointsChange = 0;
            switch (result) {
                case "win":
                    pointsChange = 50 + Math.floor(reward / 10);
                    break;
                case "draw":
                    pointsChange = 10 + Math.floor(reward / 20);
                    break;
                case "lose":
                    pointsChange = -20 + Math.floor(reward / 30);
                    break;
            }

            // 更新积分
            const newPoints = Math.max(0, (playerSegment.points || 0) + pointsChange);
            await ctx.db.patch(playerSegment._id, {
                points: newPoints,
                lastUpdated: now.iso
            });

            // 记录积分变化
            await ctx.db.insert("segment_changes", {
                uid,
                gameType,
                oldSegment: playerSegment.segment,
                newSegment: playerSegment.segment, // 段位变化逻辑在段位系统中处理
                oldPoints: playerSegment.points || 0,
                newPoints,
                pointsChange,
                reason: `锦标赛${result}`,
                createdAt: now.iso
            });
        }
    }

    /**
     * 更新门票统计
     */
    private static async updateTicketStatistics(ctx: any, uid: string, gameType: string) {
        const tickets = await ctx.db
            .query("tickets")
            .withIndex("by_uid_game", (q: any) => q.eq("uid", uid).eq("gameType", gameType))
            .collect();

        const now = getTorontoDate();
        const statistics = TicketSystem.getTicketStatistics({ uid, gameType });

        // 统计门票
        tickets.forEach((ticket: any) => {
            statistics.totalTickets++;
            statistics.ticketTypes[ticket.ticketType as keyof typeof statistics.ticketTypes].total++;

            if (ticket.isUsed) {
                statistics.usedTickets++;
                statistics.ticketTypes[ticket.ticketType as keyof typeof statistics.ticketTypes].used++;
            } else {
                const expiryDate = new Date(ticket.expiryDate);
                const current = new Date(now.iso);

                if (current > expiryDate) {
                    statistics.expiredTickets++;
                } else {
                    statistics.availableTickets++;
                    statistics.ticketTypes[ticket.ticketType as keyof typeof statistics.ticketTypes].available++;
                }
            }
        });

        // 更新统计表
        const existingStats = await ctx.db
            .query("ticket_statistics")
            .withIndex("by_uid_game", (q: any) => q.eq("uid", uid).eq("gameType", gameType))
            .first();

        if (existingStats) {
            await ctx.db.patch(existingStats._id, {
                ...statistics,
                lastUpdated: now.iso
            });
        } else {
            await ctx.db.insert("ticket_statistics", {
                uid,
                gameType,
                ...statistics,
                lastUpdated: now.iso
            });
        }
    }

    /**
     * 获取玩家可参加的锦标赛
     */
    static async getAvailableTournaments({
        ctx,
        uid,
        gameType
    }: {
        ctx: any;
        uid: string;
        gameType: string;
    }) {
        try {
            // 1. 获取玩家信息
            const playerSegment = await ctx.db
                .query("player_segments")
                .withIndex("by_uid_game", (q: any) => q.eq("uid", uid).eq("gameType", gameType))
                .first();

            if (!playerSegment) {
                return {
                    success: false,
                    error: "玩家段位信息不存在"
                };
            }

            const playerMS = playerSegment.points || 0;
            const playerELO = playerSegment.elo || 1000;

            // 2. 获取可用门票类型
            const availableTicketTypes = TicketSystem.getAvailableTicketTypes({
                playerMS,
                playerSegment: playerSegment.segment,
                playerELO
            });

            // 3. 获取活跃锦标赛
            const activeTournaments = await ctx.db
                .query("tournaments")
                .withIndex("by_is_active", (q: any) => q.eq("isActive", true))
                .collect();

            // 4. 过滤适用的锦标赛
            const applicableTournaments = activeTournaments.filter((tournament: any) => {
                const tournamentType = tournament.tournamentType || "基础";
                return availableTicketTypes.availableTickets.some((ticket: any) =>
                    ticket.tournaments.includes(tournamentType)
                );
            });

            // 5. 获取玩家门票
            const playerTickets = await ctx.db
                .query("tickets")
                .withIndex("by_uid_game", (q: any) => q.eq("uid", uid).eq("gameType", gameType))
                .collect();

            const availableTickets = playerTickets.filter((ticket: any) => !ticket.isUsed);

            return {
                success: true,
                availableTournaments: applicableTournaments,
                availableTickets,
                playerInfo: {
                    ms: playerMS,
                    segment: playerSegment.segment,
                    elo: playerELO
                }
            };

        } catch (error: any) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// ===== Convex 函数接口 =====

// 验证锦标赛参赛资格
export const validateTournamentEntry = (mutation as any)({
    args: {
        uid: v.string(),
        gameType: v.string(),
        tournamentId: v.string(),
        ticketId: v.string()
    },
    handler: async (ctx: any, args: any) => {
        return await TournamentTicketIntegration.validateTournamentEntry({
            ctx,
            ...args
        });
    }
});

// 使用门票参加锦标赛
export const joinTournamentWithTicket = (mutation as any)({
    args: {
        uid: v.string(),
        gameType: v.string(),
        tournamentId: v.string(),
        ticketId: v.string()
    },
    handler: async (ctx: any, args: any) => {
        return await TournamentTicketIntegration.joinTournamentWithTicket({
            ctx,
            ...args
        });
    }
});

// 处理锦标赛结果
export const processTournamentResult = (mutation as any)({
    args: {
        tournamentId: v.string(),
        participantId: v.string(),
        result: v.string(),
        performance: v.number()
    },
    handler: async (ctx: any, args: any) => {
        return await TournamentTicketIntegration.processTournamentResult({
            ctx,
            tournamentId: args.tournamentId,
            participantId: args.participantId,
            result: args.result as "win" | "lose" | "draw",
            performance: args.performance
        });
    }
});

// 获取可参加的锦标赛
export const getAvailableTournaments = (query as any)({
    args: {
        uid: v.string(),
        gameType: v.string()
    },
    handler: async (ctx: any, args: any) => {
        return await TournamentTicketIntegration.getAvailableTournaments({
            ctx,
            ...args
        });
    }
});

// 获取玩家锦标赛历史
export const getPlayerTournamentHistory = (query as any)({
    args: {
        uid: v.string(),
        gameType: v.string(),
        limit: v.optional(v.number())
    },
    handler: async (ctx: any, args: any) => {
        const { uid, gameType, limit = 50 } = args;

        try {
            const history = await ctx.db
                .query("tournament_participants")
                .withIndex("by_uid_game", (q: any) => q.eq("uid", uid).eq("gameType", gameType))
                .order("desc")
                .take(limit);

            return {
                success: true,
                history
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message
            };
        }
    }
});

// 获取锦标赛门票使用统计
export const getTournamentTicketStats = (query as any)({
    args: {
        tournamentId: v.string()
    },
    handler: async (ctx: any, args: any) => {
        const { tournamentId } = args;

        try {
            // 获取该锦标赛的所有门票使用记录
            const ticketUsage = await ctx.db
                .query("ticket_usage_logs")
                .withIndex("by_tournament_id", (q: any) => q.eq("tournamentId", tournamentId))
                .collect();

            // 统计各类型门票使用情况
            const ticketStats = {
                totalTickets: ticketUsage.length,
                ticketTypes: {} as any,
                totalReward: 0
            };

            ticketUsage.forEach((usage: any) => {
                const ticketType = usage.ticketType;
                if (!ticketStats.ticketTypes[ticketType]) {
                    ticketStats.ticketTypes[ticketType] = {
                        count: 0,
                        totalReward: 0
                    };
                }
                ticketStats.ticketTypes[ticketType].count++;
                ticketStats.ticketTypes[ticketType].totalReward += usage.rewardInfo?.finalReward || 0;
                ticketStats.totalReward += usage.rewardInfo?.finalReward || 0;
            });

            return {
                success: true,
                tournamentId,
                stats: ticketStats
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}); 