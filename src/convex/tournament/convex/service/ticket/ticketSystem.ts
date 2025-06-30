// @ts-nocheck
import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { getTorontoDate } from "../utils";

// 门票系统 - 分级匹配
export class TicketSystem {

    /**
     * 门票类型定义
     */
    static readonly TICKET_TYPES = {
        // 普通门票
        NORMAL: {
            id: "normal",
            name: "普通门票",
            description: "基础锦标赛门票",
            tournaments: ["基础", "进阶", "白银赛季"],
            msRequirement: { min: 0, max: 399 },
            segmentRequirement: ["bronze", "silver"],
            eloRequirement: { min: 800, max: 1200 },
            targetAudience: "新手/休闲玩家",
            rewardMultiplier: 1.0
        },

        // 高级门票
        ADVANCED: {
            id: "advanced",
            name: "高级门票",
            description: "高级锦标赛门票",
            tournaments: ["高级", "精英", "黄金赛季"],
            msRequirement: { min: 400, max: 699 },
            segmentRequirement: ["gold", "platinum", "diamond"],
            eloRequirement: { min: 1200, max: 1600 },
            targetAudience: "中高级段位玩家",
            rewardMultiplier: 1.5
        },

        // 活动门票
        EVENT: {
            id: "event",
            name: "活动门票",
            description: "活动锦标赛门票",
            tournaments: ["活动", "钻石赛季", "大师赛季"],
            msRequirement: { min: 700, max: 999 },
            segmentRequirement: ["diamond", "master"],
            eloRequirement: { min: 1400, max: 9999 },
            targetAudience: "高段位玩家",
            rewardMultiplier: 2.0
        },

        // 专属门票
        MASTER_EXCLUSIVE: {
            id: "master_exclusive",
            name: "大师专属门票",
            description: "大师专属锦标赛门票",
            tournaments: ["大师专属"],
            msRequirement: { min: 1000, max: 9999 },
            segmentRequirement: ["master"],
            eloRequirement: { min: 1400, max: 9999 },
            targetAudience: "仅大师段位",
            rewardMultiplier: 3.0
        },

        ELITE_EXCLUSIVE: {
            id: "elite_exclusive",
            name: "精英专属门票",
            description: "精英专属锦标赛门票",
            tournaments: ["精英专属"],
            msRequirement: { min: 400, max: 9999 },
            segmentRequirement: ["gold", "platinum", "diamond", "master"],
            eloRequirement: { min: 1200, max: 9999 },
            targetAudience: "黄金I+段位",
            rewardMultiplier: 2.5
        },

        SEASON_EXCLUSIVE: {
            id: "season_exclusive",
            name: "赛季专属门票",
            description: "赛季专属锦标赛门票",
            tournaments: ["钻石赛季", "大师赛季"],
            msRequirement: { min: 700, max: 9999 },
            segmentRequirement: ["diamond", "master"],
            eloRequirement: { min: 1400, max: 9999 },
            targetAudience: "钻石+段位",
            rewardMultiplier: 2.5
        }
    };

    /**
     * 检查玩家门票资格
     */
    static checkTicketEligibility({
        ticketType,
        playerMS,
        playerSegment,
        playerELO
    }: {
        ticketType: string;
        playerMS: number;
        playerSegment: string;
        playerELO: number;
    }) {
        const ticketConfig = this.TICKET_TYPES[ticketType.toUpperCase()];

        if (!ticketConfig) {
            return {
                eligible: false,
                reason: "无效门票类型"
            };
        }

        // 检查MS要求
        const msEligible = playerMS >= ticketConfig.msRequirement.min &&
            playerMS <= ticketConfig.msRequirement.max;

        // 检查段位要求
        const segmentEligible = ticketConfig.segmentRequirement.includes(playerSegment);

        // 检查ELO要求
        const eloEligible = playerELO >= ticketConfig.eloRequirement.min &&
            playerELO <= ticketConfig.eloRequirement.max;

        const eligible = msEligible && segmentEligible && eloEligible;

        return {
            eligible,
            msEligible,
            segmentEligible,
            eloEligible,
            ticketConfig,
            reason: eligible ? "符合所有要求" : this.getEligibilityReason({
                msEligible,
                segmentEligible,
                eloEligible,
                playerMS,
                playerSegment,
                playerELO,
                ticketConfig
            })
        };
    }

