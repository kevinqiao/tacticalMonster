// @ts-nocheck
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { mutation, query } from "../../_generated/server";

// ===== 游戏集成示例 =====

// 1. 单人游戏（纸牌接龙）- 延迟扣除
export const solitaireGameExample = mutation({
    args: {
        uid: v.string(),
        gameId: v.string(),
        action: v.union(v.literal("use_hint"), v.literal("use_undo"), v.literal("use_shuffle"), v.literal("submit_score"))
    },
    handler: async (ctx, args) => {
        const { uid, gameId, action } = args;

        switch (action) {
            case "use_hint":
                // 使用提示道具 - 延迟扣除
                return await ctx.runMutation(internal.service.prop.smartPropUsage.usePropSmart, {
                    uid,
                    gameType: "solitaire",
                    propType: "hint",
                    gameState: { /* 当前游戏状态 */ },
                    gameId,
                    // 单人游戏自动使用延迟扣除
                    isRealTime: false,
                    isMultiplayer: false
                });

            case "use_undo":
                // 使用撤销道具 - 延迟扣除
                return await ctx.runMutation(internal.service.prop.smartPropUsage.usePropSmart, {
                    uid,
                    gameType: "solitaire",
                    propType: "undo",
                    gameState: { /* 当前游戏状态 */ },
                    gameId,
                    isRealTime: false,
                    isMultiplayer: false
                });

            case "use_shuffle":
                // 使用洗牌道具 - 延迟扣除
                return await ctx.runMutation(internal.service.prop.smartPropUsage.usePropSmart, {
                    uid,
                    gameType: "solitaire",
                    propType: "shuffle",
                    gameState: { /* 当前游戏状态 */ },
                    gameId,
                    isRealTime: false,
                    isMultiplayer: false
                });

            case "submit_score":
                // 提交分数时执行延迟扣除
                const gameResult = { score: 1500, completed: true };

                // 执行延迟扣除
                const deductionResult = await ctx.runMutation(internal["service/prop/unifiedPropManager"].executeDelayedDeduction, {
                    gameId,
                    uid,
                    gameResult
                });

                // 提交分数到锦标赛
                await ctx.runMutation(internal.service.tournaments.submitScore, {
                    uid,
                    tournamentId: "tournament123",
                    score: gameResult.score,
                    gameId
                });

                return {
                    success: true,
                    scoreSubmitted: true,
                    deductionResult,
                    message: "游戏完成，道具已扣除"
                };
        }
    }
});

// 2. 实时多人游戏（飞行棋）- 实时扣除
export const ludoGameExample = mutation({
    args: {
        uid: v.string(),
        gameId: v.string(),
        action: v.union(v.literal("use_dice_boost"), v.literal("use_double_move"), v.literal("use_shield"), v.literal("game_end"))
    },
    handler: async (ctx, args) => {
        const { uid, gameId, action } = args;

        switch (action) {
            case "use_dice_boost":
                // 使用骰子增强道具 - 实时扣除
                return await ctx.runMutation(internal.service.prop.smartPropUsage.usePropSmart, {
                    uid,
                    gameType: "ludo",
                    propType: "dice_boost",
                    gameState: { /* 当前游戏状态 */ },
                    gameId,
                    // 实时多人游戏强制使用实时扣除
                    isRealTime: true,
                    isMultiplayer: true
                });

            case "use_double_move":
                // 使用双倍移动道具 - 实时扣除
                return await ctx.runMutation(internal.service.prop.smartPropUsage.usePropSmart, {
                    uid,
                    gameType: "ludo",
                    propType: "double_move",
                    gameState: { /* 当前游戏状态 */ },
                    gameId,
                    isRealTime: true,
                    isMultiplayer: true
                });

            case "use_shield":
                // 使用护盾道具 - 实时扣除
                return await ctx.runMutation(internal.service.prop.smartPropUsage.usePropSmart, {
                    uid,
                    gameType: "ludo",
                    propType: "shield",
                    gameState: { /* 当前游戏状态 */ },
                    gameId,
                    isRealTime: true,
                    isMultiplayer: true
                });

            case "game_end":
                // 游戏结束 - 实时游戏不需要执行延迟扣除
                const gameResult = { winner: uid, finalPosition: 1 };

                // 提交游戏结果
                await ctx.runMutation(internal.service.tournaments.submitScore, {
                    uid,
                    tournamentId: "tournament456",
                    score: 1000,
                    gameId
                });

                return {
                    success: true,
                    gameEnded: true,
                    winner: uid,
                    message: "游戏结束，道具已在使用时实时扣除"
                };
        }
    }
});

