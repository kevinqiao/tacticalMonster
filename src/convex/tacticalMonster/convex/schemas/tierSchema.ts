import { defineTable } from "convex/server";
import { v } from "convex/values";

export const tierSchema = {
    // ============================================
    // Tier 系统相关表（游戏特定配置）
    // ============================================
    
    mr_tier_configs: defineTable({
        tier: v.string(),
        name: v.string(),
        unlockLevel: v.number(),
        powerMin: v.number(),
        powerMax: v.number(),
        entryCostCoins: v.number(),
        entryCostEnergy: v.number(),
        coinPool: v.number(),
        top3Rewards: v.any(),                    // {1: 300, 2: 180, 3: 120}
        chestDropRate: v.number(),
        bossDifficulty: v.string(),
        bossIds: v.array(v.string()),
    })
    .index("by_tier", ["tier"]),
};