    /**
     * 获取资格检查原因
     */
    private static getEligibilityReason({
        msEligible,
        segmentEligible,
        eloEligible,
        playerMS,
        playerSegment,
        playerELO,
        ticketConfig
    }: {
        msEligible: boolean;
        segmentEligible: boolean;
        eloEligible: boolean;
        playerMS: number;
        playerSegment: string;
        playerELO: number;
        ticketConfig: any;
    }): string {
        if (!msEligible) {
            return `MS要求不满足：需要${ticketConfig.msRequirement.min}-${ticketConfig.msRequirement.max}，当前${playerMS}`;
        }
        if (!segmentEligible) {
            return `段位要求不满足：需要${ticketConfig.segmentRequirement.join('/')}，当前${playerSegment}`;
        }
        if (!eloEligible) {
            return `ELO要求不满足：需要${ticketConfig.eloRequirement.min}-${ticketConfig.eloRequirement.max}，当前${playerELO}`;
        }
        return "符合所有要求";
    }

    /**
     * 获取玩家可用的门票类型
     */
    static getAvailableTicketTypes({
        playerMS,
        playerSegment,
        playerELO
    }: {
        playerMS: number;
        playerSegment: string;
        playerELO: number;
    }) {
        const availableTickets = [];

        for (const [type, config] of Object.entries(this.TICKET_TYPES)) {
            const eligibility = this.checkTicketEligibility({
                ticketType: config.id,
                playerMS,
                playerSegment,
                playerELO
            });

            if (eligibility.eligible) {
                availableTickets.push({
                    type: config.id,
                    name: config.name,
                    description: config.description,
                    tournaments: config.tournaments,
                    targetAudience: config.targetAudience,
                    rewardMultiplier: config.rewardMultiplier
                });
            }
        }

        return {
            availableTickets,
            totalCount: availableTickets.length,
            playerInfo: {
                ms: playerMS,
                segment: playerSegment,
                elo: playerELO
            }
        };
    }

    /**
     * 创建门票
     */
    static createTicket({
        ticketType,
        uid,
        gameType,
        expiryDate
    }: {
        ticketType: string;
        uid: string;
        gameType: string;
        expiryDate?: string;
    }) {
        const ticketConfig = this.TICKET_TYPES[ticketType.toUpperCase()];

        if (!ticketConfig) {
            throw new Error("无效门票类型");
        }

        const now = getTorontoDate();
        const defaultExpiry = new Date(now.date);
        defaultExpiry.setDate(defaultExpiry.getDate() + 30); // 默认30天有效期

        return {
            id: `${ticketType}_${uid}_${Date.now()}`,
            ticketType: ticketConfig.id,
            name: ticketConfig.name,
            uid,
            gameType,
            createdAt: now.iso,
            expiryDate: expiryDate || defaultExpiry.toISOString(),
            isUsed: false,
            usedAt: null,
            tournamentId: null,
            config: {
                tournaments: ticketConfig.tournaments,
                msRequirement: ticketConfig.msRequirement,
                segmentRequirement: ticketConfig.segmentRequirement,
                eloRequirement: ticketConfig.eloRequirement,
                rewardMultiplier: ticketConfig.rewardMultiplier
            }
        };
    }

    /**
     * 使用门票
     */
    static useTicket({
        ticketId,
        tournamentId,
        uid,
        gameType
    }: {
        ticketId: string;
        tournamentId: string;
        uid: string;
        gameType: string;
    }) {
        const now = getTorontoDate();

        return {
            ticketId,
            tournamentId,
            uid,
            gameType,
            usedAt: now.iso,
            isUsed: true,
            message: "门票使用成功"
        };
    }

