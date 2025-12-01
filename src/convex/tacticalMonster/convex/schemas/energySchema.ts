import { defineTable } from "convex/server";
import { v } from "convex/values";

export const energySchema = {
    // ============================================
    // 能量系统相关表
    // ============================================
    
    mr_player_energy: defineTable({
        uid: v.string(),
        current: v.number(),
        max: v.number(),
        lastRegenAt: v.string(),
        updatedAt: v.string(),
    })
    .index("by_uid", ["uid"]),
};

