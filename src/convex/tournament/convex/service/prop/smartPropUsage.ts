// @ts-nocheck
import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { GameModeAdapter } from "./gameModeAdapter";
import { UnifiedPropManager } from "./unifiedPropManager";

// 智能道具使用配置
export interface SmartPropUsageConfig {
    uid: string;
    gameType: string;
    propType: string;
    gameState: any;
    params?: any;
    gameId?: string;
    context?: {
        isRealTime?: boolean;
        isMultiplayer?: boolean;
        forceMode?: "immediate" | "delayed";
        tournamentId?: string;
        gameMode?: string;
    };
}

// 智能道具使用管理器
export class SmartPropUsageManager {

    /**
     * 智能使用道具（自动确定扣除模式）
     */
    static async usePropSmart(ctx: any, config: SmartPropUsageConfig) {
        const { uid, gameType, propType, gameState, params, gameId, context } = config;

        // 1. 智能确定扣除模式
        const deductionMode = GameModeAdapter.determineDeductionMode(gameType, context);

        // 2. 验证模式是否支持
        const isValidMode = GameModeAdapter.validateDeductionMode(gameType, deductionMode);
        if (!isValidMode) {
            throw new Error(`游戏类型 ${gameType} 不支持 ${deductionMode} 扣除模式`);
        }

        // 3. 使用统一道具管理器
        const result = await UnifiedPropManager.useProp(ctx, {
            mode: deductionMode,
            gameId,
            gameType,
            uid,
            propType,
            gameState,
            params
        });

        // 4. 添加智能决策信息
        const gameConfig = GameModeAdapter.getGameModeConfig(gameType);
        const recommended = GameModeAdapter.getRecommendedDeductionMode(gameType);

        return {
            ...result,
            smartDecision: {
                deductionMode,
                gameConfig,
                recommended,
                context,
                reason: recommended.reason
            }
        };
    }

    /**
     * 批量智能使用道具
     */
    static async useMultiplePropsSmart(ctx: any, config: Omit<SmartPropUsageConfig, 'propType'> & {
        props: Array<{ propType: string; params?: any }>
    }) {
        const { uid, gameType, props, gameState, gameId, context } = config;

        // 1. 智能确定扣除模式
        const deductionMode = GameModeAdapter.determineDeductionMode(gameType, context);

        // 2. 验证模式是否支持
        const isValidMode = GameModeAdapter.validateDeductionMode(gameType, deductionMode);
        if (!isValidMode) {
            throw new Error(`游戏类型 ${gameType} 不支持 ${deductionMode} 扣除模式`);
        }

        // 3. 使用统一道具管理器
        const result = await UnifiedPropManager.useMultipleProps(ctx, {
            mode: deductionMode,
            gameId,
            gameType,
            uid,
            props,
            gameState
        });

        // 4. 添加智能决策信息
        const gameConfig = GameModeAdapter.getGameModeConfig(gameType);
        const recommended = GameModeAdapter.getRecommendedDeductionMode(gameType);

        return {
            ...result,
            smartDecision: {
                deductionMode,
                gameConfig,
                recommended,
                context,
                reason: recommended.reason
            }
        };
    }

    /**
     * 获取道具使用建议
     */
    static getPropUsageAdvice(gameType: string, context?: any) {
        const gameConfig = GameModeAdapter.getGameModeConfig(gameType);
        const recommended = GameModeAdapter.getRecommendedDeductionMode(gameType);
        const deductionMode = GameModeAdapter.determineDeductionMode(gameType, context);

        return {
            gameType,
            gameConfig,
            recommended,
            determinedMode: deductionMode,
            context,
            advice: {
                mode: deductionMode,
                reason: recommended.reason,
                isOptimal: deductionMode === recommended.mode,
                alternatives: gameConfig.allowedDeductionModes.filter(m => m !== deductionMode)
            }
        };
    }

