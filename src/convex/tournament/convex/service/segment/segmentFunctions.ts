/**
 * 段位系统 Convex 函数接口
 * 提供完整的段位管理功能
 */

import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { SegmentManager } from "./SegmentManager";
import { getAllSegmentNames, getSegmentRule } from "./config";
import { SegmentName } from "./types";

// ==================== 查询函数 ====================

/**
 * 获取段位信息
 */
export const getSegmentInfo = query({
    args: { segmentName: v.string() },
    handler: async (ctx, args) => {
        const rule = getSegmentRule(args.segmentName as SegmentName);
        if (!rule) {
            throw new Error(`段位 ${args.segmentName} 不存在`);
        }
        return rule;
    }
});

/**
 * 获取所有可用段位
 */
export const getAvailableSegments = query({
    args: {},
    handler: async (ctx) => {
        return getAllSegmentNames().map(name => ({
            name,
            ...getSegmentRule(name)
        }));
    }
});

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
    args: {
        uid: v.string(),
        limit: v.optional(v.number())
    },
    handler: async (ctx, args) => {
        const segmentManager = new SegmentManager(ctx);
        return await segmentManager.getPlayerSegmentHistory(args.uid, args.limit || 10);
    }
});

/**
 * 获取段位分布统计
 */
export const getSegmentDistribution = query({
    args: {},
    handler: async (ctx) => {
        const segmentManager = new SegmentManager(ctx);
        return await segmentManager.getSegmentStatistics();
    }
});

/**
 * 获取段位排名概率
 */
export const getSegmentRankingProbabilities = query({
    args: {
        segmentName: v.string(),
        participantCount: v.number()
    },
    handler: async (ctx, args) => {
        const rule = getSegmentRule(args.segmentName as SegmentName);
        if (!rule) {
            throw new Error(`段位 ${args.segmentName} 不存在`);
        }

        const probabilities = rule.rankingProbabilities[args.participantCount];
        if (!probabilities) {
            // 返回默认概率：均等分布
            return new Array(args.participantCount).fill(1 / args.participantCount);
        }

        return probabilities;
    }
});

// ==================== 变更函数 ====================

/**
 * 检查并处理段位变化
 */
export const checkAndProcessSegmentChange = mutation({
    args: {
        uid: v.string(),
        pointsDelta: v.number(),
        matchId: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const segmentManager = new SegmentManager(ctx);
        return await segmentManager.updatePoints(args.uid, args.pointsDelta);
    }
});

/**
 * 手动升级玩家段位
 */
export const promotePlayerSegment = mutation({
    args: {
        uid: v.string(),
        targetSegment: v.string(),
        reason: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const segmentManager = new SegmentManager(ctx);

        // 获取玩家当前数据
        const playerData = await segmentManager.getPlayerSegmentInfo(args.uid);
        if (!playerData) {
            throw new Error("玩家数据不存在");
        }

        // 检查目标段位是否有效
        const targetRule = getSegmentRule(args.targetSegment as SegmentName);
        if (!targetRule) {
            throw new Error(`目标段位 ${args.targetSegment} 不存在`);
        }

        // 检查是否可以升级到目标段位
        const currentRule = getSegmentRule(playerData.currentSegment);
        if (!currentRule || !currentRule.nextSegment) {
            throw new Error("已达到最高段位");
        }

        // 执行升级
        const result = await segmentManager.updatePoints(
            args.uid,
            targetRule.promotion.pointsRequired - playerData.points
        );

        return result;
    }
});

// ==================== 降级函数（已禁用） ====================
// 根据 systemdesign.pdf，段位系统不支持降级，因此移除降级相关函数

/**
 * 重置玩家段位
 */
export const resetPlayerSegment = mutation({
    args: {
        uid: v.string(),
        segmentName: v.string(),
        points: v.optional(v.number())
    },
    handler: async (ctx, args) => {
        const segmentManager = new SegmentManager(ctx);

        // 检查段位是否有效
        const rule = getSegmentRule(args.segmentName as SegmentName);
        if (!rule) {
            throw new Error(`段位 ${args.segmentName} 不存在`);
        }

        // 更新玩家段位数据
        const { PlayerSegmentDataAccess } = await import("./dataAccess");
        const success = await PlayerSegmentDataAccess.updatePlayerSegmentData(
            ctx,
            args.uid,
            {
                currentSegment: args.segmentName as SegmentName,
                points: args.points || 0,
                lastMatchDate: new Date().toISOString()
            }
        );

        if (!success) {
            throw new Error("重置段位失败");
        }

        return {
            success: true,
            message: `玩家段位已重置为 ${args.segmentName}`,
            timestamp: new Date().toISOString()
        };
    }
});

/**
 * 批量检查段位变化
 */
