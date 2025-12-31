import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "../_generated/server";
import { sessionMutation } from "../custom/session";
const REFRESH_TOKEN_EXPIRE = 600 * 1000;
export const create = internalMutation({
    args: {
        cuid: v.string(),
        cid: v.number(),
        token: v.string(),
        partner: v.optional(v.number()),
        data: v.any()
    },
    handler: async (ctx, { cuid, cid, partner, token, data }) => {
        console.log("create userDao", cuid, cid, partner, token, data);
        const uid = cid + "_" + cuid;
        const user = await ctx.db.query("user").withIndex("by_uid", (q) => q.eq("uid", uid)).unique();
        if (!user) {
            await ctx.db.insert("user", { uid, cuid, cid, partner, token, data });
            return { uid, cuid, cid, partner, token, data };
        }
        return null;
    },
});

export const find = internalQuery({
    args: {
        uid: v.string(),
    },
    handler: async (ctx, { uid }) => {
        const user = await ctx.db.query("user").withIndex("by_uid", (q) => q.eq("uid", uid)).unique();
        return user
    },
})
export const findUser = query({
    args: {
        uid: v.string(),
    },
    handler: async (ctx, { uid }) => {
        const user = await ctx.db.query("user").withIndex("by_uid", (q) => q.eq("uid", uid)).unique();
        return user
    },
})


export const logout = internalMutation({
    args: {
        uid: v.string(),
    },
    handler: async (ctx, { uid }) => {

        const user = await ctx.db.query("user").withIndex("by_uid", (q) => q.eq("uid", uid)).unique();
        if (user) {
            await ctx.db.patch(user._id, { lastUpdate: Date.now(), token: undefined, expire: Date.now() });
            return true;
        }
        return false;
    },
})
export const refreshExpire = internalMutation({
    args: {
        uid: v.string(),
    },
    handler: async (ctx, { uid }) => {

        const user = await ctx.db.query("user").withIndex("by_uid", (q) => q.eq("uid", uid)).unique();
        if (user) {
            await ctx.db.patch(user._id, { lastUpdate: Date.now(), expire: REFRESH_TOKEN_EXPIRE + Date.now() });
            return true;
        }
        return false;
    },
})
export const updateToken = internalMutation({
    args: {
        uid: v.string(),
        token: v.string()
    },
    handler: async (ctx, { uid, token }) => {

        const user = await ctx.db.query("user").withIndex("by_uid", (q) => q.eq("uid", uid)).unique();
        if (user) {
            await ctx.db.patch(user._id, { token, expire: REFRESH_TOKEN_EXPIRE + Date.now() });
            return true;
        }
        return false;
    },
})
export const updateUserData = internalMutation({
    args: {
        uid: v.string(),
        data: v.any()
    },
    handler: async (ctx, { uid, data }) => {
        const user = await ctx.db.query("user").withIndex("by_uid", (q) => q.eq("uid", uid)).unique();
        console.log("update userDao", uid, user?.data, data);
        if (user) {
            const updateData = user.data ? Object.assign({}, user.data, data) : data;
            await ctx.db.patch(user._id, { lastUpdate: Date.now(), data: updateData });
            return true;
        }
        return false;
    },
})

export const updateMatch = sessionMutation({
    args: { matchId: v.string() },
    handler: async (ctx, { matchId }) => {
        const uid = ctx.user?.uid;
        if (!uid) return false;
        const user = await ctx.db.query("user").withIndex("by_uid", (q) => q.eq("uid", uid)).unique();
        if (user) {
            const data = user.data ? Object.assign({}, user.data, { matchId }) : { matchId };
            await ctx.db.patch(user._id, { data });
            return true;
        }
        return false;
    },
})
export const completeMatch = sessionMutation({
    args: {},
    handler: async (ctx, { }) => {
        const uid = ctx.user?.uid;
        if (!uid) return false;
        const user = await ctx.db.query("user").withIndex("by_uid", (q) => q.eq("uid", uid)).unique();
        if (user) {
            const data = user.data ? { ...user.data, matchId: undefined } : {};
            await ctx.db.patch(user._id, { data });
            return true;
        }
        return false;
    },
})
export const cancelMatch = sessionMutation({
    args: {},
    handler: async (ctx, { }) => {
        const uid = ctx.user?.uid;
        if (!uid) return false;
        const user = await ctx.db.query("user").withIndex("by_uid", (q) => q.eq("uid", uid)).unique();
        if (user) {
            const data = user.data ? { ...user.data, matchId: undefined } : {};
            await ctx.db.patch(user._id, { data });
            return true;
        }
        return false;
    },
})

