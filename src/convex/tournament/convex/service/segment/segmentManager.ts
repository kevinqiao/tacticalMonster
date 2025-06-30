// @ts-nocheck
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { mutation, query } from "../../_generated/server";
import { getTorontoDate } from "../utils";

// 段位管理器
export class SegmentManager {

    /**
     * 创建段位定义
     */
    static async createSegment(ctx: any, segmentData: any) {
        const now = getTorontoDate();

        const segmentId = await ctx.db.insert("segments", {
            segmentId: segmentData.segmentId,
            name: segmentData.name,
            displayName: segmentData.displayName,
            description: segmentData.description,
            tier: segmentData.tier,
            minPoints: segmentData.minPoints,
            maxPoints: segmentData.maxPoints,
            color: segmentData.color,
            icon: segmentData.icon,
            badge: segmentData.badge,
            rewards: segmentData.rewards,
            promotionBonus: segmentData.promotionBonus,
            demotionProtection: segmentData.demotionProtection,
            protectionMatches: segmentData.protectionMatches,
            isActive: segmentData.isActive !== false,
            createdAt: now.iso,
            updatedAt: now.iso
        });

        return {
            success: true,
            segmentId,
            message: "段位创建成功"
        };
    }

    /**
     * 初始化玩家段位
     */
    static async initializePlayerSegment(ctx: any, uid: string, gameType: string) {
        const now = getTorontoDate();

        // 检查是否已存在
        const existing = await ctx.db
            .query("player_segments")
            .withIndex("by_uid_game", (q: any) => q.eq("uid", uid).eq("gameType", gameType))
            .first();

        if (existing) {
            throw new Error("玩家段位已存在");
        }

        // 获取最低段位
        const lowestSegment = await ctx.db
            .query("segments")
            .withIndex("by_tier", (q: any) => q.eq("tier", 1))
            .filter((q: any) => q.eq(q.field("isActive"), true))
            .first();

        if (!lowestSegment) {
            throw new Error("未找到有效的起始段位");
        }

        const playerSegmentId = await ctx.db.insert("player_segments", {
            uid,
            gameType,
            currentSegment: lowestSegment.segmentId,
            currentPoints: lowestSegment.minPoints,
            highestSegment: lowestSegment.segmentId,
            highestPoints: lowestSegment.minPoints,
            seasonHighestSegment: lowestSegment.segmentId,
            seasonHighestPoints: lowestSegment.minPoints,
            promotionMatches: 0,
            demotionProtection: false,
            protectionMatchesRemaining: 0,
            totalMatches: 0,
            wins: 0,
            losses: 0,
            winRate: 0,
            streak: 0,
            streakType: "none",
            seasonStartSegment: lowestSegment.segmentId,
            seasonStartPoints: lowestSegment.minPoints,
            updatedAt: now.iso
        });

        return {
            success: true,
            playerSegmentId,
            segment: lowestSegment,
            message: "玩家段位初始化成功"
        };
    }