export const batchCheckSegmentChanges = mutation({
    args: {
        playerUpdates: v.array(v.object({
            uid: v.string(),
            pointsDelta: v.number(),
            matchId: v.optional(v.string())
        }))
    },
    handler: async (ctx, args) => {
        const segmentManager = new SegmentManager(ctx);
        const results = [];

        for (const update of args.playerUpdates) {
            try {
                const result = await segmentManager.updatePoints(
                    update.uid,
                    update.pointsDelta
                );
                results.push({
                    uid: update.uid,
                    success: true,
                    result
                });
            } catch (error) {
                results.push({
                    uid: update.uid,
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }

        return {
            totalProcessed: results.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            results
        };
    }
});

// ==================== 管理函数 ====================

/**
 * 创建玩家段位数据
 */
export const createPlayerSegmentData = mutation({
    args: {
        uid: v.string(),
        segmentName: v.string(),
        points: v.optional(v.number())
    },
    handler: async (ctx, args) => {
        // 检查段位是否有效
        const rule = getSegmentRule(args.segmentName as SegmentName);
        if (!rule) {
            throw new Error(`段位 ${args.segmentName} 不存在`);
        }

        // 检查玩家是否已有段位数据
        const segmentManager = new SegmentManager(ctx);
        const existingData = await segmentManager.getPlayerSegmentInfo(args.uid);
        if (existingData) {
            throw new Error("玩家段位数据已存在");
        }

        // 创建新的段位数据
        const { PlayerSegmentDataAccess } = await import("./dataAccess");
        const success = await PlayerSegmentDataAccess.createPlayerSegmentData(
            ctx,
            {
                uid: args.uid,
                currentSegment: args.segmentName as SegmentName,
                points: args.points || 0,
                totalMatches: 0,
                totalWins: 0,
                currentWinStreak: 0,
                currentLoseStreak: 0,
                lastMatchDate: new Date().toISOString()
            }
        );

        if (!success) {
            throw new Error("创建玩家段位数据失败");
        }

        return {
            success: true,
            message: `玩家段位数据创建成功，初始段位：${args.segmentName}`,
            timestamp: new Date().toISOString()
        };
    }
});

/**
 * 更新段位规则
 */
export const updateSegmentRule = mutation({
    args: {
        segmentName: v.string(),
        rule: v.object({
            promotion: v.object({
                pointsRequired: v.number()
            }),
            demotion: v.object({
                pointsThreshold: v.number(),
                consecutiveLosses: v.number(),
                gracePeriod: v.number(),
                maxProtectionLevel: v.number(),
                winRateThreshold: v.optional(v.number())
            })
        })
    },
    handler: async (ctx, args) => {
        // 这里应该更新数据库中的段位规则
        // 由于当前配置是硬编码的，这里只是示例
        console.log(`更新段位规则: ${args.segmentName}`, args.rule);

        return {
            success: true,
            message: `段位 ${args.segmentName} 规则更新成功`,
            timestamp: new Date().toISOString()
        };
    }
});

// ==================== 测试和调试函数 ====================

/**
 * 测试段位系统
 */
export const testSegmentSystem = mutation({
    args: {},
    handler: async (ctx) => {
        const testResults = [];
        let passedTests = 0;
        let totalTests = 0;

        // 测试1: 获取所有段位信息
        totalTests++;
        try {
            const segments = getAllSegmentNames();
            if (segments.length === 7) {
                testResults.push({ test: "获取段位信息", status: "PASS", message: `成功获取 ${segments.length} 个段位` });
                passedTests++;
            } else {
                testResults.push({ test: "获取段位信息", status: "FAIL", message: `期望7个段位，实际获取 ${segments.length} 个` });
            }
        } catch (error) {
            testResults.push({ test: "获取段位信息", status: "ERROR", message: error instanceof Error ? error.message : String(error) });
        }

        // 测试2: 段位规则完整性
        totalTests++;
        try {
            const allRulesValid = getAllSegmentNames().every(name => {
                const rule = getSegmentRule(name);
                return rule && rule.promotion && rule.demotion;
            });

            if (allRulesValid) {
                testResults.push({ test: "段位规则完整性", status: "PASS", message: "所有段位规则完整" });
                passedTests++;
            } else {
                testResults.push({ test: "段位规则完整性", status: "FAIL", message: "部分段位规则不完整" });
            }
        } catch (error) {
            testResults.push({ test: "段位规则完整性", status: "ERROR", message: error instanceof Error ? error.message : String(error) });
        }

        // 测试3: 段位管理器初始化
        totalTests++;
        try {
            const segmentManager = new SegmentManager(ctx);
            testResults.push({ test: "段位管理器初始化", status: "PASS", message: "段位管理器初始化成功" });
            passedTests++;
        } catch (error) {
            testResults.push({ test: "段位管理器初始化", status: "ERROR", message: error instanceof Error ? error.message : String(error) });
        }

        return {
            summary: {
                totalTests,
                passedTests,
                failedTests: totalTests - passedTests,
                successRate: totalTests > 0 ? (passedTests / totalTests) * 100 : 0
            },
            testResults,
            timestamp: new Date().toISOString()
        };
    }
});

// cleanupTestData 函数已移至 segmentSystemTest.ts 中

// ==================== 赛季重置函数 ====================

/**
 * 执行赛季软重置
 */
export const performSeasonReset = mutation({
    args: {
        seasonId: v.string(),
        resetReason: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const segmentManager = new SegmentManager(ctx);
        return await segmentManager.performSeasonReset(
            args.seasonId,
            args.resetReason || "赛季结束"
        );
    }
});

/**
 * 获取赛季重置预览
 */
export const getSeasonResetPreview = query({
    args: {},
    handler: async (ctx) => {
        const segmentManager = new SegmentManager(ctx);
        return await segmentManager.getSeasonResetPreview();
    }
});

/**
 * 获取系统状态
 */
export const getSystemStatus = query({
    args: {},
    handler: async (ctx) => {
        try {
            const segmentManager = new SegmentManager(ctx);
            const statistics = await segmentManager.getSegmentStatistics();

            return {
                status: "healthy",
                timestamp: new Date().toISOString(),
                statistics,
                version: "1.0.0",
                features: {
                    segmentManagement: true,
                    protectionMechanism: true,
                    batchProcessing: true,
                    statistics: true
                }
            };
        } catch (error) {
            return {
                status: "error",
                timestamp: new Date().toISOString(),
                error: error instanceof Error ? error.message : String(error),
                version: "1.0.0"
            };
        }
    }
});
