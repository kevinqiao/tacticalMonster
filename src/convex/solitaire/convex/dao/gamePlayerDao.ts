import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

export const create = internalMutation({
    args: {
        uid: v.string(),
        token: v.string(),
        expire: v.optional(v.number()),
        name: v.optional(v.string()),
        avatar: v.optional(v.string()),
    },
    handler: async (ctx, { uid,token,name,avatar }) => {
        const pid = await ctx.db.insert("game_player", { uid,token,name,avatar,level:0,exp:0 });
        return pid;
    },
})

export const findAll = internalQuery({
    handler: async (ctx, { character_id }) => {
        const players = await ctx.db.query("game_player").collect();
        return players
    },
})
export const find = internalQuery({
    args: {
        uid: v.string(),
    },
    handler: async (ctx, { uid }) => {
        const player = await ctx.db.query("game_player").withIndex("by_uid", (q) => q.eq("uid", uid)).unique();
        return player;
    },
})
export const update = internalMutation({
    args: {
        uid: v.string(),
        data: v.any()
    },
    handler: async (ctx, { uid,data }) => {
        const player = await ctx.db.query("game_player").withIndex("by_uid", (q) => q.eq("uid", uid)).unique();
        if(player){
            return await ctx.db.patch(player._id, data);
        }
        return null;
    },
})