    /**
     * 验证门票有效性
     */
    static validateTicket({
        ticket,
        playerMS,
        playerSegment,
        playerELO,
        currentDate
    }: {
        ticket: any;
        playerMS: number;
        playerSegment: string;
        playerELO: number;
        currentDate: string;
    }) {
        // 检查是否已使用
        if (ticket.isUsed) {
            return {
                valid: false,
                reason: "门票已使用"
            };
        }

        // 检查是否过期
        const expiryDate = new Date(ticket.expiryDate);
        const current = new Date(currentDate);
        if (current > expiryDate) {
            return {
                valid: false,
                reason: "门票已过期"
            };
        }

        // 检查玩家资格
        const eligibility = this.checkTicketEligibility({
            ticketType: ticket.ticketType,
            playerMS,
            playerSegment,
            playerELO
        });

        if (!eligibility.eligible) {
            return {
                valid: false,
                reason: eligibility.reason
            };
        }

        return {
            valid: true,
            reason: "门票有效",
            eligibility
        };
    }

    /**
     * 获取门票奖励倍数
     */
    static getTicketRewardMultiplier(ticketType: string): number {
        const ticketConfig = this.TICKET_TYPES[ticketType.toUpperCase()];
        return ticketConfig ? ticketConfig.rewardMultiplier : 1.0;
    }

    /**
     * 计算门票锦标赛奖励
     */
    static calculateTicketTournamentReward({
        baseReward,
        ticketType,
        playerPerformance
    }: {
        baseReward: number;
        ticketType: string;
        playerPerformance: "win" | "lose" | "draw";
    }) {
        const multiplier = this.getTicketRewardMultiplier(ticketType);
        const performanceMultiplier = {
            win: 1.0,
            draw: 0.5,
            lose: 0.1
        };

        return Math.round(baseReward * multiplier * performanceMultiplier[playerPerformance]);
    }

    /**
     * 获取门票统计信息
     */
    static getTicketStatistics({
        uid,
        gameType
    }: {
        uid: string;
        gameType: string;
    }) {
        return {
            totalTickets: 0,
            usedTickets: 0,
            availableTickets: 0,
            expiredTickets: 0,
            ticketTypes: {
                normal: { total: 0, used: 0, available: 0 },
                advanced: { total: 0, used: 0, available: 0 },
                event: { total: 0, used: 0, available: 0 },
                master_exclusive: { total: 0, used: 0, available: 0 },
                elite_exclusive: { total: 0, used: 0, available: 0 },
                season_exclusive: { total: 0, used: 0, available: 0 }
            }
        };
    }
}

// ===== Convex 函数接口 =====

// 检查门票资格
export const checkTicketEligibility = (mutation as any)({
    args: {
        ticketType: v.string(),
        uid: v.string(),
        gameType: v.string()
    },
    handler: async (ctx: any, args: any) => {
        const { ticketType, uid, gameType } = args;

        // 获取玩家信息
        const playerSegment = await ctx.db
            .query("player_segments")
            .withIndex("by_uid_game", (q: any) => q.eq("uid", uid).eq("gameType", gameType))
            .first();

        if (!playerSegment) {
            throw new Error("玩家段位信息不存在");
        }

        // 获取玩家MS和ELO（这里需要根据实际数据结构调整）
        const playerMS = playerSegment.points || 0; // 假设MS存储在points字段
        const playerELO = playerSegment.elo || 1000; // 假设ELO字段

        const eligibility = TicketSystem.checkTicketEligibility({
            ticketType,
            playerMS,
            playerSegment: playerSegment.segment,
            playerELO
        });

        // 记录资格检查日志
        const now = getTorontoDate();
        await ctx.db.insert("ticket_eligibility_logs", {
            uid,
            gameType,
            ticketType,
            playerMS,
            playerSegment: playerSegment.segment,
            playerELO,
            eligibilityResult: {
                eligible: eligibility.eligible,
                msEligible: eligibility.msEligible,
                segmentEligible: eligibility.segmentEligible,
                eloEligible: eligibility.eloEligible,
                reason: eligibility.reason
            },
            checkedAt: now.iso
        });

        return {
            success: true,
            eligibility,
            playerInfo: {
                ms: playerMS,
                segment: playerSegment.segment,
                elo: playerELO
            }
        };
    }
});

