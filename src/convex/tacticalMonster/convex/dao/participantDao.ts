import { v } from "convex/values";
import { internalMutation, query } from "../_generated/server";

/**
 * 参与者数据访问层
 */
export const getParticipant = query({
    args: { gameId: v.string(), uid: v.string() },
    handler: async (ctx, args) => {
        // Query by gameId index, then filter by uid in JavaScript
        const participants = await ctx.db
            .query("mr_game_participants")
            .withIndex("by_gameId", (q: any) => q.eq("gameId", args.gameId))
            .collect();

        return participants.find(p => p.uid === args.uid) || null;
    },
});

export const getAllParticipants = query({
    args: { gameId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("mr_game_participants")
            .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
            .collect();
    },
});

export const getFinishedParticipants = query({
    args: { gameId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("mr_game_participants")
            .withIndex("by_gameId_status", (q) =>
                q.eq("gameId", args.gameId).eq("status", "finished")
            )
            .collect();
    },
});

export const createParticipant = internalMutation({
    args: {
        gameId: v.string(),
        uid: v.string(),
        position: v.number(),
        teamPower: v.number(),
        monsters: v.array(v.any()),
    },
    handler: async (ctx, args) => {
        const now = new Date().toISOString();
        return await ctx.db.insert("mr_game_participants", {
            gameId: args.gameId,
            uid: args.uid,
            position: args.position,
            teamPower: args.teamPower,
            finalScore: 0,
            status: "playing",
            monsters: args.monsters,
            joinedAt: now,
        });
    },
});

export const updateParticipantFinish = internalMutation({
    args: {
        gameId: v.string(),
        uid: v.string(),
        finalScore: v.number(),
        finishedAt: v.string(),
    },
    handler: async (ctx, args) => {
        // Query by gameId index, then filter by uid in JavaScript
        const participants = await ctx.db
            .query("mr_game_participants")
            .withIndex("by_gameId", (q: any) => q.eq("gameId", args.gameId))
            .collect();

        const participant = participants.find(p => p.uid === args.uid);

        if (!participant) {
            throw new Error("参与者不存在");
        }

        return await ctx.db.patch(participant._id, {
            status: "finished",
            finalScore: args.finalScore,
            finishedAt: args.finishedAt,
        });
    },
});

export const updateParticipantRank = internalMutation({
    args: {
        gameId: v.string(),
        uid: v.string(),
        rank: v.number(),
    },
    handler: async (ctx, args) => {
        // Query by gameId index, then filter by uid in JavaScript
        const participants = await ctx.db
            .query("mr_game_participants")
            .withIndex("by_gameId", (q: any) => q.eq("gameId", args.gameId))
            .collect();

        const participant = participants.find(p => p.uid === args.uid);

        if (!participant) {
            throw new Error("参与者不存在");
        }

        return await ctx.db.patch(participant._id, {
            rank: args.rank,
        });
    },
});

export const markParticipantRewarded = internalMutation({
    args: {
        gameId: v.string(),
        uid: v.string(),
        rewardedAt: v.string(),
    },
    handler: async (ctx, args) => {
        // Query by gameId index, then filter by uid in JavaScript
        const participants = await ctx.db
            .query("mr_game_participants")
            .withIndex("by_gameId", (q: any) => q.eq("gameId", args.gameId))
            .collect();

        const participant = participants.find(p => p.uid === args.uid);

        if (!participant) {
            throw new Error("参与者不存在");
        }

        return await ctx.db.patch(participant._id, {
            status: "rewarded",
            rewardedAt: args.rewardedAt,
        });
    },
});

