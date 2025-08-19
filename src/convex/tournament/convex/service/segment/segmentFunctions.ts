/**
 * 段位系统Convex函数
 * 提供段位管理的所有功能接口
 */

import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { SegmentManager } from "./SegmentManager";
import {
    canDemote,
    canPromote,
    getAllSegmentNames,
    getNextSegment,
    getPreviousSegment,
    getSegmentColor,
    getSegmentDistance,
    getSegmentIcon,
    getSegmentPath,
    getSegmentRule,
    getSegmentTier
} from "./config";

// ==================== 段位查询函数 ====================

/**
 * 获取段位信息
 */
export const getSegmentInfo = query({
    args: { segmentName: v.string() },
    handler: async (ctx, args) => {
        return getSegmentRule(args.segmentName as any);
    }
});

/**
 * 获取所有可用段位
 */
export const getAvailableSegments = query({
    args: {},
    handler: async () => {
        return getAllSegmentNames();
    }
});

/**
 * 获取段位等级
 */
export const getSegmentTier = query({
    args: { segmentName: v.string() },
    handler: async (ctx, args) => {
        return getSegmentTier(args.segmentName as any);
    }
});

/**
 * 获取段位颜色
 */
export const getSegmentColor = query({
    args: { segmentName: v.string() },
    handler: async (ctx, args) => {
        return getSegmentColor(args.segmentName as any);
    }
});

/**
 * 获取段位图标
 */
export const getSegmentIcon = query({
    args: { segmentName: v.string() },
    handler: async (ctx, args) => {
        return getSegmentIcon(args.segmentName as any);
    }
});

/**
 * 检查是否可以升级
 */
export const canPromoteSegment = query({
    args: { currentSegment: v.string() },
    handler: async (ctx, args) => {
        return canPromote(args.currentSegment as any);
    }
});

/**
 * 检查是否可以降级
 */
export const canDemoteSegment = query({
    args: { currentSegment: v.string() },
    handler: async (ctx, args) => {
        return canDemote(args.currentSegment as any);
    }
});

/**
 * 获取下一个段位
 */
export const getNextSegment = query({
    args: { currentSegment: v.string() },
    handler: async (ctx, args) => {
        return getNextSegment(args.currentSegment as any);
    }
});

/**
 * 获取上一个段位
 */
export const getPreviousSegment = query({
    args: { currentSegment: v.string() },
    handler: async (ctx, args) => {
        return getPreviousSegment(args.currentSegment as any);
    }
});

/**
 * 获取段位路径
 */
export const getSegmentPath = query({
    args: { from: v.string(), to: v.string() },
    handler: async (ctx, args) => {
        return getSegmentPath(args.from as any, args.to as any);
    }
});

/**
 * 计算段位距离
 */
export const getSegmentDistance = query({
    args: { from: v.string(), to: v.string() },
    handler: async (ctx, args) => {
        return getSegmentDistance(args.from as any, args.to as any);
    }
});

// ==================== 玩家段位查询函数 ====================

/**
 * 获取玩家段位信息
 */
export const getPlayerSegmentInfo = query({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        const segmentManager = new SegmentManager(ctx);
        return await segmentManager.getPlayerSegmentInfo(args.uid);
    }
});

/**
 * 获取玩家保护状态
 */
export const getPlayerProtectionStatus = query({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        const segmentManager = new SegmentManager(ctx);
        return await segmentManager.getPlayerProtectionStatus(args.uid);
    }
});

/**
 * 获取玩家段位变化历史
 */
export const getPlayerSegmentHistory = query({
    args: { uid: v.string(), limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const segmentManager = new SegmentManager(ctx);
        return await segmentManager.getPlayerSegmentHistory(args.uid, args.limit || 10);
    }
});

// ==================== 段位管理函数 ====================

/**
 * 检查并处理段位变化
 */
export const checkAndProcessSegmentChange = mutation({
    args: {
        uid: v.string(),
        newPoints: v.number(),
        matchId: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const segmentManager = new SegmentManager(ctx);
        return await segmentManager.checkAndProcessSegmentChange(
            args.uid,
            args.newPoints,
            args.matchId
        );
    }
});

/**
 * 手动设置玩家段位
 */