// 获取可用门票类型
export const getAvailableTicketTypes = (query as any)({
    args: {
        uid: v.string(),
        gameType: v.string()
    },
    handler: async (ctx: any, args: any) => {
        const { uid, gameType } = args;

        // 获取玩家信息
        const playerSegment = await ctx.db
            .query("player_segments")
            .withIndex("by_uid_game", (q: any) => q.eq("uid", uid).eq("gameType", gameType))
            .first();

        if (!playerSegment) {
            throw new Error("玩家段位信息不存在");
        }

        const playerMS = playerSegment.points || 0;
        const playerELO = playerSegment.elo || 1000;

        const availableTickets = TicketSystem.getAvailableTicketTypes({
            playerMS,
            playerSegment: playerSegment.segment,
            playerELO
        });

        // 生成推荐门票
        const now = getTorontoDate();
        const recommendedTickets = availableTickets.availableTickets.map((ticket: any, index: number) => ({
            ticketType: ticket.type,
            name: ticket.name,
            description: ticket.description,
            reason: `符合${ticket.targetAudience}要求`,
            priority: 10 - index // 优先级递减
        }));

        // 保存推荐记录
        await ctx.db.insert("ticket_recommendations", {
            uid,
            gameType,
            recommendedTickets,
            playerMS,
            playerSegment: playerSegment.segment,
            playerELO,
            recommendedAt: now.iso,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24小时后过期
        });

        return {
            success: true,
            availableTickets
        };
    }
});

// 创建门票
export const createTicket = (mutation as any)({
    args: {
        ticketType: v.string(),
        uid: v.string(),
        gameType: v.string(),
        expiryDate: v.optional(v.string())
    },
    handler: async (ctx: any, args: any) => {
        const { ticketType, uid, gameType, expiryDate } = args;
        const now = getTorontoDate();

        try {
            const ticket = TicketSystem.createTicket({
                ticketType,
                uid,
                gameType,
                expiryDate
            });

            // 保存门票到数据库
            const ticketId = await ctx.db.insert("tickets", {
                ...ticket,
                createdAt: now.iso
            });

            // 更新门票统计
            await updateTicketStatistics(ctx, uid, gameType);

            return {
                success: true,
                ticketId,
                ticket,
                message: "门票创建成功"
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message
            };
        }
    }
});

// 使用门票
export const useTicket = (mutation as any)({
    args: {
        ticketId: v.string(),
        tournamentId: v.string(),
        uid: v.string(),
        gameType: v.string()
    },
    handler: async (ctx: any, args: any) => {
        const { ticketId, tournamentId, uid, gameType } = args;
        const now = getTorontoDate();

        try {
            // 获取门票
            const ticket = await ctx.db.get(ticketId);
            if (!ticket) {
                throw new Error("门票不存在");
            }

            // 验证门票
            const playerSegment = await ctx.db
                .query("player_segments")
                .withIndex("by_uid_game", (q: any) => q.eq("uid", uid).eq("gameType", gameType))
                .first();

            if (!playerSegment) {
                throw new Error("玩家段位信息不存在");
            }

            const playerMS = playerSegment.points || 0;
            const playerELO = playerSegment.elo || 1000;

            const validation = TicketSystem.validateTicket({
                ticket,
                playerMS,
                playerSegment: playerSegment.segment,
                playerELO,
                currentDate: now.iso
            });

            if (!validation.valid) {
                throw new Error(validation.reason);
            }

            // 使用门票
            const useResult = TicketSystem.useTicket({
                ticketId,
                tournamentId,
                uid,
                gameType
            });

            // 更新门票状态
            await ctx.db.patch(ticketId, {
                isUsed: true,
                usedAt: useResult.usedAt,
                tournamentId: tournamentId
            });

            // 记录使用日志
            await ctx.db.insert("ticket_usage_logs", {
                ticketId,
                uid,
                gameType,
                tournamentId,
                usedAt: useResult.usedAt,
                playerMS,
                playerSegment: playerSegment.segment,
                playerELO,
                eligibilityCheck: {
                    msEligible: validation.eligibility.msEligible,
                    segmentEligible: validation.eligibility.segmentEligible,
                    eloEligible: validation.eligibility.eloEligible,
                    overallEligible: validation.eligibility.eligible
                },
                rewardInfo: {
                    baseReward: 100, // 基础奖励
                    ticketMultiplier: TicketSystem.getTicketRewardMultiplier(ticket.ticketType),
                    performanceMultiplier: 1.0, // 默认表现倍数
                    finalReward: 100 * TicketSystem.getTicketRewardMultiplier(ticket.ticketType)
                },
                createdAt: now.iso
            });

            // 更新门票统计
            await updateTicketStatistics(ctx, uid, gameType);

            return {
                success: true,
                useResult,
                message: "门票使用成功"
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message
            };
        }
    }
});

