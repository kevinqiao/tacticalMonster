import { defineTable } from "convex/server";
import { v } from "convex/values";

export const monsterRumbleSchema = {
    // ============================================
    // Monster Rumble Tournament 相关表
    // 注意：游戏主表已合并到 tacticalMonster_game
    // ============================================

    mr_game_participants: defineTable({
        gameId: v.string(),
        uid: v.string(),
        position: v.number(),                    // 玩家位置/座位
        teamPower: v.number(),                   // 阵容战斗力
        finalScore: v.optional(v.number()),
        rank: v.optional(v.number()),            // 最终排名
        status: v.string(),                      // "playing", "finished", "rewarded"
        monsters: v.array(v.object({             // 玩家选择的4个怪物
            monsterId: v.string(),
            level: v.number(),
            stars: v.number(),
            position: v.object({                 // Hex位置
                q: v.number(),
                r: v.number()
            })
        })),
        joinedAt: v.string(),
        finishedAt: v.optional(v.string()),
        rewardedAt: v.optional(v.string()),
    })
        .index("by_gameId", ["gameId"])
        .index("by_gameId_status", ["gameId", "status"])
        .index("by_gameId_finalScore", ["gameId", "finalScore"])
        .index("by_uid", ["uid"]),
};

