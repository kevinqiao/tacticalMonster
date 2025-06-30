// @ts-nocheck
import { v } from "convex/values";
import { query } from "../../_generated/server";

// 游戏模式配置
export interface GameModeConfig {
    gameType: string;
    isRealTime: boolean;
    isMultiplayer: boolean;
    requiresImmediateDeduction: boolean;
    defaultDeductionMode: "immediate" | "delayed";
    allowedDeductionModes: ("immediate" | "delayed")[];
}

// 游戏模式适配器
export class GameModeAdapter {

    // 游戏模式配置映射
    private static readonly gameModeConfigs: Record<string, GameModeConfig> = {
        // 单人游戏 - 延迟扣除
        "solitaire": {
            gameType: "solitaire",
            isRealTime: false,
            isMultiplayer: false,
            requiresImmediateDeduction: false,
            defaultDeductionMode: "delayed",
            allowedDeductionModes: ["delayed", "immediate"]
        },

        // 实时对战游戏 - 实时扣除
        "ludo": {
            gameType: "ludo",
            isRealTime: true,
            isMultiplayer: true,
            requiresImmediateDeduction: true,
            defaultDeductionMode: "immediate",
            allowedDeductionModes: ["immediate"]
        },

        // 实时卡牌游戏 - 实时扣除
        "rummy": {
            gameType: "rummy",
            isRealTime: true,
            isMultiplayer: true,
            requiresImmediateDeduction: true,
            defaultDeductionMode: "immediate",
            allowedDeductionModes: ["immediate"]
        },

        // 实时策略游戏 - 实时扣除
        "strategy": {
            gameType: "strategy",
            isRealTime: true,
            isMultiplayer: true,
            requiresImmediateDeduction: true,
            defaultDeductionMode: "immediate",
            allowedDeductionModes: ["immediate"]
        },

        // 单人解谜游戏 - 延迟扣除
        "puzzle": {
            gameType: "puzzle",
            isRealTime: false,
            isMultiplayer: false,
            requiresImmediateDeduction: false,
            defaultDeductionMode: "delayed",
            allowedDeductionModes: ["delayed", "immediate"]
        },

        // 单人冒险游戏 - 延迟扣除
        "adventure": {
            gameType: "adventure",
            isRealTime: false,
            isMultiplayer: false,
            requiresImmediateDeduction: false,
            defaultDeductionMode: "delayed",
            allowedDeductionModes: ["delayed", "immediate"]
        },

        // 实时射击游戏 - 实时扣除
        "shooter": {
            gameType: "shooter",
            isRealTime: true,
            isMultiplayer: true,
            requiresImmediateDeduction: true,
            defaultDeductionMode: "immediate",
            allowedDeductionModes: ["immediate"]
        },

        // 实时竞速游戏 - 实时扣除
        "racing": {
            gameType: "racing",
            isRealTime: true,
            isMultiplayer: true,
            requiresImmediateDeduction: true,
            defaultDeductionMode: "immediate",
            allowedDeductionModes: ["immediate"]
        },

        // 单人RPG游戏 - 延迟扣除
        "rpg": {
            gameType: "rpg",
            isRealTime: false,
            isMultiplayer: false,
            requiresImmediateDeduction: false,
            defaultDeductionMode: "delayed",
            allowedDeductionModes: ["delayed", "immediate"]
        },

        // 实时MOBA游戏 - 实时扣除
        "moba": {
            gameType: "moba",
            isRealTime: true,
            isMultiplayer: true,
            requiresImmediateDeduction: true,
            defaultDeductionMode: "immediate",
            allowedDeductionModes: ["immediate"]
        }
    };

    /**
     * 获取游戏模式配置
     */
    static getGameModeConfig(gameType: string): GameModeConfig {
        const config = this.gameModeConfigs[gameType];
        if (!config) {
            // 默认配置 - 延迟扣除
            return {
                gameType,
                isRealTime: false,
                isMultiplayer: false,
                requiresImmediateDeduction: false,
                defaultDeductionMode: "delayed",
                allowedDeductionModes: ["delayed", "immediate"]
            };
        }
        return config;
    }

