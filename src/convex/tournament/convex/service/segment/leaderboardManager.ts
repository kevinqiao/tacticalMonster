// @ts-nocheck
import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { getTorontoDate } from "../utils";

// 排行榜管理器
export class LeaderboardManager {

    /**
     * 更新排行榜
     */
    static async updateLeaderboard(ctx: any, gameType: string) {
        const now = getTorontoDate();

        // 获取所有玩家段位信息
        const playerSegments = await ctx.db
            .query("player_segments")
            .filter((q: any) => q.eq(q.field("gameType"), gameType))
            .collect();

        // 按段位分组
        const segmentGroups = new Map();
        for (const playerSegment of playerSegments) {
            if (!segmentGroups.has(playerSegment.currentSegment)) {
                segmentGroups.set(playerSegment.currentSegment, []);
            }
            segmentGroups.get(playerSegment.currentSegment).push(playerSegment);
        }

        // 计算全局排名
        const allPlayers = playerSegments.sort((a: any, b: any) => b.currentPoints - a.currentPoints);
        const globalRankMap = new Map();
        allPlayers.forEach((player: any, index: number) => {
            globalRankMap.set(player.uid, index + 1);
        });

        // 更新每个段位的排行榜
        for (const [segmentId, players] of segmentGroups) {
            // 按积分排序
            const sortedPlayers = players.sort((a: any, b: any) => b.currentPoints - a.currentPoints);

            for (let i = 0; i < sortedPlayers.length; i++) {
                const player = sortedPlayers[i];
                const rank = i + 1;
                const globalRank = globalRankMap.get(player.uid);

                // 检查是否已存在排行榜记录
                const existingLeaderboard = await ctx.db
                    .query("segment_leaderboards")
                    .withIndex("by_game_segment", (q: any) =>
                        q.eq("gameType", gameType).eq("segmentId", segmentId)
                    )
                    .filter((q: any) => q.eq(q.field("uid"), player.uid))
                    .first();

                if (existingLeaderboard) {
                    // 更新现有记录
                    await ctx.db.patch(existingLeaderboard._id, {
                        points: player.currentPoints,
                        rank,
                        globalRank,
                        totalMatches: player.totalMatches,
                        winRate: player.winRate,
                        lastActiveAt: now.iso,
                        updatedAt: now.iso
                    });
                } else {
                    // 创建新记录
                    await ctx.db.insert("segment_leaderboards", {
                        gameType,
                        segmentId,
                        uid: player.uid,
                        points: player.currentPoints,
                        rank,
                        globalRank,
                        totalMatches: player.totalMatches,
                        winRate: player.winRate,
                        lastActiveAt: now.iso,
                        updatedAt: now.iso
                    });
                }
            }
        }

        return {
            success: true,
            gameType,
            totalPlayers: playerSegments.length,
            segmentsUpdated: segmentGroups.size,
            message: `排行榜更新完成`
        };
    }

    /**
     * 获取段位排行榜
     */
    static async getSegmentLeaderboard(ctx: any, gameType: string, segmentId: string, limit: number = 50) {
        const leaderboard = await ctx.db
            .query("segment_leaderboards")
            .withIndex("by_game_segment", (q: any) =>
                q.eq("gameType", gameType).eq("segmentId", segmentId)
            )
            .order("asc")
            .take(limit);

        // 获取玩家详细信息
        const playerDetails = await Promise.all(
            leaderboard.map(async (entry: any) => {
                const player = await ctx.db
                    .query("players")
                    .withIndex("by_uid", (q: any) => q.eq("uid", entry.uid))
                    .first();

                return {
                    ...entry,
                    playerName: player?.name || "未知玩家",
                    avatar: player?.avatar || "/avatars/default.png"
                };
            })
        );

        return {
            success: true,
            gameType,
            segmentId,
            leaderboard: playerDetails,
            total: leaderboard.length
        };
    }

    /**
     * 获取全局排行榜
     */
    static async getGlobalLeaderboard(ctx: any, gameType: string, limit: number = 100) {
        const leaderboard = await ctx.db
            .query("segment_leaderboards")
            .filter((q: any) => q.eq(q.field("gameType"), gameType))
            .order("asc")
            .take(limit);

        // 获取玩家详细信息
        const playerDetails = await Promise.all(
            leaderboard.map(async (entry: any) => {
                const player = await ctx.db
                    .query("players")
                    .withIndex("by_uid", (q: any) => q.eq("uid", entry.uid))
                    .first();

                const segment = await ctx.db
                    .query("segments")
                    .withIndex("by_segmentId", (q: any) => q.eq("segmentId", entry.segmentId))
                    .first();

                return {
                    ...entry,
                    playerName: player?.name || "未知玩家",
                    avatar: player?.avatar || "/avatars/default.png",
                    segmentName: segment?.name || "未知段位",
                    segmentColor: segment?.color || "#000000"
                };
            })
        );

        return {
            success: true,
            gameType,
            leaderboard: playerDetails,
            total: leaderboard.length
        };
    }