export const setPlayerSegment = mutation({
    args: {
        uid: v.string(),
        segmentName: v.string(),
        reason: v.string()
    },
    handler: async (ctx, args) => {
        try {
            const segmentManager = new SegmentManager(ctx);

            // 获取当前段位信息
            const currentInfo = await segmentManager.getPlayerSegmentInfo(args.uid);
            if (!currentInfo) {
                return { success: false, error: "玩家不存在" };
            }

            // 记录手动段位变化
            const { SegmentChangeRecordAccess } = await import('./dataAccess');
            await SegmentChangeRecordAccess.recordSegmentChange(ctx, {
                uid: args.uid,
                oldSegment: currentInfo.currentSegment,
                newSegment: args.segmentName as any,
                changeType: "promotion", // 手动设置通常视为升级
                pointsConsumed: 0,
                reason: `手动设置: ${args.reason}`,
                matchId: undefined
            });

            // 更新玩家段位
            const { PlayerSegmentDataAccess } = await import('./dataAccess');
            const updateSuccess = await PlayerSegmentDataAccess.updatePlayerSegmentData(
                ctx,
                args.uid,
                { currentSegment: args.segmentName as any }
            );

            if (!updateSuccess) {
                return { success: false, error: "更新段位失败" };
            }

            return {
                success: true,
                message: `玩家段位已手动设置为 ${args.segmentName}`,
                oldSegment: currentInfo.currentSegment,
                newSegment: args.segmentName
            };

        } catch (error) {
            console.error("手动设置段位失败:", error);
            return {
                success: false,
                error: `设置失败: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }
});

/**
 * 重置玩家保护状态
 */
export const resetPlayerProtection = mutation({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        try {
            const { PlayerProtectionDataAccess } = await import('./dataAccess');
            const success = await PlayerProtectionDataAccess.resetProtectionStatus(ctx, args.uid);

            return {
                success,
                message: success ? "保护状态已重置" : "重置保护状态失败"
            };
        } catch (error) {
            console.error("重置保护状态失败:", error);
            return {
                success: false,
                error: `重置失败: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }
});

// ==================== 统计查询函数 ====================

/**
 * 获取段位分布统计
 */
export const getSegmentStatistics = query({
    args: {},
    handler: async (ctx) => {
        const segmentManager = new SegmentManager(ctx);
        return await segmentManager.getSegmentStatistics();
    }
});

/**
 * 获取最近的段位变化记录
 */
export const getRecentSegmentChanges = query({
    args: { limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const { SegmentChangeRecordAccess } = await import('./dataAccess');
        return await SegmentChangeRecordAccess.getRecentSegmentChanges(
            ctx,
            args.limit || 20
        );
    }
});

// ==================== 批量操作函数 ====================

/**
 * 批量检查玩家段位变化
 */
export const batchCheckSegmentChanges = mutation({
    args: {
        playerUpdates: v.array(v.object({
            uid: v.string(),
            newPoints: v.number(),
            matchId: v.optional(v.string())
        }))
    },
    handler: async (ctx, args) => {
        const segmentManager = new SegmentManager(ctx);
        const results = [];

        for (const update of args.playerUpdates) {
            try {
                const result = await segmentManager.checkAndProcessSegmentChange(
                    update.uid,
                    update.newPoints,
                    update.matchId
                );
                results.push({ uid: update.uid, ...result });
            } catch (error) {
                results.push({
                    uid: update.uid,
                    changed: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }

        return results;
    }
});

/**
 * 获取多个玩家的段位信息
 */
export const getMultiplePlayerSegmentInfo = query({
    args: { uids: v.array(v.string()) },
    handler: async (ctx, args) => {
        const segmentManager = new SegmentManager(ctx);
        const results = [];

        for (const uid of args.uids) {
            try {
                const info = await segmentManager.getPlayerSegmentInfo(uid);
                results.push({ uid, info });
            } catch (error) {
                results.push({
                    uid,
                    info: null,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }

        return results;
    }
});

// ==================== 系统配置函数 ====================

/**
 * 获取段位系统配置
 */
export const getSegmentSystemConfig = query({
    args: {},
    handler: async () => {
        const { SEGMENT_SYSTEM_CONFIG } = await import('./config');
        return SEGMENT_SYSTEM_CONFIG;
    }
});

/**
 * 获取段位规则配置
 */
export const getSegmentRules = query({
    args: {},
    handler: async () => {
        const { SEGMENT_RULES } = await import('./config');
        return SEGMENT_RULES;
    }
});
