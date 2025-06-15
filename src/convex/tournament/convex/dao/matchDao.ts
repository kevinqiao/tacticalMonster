import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { internalMutation, internalQuery, query } from "../_generated/server";
const enum Status {
    STARTED = 0,
    COMPLETED = 1,
    DROPPED = 2,
    CANCELLED = 3,
}
export const create = internalMutation({
    args: {
        tournamentId: v.id("tournaments"), // 关联锦标赛
        seasonId: v.id("seasons"), // 关联赛季
        matchType: v.string(), // 对局类型："free", "challenge", "master", "daily"
        players: v.array(
            v.object({
                playerId: v.union(v.id("players"), v.string()), // 真人玩家ID或AI标识
                score: v.number(), // 分数
                rank: v.number(), // 排名（0 表示未完成）
                segmentName: v.string(), // 段位
                isAI: v.boolean(), // 是否为AI
            })
        ),
        status: v.number(), // 状态："active", "completed"
        seed: v.number(), // 随机种子（游戏一致性）
        createdAt: v.string(), // 创建时间（ISODate）
    },
    handler: async (ctx, args) => {
        const mid = await ctx.db.insert("matches", args);
        return mid;
    },
})
export const findMatch = query({
    args: {
        mid: v.string(),
    },
    handler: async (ctx, { mid }) => {
        const match = await ctx.db.get(mid as Id<"matches">);
        return { ...match, _id: undefined, _creationTime: undefined };
    }
})
export const find = internalQuery({
    args: {
        mid: v.id("matches"),
    },
    handler: async (ctx, { mid }) => {
        const match = await ctx.db.get(mid);
        return match;
    },
})
export const update = internalMutation({
    args: {
        mid: v.id("matches"),
        data: v.any()
    },
    handler: async (ctx, { mid, data }) => {
        const match = await ctx.db.get(mid);
        if (match) {
            return await ctx.db.patch(match._id, data);
        }
        return null;
    },
})
export const remove = internalMutation({
    args: {
        mid: v.id("matches"),
    },
    handler: async (ctx, { mid }) => {
        await ctx.db.delete(mid);
    },
})
