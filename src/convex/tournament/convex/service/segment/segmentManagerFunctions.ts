/**
 * 段位管理器Convex函数
 * 提供段位升降、查询和管理的功能
 */

import { v } from "convex/values";
import { mutation, query } from "../../../_generated/server";
import { SegmentPromotionDemotionManager } from "./segmentPromotionDemotionManager";

// ==================== 段位查询函数 ====================

/**
 * 获取段位信息
 */
export const getSegmentInfo = query({
    args: { segmentName: v.string() },
    handler: async (ctx, args) => {
        return SegmentPromotionDemotionManager.getSegmentInfo(args.segmentName);
    }
});

/**
 * 获取所有可用段位
 */
export const getAvailableSegments = query({
    args: {},
    handler: async (ctx) => {
        return SegmentPromotionDemotionManager.getAvailableSegments();
    }
});

/**
 * 获取段位等级
 */
export const getSegmentTier = query({
    args: { segmentName: v.string() },
    handler: async (ctx, args) => {
        return SegmentPromotionDemotionManager.getSegmentTier(args.segmentName);
    }
});

/**
 * 获取段位颜色
 */
export const getSegmentColor = query({
    args: { segmentName: v.string() },
    handler: async (ctx, args) => {
        return SegmentPromotionDemotionManager.getSegmentColor(args.segmentName);
    }
});

/**
 * 获取段位图标
 */
export const getSegmentIcon = query({
    args: { segmentName: v.string() },
    handler: async (ctx, args) => {
        return SegmentPromotionDemotionManager.getSegmentIcon(args.segmentName);
    }
});

/**
 * 检查是否可以升级
 */
export const canPromote = query({
    args: { currentSegment: v.string() },
    handler: async (ctx, args) => {
        return SegmentPromotionDemotionManager.canPromote(args.currentSegment);
    }
});

/**
 * 检查是否可以降级
 */
export const canDemote = query({
    args: { currentSegment: v.string() },
    handler: async (ctx, args) => {
        return SegmentPromotionDemotionManager.canDemote(args.currentSegment);
    }
});

/**
 * 获取下一个段位
 */
export const getNextSegment = query({
    args: { currentSegment: v.string() },
    handler: async (ctx, args) => {
        return SegmentPromotionDemotionManager.getNextSegment(args.currentSegment);
    }
});

/**
 * 获取上一个段位
 */
export const getPreviousSegment = query({
    args: { currentSegment: v.string() },
    handler: async (ctx, args) => {
        return SegmentPromotionDemotionManager.getPreviousSegment(args.currentSegment);
    }
});

// ==================== 段位管理函数 ====================

/**
 * 手动检查段位变化
 */
export const checkSegmentChange = mutation({
    args: {
        uid: v.string(),
        newPoints: v.number()
    },
    handler: async (ctx, args) => {
        // 获取玩家性能指标
        const performanceMetrics = await ctx.db
            .query("player_performance_metrics")
            .withIndex("by_uid", (q) => q.eq("uid", args.uid))
            .unique();

        if (!performanceMetrics) {
            throw new Error("玩家性能指标未找到");
        }

        // 检查段位变化
        const segmentChange = await SegmentPromotionDemotionManager.checkSegmentChange(
            ctx,
            args.uid,
            args.newPoints,
            performanceMetrics
        );

        return segmentChange;
    }
});

/**
 * 手动升级玩家段位
 */
export const promotePlayerSegment = mutation({
    args: {
        uid: v.string(),
        targetSegment: v.string()
    },
    handler: async (ctx, args) => {
        // 获取当前段位
        const currentSegment = await ctx.db
            .query("player_performance_metrics")
            .withIndex("by_uid", (q) => q.eq("uid", args.uid))
            .unique();

        if (!currentSegment) {
            throw new Error("玩家数据未找到");
        }

        // 检查目标段位是否有效
        const segmentInfo = SegmentPromotionDemotionManager.getSegmentInfo(args.targetSegment);
        if (!segmentInfo) {
            throw new Error("目标段位无效");
        }

        // 检查是否可以升级到目标段位
        let currentSegmentName = currentSegment.segmentName;
        while (currentSegmentName !== args.targetSegment) {
            const nextSegment = SegmentPromotionDemotionManager.getNextSegment(currentSegmentName);
            if (!nextSegment) {
                throw new Error(`无法从 ${currentSegmentName} 升级到 ${args.targetSegment}`);
            }
            currentSegmentName = nextSegment;
        }

        // 执行升级
        const oldSegment = currentSegment.segmentName;

        // 更新段位
        await ctx.db.patch(currentSegment._id, {
            segmentName: args.targetSegment,
            lastUpdated: new Date().toISOString()
        });

        // 记录段位变化
        await ctx.db.insert("segment_change_history", {
            uid: args.uid,
            oldSegment,
            newSegment: args.targetSegment,
            changeType: "promotion",
            reason: "手动升级",
            createdAt: new Date().toISOString()
        });

        return {
            success: true,
            oldSegment,
            newSegment: args.targetSegment,
            message: `玩家已从 ${oldSegment} 升级到 ${args.targetSegment}`
        };
    }
});

