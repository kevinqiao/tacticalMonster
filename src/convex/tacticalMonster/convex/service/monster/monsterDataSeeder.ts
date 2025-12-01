/**
 * 怪物数据初始化服务
 * 用于将怪物配置数据导入到数据库
 */

import { v } from "convex/values";
import { internalMutation } from "../../_generated/server";
import { getAllMonsterConfigs } from "../../data/monsterConfigs";

/**
 * 初始化怪物配置数据到数据库
 * 这是一个 internal mutation，可以通过 Convex dashboard 或脚本调用
 */
export const seedMonsterConfigs = internalMutation({
    args: {},
    handler: async (ctx) => {
        const configs = getAllMonsterConfigs();
        const results = {
            inserted: 0,
            skipped: 0,
            errors: [] as string[],
        };

        for (const config of configs) {
            try {
                // 检查是否已存在
                const existing = await ctx.db
                    .query("mr_monster_configs")
                    .withIndex("by_monsterId", (q: any) => q.eq("monsterId", config.monsterId))
                    .first();

                if (existing) {
                    results.skipped++;
                    continue;
                }

                // 插入新配置
                await ctx.db.insert("mr_monster_configs", {
                    monsterId: config.monsterId,
                    name: config.name,
                    rarity: config.rarity,
                    class: config.class,
                    race: config.race,
                    baseHp: config.baseHp,
                    baseDamage: config.baseDamage,
                    baseDefense: config.baseDefense,
                    baseSpeed: config.baseSpeed,
                    skills: config.skills,
                    growthRates: config.growthRates,
                    assetPath: config.assetPath,
                    configVersion: config.configVersion,
                });

                results.inserted++;
            } catch (error: any) {
                results.errors.push(`${config.monsterId}: ${error.message}`);
            }
        }

        return {
            ok: true,
            total: configs.length,
            ...results,
        };
    },
});

/**
 * 更新单个怪物配置
 */
export const updateMonsterConfig = internalMutation({
    args: {
        monsterId: v.string(),
        updates: v.object({
            name: v.optional(v.string()),
            rarity: v.optional(v.string()),
            class: v.optional(v.string()),
            race: v.optional(v.string()),
            baseHp: v.optional(v.number()),
            baseDamage: v.optional(v.number()),
            baseDefense: v.optional(v.number()),
            baseSpeed: v.optional(v.number()),
            skills: v.optional(v.any()),
            growthRates: v.optional(v.any()),
            assetPath: v.optional(v.string()),
            configVersion: v.optional(v.number()),
        }),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("mr_monster_configs")
            .withIndex("by_monsterId", (q: any) => q.eq("monsterId", args.monsterId))
            .first();

        if (!existing) {
            throw new Error(`怪物配置不存在: ${args.monsterId}`);
        }

        await ctx.db.patch(existing._id, args.updates);

        return { ok: true };
    },
});

/**
 * 清空所有怪物配置（谨慎使用）
 */
export const clearAllMonsterConfigs = internalMutation({
    args: {},
    handler: async (ctx) => {
        const allConfigs = await ctx.db.query("mr_monster_configs").collect();

        for (const config of allConfigs) {
            await ctx.db.delete(config._id);
        }

        return {
            ok: true,
            deleted: allConfigs.length,
        };
    },
});

