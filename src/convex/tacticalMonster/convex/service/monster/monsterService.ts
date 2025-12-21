/**
 * 怪物管理服务
 * 负责怪物的查询、获取、添加等基础管理功能，以及碎片管理
 * 
 * 注意：Monster 配置直接从配置文件读取，不存数据库
 * 碎片存储在 mr_player_monsters.shards 字段中（方案B）
 */

import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { getMonsterConfigsByRarity, Monster, MONSTER_CONFIGS_MAP } from "../../data/monsterConfigs";

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

export class MonsterService {
    // ============================================
    // 怪物配置相关
    // ============================================

    /**
     * 获取怪物配置（从配置文件）
     */
    static getMonsterConfig(monsterId: string): Monster | null {
        return MONSTER_CONFIGS_MAP[monsterId] || null;
    }

    /**
     * 获取所有怪物配置（按稀有度筛选）
     */
    static getAllMonsterConfigs(rarity?: string): Monster[] {
        if (rarity) {
            return getMonsterConfigsByRarity(rarity as any);
        }
        return Object.values(MONSTER_CONFIGS_MAP);
    }

    // ============================================
    // 怪物实例管理（CRUD）
    // ============================================

    /**
     * 获取玩家的所有怪物（只返回已解锁的）
     */
    static async getPlayerMonsters(ctx: any, uid: string) {
        const monsters = await ctx.db
            .query("mr_player_monsters")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .filter((q: any) => q.eq(q.field("isUnlocked"), true))  // 只返回已解锁的
            .collect();

        // 关联怪物配置信息（从配置文件读取）
        const monstersWithConfig = monsters.map((monster: any) => {
            const config = this.getMonsterConfig(monster.monsterId);
            return {
                ...monster,
                config: config || null,
            };
        });

        return monstersWithConfig;
    }

    /**
     * 获取玩家的队伍怪物（上场队伍，inTeam === 1）
     * 注意：此方法返回上场队伍（最多4个），按坐标排序
     */
    static async getPlayerTeamMonsters(ctx: any, uid: string) {
        // 查询所有在队伍中的怪物（inTeam === 1），只返回已解锁的
        const allMonsters = await ctx.db
            .query("mr_player_monsters")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .filter((q: any) => q.eq(q.field("isUnlocked"), true))  // 只返回已解锁的
            .collect();

        // 过滤出在队伍中的怪物
        const teamMonsters = allMonsters.filter((m: any) => m.inTeam === 1);

        // 按坐标排序（先按 q，再按 r）并限制最多4个
        const sortedTeam = teamMonsters
            .sort((a: any, b: any) => {
                const posA = a.teamPosition || { q: 999, r: 999 };
                const posB = b.teamPosition || { q: 999, r: 999 };
                if (posA.q !== posB.q) {
                    return posA.q - posB.q;
                }
                return posA.r - posB.r;
            })
            .slice(0, 4);

        // 关联怪物配置信息（从配置文件读取）
        const monstersWithConfig = sortedTeam.map((monster: any) => {
            const config = this.getMonsterConfig(monster.monsterId);
            return {
                ...monster,
                config: config || null,
            };
        });

        return monstersWithConfig;
    }

    /**
     * 获取玩家的单个怪物（包括未解锁的，用于碎片查询）
     */
    static async getPlayerMonster(ctx: any, uid: string, monsterId: string) {
        const monsters = await ctx.db
            .query("mr_player_monsters")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .collect();

        const monster = monsters.find((m: any) => m.monsterId === monsterId);

        if (!monster) {
            return null;
        }

        const config = this.getMonsterConfig(monsterId);

        return {
            ...monster,
            config: config || null,
        };
    }

