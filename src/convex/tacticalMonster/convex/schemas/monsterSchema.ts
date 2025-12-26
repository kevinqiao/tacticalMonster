import { defineTable } from "convex/server";
import { v } from "convex/values";

export const monsterSchema = {
    // ============================================
    // 怪物系统相关表
    // ============================================

    // 注意：Monster 配置不再存储在数据库中，直接从配置文件 monsterConfigs.ts 读取
    // mr_monster_configs 表已删除

    mr_player_monsters: defineTable({
        uid: v.string(),
        monsterId: v.string(),
        level: v.number(),
        stars: v.number(),
        experience: v.number(),
        shards: v.number(),                      // 当前碎片数量
        isUnlocked: v.boolean(),                  // 是否已解锁（拥有）：false=只有碎片，true=已解锁
        unlockedSkills: v.any(),
        inTeam: v.number(),                       // 0: 不在队伍中，1: 在队伍中
        teamPosition: v.optional(v.object({       // 队伍位置坐标（Hex坐标）
            q: v.number(),
            r: v.number(),
        })),
        obtainedAt: v.string(),
        updatedAt: v.string(),
    })
        .index("by_uid", ["uid"])
        .index("by_uid_monsterId", ["uid", "monsterId"])
        .index("by_inTeam", ["inTeam"])
        // 注意：teamPosition 是对象类型，索引主要用于精确匹配，查询队伍中的怪物应使用 inTeam 字段
        .index("by_uid_teamPosition", ["uid", "teamPosition"]),

};

