/**
 * 碎片管理服务
 * 负责碎片的添加、扣除、合成等操作
 */

import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { MonsterService } from "./monsterService";

/**
 * 碎片合成需求配置
 */
const SYNTHESIS_SHARD_REQUIREMENTS: Record<string, number> = {
    Common: 20,
    Rare: 30,
    Epic: 50,
    Legendary: 100,
};

/**
 * 重复角色转换为碎片数量
 */
const DUPLICATE_TO_SHARD: Record<string, number> = {
    Common: 10,
    Rare: 15,
    Epic: 25,
    Legendary: 50,
};

export class ShardService {
    /**
     * 获取玩家碎片数量
     */
    static async getPlayerShards(ctx: any, uid: string, monsterId: string): Promise<number> {
        const shardRecord = await ctx.db
            .query("mr_monster_shards")
            .withIndex("by_uid_monsterId", (q: any) => q.eq("uid", uid).eq("monsterId", monsterId))
            .first();

        return shardRecord?.quantity || 0;
    }

    /**
     * 获取玩家所有碎片
     */
    static async getAllPlayerShards(ctx: any, uid: string) {
        const shards = await ctx.db
            .query("mr_monster_shards")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .collect();

        return shards;
    }

    /**
     * 添加碎片
     */
    static async addShards(
        ctx: any,
        params: {
            uid: string;
            monsterId: string;
            quantity: number;
            source: string;
            sourceId?: string;
        }
    ) {
        const { uid, monsterId, quantity, source, sourceId } = params;

        if (quantity <= 0) {
            throw new Error("碎片数量必须大于0");
        }

        // 查找或创建碎片记录
        let shardRecord = await ctx.db
            .query("mr_monster_shards")
            .withIndex("by_uid_monsterId", (q: any) => q.eq("uid", uid).eq("monsterId", monsterId))
            .first();

        const now = new Date().toISOString();

        if (shardRecord) {
            // 更新现有记录
            await ctx.db.patch(shardRecord._id, {
                quantity: shardRecord.quantity + quantity,
                updatedAt: now,
            });
        } else {
            // 创建新记录
            await ctx.db.insert("mr_monster_shards", {
                uid,
                monsterId,
                quantity,
                updatedAt: now,
            });
        }

        // 同时更新玩家怪物记录中的碎片数量（如果存在）
        const monster = await MonsterService.getPlayerMonster(ctx, uid, monsterId);
        if (monster) {
            await MonsterService.updateMonster(ctx, {
                uid,
                monsterId,
                shards: (monster.shards || 0) + quantity,
            });
        }

        return { ok: true };
    }

    /**
     * 扣除碎片
     */
    static async deductShards(
        ctx: any,
        params: {
            uid: string;
            monsterId: string;
            quantity: number;
            source: string;
            sourceId?: string;
        }
    ) {
        const { uid, monsterId, quantity, source, sourceId } = params;

        if (quantity <= 0) {
            throw new Error("碎片数量必须大于0");
        }

        // 查找碎片记录
        const shardRecord = await ctx.db
            .query("mr_monster_shards")
            .withIndex("by_uid_monsterId", (q: any) => q.eq("uid", uid).eq("monsterId", monsterId))
            .first();

        const currentQuantity = shardRecord?.quantity || 0;

        if (currentQuantity < quantity) {
            throw new Error(`碎片不足，需要 ${quantity} 碎片，当前拥有 ${currentQuantity}`);
        }

        const now = new Date().toISOString();

        if (shardRecord) {
            const newQuantity = currentQuantity - quantity;
            if (newQuantity === 0) {
                // 如果碎片为0，删除记录
                await ctx.db.delete(shardRecord._id);
            } else {
                // 更新记录
                await ctx.db.patch(shardRecord._id, {
                    quantity: newQuantity,
                    updatedAt: now,
                });
            }
        }

        // 同时更新玩家怪物记录中的碎片数量（如果存在）
        const monster = await MonsterService.getPlayerMonster(ctx, uid, monsterId);
        if (monster) {
            await MonsterService.updateMonster(ctx, {
                uid,
                monsterId,
                shards: Math.max(0, (monster.shards || 0) - quantity),
            });
        }

        return { ok: true };
    }

    /**
     * 碎片合成怪物
     */
    static async synthesizeMonster(
        ctx: any,
        params: {
            uid: string;
            monsterId: string;
        }
    ) {
        const { uid, monsterId } = params;

        // 1. 获取怪物配置
        const config = await MonsterService.getMonsterConfig(ctx, monsterId);
        if (!config) {
            throw new Error(`怪物配置不存在: ${monsterId}`);
        }

        // 2. 检查玩家是否已有该怪物
        const existing = await MonsterService.getPlayerMonster(ctx, uid, monsterId);
        if (existing) {
            throw new Error(`玩家已拥有该怪物，无法合成`);
        }

        // 3. 获取合成所需碎片
        const shardRequirement = SYNTHESIS_SHARD_REQUIREMENTS[config.rarity];
        if (!shardRequirement) {
            throw new Error(`未知的稀有度: ${config.rarity}`);
        }

        // 4. 检查碎片是否足够
        const currentShards = await this.getPlayerShards(ctx, uid, monsterId);
        if (currentShards < shardRequirement) {
            throw new Error(`碎片不足，需要 ${shardRequirement} 碎片，当前拥有 ${currentShards}`);
        }

        // 5. 扣除碎片
        await this.deductShards(ctx, {
            uid,
            monsterId,
            quantity: shardRequirement,
            source: "synthesize",
            sourceId: monsterId,
        });

        // 6. 添加怪物到玩家账户
        await MonsterService.addMonsterToPlayer(ctx, {
            uid,
            monsterId,
            level: 1,
            stars: 1,
            experience: 0,
            shards: 0,
        });

        return {
            ok: true,
            monsterId,
            shardCost: shardRequirement,
        };
    }

