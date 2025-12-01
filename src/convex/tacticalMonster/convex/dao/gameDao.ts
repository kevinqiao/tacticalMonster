import { v } from "convex/values";
import { internalMutation, query } from "../_generated/server";

/**
 * 游戏数据访问层
 */
export const getGameById = query({
    args: { gameId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("tacticalMonster_game")
            .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
            .first();
    },
});

export const createGame = internalMutation({
    args: {
        gameId: v.string(),
        matchId: v.optional(v.string()),
        tier: v.string(),
        bossId: v.string(),
        maxPlayers: v.number(),
        timeoutAt: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const now = new Date().toISOString();
        // 注意：有 matchId 就表示是 Tournament 模式
        return await ctx.db.insert("tacticalMonster_game", {
            gameId: args.gameId,
            matchId: args.matchId,
            tier: args.tier,
            bossId: args.bossId,
            status: "waiting",
            maxPlayers: args.maxPlayers,
            currentPlayers: 0,
            timeoutAt: args.timeoutAt,
            createdAt: now,
        });
    },
});

export const updateGameStatus = internalMutation({
    args: {
        gameId: v.string(),
        status: v.string(),
        startedAt: v.optional(v.string()),
        endedAt: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const game = await ctx.db
            .query("tacticalMonster_game")
            .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
            .first();

        if (!game) {
            throw new Error("游戏不存在");
        }

        const updates: any = { status: args.status };
        if (args.startedAt) updates.startedAt = args.startedAt;
        if (args.endedAt) updates.endedAt = args.endedAt;

        return await ctx.db.patch(game._id, updates);
    },
});

