"use node"
import { v } from "convex/values";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { User } from "../../../../service/UserManager";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";
import { handle } from "./handler/CustomAuthHandler";
const REFRESH_TOKEN_EXPIRE = 600 * 1000;
const ACCESS_TOKEN_SECRET = "12222222";
const TELEGRAM_BOT_TOKEN_SECRET = "5369641667:AAGdoOdBJaZVi2QsAHOunEX0DuEhezjFYLQ";
export interface CUser {
    cid?: string;
    cuid: string;
    name?: string;
    data?: { [k: string]: any };
}
export const authenticate = action({
    args: { cid: v.string(), data: v.any(), partner: v.optional(v.number()) },
    handler: async (ctx, { cid, data, partner }): Promise<User | null> => {
        const pid = partner ?? 1;
        const cuser = handle(cid, data);

        if (cuser?.cuid && cuser?.cid) {
            await ctx.runMutation(internal.dao.cuserDao.update, { cuid: cuser.cuid, cid: cuser.cid, data: cuser.data });
            const uid = pid + "-" + cuser.cuid;
            let user: User | null = await ctx.runQuery(internal.dao.userDao.find, { uid });
            if (!user) {
                user = await ctx.runMutation(internal.dao.userDao.create, { cuid: cuser.cuid, partner: pid, token: "", platform: 1, data: cuser.data });
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
            const refreshToken = jwt.sign({ uid: user.uid, expire: REFRESH_TOKEN_EXPIRE }, ACCESS_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRE });
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

        if (user?.token === token) {
            await ctx.runMutation(internal.dao.userDao.update, { uid, data: { lastUpdate: Date.now() } });
            return Object.assign({}, user, { _id: undefined, _creationTime: undefined });
        }
        return null;
    }
})
export const authByTelegram = action({
    args: { initData: v.string() },
    handler: async (ctx, { initData }): Promise<User | null> => {
        console.log("authByTelegram", initData);
        const params = new URLSearchParams(initData);
        const receivedHash = params.get('hash');
        console.log("authByTelegram", receivedHash);
        if (!receivedHash) {
            return null;
        }
        params.delete('hash');
        const dataCheckString = Array.from(params.entries())
            .sort(([a], [b]) => a.localeCompare(b)) // 按键字母顺序排序
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');

        // 生成密钥：HMAC-SHA-256("WebAppData", botToken)
        const secretKey = crypto
            .createHmac('sha256', 'WebAppData')
            .update(TELEGRAM_BOT_TOKEN_SECRET)
            .digest();

        // 计算签名：HMAC-SHA-256(data_check_string, secretKey)
        const calculatedHash = crypto
            .createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');

        // 比较签名
        const isValid = calculatedHash === receivedHash;
        if (isValid) {
            const userString = params.get('user');
            if (userString) {
                const user = JSON.parse(decodeURIComponent(userString));
                console.log("authByTelegram", user);
                return user;
            }
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
