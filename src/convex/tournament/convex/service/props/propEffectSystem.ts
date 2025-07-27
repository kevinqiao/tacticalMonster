// @ts-nocheck
import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { getTorontoDate } from "../simpleTimezoneUtils";
import { PropEffectType } from "./propSystem";

// ============================================================================
// 道具效果系统
// ============================================================================

/**
 * 道具效果接口
 */
export interface PropEffect {
    effectType: PropEffectType;
    effectValue: number;
    duration?: number;
    expiresAt?: string;
    recordId: string;
}

/**
 * 游戏效果结果接口
 */
export interface GameEffectResult {
    scoreMultiplier: number;
    timeBoost: number;
    extraLives: number;
    shields: number;
    rerolls: number;
    hints: number;
    cosmeticEffects: {
        frame?: string;
        avatar?: string;
        title?: string;
    };
}

/**
 * 道具效果系统
 */
export class PropEffectSystem {

    /**
     * 计算游戏效果
     */
    static calculateGameEffects(effects: PropEffect[]): GameEffectResult {
        const result: GameEffectResult = {
            scoreMultiplier: 1.0,
            timeBoost: 0,
            extraLives: 0,
            shields: 0,
            rerolls: 0,
            hints: 0,
            cosmeticEffects: {}
        };

        for (const effect of effects) {
            switch (effect.effectType) {
                case PropEffectType.SCORE_MULTIPLIER:
                    result.scoreMultiplier *= effect.effectValue;
                    break;
                case PropEffectType.TIME_BOOST:
                    result.timeBoost += effect.effectValue;
                    break;
                case PropEffectType.EXTRA_LIFE:
                    result.extraLives += effect.effectValue;
                    break;
                case PropEffectType.SHIELD:
                    result.shields += effect.effectValue;
                    break;
                case PropEffectType.REROLL:
                    result.rerolls += effect.effectValue;
                    break;
                case PropEffectType.HINT:
                    result.hints += effect.effectValue;
                    break;
                case PropEffectType.COSMETIC_FRAME:
                    result.cosmeticEffects.frame = effect.effectValue.toString();
                    break;
                case PropEffectType.COSMETIC_AVATAR:
                    result.cosmeticEffects.avatar = effect.effectValue.toString();
                    break;
                case PropEffectType.COSMETIC_TITLE:
                    result.cosmeticEffects.title = effect.effectValue.toString();
                    break;
            }
        }

        return result;
    }

    /**
     * 应用分数倍数效果
     */
    static applyScoreMultiplier(baseScore: number, multiplier: number): number {
        return Math.floor(baseScore * multiplier);
    }

    /**
     * 应用时间增益效果
     */
    static applyTimeBoost(baseTime: number, boostSeconds: number): number {
        return baseTime + boostSeconds;
    }

    /**
     * 使用护盾
     */
    static useShield(currentShields: number): { newShields: number; used: boolean } {
        if (currentShields > 0) {
            return { newShields: currentShields - 1, used: true };
        }
        return { newShields: currentShields, used: false };
    }

    /**
     * 使用重掷
     */
    static useReroll(currentRerolls: number): { newRerolls: number; used: boolean } {
        if (currentRerolls > 0) {
            return { newRerolls: currentRerolls - 1, used: true };
        }
        return { newRerolls: currentRerolls, used: false };
    }

    /**
     * 使用提示
     */
    static useHint(currentHints: number): { newHints: number; used: boolean } {
        if (currentHints > 0) {
            return { newHints: currentHints - 1, used: true };
        }
        return { newHints: currentHints, used: false };
    }

    /**
     * 使用额外生命
     */
    static useExtraLife(currentLives: number): { newLives: number; used: boolean } {
        if (currentLives > 0) {
            return { newLives: currentLives - 1, used: true };
        }
        return { newLives: currentLives, used: false };
    }

    /**
     * 检查道具效果是否有效
     */
    static isEffectValid(effect: PropEffect): boolean {
        if (!effect.expiresAt) {
            return true; // 永久效果
        }
        return new Date(effect.expiresAt) > new Date();
    }

    /**
     * 过滤有效效果
     */
    static filterValidEffects(effects: PropEffect[]): PropEffect[] {
        return effects.filter(effect => this.isEffectValid(effect));
    }