// 获取门票统计
export const getTicketStatistics = (query as any)({
    args: {
        uid: v.string(),
        gameType: v.string()
    },
    handler: async (ctx: any, args: any) => {
        const { uid, gameType } = args;

        try {
            // 获取玩家所有门票
            const tickets = await ctx.db
                .query("tickets")
                .withIndex("by_uid_game", (q: any) => q.eq("uid", uid).eq("gameType", gameType))
                .collect();

            const now = getTorontoDate();
            const statistics = TicketSystem.getTicketStatistics({ uid, gameType });

            // 统计门票
            tickets.forEach((ticket: any) => {
                statistics.totalTickets++;
                statistics.ticketTypes[ticket.ticketType].total++;

                if (ticket.isUsed) {
                    statistics.usedTickets++;
                    statistics.ticketTypes[ticket.ticketType].used++;
                } else {
                    const expiryDate = new Date(ticket.expiryDate);
                    const current = new Date(now.iso);

                    if (current > expiryDate) {
                        statistics.expiredTickets++;
                    } else {
                        statistics.availableTickets++;
                        statistics.ticketTypes[ticket.ticketType].available++;
                    }
                }
            });

            // 更新统计表
            await updateTicketStatisticsTable(ctx, uid, gameType, statistics);

            return {
                success: true,
                statistics
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message
            };
        }
    }
});

// 获取门票系统规则
export const getTicketSystemRules = (query as any)({
    args: {},
    handler: async (ctx: any) => {
        return {
            success: true,
            rules: {
                ticketTypes: TicketSystem.TICKET_TYPES,
                matchingCriteria: {
                    ms: "匹配分数要求",
                    segment: "段位要求",
                    elo: "ELO等级要求"
                },
                tournaments: {
                    normal: ["基础", "进阶", "白银赛季"],
                    advanced: ["高级", "精英", "黄金赛季"],
                    event: ["活动", "钻石赛季", "大师赛季"],
                    exclusive: ["大师专属", "精英专属", "赛季专属"]
                }
            }
        };
    }
});

// 创建门票活动
export const createTicketEvent = (mutation as any)({
    args: {
        eventId: v.string(),
        eventName: v.string(),
        eventDescription: v.string(),
        eventType: v.string(),
        requiredTicketType: v.string(),
        startTime: v.string(),
        endTime: v.string(),
        maxParticipants: v.number(),
        baseReward: v.number(),
        bonusMultiplier: v.number()
    },
    handler: async (ctx: any, args: any) => {
        const now = getTorontoDate();

        try {
            const eventId = await ctx.db.insert("ticket_events", {
                ...args,
                isActive: true,
                currentParticipants: 0,
                rewards: {
                    baseReward: args.baseReward,
                    bonusMultiplier: args.bonusMultiplier,
                    specialRewards: []
                },
                createdAt: now.iso
            });

            return {
                success: true,
                eventId,
                message: "门票活动创建成功"
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message
            };
        }
    }
});