/**
 * 手动降级玩家段位
 */
export const demotePlayerSegment = mutation({
    args: {
        uid: v.string(),
        targetSegment: v.string()
    },
    handler: async (ctx, args) => {
        // 获取当前段位
        const currentSegment = await ctx.db
            .query("player_performance_metrics")
            .withIndex("by_uid", (q) => q.eq("uid", args.uid))
            .unique();

        if (!currentSegment) {
            throw new Error("玩家数据未找到");
        }

        // 检查目标段位是否有效
        const segmentInfo = SegmentPromotionDemotionManager.getSegmentInfo(args.targetSegment);
        if (!segmentInfo) {
            throw new Error("目标段位无效");
        }

        // 检查是否可以降级到目标段位
        let currentSegmentName = currentSegment.segmentName;
        while (currentSegmentName !== args.targetSegment) {
            const previousSegment = SegmentPromotionDemotionManager.getPreviousSegment(currentSegmentName);
            if (!previousSegment) {
                throw new Error(`无法从 ${currentSegmentName} 降级到 ${args.targetSegment}`);
            }
            currentSegmentName = previousSegment;
        }

        // 执行降级
        const oldSegment = currentSegment.segmentName;

        // 更新段位
        await ctx.db.patch(currentSegment._id, {
            segmentName: args.targetSegment,
            lastUpdated: new Date().toISOString()
        });

        // 记录段位变化
        await ctx.db.insert("segment_change_history", {
            uid: args.uid,
            oldSegment,
            newSegment: args.targetSegment,
            changeType: "demotion",
            reason: "手动降级",
            createdAt: new Date().toISOString()
        });

        return {
            success: true,
            oldSegment,
            newSegment: args.targetSegment,
            message: `玩家已从 ${oldSegment} 降级到 ${args.targetSegment}`
        };
    }
});

// ==================== 段位统计函数 ====================

/**
 * 获取段位分布统计
 */
export const getSegmentDistribution = query({
    args: {},
    handler: async (ctx) => {
        const players = await ctx.db
            .query("player_performance_metrics")
            .collect();

        const distribution: Record<string, number> = {};
        const totalPlayers = players.length;

        for (const player of players) {
            const segment = player.segmentName || "unknown";
            distribution[segment] = (distribution[segment] || 0) + 1;
        }

        // 计算百分比
        const distributionWithPercentage: Record<string, { count: number; percentage: number }> = {};
        for (const [segment, count] of Object.entries(distribution)) {
            distributionWithPercentage[segment] = {
                count,
                percentage: totalPlayers > 0 ? (count / totalPlayers) * 100 : 0
            };
        }

        return {
            totalPlayers,
            distribution: distributionWithPercentage,
            segments: Object.keys(distribution)
        };
    }
});

/**
 * 获取段位变化历史
 */
export const getSegmentChangeHistory = query({
    args: {
        uid: v.optional(v.string()),
        limit: v.optional(v.number())
    },
    handler: async (ctx, args) => {
        let query = ctx.db.query("segment_change_history");

        if (args.uid) {
            query = query.withIndex("by_uid", (q) => q.eq("uid", args.uid));
        }

        const changes = await query
            .order("desc")
            .take(args.limit || 50);

        return changes;
    }
});

/**
 * 获取段位升级统计
 */
