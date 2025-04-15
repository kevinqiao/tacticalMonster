"use node"
import { v } from "convex/values";
import jwt from "jsonwebtoken";
import { User } from "../../../../service/UserManager";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";
import { handle } from "./handler/CustomAuthHandler";
const REFRESH_TOKEN_EXPIRE = 60 * 1000;
const ACCESS_TOKEN_SECRET = "12222222";
export interface CUser {
    cid?: string;
    cuid: string;
    name?: string;
    channel: number;
    data?: { [k: string]: any };
}
export const authenticate = action({
    args: { channel: v.number(), data: v.any(), partner: v.optional(v.number()) },
    handler: async (ctx, { channel, data, partner }): Promise<User | null> => {
        const pid = partner ?? 1;
        const cuser = handle(channel, data);

        if (cuser?.cuid && cuser?.channel) {
            const cid = cuser.cuid + "-" + cuser.channel;
            await ctx.runMutation(internal.dao.cuserDao.update, { cuid: cuser.cuid, channel: cuser.channel, data: cuser.data });
            const uid = cid + "-" + pid;
            let user: User | null = await ctx.runQuery(internal.dao.userDao.find, { uid });
            if (!user) {
                user = await ctx.runMutation(internal.dao.userDao.create, { cid, uid, partner: pid, token: "", data: cuser.data });
            }
            if (user?.uid) {
                const token = jwt.sign({ uid: user.uid, cid, expire: REFRESH_TOKEN_EXPIRE }, ACCESS_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRE });
                await ctx.runMutation(internal.dao.userDao.update, { uid: user.uid, data: { token, expire: REFRESH_TOKEN_EXPIRE + Date.now() } });
                return Object.assign({}, user, { token, expire: REFRESH_TOKEN_EXPIRE, _id: undefined, _creationTime: undefined });
            }
        }
        return null;
    }
});
export const refreshToken = action({
    args: { uid: v.string(), token: v.string() },
    handler: async (ctx, { uid, token }): Promise<User | null> => {
        const user: User | null = await ctx.runQuery(internal.dao.userDao.find, { uid });
        console.log("refreshToken", user?.token, token, user?.expire, Date.now());
        if (user?.token === token && user?.expire && user.expire > Date.now()) {
            const refreshToken = jwt.sign({ uid: user.uid, cid: user.cid, expire: REFRESH_TOKEN_EXPIRE }, ACCESS_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRE });
            if (refreshToken) {
                await ctx.runMutation(internal.dao.userDao.update, { uid, data: { token: refreshToken, expire: REFRESH_TOKEN_EXPIRE + Date.now() } });
                return Object.assign({}, user, { token: refreshToken, expire: REFRESH_TOKEN_EXPIRE, _id: undefined, _creationTime: undefined });
            }
        }
        return null;
    }
})
export const authByToken = action({
    args: { uid: v.string(), token: v.string() },
    handler: async (ctx, { uid, token }): Promise<User | null> => {
        const user: User | null = await ctx.runQuery(internal.dao.userDao.find, { uid });

        if (user?.token === token && user?.expire && user.expire > Date.now()) {
            return Object.assign({}, user, { _id: undefined, _creationTime: undefined });
        }
        return null;
    }
})
export const logout = action({
    args: { uid: v.string(), token: v.string() },
    handler: async (ctx, { uid, token }): Promise<boolean> => {
        const user: User | null = await ctx.runQuery(internal.dao.userDao.find, { uid });
        if (user?.token === token) {
            await ctx.runMutation(internal.dao.userDao.update, { uid, data: { token: "", expire: 0 } });
            return true;
        }
        return false;
    }
})  