    /**
     * 确定道具扣除模式
     */
    static determineDeductionMode(gameType: string, context?: {
        isRealTime?: boolean;
        isMultiplayer?: boolean;
        forceMode?: "immediate" | "delayed";
    }): "immediate" | "delayed" {
        const config = this.getGameModeConfig(gameType);

        // 如果强制指定模式
        if (context?.forceMode) {
            if (config.allowedDeductionModes.includes(context.forceMode)) {
                return context.forceMode;
            } else {
                throw new Error(`游戏类型 ${gameType} 不支持 ${context.forceMode} 扣除模式`);
            }
        }

        // 根据上下文调整
        if (context?.isRealTime && context?.isMultiplayer) {
            // 实时多人游戏强制使用实时扣除
            if (config.allowedDeductionModes.includes("immediate")) {
                return "immediate";
            }
        }

        return config.defaultDeductionMode;
    }

    /**
     * 验证扣除模式是否适用于游戏类型
     */
    static validateDeductionMode(gameType: string, mode: "immediate" | "delayed"): boolean {
        const config = this.getGameModeConfig(gameType);
        return config.allowedDeductionModes.includes(mode);
    }

    /**
     * 获取游戏类型的推荐扣除模式
     */
    static getRecommendedDeductionMode(gameType: string): {
        mode: "immediate" | "delayed";
        reason: string;
    } {
        const config = this.getGameModeConfig(gameType);

        if (config.requiresImmediateDeduction) {
            return {
                mode: "immediate",
                reason: `${gameType} 是实时多人游戏，需要立即扣除道具以确保公平性`
            };
        } else {
            return {
                mode: "delayed",
                reason: `${gameType} 是单人游戏，可以使用延迟扣除以提升用户体验`
            };
        }
    }

    /**
     * 获取所有支持的游戏类型
     */
    static getSupportedGameTypes(): string[] {
        return Object.keys(this.gameModeConfigs);
    }

    /**
     * 获取实时游戏类型
     */
    static getRealTimeGameTypes(): string[] {
        return Object.values(this.gameModeConfigs)
            .filter(config => config.isRealTime)
            .map(config => config.gameType);
    }

    /**
     * 获取多人游戏类型
     */
    static getMultiplayerGameTypes(): string[] {
        return Object.values(this.gameModeConfigs)
            .filter(config => config.isMultiplayer)
            .map(config => config.gameType);
    }

    /**
     * 获取需要实时扣除的游戏类型
     */
    static getImmediateDeductionGameTypes(): string[] {
        return Object.values(this.gameModeConfigs)
            .filter(config => config.requiresImmediateDeduction)
            .map(config => config.gameType);
    }

    /**
     * 获取游戏类型统计信息
     */
    static getGameTypeStatistics(): {
        total: number;
        realTime: number;
        multiplayer: number;
        immediateDeduction: number;
        delayedDeduction: number;
    } {
        const configs = Object.values(this.gameModeConfigs);
        return {
            total: configs.length,
            realTime: configs.filter(config => config.isRealTime).length,
            multiplayer: configs.filter(config => config.isMultiplayer).length,
            immediateDeduction: configs.filter(config => config.requiresImmediateDeduction).length,
            delayedDeduction: configs.filter(config => !config.requiresImmediateDeduction).length
        };
    }