export const getPromotionStatistics = query({
    args: {
        timeRange: v.optional(v.union(v.literal("day"), v.literal("week"), v.literal("month")))
    },
    handler: async (ctx, args) => {
        const now = new Date();
        let startDate: Date;

        switch (args.timeRange) {
            case "day":
                startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                break;
            case "week":
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case "month":
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(0); // 所有时间
        }

        const changes = await ctx.db
            .query("segment_change_history")
            .filter((q) =>
                q.and(
                    q.eq(q.field("changeType"), "promotion"),
                    q.gte(q.field("createdAt"), startDate.toISOString())
                )
            )
            .collect();

        // 统计各段位的升级次数
        const promotionStats: Record<string, number> = {};
        for (const change of changes) {
            const segment = change.newSegment;
            promotionStats[segment] = (promotionStats[segment] || 0) + 1;
        }

        return {
            timeRange: args.timeRange || "all",
            totalPromotions: changes.length,
            segmentPromotions: promotionStats,
            changes: changes.slice(0, 10) // 返回最近10条记录
        };
    }
});

/**
 * 获取段位降级统计
 */
export const getDemotionStatistics = query({
    args: {
        timeRange: v.optional(v.union(v.literal("day"), v.literal("week"), v.literal("month")))
    },
    handler: async (ctx, args) => {
        const now = new Date();
        let startDate: Date;

        switch (args.timeRange) {
            case "day":
                startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                break;
            case "week":
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case "month":
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(0); // 所有时间
        }

        const changes = await ctx.db
            .query("segment_change_history")
            .filter((q) =>
                q.and(
                    q.eq(q.field("changeType"), "demotion"),
                    q.gte(q.field("createdAt"), startDate.toISOString())
                )
            )
            .collect();

        // 统计各段位的降级次数
        const demotionStats: Record<string, number> = {};
        for (const change of changes) {
            const segment = change.newSegment;
            demotionStats[segment] = (demotionStats[segment] || 0) + 1;
        }

        return {
            timeRange: args.timeRange || "all",
            totalDemotions: changes.length,
            segmentDemotions: demotionStats,
            changes: changes.slice(0, 10) // 返回最近10条记录
        };
    }
});

// ==================== 段位测试函数 ====================

/**
 * 测试段位升降系统
 */
export const testSegmentSystem = mutation({
    args: {},
    handler: async (ctx) => {
        const results = [];

        // 测试1: 获取所有段位信息
        const segments = SegmentPromotionDemotionManager.getAvailableSegments();
        results.push({
            test: "获取可用段位",
            result: segments,
            success: segments.length > 0
        });

        // 测试2: 检查段位升级路径
        const upgradePath = [];
        let currentSegment = "bronze";
        while (currentSegment) {
            upgradePath.push(currentSegment);
            currentSegment = SegmentPromotionDemotionManager.getNextSegment(currentSegment) || "";
        }
        results.push({
            test: "段位升级路径",
            result: upgradePath,
            success: upgradePath.length > 1
        });

        // 测试3: 检查段位降级路径
        const demotionPath = [];
        currentSegment = "grandmaster";
        while (currentSegment) {
            demotionPath.push(currentSegment);
            currentSegment = SegmentPromotionDemotionManager.getPreviousSegment(currentSegment) || "";
        }
        results.push({
            test: "段位降级路径",
            result: demotionPath,
            success: demotionPath.length > 1
        });

        // 测试4: 检查段位特性
        const segmentFeatures = [];
        for (const segment of segments.slice(0, 3)) { // 只测试前3个段位
            const info = SegmentPromotionDemotionManager.getSegmentInfo(segment);
            if (info) {
                segmentFeatures.push({
                    segment,
                    tier: info.tier,
                    color: info.color,
                    icon: info.icon,
                    canPromote: SegmentPromotionDemotionManager.canPromote(segment),
                    canDemote: SegmentPromotionDemotionManager.canDemote(segment)
                });
            }
        }
        results.push({
            test: "段位特性",
            result: segmentFeatures,
            success: segmentFeatures.length > 0
        });

        return {
            success: true,
            tests: results,
            summary: {
                totalTests: results.length,
                passedTests: results.filter(r => r.success).length,
                failedTests: results.filter(r => !r.success).length
            }
        };
    }
});

/**
 * 清理测试数据
 */
export const cleanupTestData = mutation({
    args: {
        pattern: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const pattern = args.pattern || "test_";
        let deletedCount = 0;

        // 清理测试玩家的段位变化历史
        const testChanges = await ctx.db
            .query("segment_change_history")
            .collect();

        for (const change of testChanges) {
            if (change.uid.startsWith(pattern)) {
                await ctx.db.delete(change._id);
                deletedCount++;
            }
        }

        return {
            success: true,
            deletedCount,
            message: `已清理 ${deletedCount} 条测试数据`
        };
    }
});