// 参与门票活动
export const joinTicketEvent = (mutation as any)({
    args: {
        eventId: v.string(),
        uid: v.string(),
        gameType: v.string(),
        ticketId: v.string()
    },
    handler: async (ctx: any, args: any) => {
        const { eventId, uid, gameType, ticketId } = args;
        const now = getTorontoDate();

        try {
            // 获取活动信息
            const event = await ctx.db.get(eventId);
            if (!event) {
                throw new Error("活动不存在");
            }

            if (!event.isActive) {
                throw new Error("活动已结束");
            }

            if (event.currentParticipants >= event.maxParticipants) {
                throw new Error("活动人数已满");
            }

            // 获取门票信息
            const ticket = await ctx.db.get(ticketId);
            if (!ticket || ticket.uid !== uid) {
                throw new Error("门票不存在或不属于该玩家");
            }

            if (ticket.isUsed) {
                throw new Error("门票已使用");
            }

            // 检查门票类型是否匹配
            if (ticket.ticketType !== event.requiredTicketType) {
                throw new Error("门票类型不匹配");
            }

            // 记录参与信息
            const participantId = await ctx.db.insert("ticket_event_participants", {
                eventId,
                uid,
                gameType,
                ticketId,
                ticketType: ticket.ticketType,
                joinedAt: now.iso,
                isActive: true,
                createdAt: now.iso
            });

            // 更新活动参与人数
            await ctx.db.patch(eventId, {
                currentParticipants: event.currentParticipants + 1
            });

            // 标记门票为已使用
            await ctx.db.patch(ticketId, {
                isUsed: true,
                usedAt: now.iso,
                tournamentId: eventId
            });

            return {
                success: true,
                participantId,
                message: "成功参与门票活动"
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message
            };
        }
    }
});

// 获取门票活动列表
export const getTicketEvents = (query as any)({
    args: {
        gameType: v.string()
    },
    handler: async (ctx: any, args: any) => {
        const { gameType } = args;

        try {
            const events = await ctx.db
                .query("ticket_events")
                .withIndex("by_is_active", (q: any) => q.eq("isActive", true))
                .collect();

            // 过滤当前时间在活动时间范围内的活动
            const now = new Date();
            const activeEvents = events.filter((event: any) => {
                const startTime = new Date(event.startTime);
                const endTime = new Date(event.endTime);
                return now >= startTime && now <= endTime;
            });

            return {
                success: true,
                events: activeEvents
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message
            };
        }
    }
});

// 获取门票推荐
export const getTicketRecommendations = (query as any)({
    args: {
        uid: v.string(),
        gameType: v.string()
    },
    handler: async (ctx: any, args: any) => {
        const { uid, gameType } = args;

        try {
            const recommendations = await ctx.db
                .query("ticket_recommendations")
                .withIndex("by_uid_game", (q: any) => q.eq("uid", uid).eq("gameType", gameType))
                .order("desc")
                .first();

            if (!recommendations) {
                return {
                    success: true,
                    recommendations: []
                };
            }

            // 检查是否过期
            const now = new Date();
            const expiresAt = new Date(recommendations.expiresAt);

            if (now > expiresAt) {
                return {
                    success: true,
                    recommendations: []
                };
            }

            return {
                success: true,
                recommendations: recommendations.recommendedTickets
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message
            };
        }
    }
});

// 获取门票使用历史
export const getTicketUsageHistory = (query as any)({
    args: {
        uid: v.string(),
        gameType: v.string(),
        limit: v.optional(v.number())
    },
    handler: async (ctx: any, args: any) => {
        const { uid, gameType, limit = 50 } = args;

        try {
            const usageLogs = await ctx.db
                .query("ticket_usage_logs")
                .withIndex("by_uid_game", (q: any) => q.eq("uid", uid).eq("gameType", gameType))
                .order("desc")
                .take(limit);

            return {
                success: true,
                usageHistory: usageLogs
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message
            };
        }
    }
});