    /**
     * 添加新怪物到玩家账户
     */
    static async addMonsterToPlayer(
        ctx: any,
        params: {
            uid: string;
            monsterId: string;
            level?: number;
            stars?: number;
            experience?: number;
            shards?: number;
            isUnlocked?: boolean;  // 是否已解锁，默认 true
        }
    ) {
        const {
            uid,
            monsterId,
            level = 1,
            stars = 1,
            experience = 0,
            shards = 0,
            isUnlocked = true  // 默认已解锁
        } = params;

        // 检查怪物配置是否存在（从配置文件读取）
        const config = this.getMonsterConfig(monsterId);
        if (!config) {
            throw new Error(`怪物配置不存在: ${monsterId}`);
        }

        // 检查玩家是否已有该怪物记录（包括未解锁的）
        const existing = await ctx.db
            .query("mr_player_monsters")
            .withIndex("by_uid_monsterId", (q: any) => q.eq("uid", uid).eq("monsterId", monsterId))
            .first();

        if (existing) {
            // 如果记录已存在，检查是否已解锁
            if (existing.isUnlocked && isUnlocked) {
                throw new Error(`玩家已拥有该怪物: ${monsterId}`);
            }
            // 如果记录存在但未解锁，且现在要解锁，则更新记录
            if (!existing.isUnlocked && isUnlocked) {
                await ctx.db.patch(existing._id, {
                    isUnlocked: true,
                    level,
                    stars,
                    experience,
                    shards,
                    obtainedAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });
                return { ok: true, monsterId: existing._id };
            }
            // 如果记录存在且未解锁，且现在也要创建未解锁记录，则只更新碎片
            if (!existing.isUnlocked && !isUnlocked) {
                await ctx.db.patch(existing._id, {
                    shards: existing.shards + shards,
                    updatedAt: new Date().toISOString(),
                });
                return { ok: true, monsterId: existing._id };
            }
        }

        // 创建新记录
        const now = new Date().toISOString();
        const monsterId_record = await ctx.db.insert("mr_player_monsters", {
            uid,
            monsterId,
            level,
            stars,
            experience,
            shards,
            isUnlocked,
            unlockedSkills: [],
            inTeam: 0,
            teamPosition: undefined,
            obtainedAt: now,
            updatedAt: now,
        });

        return { ok: true, monsterId: monsterId_record };
    }

    /**
     * 更新怪物信息（队伍位置、等级等）
     */
    static async updateMonster(
        ctx: any,
        params: {
            uid: string;
            monsterId: string;
            level?: number;
            stars?: number;
            experience?: number;
            shards?: number;
            unlockedSkills?: any[];
            isUnlocked?: boolean;  // 新增参数
        }
    ) {
        const { uid, monsterId, ...updates } = params;

        const monsters = await ctx.db
            .query("mr_player_monsters")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .collect();

        const monster = monsters.find((m: any) => m.monsterId === monsterId);

        if (!monster) {
            throw new Error(`玩家不拥有该怪物: ${monsterId}`);
        }

        const updateData: any = {
            updatedAt: new Date().toISOString(),
        };

        if (updates.level !== undefined) updateData.level = updates.level;
        if (updates.stars !== undefined) updateData.stars = updates.stars;
        if (updates.experience !== undefined) updateData.experience = updates.experience;
        if (updates.shards !== undefined) updateData.shards = updates.shards;
        if (updates.unlockedSkills !== undefined) updateData.unlockedSkills = updates.unlockedSkills;
        if (updates.isUnlocked !== undefined) updateData.isUnlocked = updates.isUnlocked;

        await ctx.db.patch(monster._id, updateData);

        return { ok: true };
    }

    // ============================================
    // 碎片管理（Shard Operations）
    // ============================================

    /**
     * 获取玩家碎片数量（从 mr_player_monsters 表查询）
     */
    static async getPlayerShards(ctx: any, uid: string, monsterId: string): Promise<number> {
        const records = await ctx.db
            .query("mr_player_monsters")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .collect();

        const record = records.find((m: any) => m.monsterId === monsterId);
        return record?.shards || 0;
    }