    /**
     * 获取玩家排名信息
     */
    static async getPlayerRanking(ctx: any, uid: string, gameType: string) {
        const playerSegment = await ctx.db
            .query("player_segments")
            .withIndex("by_uid_game", (q: any) => q.eq("uid", uid).eq("gameType", gameType))
            .first();

        if (!playerSegment) {
            throw new Error("玩家段位信息不存在");
        }

        const leaderboardEntry = await ctx.db
            .query("segment_leaderboards")
            .withIndex("by_game_segment", (q: any) =>
                q.eq("gameType", gameType).eq("segmentId", playerSegment.currentSegment)
            )
            .filter((q: any) => q.eq(q.field("uid"), uid))
            .first();

        const segment = await ctx.db
            .query("segments")
            .withIndex("by_segmentId", (q: any) => q.eq("segmentId", playerSegment.currentSegment))
            .first();

        return {
            success: true,
            uid,
            gameType,
            currentSegment: playerSegment.currentSegment,
            segmentName: segment?.name || "未知段位",
            segmentColor: segment?.color || "#000000",
            currentPoints: playerSegment.currentPoints,
            segmentRank: leaderboardEntry?.rank || 0,
            globalRank: leaderboardEntry?.globalRank || 0,
            totalMatches: playerSegment.totalMatches,
            winRate: playerSegment.winRate,
            streak: playerSegment.streak,
            streakType: playerSegment.streakType
        };
    }

    /**
     * 获取排行榜统计信息
     */
    static async getLeaderboardStats(ctx: any, gameType: string) {
        const leaderboard = await ctx.db
            .query("segment_leaderboards")
            .filter((q: any) => q.eq(q.field("gameType"), gameType))
            .collect();

        const segments = await ctx.db.query("segments").collect();

        // 按段位统计
        const segmentStats = segments.map(segment => {
            const segmentPlayers = leaderboard.filter(entry => entry.segmentId === segment.segmentId);
            return {
                segmentId: segment.segmentId,
                name: segment.name,
                playerCount: segmentPlayers.length,
                averagePoints: segmentPlayers.length > 0 ?
                    segmentPlayers.reduce((sum, entry) => sum + entry.points, 0) / segmentPlayers.length : 0,
                averageWinRate: segmentPlayers.length > 0 ?
                    segmentPlayers.reduce((sum, entry) => sum + entry.winRate, 0) / segmentPlayers.length : 0
            };
        });

        return {
            success: true,
            gameType,
            totalPlayers: leaderboard.length,
            segmentStats,
            summary: {
                highestPoints: Math.max(...leaderboard.map(entry => entry.points)),
                averagePoints: leaderboard.reduce((sum, entry) => sum + entry.points, 0) / leaderboard.length,
                averageWinRate: leaderboard.reduce((sum, entry) => sum + entry.winRate, 0) / leaderboard.length
            }
        };
    }
}

// ===== Convex 函数接口 =====

// 更新排行榜
export const updateLeaderboard = (mutation as any)({
    args: { gameType: v.string() },
    handler: async (ctx: any, args: any) => {
        return await LeaderboardManager.updateLeaderboard(ctx, args.gameType);
    }
});

// 获取段位排行榜
export const getSegmentLeaderboard = (query as any)({
    args: {
        gameType: v.string(),
        segmentId: v.string(),
        limit: v.optional(v.number())
    },
    handler: async (ctx: any, args: any) => {
        return await LeaderboardManager.getSegmentLeaderboard(
            ctx,
            args.gameType,
            args.segmentId,
            args.limit || 50
        );
    }
});

// 获取全局排行榜
export const getGlobalLeaderboard = (query as any)({
    args: {
        gameType: v.string(),
        limit: v.optional(v.number())
    },
    handler: async (ctx: any, args: any) => {
        return await LeaderboardManager.getGlobalLeaderboard(
            ctx,
            args.gameType,
            args.limit || 100
        );
    }
});

// 获取玩家排名信息
export const getPlayerRanking = (query as any)({
    args: {
        uid: v.string(),
        gameType: v.string()
    },
    handler: async (ctx: any, args: any) => {
        return await LeaderboardManager.getPlayerRanking(
            ctx,
            args.uid,
            args.gameType
        );
    }
});

// 获取排行榜统计信息
export const getLeaderboardStats = (query as any)({
    args: { gameType: v.string() },
    handler: async (ctx: any, args: any) => {
        return await LeaderboardManager.getLeaderboardStats(ctx, args.gameType);
    }
});

// 批量更新所有游戏类型的排行榜
export const updateAllLeaderboards = (mutation as any)({
    args: {},
    handler: async (ctx: any) => {
        const gameTypes = ["solitaire", "ludo", "rummy"];
        const results = [];

        for (const gameType of gameTypes) {
            try {
                const result = await LeaderboardManager.updateLeaderboard(ctx, gameType);
                results.push({ gameType, ...result });
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
            totalUpdated: results.filter(r => r.success).length,
            totalFailed: results.filter(r => !r.success).length
        };
    }
}); 