    /**
     * 获取玩家当前有效效果
     */
    static async getPlayerValidEffects(ctx: any, uid: string, gameId: string) {
        const now = getTorontoDate().iso;

        const activeRecords = await ctx.db.query("prop_usage_records")
            .withIndex("by_uid_gameId", (q: any) => q.eq("uid", uid).eq("gameId", gameId))
            .filter((q: any) =>
                q.or(
                    q.eq(q.field("expiresAt"), undefined),
                    q.gt(q.field("expiresAt"), now)
                )
            )
            .collect();

        const effects: PropEffect[] = activeRecords.map(record => ({
            effectType: record.effectType,
            effectValue: record.effectValue,
            duration: record.duration,
            expiresAt: record.expiresAt,
            recordId: record._id
        }));

        return this.filterValidEffects(effects);
    }

    /**
     * 处理游戏开始时的道具效果
     */
    static async handleGameStart(ctx: any, uid: string, gameId: string, gameType: string) {
        try {
            const effects = await this.getPlayerValidEffects(ctx, uid, gameId);
            const gameEffects = this.calculateGameEffects(effects);

            // 记录游戏开始时的效果状态
            await ctx.db.insert("game_effect_states", {
                uid,
                gameId,
                gameType,
                effects: gameEffects,
                startTime: getTorontoDate().iso,
                isActive: true
            });

            return {
                success: true,
                effects: gameEffects,
                activeEffects: effects.length,
                message: `游戏开始，应用了 ${effects.length} 个道具效果`
            };
        } catch (error) {
            console.error("处理游戏开始效果失败:", error);
            throw error;
        }
    }

    /**
     * 处理游戏结束时的道具效果
     */
    static async handleGameEnd(ctx: any, uid: string, gameId: string, finalScore: number, baseScore: number) {
        try {
            const effects = await this.getPlayerValidEffects(ctx, uid, gameId);
            const gameEffects = this.calculateGameEffects(effects);

            // 计算道具效果对分数的影响
            const scoreDifference = finalScore - baseScore;
            const multiplierUsed = gameEffects.scoreMultiplier > 1.0;

            // 更新游戏效果状态
            const effectState = await ctx.db.query("game_effect_states")
                .withIndex("by_uid_gameId", (q: any) => q.eq("uid", uid).eq("gameId", gameId))
                .unique();

            if (effectState) {
                await ctx.db.patch(effectState._id, {
                    finalEffects: gameEffects,
                    finalScore,
                    baseScore,
                    scoreDifference,
                    endTime: getTorontoDate().iso,
                    isActive: false
                });
            }

            // 记录道具使用统计
            await ctx.db.insert("prop_effect_statistics", {
                uid,
                gameId,
                effectCount: effects.length,
                scoreMultiplier: gameEffects.scoreMultiplier,
                timeBoost: gameEffects.timeBoost,
                extraLives: gameEffects.extraLives,
                shields: gameEffects.shields,
                rerolls: gameEffects.rerolls,
                hints: gameEffects.hints,
                scoreDifference,
                multiplierUsed,
                gameEndTime: getTorontoDate().iso
            });

            return {
                success: true,
                effects: gameEffects,
                scoreDifference,
                multiplierUsed,
                message: `游戏结束，道具效果统计完成`
            };
        } catch (error) {
            console.error("处理游戏结束效果失败:", error);
            throw error;
        }
    }

    /**
     * 使用游戏中的道具效果
     */
    static async useGameEffect(ctx: any, uid: string, gameId: string, effectType: PropEffectType) {
        try {
            const effects = await this.getPlayerValidEffects(ctx, uid, gameId);
            const gameEffects = this.calculateGameEffects(effects);

            let used = false;
            let newValue = 0;

            switch (effectType) {
                case PropEffectType.SHIELD:
                    const shieldResult = this.useShield(gameEffects.shields);
                    used = shieldResult.used;
                    newValue = shieldResult.newShields;
                    break;
                case PropEffectType.REROLL:
                    const rerollResult = this.useReroll(gameEffects.rerolls);
                    used = rerollResult.used;
                    newValue = rerollResult.newRerolls;
                    break;
                case PropEffectType.HINT:
                    const hintResult = this.useHint(gameEffects.hints);
                    used = hintResult.used;
                    newValue = hintResult.newHints;
                    break;
                case PropEffectType.EXTRA_LIFE:
                    const lifeResult = this.useExtraLife(gameEffects.extraLives);
                    used = lifeResult.used;
                    newValue = lifeResult.newLives;
                    break;
                default:
                    throw new Error(`不支持的效果类型: ${effectType}`);
            }

            if (used) {
                // 记录效果使用
                await ctx.db.insert("effect_usage_logs", {
                    uid,
                    gameId,
                    effectType,
                    usedAt: getTorontoDate().iso,
                    remainingValue: newValue
                });
            }

            return {
                success: true,
                used,
                newValue,
                effectType,
                message: used ? `成功使用 ${effectType} 效果` : `没有可用的 ${effectType} 效果`
            };
        } catch (error) {
            console.error("使用游戏效果失败:", error);
            throw error;
        }
    }