// 获取门票资格检查历史
export const getTicketEligibilityHistory = (query as any)({
    args: {
        uid: v.string(),
        gameType: v.string(),
        limit: v.optional(v.number())
    },
    handler: async (ctx: any, args: any) => {
        const { uid, gameType, limit = 50 } = args;

        try {
            const eligibilityLogs = await ctx.db
                .query("ticket_eligibility_logs")
                .withIndex("by_uid_game", (q: any) => q.eq("uid", uid).eq("gameType", gameType))
                .order("desc")
                .take(limit);

            return {
                success: true,
                eligibilityHistory: eligibilityLogs
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message
            };
        }
    }
});

// 更新门票系统配置
export const updateTicketSystemConfig = (mutation as any)({
    args: {
        configKey: v.string(),
        configValue: v.any(),
        description: v.string()
    },
    handler: async (ctx: any, args: any) => {
        const { configKey, configValue, description } = args;
        const now = getTorontoDate();

        try {
            // 检查配置是否已存在
            const existingConfig = await ctx.db
                .query("ticket_system_config")
                .withIndex("by_config_key", (q: any) => q.eq("configKey", configKey))
                .first();

            if (existingConfig) {
                // 更新现有配置
                await ctx.db.patch(existingConfig._id, {
                    configValue,
                    description,
                    updatedAt: now.iso
                });
            } else {
                // 创建新配置
                await ctx.db.insert("ticket_system_config", {
                    configKey,
                    configValue,
                    description,
                    createdAt: now.iso,
                    updatedAt: now.iso
                });
            }

            return {
                success: true,
                message: "门票系统配置更新成功"
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message
            };
        }
    }
});

// 获取门票系统配置
export const getTicketSystemConfig = (query as any)({
    args: {
        configKey: v.optional(v.string())
    },
    handler: async (ctx: any, args: any) => {
        const { configKey } = args;

        try {
            if (configKey) {
                // 获取特定配置
                const config = await ctx.db
                    .query("ticket_system_config")
                    .withIndex("by_config_key", (q: any) => q.eq("configKey", configKey))
                    .first();

                return {
                    success: true,
                    config: config || null
                };
            } else {
                // 获取所有配置
                const configs = await ctx.db
                    .query("ticket_system_config")
                    .collect();

                return {
                    success: true,
                    configs
                };
            }
        } catch (error: any) {
            return {
                success: false,
                error: error.message
            };
        }
    }
});

// ===== 辅助函数 =====

// 更新门票统计
async function updateTicketStatistics(ctx: any, uid: string, gameType: string) {
    const tickets = await ctx.db
        .query("tickets")
        .withIndex("by_uid_game", (q: any) => q.eq("uid", uid).eq("gameType", gameType))
        .collect();

    const now = getTorontoDate();
    const statistics = TicketSystem.getTicketStatistics({ uid, gameType });

    // 统计门票
    tickets.forEach((ticket: any) => {
        statistics.totalTickets++;
        statistics.ticketTypes[ticket.ticketType].total++;

        if (ticket.isUsed) {
            statistics.usedTickets++;
            statistics.ticketTypes[ticket.ticketType].used++;
        } else {
            const expiryDate = new Date(ticket.expiryDate);
            const current = new Date(now.iso);

            if (current > expiryDate) {
                statistics.expiredTickets++;
            } else {
                statistics.availableTickets++;
                statistics.ticketTypes[ticket.ticketType].available++;
            }
        }
    });

    await updateTicketStatisticsTable(ctx, uid, gameType, statistics);
}

// 更新门票统计表
async function updateTicketStatisticsTable(ctx: any, uid: string, gameType: string, statistics: any) {
    const now = getTorontoDate();

    // 检查是否已存在统计记录
    const existingStats = await ctx.db
        .query("ticket_statistics")
        .withIndex("by_uid_game", (q: any) => q.eq("uid", uid).eq("gameType", gameType))
        .first();

    if (existingStats) {
        // 更新现有统计
        await ctx.db.patch(existingStats._id, {
            ...statistics,
            lastUpdated: now.iso
        });
    } else {
        // 创建新统计记录
        await ctx.db.insert("ticket_statistics", {
            uid,
            gameType,
            ...statistics,
            lastUpdated: now.iso
        });
    }
} 