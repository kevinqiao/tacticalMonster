"use node"
import { v } from "convex/values";
import jwt from "jsonwebtoken";
import type { User } from "../../../../host/service/UserManager";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";
import { AuthenticatorFactory } from "./provider/AuthenticatorFactory";
const REFRESH_TOKEN_EXPIRE = 600 * 1000;
const ACCESS_TOKEN_SECRET = "12222222";
const TELEGRAM_BOT_TOKEN_SECRET = "5369641667:AAGdoOdBJaZVi2QsAHOunEX0DuEhezjFYLQ";

export const authenticate = action({
    args: { cid: v.number(), partner: v.optional(v.number()), data: v.any() },
    handler: async (ctx, { cid, partner, data }): Promise<User | null> => {
        const channel = cid === 0 ? { cid: 0, provider: "web" } : await ctx.runQuery(internal.dao.authChannelDao.find, { cid });
        if (channel) {
            const authenticator = AuthenticatorFactory.createAuthenticator(channel);
            if (authenticator) {
                return authenticator.signIn(ctx, partner, data);
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
            const refreshToken = jwt.sign({ uid: user.uid, expire: REFRESH_TOKEN_EXPIRE }, ACCESS_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRE });
            if (refreshToken) {
                await ctx.runMutation(internal.dao.userDao.updateToken, { uid, token: refreshToken });
                return Object.assign({}, user, { token: refreshToken, expire: REFRESH_TOKEN_EXPIRE, _id: undefined, _creationTime: undefined });
            }
        }
        return null;
    }
})
export const authByToken = action({
    args: { uid: v.string(), token: v.string() },
    handler: async (ctx, { uid, token }): Promise<User | null> => {
        try {
            const user: User | null = await ctx.runQuery(internal.dao.userDao.find, { uid });
            console.log("authByToken", user?.token, token);
            if (user?.token === token) {
                await ctx.runMutation(internal.dao.userDao.refreshExpire, { uid });
                return Object.assign({}, user, { _id: undefined, _creationTime: undefined, cuid: undefined, cid: undefined, data: undefined });
            }
            return null;
        } catch (err) {
            console.error("[authByToken] error", err);
            return null;
        }
    }
})
export const signUp = action({
    args: { cid: v.number(), partner: v.optional(v.number()), data: v.any() },
    handler: async (ctx, { cid, partner, data }) => {
        const channel = cid === 0 ? { cid: 0, provider: "web" } : await ctx.runQuery(internal.dao.authChannelDao.find, { cid });
        if (channel) {
            const authenticator = AuthenticatorFactory.createAuthenticator(channel);
            if (authenticator && authenticator.signUp) {
                return authenticator.signUp(ctx, partner, data);
            }
        }
        return null;
    }
});
export const signOut = action({
    args: { uid: v.string(), token: v.string() },
    handler: async (ctx, { uid, token }): Promise<boolean> => {
        const user: User | null = await ctx.runQuery(internal.dao.userDao.find, { uid });
        if (user?.token === token) {
            await ctx.runMutation(internal.dao.userDao.logout, { uid });
            return true;
        }
        return false;
    }
})
export const updateData = action({
    args: { uid: v.string(), token: v.string(), data: v.any() },
    handler: async (ctx, { uid, token, data }): Promise<boolean> => {

        const user: User | null = await ctx.runQuery(internal.dao.userDao.find, { uid });
        console.log("updateData", uid, token, user?.token, data);
        if (user?.token === token) {
            console.log("updateData start", uid, data);
            await ctx.runMutation(internal.dao.userDao.updateUserData, { uid, data });
            return true;
        }
        return false;
    }
})
