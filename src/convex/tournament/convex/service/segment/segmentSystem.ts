// @ts-nocheck
import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { getTorontoDate } from "../utils";

// 段位系统核心实现
export class SegmentSystem {

    // 段位定义配置
    static readonly SEGMENT_LEVELS = {
        Bronze: { minScore: 0, maxScore: 999, color: "#CD7F32", tier: 1 },
        Silver: { minScore: 1000, maxScore: 1999, color: "#C0C0C0", tier: 2 },
        Gold: { minScore: 2000, maxScore: 2999, color: "#FFD700", tier: 3 },
        Platinum: { minScore: 3000, maxScore: 3999, color: "#E5E4E2", tier: 4 },
        Diamond: { minScore: 4000, maxScore: 4999, color: "#B9F2FF", tier: 5 },
        Master: { minScore: 5000, maxScore: 6999, color: "#FF6B6B", tier: 6 },
        GrandMaster: { minScore: 7000, maxScore: 9999, color: "#4ECDC4", tier: 7 },
        Legend: { minScore: 10000, maxScore: Infinity, color: "#FFE66D", tier: 8 }
    };

    // 锦标赛段位分数奖励配置
    static readonly TOURNAMENT_SEGMENT_REWARDS = {
        // 单场比赛（4人）
        single_match: {
            1: { score: 20, description: "冠军" },
            2: { score: 10, description: "亚军" },
            3: { score: 2, description: "季军" },
            4: { score: -3, description: "第四名" }
        },

        // 每日锦标赛（16人）
        daily: {
            1: { score: 50, description: "日冠军" },
            2: { score: 35, description: "日亚军" },
            3: { score: 25, description: "日季军" },
            4: { score: 20, description: "第四名" },
            5: { score: 15, description: "第五名" },
            6: { score: 12, description: "第六名" },
            7: { score: 10, description: "第七名" },
            8: { score: 8, description: "第八名" },
            9: { score: 6, description: "第九名" },
            10: { score: 5, description: "第十名" },
            11: { score: 4, description: "第十一名" },
            12: { score: 3, description: "第十二名" },
            13: { score: 2, description: "第十三名" },
            14: { score: 1, description: "第十四名" },
            15: { score: 0, description: "第十五名" },
            16: { score: -5, description: "第十六名" }
        },

        // 每周锦标赛（32人）
        weekly: {
            1: { score: 150, description: "周冠军" },
            2: { score: 100, description: "周亚军" },
            3: { score: 75, description: "周季军" },
            4: { score: 60, description: "第四名" },
            5: { score: 50, description: "第五名" },
            6: { score: 40, description: "第六名" },
            7: { score: 35, description: "第七名" },
            8: { score: 30, description: "第八名" },
            9: { score: 25, description: "第九名" },
            10: { score: 20, description: "第十名" },
            11: { score: 18, description: "第十一名" },
            12: { score: 15, description: "第十二名" },
            13: { score: 12, description: "第十三名" },
            14: { score: 10, description: "第十四名" },
            15: { score: 8, description: "第十五名" },
            16: { score: 5, description: "第十六名" },
            17: { score: 3, description: "第十七名" },
            18: { score: 1, description: "第十八名" },
            19: { score: 0, description: "第十九名" },
            20: { score: -5, description: "第二十名" },
            21: { score: -10, description: "第二十一名" },
            22: { score: -15, description: "第二十二名" },
            23: { score: -20, description: "第二十三名" },
            24: { score: -25, description: "第二十四名" },
            25: { score: -30, description: "第二十五名" },
            26: { score: -35, description: "第二十六名" },
            27: { score: -40, description: "第二十七名" },
            28: { score: -45, description: "第二十八名" },
            29: { score: -50, description: "第二十九名" },
            30: { score: -55, description: "第三十名" },
            31: { score: -60, description: "第三十一名" },
            32: { score: -65, description: "第三十二名" }
        },

        // 赛季锦标赛（大规模）
        seasonal: {
            // 动态计算函数
            calculateByRank: (rank: number, totalPlayers: number) => {
                const percentage = (rank / totalPlayers) * 100;

                if (percentage <= 10) {
                    // 前10%：+200到+500
                    return Math.max(200, 500 - (rank - 1) * 0.3);
                } else if (percentage <= 25) {
                    // 前25%：+50到+199
                    return Math.max(50, 150 - (rank - 1001) * 0.067);
                } else if (percentage <= 50) {
                    // 前50%：+0到+49
                    return Math.max(0, 30 - (rank - 2501) * 0.012);
                } else {
                    // 后50%：-1到-100
                    const bottomPercentage = (rank - 5000) / 5000;
                    return -Math.floor(bottomPercentage * 100);
                }
            }
        }
    };