    /**
     * 验证游戏类型配置
     */
    static validateGameTypeConfig(gameType: string): {
        isValid: boolean;
        errors: string[];
        warnings: string[];
    } {
        const errors: string[] = [];
        const warnings: string[] = [];
        const config = this.gameModeConfigs[gameType];

        if (!config) {
            errors.push(`游戏类型 ${gameType} 未配置`);
            return { isValid: false, errors, warnings };
        }

        // 验证配置一致性
        if (config.isRealTime && config.isMultiplayer && !config.requiresImmediateDeduction) {
            warnings.push(`实时多人游戏 ${gameType} 建议使用实时扣除模式`);
        }

        if (!config.isRealTime && !config.isMultiplayer && config.requiresImmediateDeduction) {
            warnings.push(`单人非实时游戏 ${gameType} 使用实时扣除模式可能影响用户体验`);
        }

        if (config.allowedDeductionModes.length === 0) {
            errors.push(`游戏类型 ${gameType} 没有配置允许的扣除模式`);
        }

        if (!config.allowedDeductionModes.includes(config.defaultDeductionMode)) {
            errors.push(`游戏类型 ${gameType} 的默认扣除模式不在允许的模式列表中`);
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
}

// ===== Convex 查询接口 =====

// 获取游戏模式配置
export const getGameModeConfig = (query as any)({
    args: { gameType: v.string() },
    handler: async (ctx: any, args: any) => {
        const config = GameModeAdapter.getGameModeConfig(args.gameType);
        return {
            success: true,
            config,
            recommended: GameModeAdapter.getRecommendedDeductionMode(args.gameType)
        };
    }
});

// 确定道具扣除模式
export const determineDeductionMode = (query as any)({
    args: {
        gameType: v.string(),
        isRealTime: v.optional(v.boolean()),
        isMultiplayer: v.optional(v.boolean()),
        forceMode: v.optional(v.any())
    },
    handler: async (ctx: any, args: any) => {
        const { gameType, isRealTime, isMultiplayer, forceMode } = args;

        const mode = GameModeAdapter.determineDeductionMode(gameType, {
            isRealTime,
            isMultiplayer,
            forceMode
        });

        const config = GameModeAdapter.getGameModeConfig(gameType);

        return {
            success: true,
            deductionMode: mode,
            gameConfig: config,
            reason: GameModeAdapter.getRecommendedDeductionMode(gameType).reason
        };
    }
});

// 验证扣除模式
export const validateDeductionMode = (query as any)({
    args: {
        gameType: v.string(),
        mode: v.any()
    },
    handler: async (ctx: any, args: any) => {
        const { gameType, mode } = args;

        const isValid = GameModeAdapter.validateDeductionMode(gameType, mode);
        const config = GameModeAdapter.getGameModeConfig(gameType);

        return {
            success: true,
            isValid,
            gameConfig: config,
            allowedModes: config.allowedDeductionModes,
            message: isValid
                ? `${gameType} 支持 ${mode} 扣除模式`
                : `${gameType} 不支持 ${mode} 扣除模式，支持的模式: ${config.allowedDeductionModes.join(", ")}`
        };
    }
});

// 获取所有游戏类型信息
export const getAllGameTypes = (query as any)({
    args: {},
    handler: async (ctx: any, args: any) => {
        const gameTypes = GameModeAdapter.getSupportedGameTypes();
        const realTimeGames = GameModeAdapter.getRealTimeGameTypes();
        const multiplayerGames = GameModeAdapter.getMultiplayerGameTypes();
        const immediateDeductionGames = GameModeAdapter.getImmediateDeductionGameTypes();

        const gameTypeDetails = gameTypes.map((gameType: any) => {
            const config = GameModeAdapter.getGameModeConfig(gameType);
            const recommended = GameModeAdapter.getRecommendedDeductionMode(gameType);

            return {
                gameType,
                config,
                recommended
            };
        });

        return {
            success: true,
            gameTypes,
            realTimeGames,
            multiplayerGames,
            immediateDeductionGames,
            gameTypeDetails
        };
    }
});

// 获取游戏类型统计信息
export const getGameTypeStatistics = (query as any)({
    args: {},
    handler: async (ctx: any, args: any) => {
        const statistics = GameModeAdapter.getGameTypeStatistics();
        const gameTypes = GameModeAdapter.getSupportedGameTypes();

        // 验证所有游戏类型配置
        const validations = gameTypes.map((gameType: any) => ({
            gameType,
            ...GameModeAdapter.validateGameTypeConfig(gameType)
        }));

        return {
            success: true,
            statistics,
            validations,
            summary: {
                totalGameTypes: statistics.total,
                validConfigs: validations.filter((v: any) => v.isValid).length,
                configErrors: validations.filter((v: any) => v.errors.length > 0).length,
                configWarnings: validations.filter((v: any) => v.warnings.length > 0).length
            }
        };
    }
});

// 验证特定游戏类型配置
export const validateGameTypeConfig = (query as any)({
    args: { gameType: v.string() },
    handler: async (ctx: any, args: any) => {
        const { gameType } = args;
        const validation = GameModeAdapter.validateGameTypeConfig(gameType);
        const config = GameModeAdapter.getGameModeConfig(gameType);

        return {
            success: true,
            gameType,
            config,
            validation,
            recommendation: GameModeAdapter.getRecommendedDeductionMode(gameType)
        };
    }
}); 