    /**
     * 获取玩家所有碎片（包括未解锁的）
     */
    static async getAllPlayerShards(ctx: any, uid: string) {
        const records = await ctx.db
            .query("mr_player_monsters")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .filter((q: any) => q.gt(q.field("shards"), 0))  // 只返回有碎片的记录
            .collect();

        return records.map((r: any) => ({
            monsterId: r.monsterId,
            quantity: r.shards,
            isUnlocked: r.isUnlocked,
        }));
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

        // 检查怪物配置是否存在
        const config = this.getMonsterConfig(monsterId);
        if (!config) {
            throw new Error(`怪物配置不存在: ${monsterId}`);
        }

        // 查询现有记录（包括未解锁的）
        const records = await ctx.db
            .query("mr_player_monsters")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .collect();
        const existing = records.find((m: any) => m.monsterId === monsterId);

        if (existing) {
            // 更新现有记录的碎片数量
            await this.updateMonster(ctx, {
                uid,
                monsterId,
                shards: (existing.shards || 0) + quantity,
            });
        } else {
            // 创建"仅碎片"记录（isUnlocked=false）
            await this.addMonsterToPlayer(ctx, {
                uid,
                monsterId,
                level: 1,              // 默认值，但未解锁时不可用
                stars: 1,             // 默认值，但未解锁时不可用
                experience: 0,
                shards: quantity,
                isUnlocked: false,     // 标记为未解锁
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

        // 查询现有记录（包括未解锁的）
        const records = await ctx.db
            .query("mr_player_monsters")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .collect();
        const existing = records.find((m: any) => m.monsterId === monsterId);

        if (!existing) {
            throw new Error(`玩家没有该怪物的碎片记录: ${monsterId}`);
        }

        const currentShards = existing.shards || 0;

        if (currentShards < quantity) {
            throw new Error(`碎片不足，需要 ${quantity} 碎片，当前拥有 ${currentShards}`);
        }

        const newShards = currentShards - quantity;

        // 更新碎片数量
        await this.updateMonster(ctx, {
            uid,
            monsterId,
            shards: newShards,
        });

        return { ok: true };
    }

    /**
     * 碎片合成怪物（解锁怪物）
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
        const config = this.getMonsterConfig(monsterId);
        if (!config) {
            throw new Error(`怪物配置不存在: ${monsterId}`);
        }

        // 2. 查询现有记录（包括未解锁的）
        const records = await ctx.db
            .query("mr_player_monsters")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .collect();
        const existing = records.find((m: any) => m.monsterId === monsterId);

        // 3. 检查是否已解锁
        if (existing && existing.isUnlocked) {
            throw new Error(`玩家已拥有该怪物，无法合成`);
        }

        // 4. 获取合成所需碎片
        const shardRequirement = SYNTHESIS_SHARD_REQUIREMENTS[config.rarity];
        if (!shardRequirement) {
            throw new Error(`未知的稀有度: ${config.rarity}`);
        }

        // 5. 检查碎片是否足够
        const currentShards = existing?.shards || 0;
        if (currentShards < shardRequirement) {
            throw new Error(`碎片不足，需要 ${shardRequirement} 碎片，当前拥有 ${currentShards}`);
        }

        // 6. 扣除碎片
        await this.deductShards(ctx, {
            uid,
            monsterId,
            quantity: shardRequirement,
            source: "synthesize",
            sourceId: monsterId,
        });

        // 7. 解锁怪物（如果记录存在）或创建已解锁的怪物（如果记录不存在）
        if (existing && !existing.isUnlocked) {
            // 解锁现有记录
            await this.updateMonster(ctx, {
                uid,
                monsterId,
                isUnlocked: true,
                level: 1,
                stars: 1,
                experience: 0,
                shards: existing.shards - shardRequirement,
            });
        } else if (!existing) {
            // 创建已解锁的怪物（这种情况理论上不应该发生，因为合成前应该有碎片记录）
            await this.addMonsterToPlayer(ctx, {
                uid,
                monsterId,
                level: 1,
                stars: 1,
                experience: 0,
                shards: 0,
                isUnlocked: true,
            });
        }

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
        const config = this.getMonsterConfig(monsterId);
        if (!config) {
            throw new Error(`怪物配置不存在: ${monsterId}`);
        }

        // 2. 检查玩家是否拥有该怪物（必须是已解锁的）
        const monster = await this.getPlayerMonster(ctx, uid, monsterId);
        if (!monster || !monster.isUnlocked) {
            throw new Error(`玩家不拥有该怪物，无法转换`);
        }

        // 3. 获取转换碎片数量
        const shardAmount = DUPLICATE_TO_SHARD[config.rarity];
        if (!shardAmount) {
            throw new Error(`未知的稀有度: ${config.rarity}`);
        }

        // 4. 添加碎片（如果记录存在但未解锁，会更新；如果不存在，会创建未解锁记录）
        await this.addShards(ctx, {
            uid,
            monsterId,
            quantity: shardAmount,
            source: "duplicate_conversion",
            sourceId: monsterId,
        });

        // 5. 删除玩家怪物记录（因为已经转换为碎片）
        const records = await ctx.db
            .query("mr_player_monsters")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .collect();

        const monsterRecord = records.find((m: any) => m.monsterId === monsterId && m.isUnlocked);
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
 * 查询怪物配置（从配置文件读取）
 */
export const getMonsterConfig = query({
    args: { monsterId: v.string() },
    handler: async (ctx, args) => {
        const config = MonsterService.getMonsterConfig(args.monsterId);
        return config;
    },
});

/**
 * 查询所有怪物配置（从配置文件读取）
 */
export const getAllMonsterConfigs = query({
    args: { rarity: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const configs = MonsterService.getAllMonsterConfigs(args.rarity);
        return configs;
    },
});

/**
 * 获取玩家的所有怪物
 */
export const getPlayerMonsters = query({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        const monsters = await MonsterService.getPlayerMonsters(ctx, args.uid);
        return monsters;
    },
});

/**
 * 获取玩家的队伍怪物
 */
export const getPlayerTeamMonsters = query({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        const teamMonsters = await MonsterService.getPlayerTeamMonsters(ctx, args.uid);
        return teamMonsters;
    },
});

/**
 * 获取玩家的单个怪物
 */
export const getPlayerMonster = query({
    args: { uid: v.string(), monsterId: v.string() },
    handler: async (ctx, args) => {
        const monster = await MonsterService.getPlayerMonster(ctx, args.uid, args.monsterId);
        return monster;
    },
});

/**
 * 添加怪物到玩家账户
 */
export const addMonsterToPlayer = mutation({
    args: {
        uid: v.string(),
        monsterId: v.string(),
        level: v.optional(v.number()),
        stars: v.optional(v.number()),
        experience: v.optional(v.number()),
        shards: v.optional(v.number()),
        isUnlocked: v.optional(v.boolean()),  // 新增
    },
    handler: async (ctx, args) => {
        const result = await MonsterService.addMonsterToPlayer(ctx, args);
        return result;
    },
});

/**
 * 更新怪物信息
 */
export const updateMonster = mutation({
    args: {
        uid: v.string(),
        monsterId: v.string(),
        level: v.optional(v.number()),
        stars: v.optional(v.number()),
        experience: v.optional(v.number()),
        shards: v.optional(v.number()),
        unlockedSkills: v.optional(v.any()),
        isUnlocked: v.optional(v.boolean()),  // 新增
    },
    handler: async (ctx, args) => {
        const result = await MonsterService.updateMonster(ctx, args);
        return result;
    },
});

// ============================================
// 碎片相关 API（保持原有命名，便于向后兼容）
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
        const quantity = await MonsterService.getPlayerShards(ctx, args.uid, args.monsterId);
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
        const shards = await MonsterService.getAllPlayerShards(ctx, args.uid);
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
        const result = await MonsterService.addShards(ctx, args);
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
        const result = await MonsterService.deductShards(ctx, args);
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
        const result = await MonsterService.synthesizeMonster(ctx, args);
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
        const result = await MonsterService.convertDuplicateToShards(ctx, args);
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
        const result = await MonsterService.batchAddShards(ctx, args);
        return result;
    },
});