    /**
     * 初始化玩家段位
     */
    static async initializePlayerSegment(ctx: any, uid: string, gameType: string, seasonId?: string) {
        const now = getTorontoDate();

        // 检查是否已存在
        const existing = await ctx.db
            .query("player_segments")
            .withIndex("by_uid_game", (q: any) => q.eq("uid", uid).eq("gameType", gameType))
            .first();

        if (existing) {
            return {
                success: true,
                playerSegment: existing,
                message: "玩家段位已存在"
            };
        }

        // 创建新的玩家段位记录
        const playerSegmentId = await ctx.db.insert("player_segments", {
            uid,
            gameType,
            segmentName: "Bronze",
            currentPoints: 0,
            seasonPoints: 0,
            globalPoints: 0,
            highestPoints: 0,
            protectionExpiry: now.iso,
            lastActivityDate: now.iso,
            createdAt: now.iso,
            updatedAt: now.iso
        });

        const playerSegment = await ctx.db.get(playerSegmentId);

        return {
            success: true,
            playerSegment,
            message: "玩家段位初始化成功"
        };
    }

    /**
     * 更新玩家段位分数
     */
    static async updatePlayerSegmentScore(ctx: any, params: {
        uid: string;
        gameType: string;
        scoreChange: number;
        tournamentType?: string;
        tournamentId?: string;
        matchId?: string;
        rank?: number;
        totalPlayers?: number;
    }) {
        const now = getTorontoDate();
        const { uid, gameType, scoreChange, tournamentType, tournamentId, matchId, rank, totalPlayers } = params;

        // 获取或初始化玩家段位
        let playerSegment = await ctx.db
            .query("player_segments")
            .withIndex("by_uid_game", (q: any) => q.eq("uid", uid).eq("gameType", gameType))
            .first();

        if (!playerSegment) {
            const initResult = await this.initializePlayerSegment(ctx, uid, gameType);
            playerSegment = initResult.playerSegment;
        }

        // 计算新分数
        const oldPoints = playerSegment.currentPoints;
        const newPoints = Math.max(0, oldPoints + scoreChange);
        const oldSegment = playerSegment.segmentName;

        // 确定新段位
        const newSegment = this.calculateSegmentByScore(newPoints);

        // 检查段位变化
        const segmentChanged = newSegment !== oldSegment;
        const isPromotion = this.getSegmentTier(newSegment) > this.getSegmentTier(oldSegment);
        const isDemotion = this.getSegmentTier(newSegment) < this.getSegmentTier(oldSegment);

        // 更新玩家段位信息
        const updateData: any = {
            currentPoints: newPoints,
            lastActivityDate: now.iso,
            updatedAt: now.iso
        };

        if (segmentChanged) {
            updateData.segmentName = newSegment;

            if (isPromotion) {
                updateData.highestPoints = Math.max(playerSegment.highestPoints, newPoints);
                // 发放晋级奖励
                await this.grantPromotionRewards(ctx, uid, gameType, newSegment);
            }
        }

        // 更新最高分数
        if (newPoints > playerSegment.highestPoints) {
            updateData.highestPoints = newPoints;
        }

        await ctx.db.patch(playerSegment._id, updateData);

        // 记录段位变更
        if (segmentChanged) {
            await ctx.db.insert("segment_changes", {
                uid,
                gameType,
                oldSegment,
                newSegment,
                pointsChange: scoreChange,
                reason: isPromotion ? "promotion" : isDemotion ? "demotion" : "points_change",
                createdAt: now.iso
            });
        }

        // 更新玩家表中的段位信息
        const player = await ctx.db
            .query("players")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .first();

        if (player) {
            await ctx.db.patch(player._id, {
                segmentName: newSegment,
                updatedAt: now.iso
            });
        }

        return {
            success: true,
            oldSegment,
            newSegment,
            oldPoints,
            newPoints,
            scoreChange,
            segmentChanged,
            isPromotion,
            isDemotion
        };
    }

