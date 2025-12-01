import { defineTable } from "convex/server";
import { v } from "convex/values";

export const monsterSchema = {
    // ============================================
    // 怪物系统相关表
    // ============================================
    
    mr_monster_configs: defineTable({
        monsterId: v.string(),
        name: v.string(),
        rarity: v.string(),                      // "Common", "Rare", "Epic", "Legendary"
        class: v.optional(v.string()),
        race: v.optional(v.string()),
        baseHp: v.number(),
        baseDamage: v.number(),
        baseDefense: v.number(),
        baseSpeed: v.number(),
        skills: v.any(),                         // 技能配置
        growthRates: v.any(),                    // 成长率配置
        assetPath: v.string(),                   // 3D模型路径
        configVersion: v.number(),
    })
    .index("by_monsterId", ["monsterId"])
    .index("by_rarity", ["rarity"]),

    mr_player_monsters: defineTable({
        uid: v.string(),
        monsterId: v.string(),
        level: v.number(),
        stars: v.number(),
        experience: v.number(),
        shards: v.number(),                      // 当前碎片数量
        unlockedSkills: v.any(),
        inTeam: v.optional(v.boolean()),         // 是否在队伍中
        obtainedAt: v.string(),
        updatedAt: v.string(),
    })
    .index("by_uid", ["uid"])
    .index("by_uid_monsterId", ["uid", "monsterId"])
    .index("by_uid_inTeam", ["uid", "inTeam"]),

    mr_monster_shards: defineTable({
        uid: v.string(),
        monsterId: v.string(),
        quantity: v.number(),
        updatedAt: v.string(),
    })
    .index("by_uid", ["uid"])
    .index("by_uid_monsterId", ["uid", "monsterId"]),
};

