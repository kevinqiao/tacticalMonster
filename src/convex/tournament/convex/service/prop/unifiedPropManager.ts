import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { mutation, query } from "../../_generated/server";
import { getTorontoDate } from "../utils";
import { getPropEffect, getPropType } from "./propManager";

// 道具使用配置
export interface PropUsageConfig {
    mode: "immediate" | "delayed";
    gameId?: string;
    gameType: string;
    uid: string;
    propType: string;
    gameState: any;
    params?: any;
}

// 统一道具使用管理器
export class UnifiedPropManager {

    /**
     * 使用道具（支持实时和延迟两种模式）
     */
    static async useProp(ctx: any, config: PropUsageConfig) {
        const { mode, gameId, gameType, uid, propType, gameState, params } = config;
        const now = getTorontoDate();
        // 1. 验证道具使用
        const validation = await ctx.runMutation((internal as any)["service/prop/propManager"].validatePropUsage, {
            uid,
            gameType,
            propType,
            gameState
        });

        // 2. 应用道具效果
        const effect = getPropEffect(propType);
        let newGameState = gameState;

        if (effect) {
            newGameState = effect.effect(gameState, params);
        }

        // 3. 根据模式处理道具扣除
        let deductionId = null;

        if (mode === "immediate") {
            // 实时扣除模式
            await UnifiedPropManager.deductPropImmediately(ctx, uid, gameType, propType);
        } else {
            // 延迟扣除模式
            if (gameId) {
                deductionId = await UnifiedPropManager.recordDelayedDeduction(ctx, uid, gameId, gameType, propType);
            }
        }

        // 4. 记录道具使用日志
        const logData: any = {
            uid,
            gameType,
            propType,
            gameState: gameState,
            newGameState: newGameState,
            params,
            deductionMode: mode,
            gameId,
            createdAt: now.iso
        };

        // 只有在延迟扣除模式下才添加 deductionId
        if (deductionId) {
            logData.deductionId = deductionId;
        }

        await ctx.db.insert("prop_usage_logs", logData);

        return {
            success: true,
            newGameState,
            propUsed: propType,
            effectApplied: !!effect,
            deductionMode: mode,
            message: mode === "immediate" ? "道具已使用并扣除" : "道具已使用，将在游戏结束时扣除"
        };
    }