    /**
     * 更新玩家积分
     */
    static async updatePlayerPoints(ctx: any, uid: string, gameType: string, pointsChange: number, matchId?: string, tournamentId?: string) {
        const now = getTorontoDate();

        // 获取玩家段位信息
        const playerSegment = await ctx.db
            .query("player_segments")
            .withIndex("by_uid_game", (q: any) => q.eq("uid", uid).eq("gameType", gameType))
            .first();

        if (!playerSegment) {
            throw new Error("玩家段位不存在");
        }

        const oldPoints = playerSegment.currentPoints;
        const newPoints = Math.max(0, oldPoints + pointsChange);
        const oldSegment = playerSegment.currentSegment;

        // 获取所有段位定义
        const segments = await ctx.db
            .query("segments")
            .filter((q: any) => q.eq(q.field("isActive"), true))
            .order("asc")
            .collect();

        // 确定新段位
        let newSegment = oldSegment;
        let changeType = "points_change";
        let reason = "积分变化";

        for (const segment of segments) {
            if (newPoints >= segment.minPoints && newPoints <= segment.maxPoints) {
                newSegment = segment.segmentId;
                break;
            }
        }

        // 检查段位变化
        if (newSegment !== oldSegment) {
            const oldSegmentData = segments.find(s => s.segmentId === oldSegment);
            const newSegmentData = segments.find(s => s.segmentId === newSegment);

            if (newSegmentData && oldSegmentData) {
                if (newSegmentData.tier > oldSegmentData.tier) {
                    changeType = "promotion";
                    reason = "段位晋级";
                } else if (newSegmentData.tier < oldSegmentData.tier) {
                    changeType = "demotion";
                    reason = "段位降级";
                }
            }
        }

        // 更新玩家段位信息
        const updateData: any = {
            currentPoints: newPoints,
            updatedAt: now.iso
        };

        if (newSegment !== oldSegment) {
            updateData.currentSegment = newSegment;

            if (changeType === "promotion") {
                updateData.lastPromotionAt = now.iso;
                updateData.promotionMatches = 0;

                // 更新最高段位
                const newSegmentData = segments.find(s => s.segmentId === newSegment);
                if (newSegmentData && newSegmentData.tier > segments.find(s => s.segmentId === playerSegment.highestSegment)?.tier) {
                    updateData.highestSegment = newSegment;
                    updateData.highestPoints = newPoints;
                }

                if (newSegmentData && newSegmentData.tier > segments.find(s => s.segmentId === playerSegment.seasonHighestSegment)?.tier) {
                    updateData.seasonHighestSegment = newSegment;
                    updateData.seasonHighestPoints = newPoints;
                }
            } else if (changeType === "demotion") {
                updateData.lastDemotionAt = now.iso;
            }
        }

        await ctx.db.patch(playerSegment._id, updateData);

        // 记录段位变更
        await ctx.db.insert("segment_changes", {
            uid,
            gameType,
            oldSegment,
            newSegment,
            oldPoints,
            newPoints,
            changeType,
            reason,
            matchId,
            tournamentId,
            pointsChange,
            createdAt: now.iso
        });

        // 如果是晋级，发放奖励
        if (changeType === "promotion") {
            const newSegmentData = segments.find(s => s.segmentId === newSegment);
            if (newSegmentData && newSegmentData.promotionBonus) {
                await this.grantPromotionRewards(ctx, uid, gameType, newSegment, newSegmentData.promotionBonus);
            }
        }

        return {
            success: true,
            oldSegment,
            newSegment,
            oldPoints,
            newPoints,
            changeType,
            reason,
            message: changeType === "promotion" ? "恭喜晋级！" :
                changeType === "demotion" ? "段位降级" : "积分更新成功"
        };
    }

