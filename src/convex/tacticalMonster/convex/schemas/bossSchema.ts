import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Boss系统Schema
 * 定义Boss组合实例和Boss配置表
 */
export const bossSchema = {
    mr_boss_instances: defineTable({
        bossInstanceId: v.string(),
        gameId: v.string(),
        bossId: v.string(),
        levelId: v.string(),
        
        // Boss组合的角色ID映射
        // 所有角色（Boss本体+小怪）都存储在tacticalMonster_game_character中
        characterIds: v.object({
            bossMain: v.string(),        // Boss本体的character_id
            minions: v.array(v.string()), // 小怪的character_id列表
        }),
        
        currentPhase: v.optional(v.string()),  // 当前阶段
        status: v.string(),              // "alive" | "defeated"
        behaviorSeed: v.string(),        // 行为随机种子（确保确定性）
        createdAt: v.string(),
        updatedAt: v.optional(v.string()),
    })
    .index("by_gameId", ["gameId"])
    .index("by_bossId", ["bossId"])
    .index("by_status", ["status"]),
};
