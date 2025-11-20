import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    blockBlast_game: defineTable({
        gameId: v.string(),
        grid: v.array(v.array(v.number())), // 10x10 网格，0=空，1=填充
        shapes: v.array(v.object({
            id: v.string(),
            shape: v.array(v.array(v.number())), // 形状定义（2D数组）
            color: v.number(), // 颜色索引
        })),
        nextShapes: v.array(v.object({
            id: v.string(),
            shape: v.array(v.array(v.number())),
            color: v.number(),
        })),
        score: v.number(),
        lines: v.number(), // 消除的行数
        status: v.number(), // 0=进行中, 1=胜利, 2=失败
        moves: v.number(),
        seed: v.optional(v.string()),
        shapeCounter: v.optional(v.number()), // 已生成的形状计数器（用于可重现性）
        lastUpdate: v.optional(v.number()),
    }).index("by_gameId", ["gameId"]),
});

