/**
 * 挑战关卡测试数据验证函数（Tournament模块）
 */

import { v } from "convex/values";
import { internalMutation } from "../../../../_generated/server";

/**
 * 验证测试数据的完整性和正确性（internalMutation版本）
 */
export const validateTestData = internalMutation({
    args: {
        playerIds: v.array(v.string()),
        tournamentTypeId: v.string(),
    },
    handler: async (ctx, args) => {
        return await validateTestDataImpl(ctx, args.playerIds, args.tournamentTypeId);
    },
});

/**
 * 验证测试数据的完整性和正确性（实现函数）
 */
export async function validateTestDataImpl(ctx: any, playerIds: string[], tournamentTypeId: string) {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. 验证玩家数据
    for (const uid of playerIds) {
        const player = await ctx.db
            .query("players")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .first();

        if (!player) {
            errors.push(`玩家不存在: ${uid}`);
            continue;
        }

        // 验证资源
        const inventory = await ctx.db
            .query("player_inventory")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .first();

        if (!inventory) {
            errors.push(`玩家 ${uid} 没有资源数据`);
        } else {
            if (inventory.coins < 1000) {
                warnings.push(`玩家 ${uid} 的coins不足（${inventory.coins}）`);
            }
        }

        const energy = await ctx.db
            .query("player_energy")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .first();

        if (!energy) {
            errors.push(`玩家 ${uid} 没有能量数据`);
        } else {
            if (energy.current < 6) {
                warnings.push(`玩家 ${uid} 的能量不足（${energy.current}），可能无法参与关卡`);
            }
        }
    }

    // 2. 验证挑战关卡配置
    const tournamentType = await ctx.db
        .query("tournament_types")
        .withIndex("by_typeId", (q: any) => q.eq("typeId", tournamentTypeId))
        .first();

    if (!tournamentType) {
        errors.push(`挑战关卡配置不存在: ${tournamentTypeId}`);
    } else {
        // 验证entryRequirements
        if (tournamentType.entryRequirements) {
            const entryFee = tournamentType.entryRequirements.entryFee;
            if (entryFee.energy && entryFee.energy > 0) {
                // 验证玩家能量是否足够
                for (const uid of playerIds) {
                    const energy = await ctx.db
                        .query("player_energy")
                        .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                        .first();

                    if (energy && energy.current < entryFee.energy) {
                        warnings.push(
                            `玩家 ${uid} 的能量（${energy.current}）不足以参与关卡（需要${entryFee.energy}）`
                        );
                    }
                }
            }

            // 验证等级要求
            if (tournamentType.soloChallenge?.unlockConditions?.minPlayerLevel) {
                const minLevel = tournamentType.soloChallenge.unlockConditions.minPlayerLevel;
                for (const uid of playerIds) {
                    const player = await ctx.db
                        .query("players")
                        .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                        .first();

                    if (player && player.level !== undefined && player.level < minLevel) {
                        errors.push(
                            `玩家 ${uid} 的等级（${player.level}）不足，需要至少${minLevel}级`
                        );
                    }
                }
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}

