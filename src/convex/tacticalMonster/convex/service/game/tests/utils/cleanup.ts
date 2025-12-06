/**
 * 测试数据清理工具
 * 用于清理测试过程中创建的数据
 */

import { v } from "convex/values";
import { internalMutation } from "../../../../_generated/server";

/**
 * 清理测试玩家数据
 */
export async function cleanupTestPlayers(ctx: any, uids: string[]): Promise<{ deleted: number; errors: string[] }> {
    console.log(`[cleanupTestPlayers] 开始清理 ${uids.length} 个测试玩家的数据`);
    const errors: string[] = [];
    let deleted = 0;

    for (const uid of uids) {
        try {
            console.log(`[cleanupTestPlayers] 清理玩家: ${uid}`);
            // 清理玩家记录
            const player = await ctx.db
                .query("players")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .first();
            if (player) {
                await ctx.db.delete(player._id);
                deleted++;
                console.log(`[cleanupTestPlayers] ✓ 删除玩家记录: ${uid}`);
            }

            // 清理库存
            const inventory = await ctx.db
                .query("player_inventory")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .first();
            if (inventory) {
                await ctx.db.delete(inventory._id);
                console.log(`[cleanupTestPlayers] ✓ 删除库存记录: ${uid}`);
            }

            // 清理怪物
            const monsters = await ctx.db
                .query("mr_player_monsters")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .collect();
            for (const monster of monsters) {
                await ctx.db.delete(monster._id);
            }
            if (monsters.length > 0) {
                console.log(`[cleanupTestPlayers] ✓ 删除 ${monsters.length} 个怪物记录: ${uid}`);
            }

            // 清理能量
            const energy = await ctx.db
                .query("mr_player_energy")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .first();
            if (energy) {
                await ctx.db.delete(energy._id);
                console.log(`[cleanupTestPlayers] ✓ 删除能量记录: ${uid}`);
            }
        } catch (error: any) {
            console.error(`[cleanupTestPlayers] ❌ 清理玩家 ${uid} 失败:`, error.message);
            errors.push(`清理玩家 ${uid} 失败: ${error.message}`);
        }
    }

    console.log(`[cleanupTestPlayers] 完成清理，删除了 ${deleted} 个玩家记录，${errors.length} 个错误`);
    return { deleted, errors };
}

/**
 * 清理测试游戏数据
 */
export async function cleanupTestGames(ctx: any, gameIds: string[]): Promise<{ deleted: number; errors: string[] }> {
    const errors: string[] = [];
    let deleted = 0;

    for (const gameId of gameIds) {
        try {
            // 清理游戏记录
            const game = await ctx.db
                .query("tacticalMonster_game")
                .withIndex("by_gameId", (q: any) => q.eq("gameId", gameId))
                .first();
            if (game) {
                await ctx.db.delete(game._id);
                deleted++;
            }

            // 清理参与者
            const participants = await ctx.db
                .query("mr_game_participants")
                .withIndex("by_gameId", (q: any) => q.eq("gameId", gameId))
                .collect();
            for (const participant of participants) {
                await ctx.db.delete(participant._id);
            }

            // 清理游戏角色
            const characters = await ctx.db
                .query("tacticalMonster_game_character")
                .withIndex("by_game", (q: any) => q.eq("gameId", gameId))
                .collect();
            for (const character of characters) {
                await ctx.db.delete(character._id);
            }

            // 清理回合数据
            const rounds = await ctx.db
                .query("tacticalMonster_game_round")
                .withIndex("by_game_round", (q: any) => q.eq("gameId", gameId))
                .collect();
            for (const round of rounds) {
                await ctx.db.delete(round._id);
            }
        } catch (error: any) {
            errors.push(`清理游戏 ${gameId} 失败: ${error.message}`);
        }
    }

    return { deleted, errors };
}

/**
 * 清理测试 Battle Pass 数据
 */
export async function cleanupTestBattlePass(ctx: any, uids: string[]): Promise<{ deleted: number; errors: string[] }> {
    console.log(`[cleanupTestBattlePass] 开始清理 ${uids.length} 个玩家的 Battle Pass 数据`);
    const errors: string[] = [];
    let deleted = 0;

    for (const uid of uids) {
        try {
            console.log(`[cleanupTestBattlePass] 清理玩家: ${uid}`);
            // 清理 Battle Pass 记录（需要知道 seasonId）
            const battlePasses = await ctx.db
                .query("player_battle_pass")
                .withIndex("by_uid_season", (q: any) => q.eq("uid", uid))
                .collect();
            for (const bp of battlePasses) {
                await ctx.db.delete(bp._id);
                deleted++;
            }
            if (battlePasses.length > 0) {
                console.log(`[cleanupTestBattlePass] ✓ 删除 ${battlePasses.length} 个 Battle Pass 记录: ${uid}`);
            }

            // 清理积分日志
            const logs = await ctx.db
                .query("battle_pass_season_points_logs")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .collect();
            for (const log of logs) {
                await ctx.db.delete(log._id);
            }
            if (logs.length > 0) {
                console.log(`[cleanupTestBattlePass] ✓ 删除 ${logs.length} 个积分日志: ${uid}`);
            }

            // 清理奖励领取日志
            const claims = await ctx.db
                .query("battle_pass_reward_claims")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .collect();
            for (const claim of claims) {
                await ctx.db.delete(claim._id);
            }
            if (claims.length > 0) {
                console.log(`[cleanupTestBattlePass] ✓ 删除 ${claims.length} 个奖励领取日志: ${uid}`);
            }
        } catch (error: any) {
            console.error(`[cleanupTestBattlePass] ❌ 清理 Battle Pass ${uid} 失败:`, error.message);
            errors.push(`清理 Battle Pass ${uid} 失败: ${error.message}`);
        }
    }

    console.log(`[cleanupTestBattlePass] 完成清理，删除了 ${deleted} 个 Battle Pass 记录，${errors.length} 个错误`);
    return { deleted, errors };
}

/**
 * 清理匹配队列数据
 */
export async function cleanupMatchingQueue(ctx: any, uids: string[]): Promise<{ deleted: number; errors: string[] }> {
    const errors: string[] = [];
    let deleted = 0;

    for (const uid of uids) {
        try {
            const queues = await ctx.db
                .query("matchingQueue")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .collect();
            for (const queue of queues) {
                await ctx.db.delete(queue._id);
                deleted++;
            }
        } catch (error: any) {
            errors.push(`清理匹配队列 ${uid} 失败: ${error.message}`);
        }
    }

    return { deleted, errors };
}

/**
 * Convex Mutation: 清理所有测试数据
 */
export const cleanupAllTestData = internalMutation({
    args: {
        playerUids: v.array(v.string()),
        gameIds: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        const results = {
            players: await cleanupTestPlayers(ctx, args.playerUids),
            games: args.gameIds ? await cleanupTestGames(ctx, args.gameIds) : { deleted: 0, errors: [] },
            battlePass: await cleanupTestBattlePass(ctx, args.playerUids),
            matchingQueue: await cleanupMatchingQueue(ctx, args.playerUids),
        };

        return {
            success: true,
            results,
            totalDeleted: results.players.deleted + results.games.deleted + results.battlePass.deleted + results.matchingQueue.deleted,
            totalErrors: [
                ...results.players.errors,
                ...results.games.errors,
                ...results.battlePass.errors,
                ...results.matchingQueue.errors,
            ],
        };
    },
});

