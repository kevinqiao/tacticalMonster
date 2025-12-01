import { defineTable } from "convex/server";
import { v } from "convex/values";

export const chestSchema = {
    // ============================================
    // 宝箱系统相关表
    // ============================================
    
    mr_chest_configs: defineTable({
        chestType: v.string(),                   // "silver", "gold", "purple", "orange"
        name: v.string(),
        unlockTimeSeconds: v.number(),
        rewardsConfig: v.any(),                  // 奖励配置（概率表）
        gemAccelerateCost: v.number(),
    })
    .index("by_chestType", ["chestType"]),

    mr_player_chests: defineTable({
        chestId: v.string(),
        uid: v.string(),
        chestType: v.string(),
        slotNumber: v.number(),                  // 1/2/3
        status: v.string(),                      // "waiting", "opening", "ready", "claimed"
        rewards: v.any(),                        // 预生成的奖励
        startedAt: v.string(),
        readyAt: v.string(),
        claimedAt: v.optional(v.string()),
        createdAt: v.string(),
    })
    .index("by_uid_status", ["uid", "status"])
    .index("by_readyAt", ["readyAt"])
    .index("by_uid_slot", ["uid", "slotNumber"]),
};