    /**
     * 批量使用道具
     */
    static async useMultipleProps(ctx: any, config: Omit<PropUsageConfig, 'propType'> & { props: Array<{ propType: string; params?: any }> }) {
        const { mode, gameId, gameType, uid, props, gameState } = config as any;
        const now = getTorontoDate();
        let currentGameState = gameState;
        const usedProps: any[] = [];
        const propsToDeduct: any[] = [];

        for (const prop of props) {
            try {
                // 验证道具使用
                const validation = await ctx.runMutation((internal as any)["service/prop/propManager"].validatePropUsage, {
                    uid,
                    gameType,
                    propType: prop.propType,
                    gameState: currentGameState
                });

                // 应用道具效果
                const effect = getPropEffect(prop.propType);
                if (effect) {
                    currentGameState = effect.effect(currentGameState, prop.params);
                }

                usedProps.push({
                    propType: prop.propType,
                    success: true,
                    effectApplied: !!effect
                });

                propsToDeduct.push({
                    propType: prop.propType,
                    quantity: 1,
                    usedAt: now.iso,
                    gameState: currentGameState
                });

            } catch (error) {
                usedProps.push({
                    propType: prop.propType,
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }

        let deductionId = null;

        if (mode === "immediate") {
            // 实时扣除所有成功使用的道具
            for (const prop of propsToDeduct) {
                await UnifiedPropManager.deductPropImmediately(ctx, uid, gameType, prop.propType);
            }
        } else if (propsToDeduct.length > 0 && gameId) {
            // 延迟扣除
            deductionId = await UnifiedPropManager.recordDelayedDeduction(ctx, uid, gameId, gameType, propsToDeduct);
        }
        const success = propsToDeduct.length > 0;
        return {
            success: true,
            finalGameState: currentGameState as any,
            usedProps: usedProps as any,
            deductionMode: mode,
            deductionId,
            totalPropsUsed: success ? propsToDeduct.length : 0
        };
    }

    /**
     * 实时扣除道具
     */
    private static async deductPropImmediately(ctx: any, uid: string, gameType: string, propType: string) {
        const propInfo = getPropType(propType);

        if (propInfo && propInfo.isConsumable) {
            await ctx.runMutation((internal as any)["service/prop/inventoryManager"].removeProps, {
                uid,
                props: [{
                    gameType,
                    propType,
                    quantity: 1
                }]
            });
        }
    }

    /**
     * 记录延迟扣除
     */
    private static async recordDelayedDeduction(ctx: any, uid: string, gameId: string, gameType: string, props: any) {
        const now = getTorontoDate();

        // 确保 props 是数组格式
        const propsArray = Array.isArray(props) ? props : [{
            propType: props,
            quantity: 1,
            usedAt: now.iso,
            gameState: {}
        }] as any[];

        const deductionId = await ctx.db.insert("delayed_prop_deductions", {
            uid,
            gameId,
            gameType,
            props: propsArray,
            status: "pending",
            createdAt: now.iso
        });

        return deductionId;
    }

    /**
     * 执行延迟扣除
     */
    static async executeDelayedDeduction(ctx: any, gameId: string, uid: string, gameResult: any) {
        const now = getTorontoDate();

        // 查找该游戏的延迟扣除记录
        const delayedDeductions = await ctx.db
            .query("delayed_prop_deductions")
            .withIndex("by_gameId", (q: any) => q.eq("gameId", gameId))
            .filter((q: any) => q.eq(q.field("uid"), uid))
            .filter((q: any) => q.eq(q.field("status"), "pending"))
            .collect();

        if (delayedDeductions.length === 0) {
            return {
                success: true,
                message: "没有需要扣除的道具",
                deductedProps: []
            };
        }

        const deductedProps = [];

        for (const deduction of delayedDeductions) {
            try {
                // 实际扣除道具
                const propsToDeduct = deduction.props.map((p: any) => ({
                    gameType: deduction.gameType,
                    propType: p.propType,
                    quantity: p.quantity
                }));

                await ctx.runMutation((internal as any)["service/prop/inventoryManager"].removeProps, {
                    uid,
                    props: propsToDeduct
                });

                // 更新延迟扣除记录状态
                await ctx.db.patch(deduction._id, {
                    status: "completed",
                    completedAt: now.iso
                });

                deductedProps.push(...propsToDeduct);

                // 记录扣除日志
                await ctx.db.insert("prop_deduction_logs", {
                    uid,
                    gameId,
                    deductionId: deduction._id,
                    props: propsToDeduct,
                    gameResult,
                    createdAt: now.iso
                });

            } catch (error) {
                console.error(`扣除道具失败: ${error instanceof Error ? error.message : String(error)}`);

                // 标记为失败
                await ctx.db.patch(deduction._id, {
                    status: "cancelled",
                    completedAt: now.iso,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }

        return {
            success: true,
            message: `成功扣除 ${deductedProps.length} 个道具`,
            deductedProps,
            totalDeductions: delayedDeductions.length
        };
    }

    /**
     * 取消延迟扣除
     */
    static async cancelDelayedDeduction(ctx: any, gameId: string, uid: string, reason?: string) {
        const now = getTorontoDate();

        // 查找并取消延迟扣除记录
        const delayedDeductions = await ctx.db
            .query("delayed_prop_deductions")
            .withIndex("by_gameId", (q: any) => q.eq("gameId", gameId))
            .filter((q: any) => q.eq(q.field("uid"), uid))
            .filter((q: any) => q.eq(q.field("status"), "pending"))
            .collect();

        let cancelledCount = 0;

        for (const deduction of delayedDeductions) {
            await ctx.db.patch(deduction._id, {
                status: "cancelled",
                completedAt: now.iso,
                reason: reason || "游戏中断"
            });
            cancelledCount++;
        }

        return {
            success: true,
            message: `已取消 ${cancelledCount} 个延迟扣除记录`,
            cancelledCount
        };
    }
}

// ===== Convex 函数接口 =====

// 统一道具使用接口
export const useProp = (mutation as any)({
    args: {
        uid: v.string(),
        gameType: v.string(),
        propType: v.string(),
        gameState: v.any(),
        params: v.optional(v.any()),
        mode: v.any(),
        gameId: v.optional(v.string())
    },
    handler: async (ctx: any, args: any) => {
        const { uid, gameType, propType, gameState, params, mode, gameId } = args;

        const config: PropUsageConfig = {
            mode,
            gameId,
            gameType,
            uid,
            propType,
            gameState,
            params
        };

        return await UnifiedPropManager.useProp(ctx, config);
    }
});

// 批量使用道具接口
export const useMultipleProps = (mutation as any)({
    args: {
        uid: v.string(),
        gameType: v.string(),
        props: v.any(),
        gameState: v.any(),
        mode: v.any(),
        gameId: v.optional(v.string())
    },
    handler: async (ctx: any, args: any) => {
        const { uid, gameType, props, gameState, mode, gameId } = args;

        const config = {
            mode,
            gameId,
            gameType,
            uid,
            props,
            gameState
        };

        return await UnifiedPropManager.useMultipleProps(ctx, config);
    }
});

// 执行延迟扣除
export const executeDelayedDeduction = (mutation as any)({
    args: {
        gameId: v.string(),
        uid: v.string(),
        gameResult: v.any()
    },
    handler: async (ctx: any, args: any) => {
        const { gameId, uid, gameResult } = args;
        return await UnifiedPropManager.executeDelayedDeduction(ctx, gameId, uid, gameResult);
    }
});

// 取消延迟扣除
export const cancelDelayedDeduction = (mutation as any)({
    args: {
        gameId: v.string(),
        uid: v.string(),
        reason: v.optional(v.string())
    },
    handler: async (ctx: any, args: any) => {
        const { gameId, uid, reason } = args;
        return await UnifiedPropManager.cancelDelayedDeduction(ctx, gameId, uid, reason);
    }
});

// 获取道具使用历史
export const getPropUsageHistory = (query as any)({
    args: {
        uid: v.string(),
        gameType: v.optional(v.string()),
        mode: v.optional(v.any()),
        limit: v.optional(v.number())
    },
    handler: async (ctx: any, args: any) => {
        const { uid, gameType, mode, limit = 50 } = args;

        let query = ctx.db
            .query("prop_usage_logs")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid));

        if (gameType) {
            query = query.filter((q: any) => q.eq(q.field("gameType"), gameType));
        }

        if (mode) {
            query = query.filter((q: any) => q.eq(q.field("deductionMode"), mode));
        }

        return await query
            .order("desc")
            .take(limit);
    }
});

// 获取延迟扣除记录
export const getDelayedPropDeductions = (query as any)({
    args: {
        uid: v.string(),
        gameId: v.optional(v.string()),
        status: v.optional(v.string())
    },
    handler: async (ctx: any, args: any) => {
        const { uid, gameId, status } = args;

        let query = ctx.db
            .query("delayed_prop_deductions")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid));

        if (gameId) {
            query = query.filter((q: any) => q.eq(q.field("gameId"), gameId));
        }

        if (status) {
            query = query.filter((q: any) => q.eq(q.field("status"), status));
        }

        return await query
            .order("desc")
            .collect();
    }
}); 