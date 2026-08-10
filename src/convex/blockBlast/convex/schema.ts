import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import { blockBlastRecordedStep } from "./service/seedPool/blockBlastSeedPoolValidators";

export default defineSchema({
    blockBlast_game: defineTable({
        gameId: v.string(),
        /** 8 / 9 / 10；缺省视为由 grid 边长推断 */
        gridSize: v.optional(v.number()),
        grid: v.array(v.array(v.number())), // N×N，0=空，1–7=颜色块
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
        /** 回放/复盘用：稳定可复现的落子序列（不含 shapeId，shapeId 由 seed 确定性生成） */
        recordedOps: v.optional(v.array(blockBlastRecordedStep)),
        /** 上一步 op 的 wall-clock（ms），用于自动填充 pacingMs */
        lastOpAt: v.optional(v.number()),
        /** 休闲 run：对局截止时间（ms）；仅 `game_*` 建局时写入 */
        dueTime: v.optional(v.number()),
        /** 单人挑战达标线；达到后立即 WON 结束 */
        targetScore: v.optional(v.number()),
        /** 休闲 run：Convex scheduler 超时任务 id */
        casualTimeoutScheduledId: v.optional(v.id("_scheduled_functions")),
        /** 与平台 `replayEpoch` 对齐；不匹配时 loadGame 重建 */
        replayEpoch: v.optional(v.number()),
    }).index("by_gameId", ["gameId"]),
});