    /**
     * 发放晋级奖励
     */
    static async grantPromotionRewards(ctx: any, uid: string, gameType: string, segmentId: string, bonus: any) {
        const now = getTorontoDate();
        const expiresAt = new Date(now.localDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

        // 发放金币
        if (bonus.coins > 0) {
            await ctx.runMutation((internal as any)["service/prop/inventoryManager"].updateCoins, {
                uid,
                amount: bonus.coins,
                reason: `段位晋级奖励`
            });
        }

        // 发放道具
        if (bonus.props && bonus.props.length > 0) {
            await ctx.runMutation((internal as any)["service/prop/inventoryManager"].addProps, {
                uid,
                props: bonus.props
            });
        }

        // 记录奖励
        await ctx.db.insert("segment_rewards", {
            uid,
            gameType,
            segmentId,
            rewardType: "promotion",
            coins: bonus.coins || 0,
            props: bonus.props || [],
            tickets: bonus.tickets || [],
            claimed: true,
            claimedAt: now.iso,
            expiresAt,
            createdAt: now.iso
        });
    }

    /**
     * 获取玩家段位信息
     */
    static async getPlayerSegment(ctx: any, uid: string, gameType: string) {
        const playerSegment = await ctx.db
            .query("player_segments")
            .withIndex("by_uid_game", (q: any) => q.eq("uid", uid).eq("gameType", gameType))
            .first();

        if (!playerSegment) {
            throw new Error("玩家段位不存在");
        }

        // 获取段位定义
        const segment = await ctx.db
            .query("segments")
            .withIndex("by_segmentId", (q: any) => q.eq("segmentId", playerSegment.currentSegment))
            .first();

        // 获取下一个段位
        const nextSegment = await ctx.db
            .query("segments")
            .withIndex("by_tier", (q: any) => q.eq("tier", segment.tier + 1))
            .filter((q: any) => q.eq(q.field("isActive"), true))
            .first();

        // 计算进度
        const progress = nextSegment ?
            Math.min(100, ((playerSegment.currentPoints - segment.minPoints) / (nextSegment.minPoints - segment.minPoints)) * 100) :
            100;

        return {
            success: true,
            playerSegment: {
                ...playerSegment,
                segment,
                nextSegment,
                progress: Math.round(progress),
                pointsToNext: nextSegment ? nextSegment.minPoints - playerSegment.currentPoints : 0
            }
        };
    }

    /**
     * 获取段位排行榜
     */
    static async getSegmentLeaderboard(ctx: any, gameType: string, segmentId?: string, limit: number = 50) {
        let query = ctx.db.query("segment_leaderboards");

        if (gameType) {
            query = query.filter((q: any) => q.eq(q.field("gameType"), gameType));
        }

        if (segmentId) {
            query = query.filter((q: any) => q.eq(q.field("segmentId"), segmentId));
        }

        const leaderboard = await query
            .order("desc")
            .take(limit);

        return {
            success: true,
            leaderboard: leaderboard.map((entry: any, index: number) => ({
                ...entry,
                displayRank: index + 1
            }))
        };
    }

    /**
     * 更新段位统计
     */
    static async updateSegmentStatistics(ctx: any, gameType: string) {
        const now = getTorontoDate();

        // 获取所有段位
        const segments = await ctx.db
            .query("segments")
            .filter((q: any) => q.eq(q.field("isActive"), true))
            .collect();

        for (const segment of segments) {
            // 获取段位内玩家
            const players = await ctx.db
                .query("player_segments")
                .withIndex("by_game_segment", (q: any) => q.eq("gameType", gameType).eq("currentSegment", segment.segmentId))
                .collect();

            if (players.length === 0) continue;

            // 计算统计信息
            const totalPlayers = players.length;
            const totalPoints = players.reduce((sum: number, p: any) => sum + p.currentPoints, 0);
            const averagePoints = totalPoints / totalPlayers;
            const sortedPoints = players.map((p: any) => p.currentPoints).sort((a: number, b: number) => a - b);
            const medianPoints = sortedPoints[Math.floor(sortedPoints.length / 2)];

            const totalMatches = players.reduce((sum: number, p: any) => sum + p.totalMatches, 0);
            const averageMatches = totalMatches / totalPlayers;

            const totalWinRate = players.reduce((sum: number, p: any) => sum + p.winRate, 0);
            const averageWinRate = totalWinRate / totalPlayers;

            // 计算晋级率和降级率（简化计算）
            const promotionRate = 0.1; // 10% 晋级率
            const demotionRate = 0.05; // 5% 降级率

            // 更新或创建统计记录
            const existingStats = await ctx.db
                .query("segment_statistics")
                .withIndex("by_game_segment", (q: any) => q.eq("gameType", gameType).eq("segmentId", segment.segmentId))
                .first();

            const statsData = {
                gameType,
                segmentId: segment.segmentId,
                totalPlayers,
                averagePoints: Math.round(averagePoints),
                medianPoints: Math.round(medianPoints),
                promotionRate,
                demotionRate,
                averageMatches: Math.round(averageMatches),
                averageWinRate: Math.round(averageWinRate * 100) / 100,
                lastUpdated: now.iso
            };

            if (existingStats) {
                await ctx.db.patch(existingStats._id, statsData);
            } else {
                await ctx.db.insert("segment_statistics", statsData);
            }
        }

        return {
            success: true,
            message: "段位统计更新完成"
        };
    }
}

// ===== Convex 函数接口 =====

// 创建段位定义
export const createSegment = (mutation as any)({
    args: {
        segmentData: v.any()
    },
    handler: async (ctx: any, args: any) => {
        return await SegmentManager.createSegment(ctx, args.segmentData);
    }
});

// 初始化玩家段位
export const initializePlayerSegment = (mutation as any)({
    args: {
        uid: v.string(),
        gameType: v.string()
    },
    handler: async (ctx: any, args: any) => {
        return await SegmentManager.initializePlayerSegment(ctx, args.uid, args.gameType);
    }
});

// 更新玩家积分
export const updatePlayerPoints = (mutation as any)({
    args: {
        uid: v.string(),
        gameType: v.string(),
        pointsChange: v.number(),
        matchId: v.optional(v.string()),
        tournamentId: v.optional(v.string())
    },
    handler: async (ctx: any, args: any) => {
        return await SegmentManager.updatePlayerPoints(
            ctx,
            args.uid,
            args.gameType,
            args.pointsChange,
            args.matchId,
            args.tournamentId
        );
    }
});

// 获取玩家段位信息
export const getPlayerSegment = (query as any)({
    args: {
        uid: v.string(),
        gameType: v.string()
    },
    handler: async (ctx: any, args: any) => {
        return await SegmentManager.getPlayerSegment(ctx, args.uid, args.gameType);
    }
});

// 获取段位排行榜
export const getSegmentLeaderboard = (query as any)({
    args: {
        gameType: v.string(),
        segmentId: v.optional(v.string()),
        limit: v.optional(v.number())
    },
    handler: async (ctx: any, args: any) => {
        return await SegmentManager.getSegmentLeaderboard(
            ctx,
            args.gameType,
            args.segmentId,
            args.limit
        );
    }
});

// 更新段位统计
export const updateSegmentStatistics = (mutation as any)({
    args: {
        gameType: v.string()
    },
    handler: async (ctx: any, args: any) => {
        return await SegmentManager.updateSegmentStatistics(ctx, args.gameType);
    }
}); 