    /**
     * 获取道具效果统计
     */
    static async getEffectStatistics(ctx: any, uid: string) {
        try {
            const statistics = await ctx.db.query("prop_effect_statistics")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .collect();

            const totalGames = statistics.length;
            const totalEffects = statistics.reduce((sum, stat) => sum + stat.effectCount, 0);
            const totalScoreDifference = statistics.reduce((sum, stat) => sum + stat.scoreDifference, 0);
            const gamesWithMultiplier = statistics.filter(stat => stat.multiplierUsed).length;

            const averageEffectsPerGame = totalGames > 0 ? totalEffects / totalGames : 0;
            const averageScoreBoost = totalGames > 0 ? totalScoreDifference / totalGames : 0;
            const multiplierUsageRate = totalGames > 0 ? (gamesWithMultiplier / totalGames) * 100 : 0;

            return {
                totalGames,
                totalEffects,
                totalScoreDifference,
                gamesWithMultiplier,
                averageEffectsPerGame,
                averageScoreBoost,
                multiplierUsageRate: `${multiplierUsageRate.toFixed(2)}%`
            };
        } catch (error) {
            console.error("获取效果统计失败:", error);
            throw error;
        }
    }

    /**
     * 清理过期效果
     */
    static async cleanupExpiredEffects(ctx: any) {
        try {
            const now = getTorontoDate().iso;

            // 清理过期的使用记录
            const expiredRecords = await ctx.db.query("prop_usage_records")
                .filter((q: any) =>
                    q.and(
                        q.neq(q.field("expiresAt"), undefined),
                        q.lt(q.field("expiresAt"), now)
                    )
                )
                .collect();

            for (const record of expiredRecords) {
                await ctx.db.delete(record._id);
            }

            // 清理过期的游戏效果状态
            const expiredStates = await ctx.db.query("game_effect_states")
                .filter((q: any) =>
                    q.and(
                        q.eq(q.field("isActive"), true),
                        q.lt(q.field("startTime"), new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
                    )
                )
                .collect();

            for (const state of expiredStates) {
                await ctx.db.patch(state._id, {
                    isActive: false,
                    updatedAt: getTorontoDate().iso
                });
            }

            return {
                success: true,
                cleanedRecords: expiredRecords.length,
                cleanedStates: expiredStates.length,
                message: `清理了 ${expiredRecords.length} 条过期记录和 ${expiredStates.length} 个过期状态`
            };
        } catch (error) {
            console.error("清理过期效果失败:", error);
            throw error;
        }
    }
}

// ============================================================================
// Convex 函数接口
// ============================================================================

/**
 * 处理游戏开始效果
 */
export const handleGameStart = mutation({
    args: {
        uid: v.string(),
        gameId: v.string(),
        gameType: v.string()
    },
    handler: async (ctx: any, args: any) => {
        return await PropEffectSystem.handleGameStart(ctx, args.uid, args.gameId, args.gameType);
    }
});

/**
 * 处理游戏结束效果
 */
export const handleGameEnd = mutation({
    args: {
        uid: v.string(),
        gameId: v.string(),
        finalScore: v.number(),
        baseScore: v.number()
    },
    handler: async (ctx: any, args: any) => {
        return await PropEffectSystem.handleGameEnd(ctx, args.uid, args.gameId, args.finalScore, args.baseScore);
    }
});

/**
 * 使用游戏效果
 */
export const useGameEffect = mutation({
    args: {
        uid: v.string(),
        gameId: v.string(),
        effectType: v.string()
    },
    handler: async (ctx: any, args: any) => {
        return await PropEffectSystem.useGameEffect(ctx, args.uid, args.gameId, args.effectType as PropEffectType);
    }
});

/**
 * 获取玩家有效效果
 */
export const getPlayerValidEffects = query({
    args: {
        uid: v.string(),
        gameId: v.string()
    },
    handler: async (ctx: any, args: any) => {
        return await PropEffectSystem.getPlayerValidEffects(ctx, args.uid, args.gameId);
    }
});

/**
 * 获取效果统计
 */
export const getEffectStatistics = query({
    args: {
        uid: v.string()
    },
    handler: async (ctx: any, args: any) => {
        return await PropEffectSystem.getEffectStatistics(ctx, args.uid);
    }
});

/**
 * 清理过期效果
 */
export const cleanupExpiredEffects = mutation({
    args: {},
    handler: async (ctx: any, args: any) => {
        return await PropEffectSystem.cleanupExpiredEffects(ctx);
    }
}); 