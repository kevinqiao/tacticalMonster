/**
 * 怪物管理服务
 * 负责怪物的查询、获取、添加等基础管理功能
 */

import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";

export class MonsterService {
    /**
     * 获取怪物配置
     */
    static async getMonsterConfig(ctx: any, monsterId: string) {
        const config = await ctx.db
            .query("mr_monster_configs")
            .withIndex("by_monsterId", (q: any) => q.eq("monsterId", monsterId))
            .first();

        return config;
    }

    /**
     * 获取所有怪物配置（按稀有度筛选）
     */
    static async getAllMonsterConfigs(ctx: any, rarity?: string) {
        let query = ctx.db.query("mr_monster_configs");

        if (rarity) {
            query = query.withIndex("by_rarity", (q: any) => q.eq("rarity", rarity));
        }

        return await query.collect();
    }

    /**
     * 获取玩家的所有怪物
     */
    static async getPlayerMonsters(ctx: any, uid: string) {
        const monsters = await ctx.db
            .query("mr_player_monsters")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .collect();

        // 关联怪物配置信息
        const monstersWithConfig = await Promise.all(
            monsters.map(async (monster: any) => {
                const config = await this.getMonsterConfig(ctx, monster.monsterId);
                return {
                    ...monster,
                    config: config || null,
                };
            })
        );

        return monstersWithConfig;
    }

    /**
     * 获取玩家的队伍怪物（上场队伍，teamPosition 不为 null）
     * 注意：此方法返回上场队伍（最多4个），按位置排序
     */
    static async getPlayerTeamMonsters(ctx: any, uid: string) {
        const allMonsters = await ctx.db
            .query("mr_player_monsters")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .collect();

        // 获取上场队伍（teamPosition 不为 null，按位置排序，最多4个）
        const teamMonsters = allMonsters
            .filter((m: any) => m.teamPosition !== null && m.teamPosition !== undefined)
            .sort((a: any, b: any) => (a.teamPosition || 0) - (b.teamPosition || 0))
            .slice(0, 4);

        // 关联怪物配置信息
        const monstersWithConfig = await Promise.all(
            teamMonsters.map(async (monster: any) => {
                const config = await this.getMonsterConfig(ctx, monster.monsterId);
                return {
                    ...monster,
                    config: config || null,
                };
            })
        );

        return monstersWithConfig;
    }

    /**
     * 获取玩家的单个怪物
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

        const config = await this.getMonsterConfig(ctx, monsterId);

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
            inTeam?: boolean;
        }
    ) {
        const { uid, monsterId, level = 1, stars = 1, experience = 0, shards = 0, inTeam = false } = params;

        // 检查怪物配置是否存在
        const config = await this.getMonsterConfig(ctx, monsterId);
        if (!config) {
            throw new Error(`怪物配置不存在: ${monsterId}`);
        }

        // 检查玩家是否已有该怪物
        const existing = await ctx.db
            .query("mr_player_monsters")
            .withIndex("by_uid_monsterId", (q: any) => q.eq("uid", uid).eq("monsterId", monsterId))
            .first();

        if (existing) {
            throw new Error(`玩家已拥有该怪物: ${monsterId}`);
        }

        // 创建玩家怪物记录
        const now = new Date().toISOString();
        const monsterId_record = await ctx.db.insert("mr_player_monsters", {
            uid,
            monsterId,
            level,
            stars,
            experience,
            shards,
            unlockedSkills: [],
            inTeam,
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
            inTeam?: boolean;
            unlockedSkills?: any[];
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
        if (updates.inTeam !== undefined) updateData.inTeam = updates.inTeam;
        if (updates.unlockedSkills !== undefined) updateData.unlockedSkills = updates.unlockedSkills;

        await ctx.db.patch(monster._id, updateData);

        return { ok: true };
    }
}

// ============================================
// Convex API 接口
// ============================================

/**
 * 查询怪物配置
 */
export const getMonsterConfig = query({
    args: { monsterId: v.string() },
    handler: async (ctx, args) => {
        const config = await MonsterService.getMonsterConfig(ctx, args.monsterId);
        return config;
    },
});

/**
 * 查询所有怪物配置
 */
export const getAllMonsterConfigs = query({
    args: { rarity: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const configs = await MonsterService.getAllMonsterConfigs(ctx, args.rarity);
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
        inTeam: v.optional(v.boolean()),
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
        inTeam: v.optional(v.boolean()),
        unlockedSkills: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        const result = await MonsterService.updateMonster(ctx, args);
        return result;
    },
});