    /**
     * 根据分数计算段位
     */
    static calculateSegmentByScore(score: number): string {
        for (const [segmentName, config] of Object.entries(this.SEGMENT_LEVELS)) {
            if (score >= config.minScore && score <= config.maxScore) {
                return segmentName;
            }
        }
        return "Bronze"; // 默认返回青铜
    }

    /**
     * 获取段位等级
     */
    static getSegmentTier(segmentName: string): number {
        return this.SEGMENT_LEVELS[segmentName]?.tier || 1;
    }

    /**
     * 计算锦标赛段位分数奖励
     */
    static calculateTournamentSegmentReward(tournamentType: string, rank: number, totalPlayers?: number): number {
        const rewards = this.TOURNAMENT_SEGMENT_REWARDS[tournamentType];

        if (!rewards) {
            return 0;
        }

        if (tournamentType === "seasonal" && totalPlayers) {
            return rewards.calculateByRank(rank, totalPlayers);
        }

        return rewards[rank]?.score || 0;
    }

    /**
     * 发放晋级奖励
     */
    static async grantPromotionRewards(ctx: any, uid: string, gameType: string, segmentName: string) {
        const now = getTorontoDate();

        // 获取段位奖励配置
        const segmentReward = await ctx.db
            .query("segment_rewards")
            .withIndex("by_segment", (q: any) => q.eq("segmentName", segmentName))
            .filter((q: any) => q.eq(q.field("rewardType"), "promotion"))
            .first();

        if (segmentReward) {
            // 发放奖励
            for (const reward of segmentReward.rewards) {
                switch (reward.type) {
                    case "coins":
                        // 更新玩家金币
                        const player = await ctx.db
                            .query("players")
                            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                            .first();

                        if (player) {
                            await ctx.db.patch(player._id, {
                                coins: (player.coins || 0) + reward.quantity,
                                updatedAt: now.iso
                            });
                        }
                        break;

                    case "props":
                        // 添加道具到库存
                        const inventory = await ctx.db
                            .query("player_inventory")
                            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                            .first();

                        if (inventory) {
                            const updatedProps = [...(inventory.props || [])];
                            updatedProps.push({
                                id: reward.itemId,
                                quantity: reward.quantity,
                                acquiredAt: now.iso
                            });

                            await ctx.db.patch(inventory._id, {
                                props: updatedProps,
                                updatedAt: now.iso
                            });
                        }
                        break;

                    case "tickets":
                        // 添加门票
                        const ticketInventory = await ctx.db
                            .query("player_inventory")
                            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                            .first();

                        if (ticketInventory) {
                            const updatedTickets = [...(ticketInventory.tickets || [])];
                            updatedTickets.push({
                                id: reward.itemId,
                                quantity: reward.quantity,
                                acquiredAt: now.iso
                            });

                            await ctx.db.patch(ticketInventory._id, {
                                tickets: updatedTickets,
                                updatedAt: now.iso
                            });
                        }
                        break;
                }
            }
        }
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

        // 计算进度信息
        const currentSegment = playerSegment.segmentName;
        const currentPoints = playerSegment.currentPoints;
        const segmentConfig = this.SEGMENT_LEVELS[currentSegment];

        // 计算到下一段位的进度
        let progress = 0;
        let pointsToNext = 0;
        let nextSegment = null;

        for (const [segmentName, config] of Object.entries(this.SEGMENT_LEVELS)) {
            if (config.tier === segmentConfig.tier + 1) {
                nextSegment = segmentName;
                pointsToNext = config.minScore - currentPoints;
                progress = Math.min(100, Math.max(0,
                    ((currentPoints - segmentConfig.minScore) / (config.minScore - segmentConfig.minScore)) * 100
                ));
                break;
            }
        }

        return {
            success: true,
            playerSegment: {
                ...playerSegment,
                progress: Math.round(progress),
                pointsToNext: Math.max(0, pointsToNext),
                nextSegment,
                segmentConfig
            }
        };
    }

