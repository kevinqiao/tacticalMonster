// @ts-nocheck
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { mutation, query } from "../../_generated/server";
import { getTorontoDate } from "../utils";

// 段位奖励管理器
export class SegmentRewardManager {

    /**
     * 发放晋级奖励
     */
    static async grantPromotionReward(ctx: any, uid: string, gameType: string, oldSegment: string, newSegment: string) {
        const now = getTorontoDate();

        // 获取新段位信息
        const segment = await ctx.db
            .query("segments")
            .withIndex("by_segmentId", (q: any) => q.eq("segmentId", newSegment))
            .first();

        if (!segment) {
            throw new Error(`段位 ${newSegment} 不存在`);
        }

        // 创建奖励记录
        const rewardId = await ctx.db.insert("segment_rewards", {
            uid,
            gameType,
            segmentId: newSegment,
            rewardType: "promotion",
            coins: segment.promotionBonus.coins,
            props: segment.promotionBonus.props,
            tickets: segment.promotionBonus.tickets,
            claimed: false,
            expiresAt: new Date(now.localDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7天后过期
            createdAt: now.iso
        });

        // 自动发放金币
        if (segment.promotionBonus.coins > 0) {
            await ctx.runMutation((internal as any)["service/prop/inventoryManager"].updateCoins, {
                uid,
                amount: segment.promotionBonus.coins,
                reason: `晋级到${segment.name}段位奖励`
            });
        }

        // 自动发放道具
        if (segment.promotionBonus.props && segment.promotionBonus.props.length > 0) {
            await ctx.runMutation((internal as any)["service/prop/inventoryManager"].addProps, {
                uid,
                props: segment.promotionBonus.props
            });
        }

        // 自动发放门票
        if (segment.promotionBonus.tickets && segment.promotionBonus.tickets.length > 0) {
            for (const ticket of segment.promotionBonus.tickets) {
                await ctx.runMutation((internal as any)["service/ticket/ticketManager"].grantTicketToPlayer, {
                    uid,
                    templateId: `${ticket.tournamentType}_${ticket.gameType}`,
                    quantity: ticket.quantity,
                    source: "segment_promotion"
                });
            }
        }

        // 标记为已领取
        await ctx.db.patch(rewardId, {
            claimed: true,
            claimedAt: now.iso
        });

        // 发送通知
        await ctx.db.insert("notifications", {
            uid,
            message: `恭喜晋级到${segment.name}段位！获得${segment.promotionBonus.coins}金币奖励！`,
            createdAt: now.iso
        });

        return {
            success: true,
            rewardId,
            segmentName: segment.name,
            coins: segment.promotionBonus.coins,
            props: segment.promotionBonus.props,
            tickets: segment.promotionBonus.tickets,
            message: "晋级奖励发放成功"
        };
    }

    /**
     * 发放每日段位奖励
     */
    static async grantDailySegmentReward(ctx: any, uid: string, gameType: string) {
        const now = getTorontoDate();

        // 获取玩家当前段位
        const playerSegment = await ctx.db
            .query("player_segments")
            .withIndex("by_uid_game", (q: any) => q.eq("uid", uid).eq("gameType", gameType))
            .first();

        if (!playerSegment) {
            throw new Error("玩家段位信息不存在");
        }

        // 获取段位信息
        const segment = await ctx.db
            .query("segments")
            .withIndex("by_segmentId", (q: any) => q.eq("segmentId", playerSegment.currentSegment))
            .first();

        if (!segment) {
            throw new Error(`段位 ${playerSegment.currentSegment} 不存在`);
        }

        // 检查今日是否已领取
        const today = now.localDate.toISOString().split("T")[0];
        const existingReward = await ctx.db
            .query("segment_rewards")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .filter((q: any) => q.eq(q.field("rewardType"), "daily"))
            .filter((q: any) => q.eq(q.field("gameType"), gameType))
            .filter((q: any) => q.eq(q.field("segmentId"), playerSegment.currentSegment))
            .filter((q: any) => q.gte(q.field("createdAt"), today))
            .first();

        if (existingReward) {
            throw new Error("今日段位奖励已领取");
        }

        // 创建奖励记录
        const rewardId = await ctx.db.insert("segment_rewards", {
            uid,
            gameType,
            segmentId: playerSegment.currentSegment,
            rewardType: "daily",
            coins: segment.rewards.dailyBonus.coins,
            props: segment.rewards.dailyBonus.props,
            tickets: [],
            claimed: false,
            expiresAt: new Date(now.localDate.getTime() + 24 * 60 * 60 * 1000).toISOString(), // 24小时后过期
            createdAt: now.iso
        });

        // 自动发放金币
        if (segment.rewards.dailyBonus.coins > 0) {
            await ctx.runMutation((internal as any)["service/prop/inventoryManager"].updateCoins, {
                uid,
                amount: segment.rewards.dailyBonus.coins,
                reason: `${segment.name}段位每日奖励`
            });
        }

        // 自动发放道具
        if (segment.rewards.dailyBonus.props && segment.rewards.dailyBonus.props.length > 0) {
            await ctx.runMutation((internal as any)["service/prop/inventoryManager"].addProps, {
                uid,
                props: segment.rewards.dailyBonus.props
            });
        }

        // 标记为已领取
        await ctx.db.patch(rewardId, {
            claimed: true,
            claimedAt: now.iso
        });

        return {
            success: true,
            rewardId,
            segmentName: segment.name,
            coins: segment.rewards.dailyBonus.coins,
            props: segment.rewards.dailyBonus.props,
            message: "每日段位奖励发放成功"
        };
    }

    /**
     * 发放赛季结束奖励
     */
    static async grantSeasonEndReward(ctx: any, uid: string, gameType: string, seasonId: string) {
        const now = getTorontoDate();

        // 获取赛季信息
        const season = await ctx.db
            .query("segment_seasons")
            .withIndex("by_seasonId", (q: any) => q.eq("seasonId", seasonId))
            .first();

        if (!season) {
            throw new Error(`赛季 ${seasonId} 不存在`);
        }

        // 获取玩家段位信息
        const playerSegment = await ctx.db
            .query("player_segments")
            .withIndex("by_uid_game", (q: any) => q.eq("uid", uid).eq("gameType", gameType))
            .first();

        if (!playerSegment) {
            throw new Error("玩家段位信息不存在");
        }

        // 查找对应的段位奖励
        const segmentReward = season.rewards.segmentRewards.find(
            (reward: any) => reward.segmentId === playerSegment.seasonHighestSegment
        );

        if (!segmentReward) {
            throw new Error(`未找到段位 ${playerSegment.seasonHighestSegment} 的赛季奖励配置`);
        }

        // 创建奖励记录
        const rewardId = await ctx.db.insert("segment_rewards", {
            uid,
            gameType,
            segmentId: playerSegment.seasonHighestSegment,
            rewardType: "season_end",
            coins: segmentReward.coins,
            props: segmentReward.props,
            tickets: segmentReward.tickets,
            claimed: false,
            expiresAt: new Date(now.localDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30天后过期
            createdAt: now.iso
        });

        // 自动发放金币
        if (segmentReward.coins > 0) {
            await ctx.runMutation((internal as any)["service/prop/inventoryManager"].updateCoins, {
                uid,
                amount: segmentReward.coins,
                reason: `${season.name}赛季结束奖励`
            });
        }

        // 自动发放道具
        if (segmentReward.props && segmentReward.props.length > 0) {
            await ctx.runMutation((internal as any)["service/prop/inventoryManager"].addProps, {
                uid,
                props: segmentReward.props
            });
        }

        // 自动发放门票
        if (segmentReward.tickets && segmentReward.tickets.length > 0) {
            for (const ticket of segmentReward.tickets) {
                await ctx.runMutation((internal as any)["service/ticket/ticketManager"].grantTicketToPlayer, {
                    uid,
                    templateId: `${ticket.tournamentType}_${ticket.gameType}`,
                    quantity: ticket.quantity,
                    source: "season_end"
                });
            }
        }

        // 标记为已领取
        await ctx.db.patch(rewardId, {
            claimed: true,
            claimedAt: now.iso
        });

        // 发送通知
        await ctx.db.insert("notifications", {
            uid,
            message: `${season.name}赛季结束！您获得了${segmentReward.coins}金币奖励！`,
            createdAt: now.iso
        });

        return {
            success: true,
            rewardId,
            seasonName: season.name,
            segmentId: playerSegment.seasonHighestSegment,
            coins: segmentReward.coins,
            props: segmentReward.props,
            tickets: segmentReward.tickets,
            message: "赛季结束奖励发放成功"
        };
    }

    /**
     * 获取玩家可领取的奖励
     */
    static async getClaimableRewards(ctx: any, uid: string) {
        const now = getTorontoDate();

        const rewards = await ctx.db
            .query("segment_rewards")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .filter((q: any) => q.eq(q.field("claimed"), false))
            .filter((q: any) => q.gt(q.field("expiresAt"), now.iso))
            .collect();

        // 获取段位信息
        const segmentIds = [...new Set(rewards.map(r => r.segmentId))];
        const segments = await Promise.all(
            segmentIds.map(id =>
                ctx.db.query("segments")
                    .withIndex("by_segmentId", (q: any) => q.eq("segmentId", id))
                    .first()
            )
        );

        const segmentMap = new Map();
        segments.forEach(segment => {
            if (segment) segmentMap.set(segment.segmentId, segment);
        });

        const rewardDetails = rewards.map(reward => ({
            ...reward,
            segmentName: segmentMap.get(reward.segmentId)?.name || "未知段位",
            segmentColor: segmentMap.get(reward.segmentId)?.color || "#000000"
        }));

        return {
            success: true,
            rewards: rewardDetails,
            total: rewardDetails.length,
            totalCoins: rewardDetails.reduce((sum, r) => sum + r.coins, 0),
            totalProps: rewardDetails.reduce((sum, r) => sum + r.props.length, 0),
            totalTickets: rewardDetails.reduce((sum, r) => sum + r.tickets.length, 0)
        };
    }

    /**
     * 领取奖励
     */
    static async claimReward(ctx: any, rewardId: string) {
        const now = getTorontoDate();

        const reward = await ctx.db.get(rewardId);
        if (!reward) {
            throw new Error("奖励不存在");
        }

        if (reward.claimed) {
            throw new Error("奖励已领取");
        }

        if (new Date(reward.expiresAt) < new Date()) {
            throw new Error("奖励已过期");
        }

        // 发放金币
        if (reward.coins > 0) {
            await ctx.runMutation((internal as any)["service/prop/inventoryManager"].updateCoins, {
                uid: reward.uid,
                amount: reward.coins,
                reason: "段位奖励"
            });
        }

        // 发放道具
        if (reward.props && reward.props.length > 0) {
            await ctx.runMutation((internal as any)["service/prop/inventoryManager"].addProps, {
                uid: reward.uid,
                props: reward.props
            });
        }

        // 发放门票
        if (reward.tickets && reward.tickets.length > 0) {
            for (const ticket of reward.tickets) {
                await ctx.runMutation((internal as any)["service/ticket/ticketManager"].grantTicketToPlayer, {
                    uid: reward.uid,
                    templateId: `${ticket.tournamentType}_${ticket.gameType}`,
                    quantity: ticket.quantity,
                    source: "segment_reward"
                });
            }
        }

        // 标记为已领取
        await ctx.db.patch(rewardId, {
            claimed: true,
            claimedAt: now.iso
        });

        return {
            success: true,
            rewardId,
            coins: reward.coins,
            props: reward.props,
            tickets: reward.tickets,
            message: "奖励领取成功"
        };
    }

    /**
     * 获取奖励历史
     */
    static async getRewardHistory(ctx: any, uid: string, limit: number = 50) {
        const rewards = await ctx.db
            .query("segment_rewards")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .order("desc")
            .take(limit);

        // 获取段位信息
        const segmentIds = [...new Set(rewards.map(r => r.segmentId))];
        const segments = await Promise.all(
            segmentIds.map(id =>
                ctx.db.query("segments")
                    .withIndex("by_segmentId", (q: any) => q.eq("segmentId", id))
                    .first()
            )
        );

        const segmentMap = new Map();
        segments.forEach(segment => {
            if (segment) segmentMap.set(segment.segmentId, segment);
        });

        const rewardHistory = rewards.map(reward => ({
            ...reward,
            segmentName: segmentMap.get(reward.segmentId)?.name || "未知段位",
            segmentColor: segmentMap.get(reward.segmentId)?.color || "#000000"
        }));

        return {
            success: true,
            rewards: rewardHistory,
            total: rewardHistory.length,
            claimed: rewardHistory.filter(r => r.claimed).length,
            unclaimed: rewardHistory.filter(r => !r.claimed).length
        };
    }
}

// ===== Convex 函数接口 =====

// 发放晋级奖励
export const grantPromotionReward = (mutation as any)({
    args: {
        uid: v.string(),
        gameType: v.string(),
        oldSegment: v.string(),
        newSegment: v.string()
    },
    handler: async (ctx: any, args: any) => {
        return await SegmentRewardManager.grantPromotionReward(
            ctx,
            args.uid,
            args.gameType,
            args.oldSegment,
            args.newSegment
        );
    }
});

// 发放每日段位奖励
export const grantDailySegmentReward = (mutation as any)({
    args: {
        uid: v.string(),
        gameType: v.string()
    },
    handler: async (ctx: any, args: any) => {
        return await SegmentRewardManager.grantDailySegmentReward(
            ctx,
            args.uid,
            args.gameType
        );
    }
});

// 发放赛季结束奖励
export const grantSeasonEndReward = (mutation as any)({
    args: {
        uid: v.string(),
        gameType: v.string(),
        seasonId: v.string()
    },
    handler: async (ctx: any, args: any) => {
        return await SegmentRewardManager.grantSeasonEndReward(
            ctx,
            args.uid,
            args.gameType,
            args.seasonId
        );
    }
});

// 获取可领取的奖励
export const getClaimableRewards = (query as any)({
    args: { uid: v.string() },
    handler: async (ctx: any, args: any) => {
        return await SegmentRewardManager.getClaimableRewards(ctx, args.uid);
    }
});

// 领取奖励
export const claimReward = (mutation as any)({
    args: { rewardId: v.string() },
    handler: async (ctx: any, args: any) => {
        return await SegmentRewardManager.claimReward(ctx, args.rewardId);
    }
});

// 获取奖励历史
export const getRewardHistory = (query as any)({
    args: {
        uid: v.string(),
        limit: v.optional(v.number())
    },
    handler: async (ctx: any, args: any) => {
        return await SegmentRewardManager.getRewardHistory(
            ctx,
            args.uid,
            args.limit || 50
        );
    }
});

// 批量发放每日段位奖励
export const grantDailyRewardsToAllPlayers = (mutation as any)({
    args: {},
    handler: async (ctx: any) => {
        const now = getTorontoDate();
        const gameTypes = ["solitaire", "ludo", "rummy"];
        const results = [];

        for (const gameType of gameTypes) {
            try {
                // 获取该游戏类型的所有玩家
                const playerSegments = await ctx.db
                    .query("player_segments")
                    .filter((q: any) => q.eq(q.field("gameType"), gameType))
                    .collect();

                let grantedCount = 0;
                for (const playerSegment of playerSegments) {
                    try {
                        await SegmentRewardManager.grantDailySegmentReward(
                            ctx,
                            playerSegment.uid,
                            gameType
                        );
                        grantedCount++;
                    } catch (error) {
                        console.error(`发放每日奖励失败 ${playerSegment.uid}:`, error);
                    }
                }

                results.push({
                    gameType,
                    success: true,
                    totalPlayers: playerSegments.length,
                    grantedCount
                });
            } catch (error) {
                results.push({
                    gameType,
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }

        return {
            success: true,
            results,
            totalGranted: results.reduce((sum, r) => sum + (r.grantedCount || 0), 0),
            message: "每日段位奖励发放完成"
        };
    }
}); 