// 3. 实时卡牌游戏（拉米）- 实时扣除
export const rummyGameExample = mutation({
    args: {
        uid: v.string(),
        gameId: v.string(),
        action: v.union(v.literal("use_peek"), v.literal("use_swap"), v.literal("use_joker"), v.literal("game_end"))
    },
    handler: async (ctx, args) => {
        const { uid, gameId, action } = args;

        switch (action) {
            case "use_peek":
                // 使用偷看道具 - 实时扣除
                return await ctx.runMutation(internal.service.prop.smartPropUsage.usePropSmart, {
                    uid,
                    gameType: "rummy",
                    propType: "peek",
                    gameState: { /* 当前游戏状态 */ },
                    gameId,
                    isRealTime: true,
                    isMultiplayer: true
                });

            case "use_swap":
                // 使用换牌道具 - 实时扣除
                return await ctx.runMutation(internal.service.prop.smartPropUsage.usePropSmart, {
                    uid,
                    gameType: "rummy",
                    propType: "swap",
                    gameState: { /* 当前游戏状态 */ },
                    gameId,
                    isRealTime: true,
                    isMultiplayer: true
                });

            case "use_joker":
                // 使用万能牌道具 - 实时扣除
                return await ctx.runMutation(internal.service.prop.smartPropUsage.usePropSmart, {
                    uid,
                    gameType: "rummy",
                    propType: "joker",
                    gameState: { /* 当前游戏状态 */ },
                    gameId,
                    isRealTime: true,
                    isMultiplayer: true
                });

            case "game_end":
                // 游戏结束
                const gameResult = { winner: uid, score: 500 };

                await ctx.runMutation(internal.service.tournaments.submitScore, {
                    uid,
                    tournamentId: "tournament789",
                    score: gameResult.score,
                    gameId
                });

                return {
                    success: true,
                    gameEnded: true,
                    winner: uid,
                    message: "游戏结束，道具已在使用时实时扣除"
                };
        }
    }
});

// 4. 游戏中断处理
export const handleGameInterruption = mutation({
    args: {
        uid: v.string(),
        gameId: v.string(),
        gameType: v.string(),
        reason: v.string()
    },
    handler: async (ctx, args) => {
        const { uid, gameId, gameType, reason } = args;

        // 取消延迟扣除
        const cancelResult = await ctx.runMutation(internal["service/prop/unifiedPropManager"].cancelDelayedDeduction, {
            gameId,
            uid,
            reason
        });

        // 记录游戏中断
        await ctx.db.insert("game_interruptions", {
            uid,
            gameId,
            gameType,
            reason,
            cancelledDeductions: cancelResult.cancelledCount,
            createdAt: new Date().toISOString()
        });

        return {
            success: true,
            gameInterrupted: true,
            cancelResult,
            message: `游戏中断，已取消 ${cancelResult.cancelledCount} 个延迟扣除记录`
        };
    }
});

// 5. 批量道具使用示例
export const batchPropUsageExample = mutation({
    args: {
        uid: v.string(),
        gameType: v.string(),
        gameId: v.string(),
        props: v.array(v.object({
            propType: v.string(),
            params: v.optional(v.any())
        })),
        isRealTime: v.optional(v.boolean()),
        isMultiplayer: v.optional(v.boolean())
    },
    handler: async (ctx, args) => {
        const { uid, gameType, gameId, props, isRealTime, isMultiplayer } = args;

        // 批量使用道具
        const result = await ctx.runMutation(internal.service.prop.smartPropUsage.useMultiplePropsSmart, {
            uid,
            gameType,
            props,
            gameState: { /* 当前游戏状态 */ },
            gameId,
            isRealTime,
            isMultiplayer
        });

        return {
            success: true,
            batchResult: result,
            message: `批量使用了 ${result.totalPropsUsed} 个道具`
        };
    }
});