    /**
     * 重复角色转换为碎片
     */
    static async convertDuplicateToShards(
        ctx: any,
        params: {
            uid: string;
            monsterId: string;
        }
    ) {
        const { uid, monsterId } = params;

        // 1. 获取怪物配置
        const config = await MonsterService.getMonsterConfig(ctx, monsterId);
        if (!config) {
            throw new Error(`怪物配置不存在: ${monsterId}`);
        }

        // 2. 检查玩家是否拥有该怪物
        const monster = await MonsterService.getPlayerMonster(ctx, uid, monsterId);
        if (!monster) {
            throw new Error(`玩家不拥有该怪物，无法转换`);
        }

        // 3. 获取转换碎片数量
        const shardAmount = DUPLICATE_TO_SHARD[config.rarity];
        if (!shardAmount) {
            throw new Error(`未知的稀有度: ${config.rarity}`);
        }

        // 4. 添加碎片
        await this.addShards(ctx, {
            uid,
            monsterId,
            quantity: shardAmount,
            source: "duplicate_conversion",
            sourceId: monsterId,
        });

        // 5. 删除玩家怪物记录（可选：或者保留但标记为已转换）
        // 这里选择删除，因为已经转换为碎片
        const monsters = await ctx.db
            .query("mr_player_monsters")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .collect();

        const monsterRecord = monsters.find((m: any) => m.monsterId === monsterId);
        if (monsterRecord) {
            await ctx.db.delete(monsterRecord._id);
        }

        return {
            ok: true,
            shardAmount,
        };
    }

    /**
     * 批量添加碎片（用于奖励发放）
     */
    static async batchAddShards(
        ctx: any,
        params: {
            uid: string;
            shards: Array<{ monsterId: string; quantity: number }>;
            source: string;
            sourceId?: string;
        }
    ) {
        const { uid, shards, source, sourceId } = params;

        const results = await Promise.all(
            shards.map((shard) =>
                this.addShards(ctx, {
                    uid,
                    monsterId: shard.monsterId,
                    quantity: shard.quantity,
                    source,
                    sourceId,
                })
            )
        );

        return {
            ok: true,
            results,
        };
    }
}

// ============================================
// Convex API 接口
// ============================================

/**
 * 获取玩家碎片数量
 */
export const getPlayerShards = query({
    args: {
        uid: v.string(),
        monsterId: v.string(),
    },
    handler: async (ctx, args) => {
        const quantity = await ShardService.getPlayerShards(ctx, args.uid, args.monsterId);
        return { quantity };
    },
});

/**
 * 获取玩家所有碎片
 */
export const getAllPlayerShards = query({
    args: {
        uid: v.string(),
    },
    handler: async (ctx, args) => {
        const shards = await ShardService.getAllPlayerShards(ctx, args.uid);
        return shards;
    },
});

/**
 * 添加碎片
 */
export const addShards = mutation({
    args: {
        uid: v.string(),
        monsterId: v.string(),
        quantity: v.number(),
        source: v.string(),
        sourceId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const result = await ShardService.addShards(ctx, args);
        return result;
    },
});

/**
 * 扣除碎片
 */
export const deductShards = mutation({
    args: {
        uid: v.string(),
        monsterId: v.string(),
        quantity: v.number(),
        source: v.string(),
        sourceId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const result = await ShardService.deductShards(ctx, args);
        return result;
    },
});

/**
 * 碎片合成怪物
 */
export const synthesizeMonster = mutation({
    args: {
        uid: v.string(),
        monsterId: v.string(),
    },
    handler: async (ctx, args) => {
        const result = await ShardService.synthesizeMonster(ctx, args);
        return result;
    },
});

/**
 * 重复角色转换为碎片
 */
export const convertDuplicateToShards = mutation({
    args: {
        uid: v.string(),
        monsterId: v.string(),
    },
    handler: async (ctx, args) => {
        const result = await ShardService.convertDuplicateToShards(ctx, args);
        return result;
    },
});

/**
 * 批量添加碎片
 */
export const batchAddShards = mutation({
    args: {
        uid: v.string(),
        shards: v.array(v.object({ monsterId: v.string(), quantity: v.number() })),
        source: v.string(),
        sourceId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const result = await ShardService.batchAddShards(ctx, args);
        return result;
    },
});