    /**
     * 验证道具使用配置
     */
    static validatePropUsageConfig(config: SmartPropUsageConfig) {
        const { gameType, context } = config;
        const gameConfig = GameModeAdapter.getGameModeConfig(gameType);

        const errors = [];
        const warnings = [];

        // 检查游戏类型是否支持
        if (!gameConfig) {
            errors.push(`不支持的游戏类型: ${gameType}`);
        }

        // 检查强制模式是否支持
        if (context?.forceMode) {
            const isValid = GameModeAdapter.validateDeductionMode(gameType, context.forceMode);
            if (!isValid) {
                errors.push(`游戏类型 ${gameType} 不支持强制模式 ${context.forceMode}`);
            }
        }

        // 检查实时多人游戏是否使用实时扣除
        if (context?.isRealTime && context?.isMultiplayer) {
            if (!gameConfig.requiresImmediateDeduction) {
                warnings.push(`实时多人游戏建议使用实时扣除模式以确保公平性`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            gameConfig
        };
    }
}

// ===== Convex 函数接口 =====

// 智能使用道具
export const usePropSmart = mutation({
    args: {
        uid: v.string(),
        gameType: v.string(),
        propType: v.string(),
        gameState: v.any(),
        params: v.optional(v.any()),
        gameId: v.optional(v.string()),
        isRealTime: v.optional(v.boolean()),
        isMultiplayer: v.optional(v.boolean()),
        forceMode: v.optional(v.union(v.literal("immediate"), v.literal("delayed"))),
        tournamentId: v.optional(v.string()),
        gameMode: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const { uid, gameType, propType, gameState, params, gameId, isRealTime, isMultiplayer, forceMode, tournamentId, gameMode } = args;

        const config: SmartPropUsageConfig = {
            uid,
            gameType,
            propType,
            gameState,
            params,
            gameId,
            context: {
                isRealTime,
                isMultiplayer,
                forceMode,
                tournamentId,
                gameMode
            }
        };

        return await SmartPropUsageManager.usePropSmart(ctx, config);
    }
});

// 批量智能使用道具
export const useMultiplePropsSmart = mutation({
    args: {
        uid: v.string(),
        gameType: v.string(),
        props: v.array(v.object({
            propType: v.string(),
            params: v.optional(v.any())
        })),
        gameState: v.any(),
        gameId: v.optional(v.string()),
        isRealTime: v.optional(v.boolean()),
        isMultiplayer: v.optional(v.boolean()),
        forceMode: v.optional(v.union(v.literal("immediate"), v.literal("delayed"))),
        tournamentId: v.optional(v.string()),
        gameMode: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const { uid, gameType, props, gameState, gameId, isRealTime, isMultiplayer, forceMode, tournamentId, gameMode } = args;

        const config = {
            uid,
            gameType,
            props,
            gameState,
            gameId,
            context: {
                isRealTime,
                isMultiplayer,
                forceMode,
                tournamentId,
                gameMode
            }
        };

        return await SmartPropUsageManager.useMultiplePropsSmart(ctx, config);
    }
});

// 获取道具使用建议
export const getPropUsageAdvice = query({
    args: {
        gameType: v.string(),
        isRealTime: v.optional(v.boolean()),
        isMultiplayer: v.optional(v.boolean()),
        forceMode: v.optional(v.union(v.literal("immediate"), v.literal("delayed"))),
        tournamentId: v.optional(v.string()),
        gameMode: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const { gameType, isRealTime, isMultiplayer, forceMode, tournamentId, gameMode } = args;

        const context = {
            isRealTime,
            isMultiplayer,
            forceMode,
            tournamentId,
            gameMode
        };

        return SmartPropUsageManager.getPropUsageAdvice(gameType, context);
    }
});

// 验证道具使用配置
export const validatePropUsageConfig = query({
    args: {
        uid: v.string(),
        gameType: v.string(),
        propType: v.string(),
        gameState: v.any(),
        params: v.optional(v.any()),
        gameId: v.optional(v.string()),
        isRealTime: v.optional(v.boolean()),
        isMultiplayer: v.optional(v.boolean()),
        forceMode: v.optional(v.union(v.literal("immediate"), v.literal("delayed"))),
        tournamentId: v.optional(v.string()),
        gameMode: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const { uid, gameType, propType, gameState, params, gameId, isRealTime, isMultiplayer, forceMode, tournamentId, gameMode } = args;

        const config: SmartPropUsageConfig = {
            uid,
            gameType,
            propType,
            gameState,
            params,
            gameId,
            context: {
                isRealTime,
                isMultiplayer,
                forceMode,
                tournamentId,
                gameMode
            }
        };

        return SmartPropUsageManager.validatePropUsageConfig(config);
    }
});

// 获取游戏类型的推荐道具使用策略
export const getGamePropStrategy = query({
    args: {
        gameType: v.string(),
        includeExamples: v.optional(v.boolean())
    },
    handler: async (ctx, args) => {
        const { gameType, includeExamples = false } = args;

        const gameConfig = GameModeAdapter.getGameModeConfig(gameType);
        const recommended = GameModeAdapter.getRecommendedDeductionMode(gameType);

        const strategy = {
            gameType,
            gameConfig,
            recommended,
            strategy: {
                mode: recommended.mode,
                reason: recommended.reason,
                bestPractices: [],
                considerations: []
            }
        };

        // 添加最佳实践
        if (gameConfig.isRealTime && gameConfig.isMultiplayer) {
            strategy.strategy.bestPractices.push("实时多人游戏应使用实时扣除以确保公平性");
            strategy.strategy.bestPractices.push("避免在游戏过程中频繁使用道具");
            strategy.strategy.considerations.push("需要考虑网络延迟对道具效果的影响");
        } else {
            strategy.strategy.bestPractices.push("单人游戏可以使用延迟扣除以提升用户体验");
            strategy.strategy.bestPractices.push("可以在游戏结束时统一处理道具扣除");
            strategy.strategy.considerations.push("需要考虑游戏中断时的道具处理");
        }

        // 添加示例
        if (includeExamples) {
            strategy.examples = {
                immediate: {
                    description: "实时扣除示例",
                    code: `await usePropSmart({
                        uid: "player123",
                        gameType: "${gameType}",
                        propType: "hint",
                        gameState: currentState,
                        isRealTime: true,
                        isMultiplayer: true
                    })`
                },
                delayed: {
                    description: "延迟扣除示例",
                    code: `await usePropSmart({
                        uid: "player123",
                        gameType: "${gameType}",
                        propType: "hint",
                        gameState: currentState,
                        gameId: "game456"
                    })`
                }
            };
        }

        return strategy;
    }
}); 