// 6. 道具使用历史查询
export const getPlayerPropHistory = query({
    args: {
        uid: v.string(),
        gameType: v.optional(v.string()),
        limit: v.optional(v.number())
    },
    handler: async (ctx, args) => {
        const { uid, gameType, limit = 20 } = args;

        // 获取道具使用历史
        const usageHistory = await ctx.runQuery(internal["service/prop/unifiedPropManager"].getPropUsageHistory, {
            uid,
            gameType,
            limit
        });

        // 获取延迟扣除记录
        const delayedDeductions = await ctx.runQuery(internal["service/prop/unifiedPropManager"].getDelayedPropDeductions, {
            uid,
            status: "pending"
        });

        return {
            success: true,
            usageHistory,
            pendingDeductions: delayedDeductions,
            summary: {
                totalUsage: usageHistory.length,
                pendingDeductions: delayedDeductions.length,
                byGameType: usageHistory.reduce((acc, usage) => {
                    acc[usage.gameType] = (acc[usage.gameType] || 0) + 1;
                    return acc;
                }, {}),
                byDeductionMode: usageHistory.reduce((acc, usage) => {
                    acc[usage.deductionMode] = (acc[usage.deductionMode] || 0) + 1;
                    return acc;
                }, {})
            }
        };
    }
});

// 7. 道具使用统计
export const getPropUsageStats = query({
    args: {
        uid: v.string(),
        gameType: v.optional(v.string()),
        timeRange: v.optional(v.union(v.literal("day"), v.literal("week"), v.literal("month")))
    },
    handler: async (ctx, args) => {
        const { uid, gameType, timeRange = "week" } = args;

        // 获取道具使用历史
        const usageHistory = await ctx.runQuery(internal["service/prop/unifiedPropManager"].getPropUsageHistory, {
            uid,
            gameType,
            limit: 1000 // 获取更多数据用于统计
        });

        // 按时间范围过滤
        const now = new Date();
        const timeRanges = {
            day: new Date(now.getTime() - 24 * 60 * 60 * 1000),
            week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
            month: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        };

        const filteredHistory = usageHistory.filter(usage =>
            new Date(usage.createdAt) >= timeRanges[timeRange]
        );

        // 统计分析
        const stats = {
            totalUsage: filteredHistory.length,
            byPropType: filteredHistory.reduce((acc, usage) => {
                acc[usage.propType] = (acc[usage.propType] || 0) + 1;
                return acc;
            }, {}),
            byGameType: filteredHistory.reduce((acc, usage) => {
                acc[usage.gameType] = (acc[usage.gameType] || 0) + 1;
                return acc;
            }, {}),
            byDeductionMode: filteredHistory.reduce((acc, usage) => {
                acc[usage.deductionMode] = (acc[usage.deductionMode] || 0) + 1;
                return acc;
            }, {}),
            timeRange,
            period: {
                start: timeRanges[timeRange].toISOString(),
                end: now.toISOString()
            }
        };

        return {
            success: true,
            stats,
            usageHistory: filteredHistory
        };
    }
});

// 8. 游戏类型推荐策略查询
export const getGameRecommendations = query({
    args: {
        gameType: v.string()
    },
    handler: async (ctx, args) => {
        const { gameType } = args;

        // 获取游戏策略建议
        const strategy = await ctx.runQuery(internal.service.prop.smartPropUsage.getGamePropStrategy, {
            gameType,
            includeExamples: true
        });

        // 获取道具使用建议
        const advice = await ctx.runQuery(internal.service.prop.smartPropUsage.getPropUsageAdvice, {
            gameType
        });

        return {
            success: true,
            gameType,
            strategy,
            advice,
            recommendations: {
                bestMode: strategy.recommended.mode,
                reason: strategy.recommended.reason,
                bestPractices: strategy.strategy.bestPractices,
                considerations: strategy.strategy.considerations
            }
        };
    }
}); 