    /**
     * 获取段位排行榜
     */
    static async getSegmentLeaderboard(ctx: any, gameType: string, segmentName?: string, limit: number = 50) {
        let query = ctx.db.query("player_segments");

        if (segmentName) {
            query = query.withIndex("by_segment", (q: any) => q.eq("segmentName", segmentName));
        }

        const players = await query
            .filter((q: any) => q.eq(q.field("gameType"), gameType))
            .order("desc", (q: any) => q.field("currentPoints"))
            .take(limit)
            .collect();

        // 获取玩家详细信息
        const leaderboard = [];
        for (const playerSegment of players) {
            const player = await ctx.db
                .query("players")
                .withIndex("by_uid", (q: any) => q.eq("uid", playerSegment.uid))
                .first();

            leaderboard.push({
                rank: leaderboard.length + 1,
                uid: playerSegment.uid,
                displayName: player?.displayName || playerSegment.uid,
                avatar: player?.avatar,
                segmentName: playerSegment.segmentName,
                currentPoints: playerSegment.currentPoints,
                highestPoints: playerSegment.highestPoints,
                lastActivityDate: playerSegment.lastActivityDate
            });
        }

        return {
            success: true,
            leaderboard,
            gameType,
            segmentName,
            totalCount: leaderboard.length
        };
    }

    /**
     * 赛季结束段位重置
     */
    static async resetSeasonSegments(ctx: any, seasonId: string) {
        const now = getTorontoDate();

        // 段位重置规则
        const resetRules = {
            Legend: "Master",
            GrandMaster: "Diamond",
            Master: "Platinum",
            Diamond: "Gold",
            Platinum: "Silver",
            Gold: "Bronze",
            Silver: "Bronze",
            Bronze: "Bronze"
        };

        // 获取所有玩家段位
        const playerSegments = await ctx.db
            .query("player_segments")
            .collect();

        for (const playerSegment of playerSegments) {
            const oldSegment = playerSegment.segmentName;
            const newSegment = resetRules[oldSegment] || "Bronze";

            // 计算重置后的分数
            const resetPoints = this.SEGMENT_LEVELS[newSegment].minPoints;

            // 更新玩家段位
            await ctx.db.patch(playerSegment._id, {
                segmentName: newSegment,
                currentPoints: resetPoints,
                seasonPoints: 0,
                updatedAt: now.iso
            });

            // 记录段位变更
            await ctx.db.insert("segment_changes", {
                uid: playerSegment.uid,
                gameType: playerSegment.gameType,
                oldSegment,
                newSegment,
                pointsChange: resetPoints - playerSegment.currentPoints,
                reason: "season_reset",
                createdAt: now.iso
            });

            // 更新玩家表
            const player = await ctx.db
                .query("players")
                .withIndex("by_uid", (q: any) => q.eq("uid", playerSegment.uid))
                .first();

            if (player) {
                await ctx.db.patch(player._id, {
                    segmentName: newSegment,
                    updatedAt: now.iso
                });
            }
        }

        return {
            success: true,
            message: "赛季段位重置完成",
            resetCount: playerSegments.length
        };
    }
}

// ===== Convex API 接口 =====

// 初始化玩家段位
export const initializePlayerSegment = mutation({
    args: {
        uid: v.string(),
        gameType: v.string(),
        seasonId: v.optional(v.string())
    },
    handler: async (ctx: any, args: any) => {
        return await SegmentSystem.initializePlayerSegment(ctx, args.uid, args.gameType, args.seasonId);
    }
});

// 更新玩家段位分数
export const updatePlayerSegmentScore = mutation({
    args: {
        uid: v.string(),
        gameType: v.string(),
        scoreChange: v.number(),
        tournamentType: v.optional(v.string()),
        tournamentId: v.optional(v.string()),
        matchId: v.optional(v.string()),
        rank: v.optional(v.number()),
        totalPlayers: v.optional(v.number())
    },
    handler: async (ctx: any, args: any) => {
        return await SegmentSystem.updatePlayerSegmentScore(ctx, args);
    }
});

// 获取玩家段位信息
export const getPlayerSegment = query({
    args: {
        uid: v.string(),
        gameType: v.string()
    },
    handler: async (ctx: any, args: any) => {
        return await SegmentSystem.getPlayerSegment(ctx, args.uid, args.gameType);
    }
});

// 获取段位排行榜
export const getSegmentLeaderboard = query({
    args: {
        gameType: v.string(),
        segmentName: v.optional(v.string()),
        limit: v.optional(v.number())
    },
    handler: async (ctx: any, args: any) => {
        return await SegmentSystem.getSegmentLeaderboard(ctx, args.gameType, args.segmentName, args.limit);
    }
});

// 赛季结束段位重置
export const resetSeasonSegments = mutation({
    args: {
        seasonId: v.string()
    },
    handler: async (ctx: any, args: any) => {
        return await SegmentSystem.resetSeasonSegments(ctx, args.seasonId);
    }
}); 