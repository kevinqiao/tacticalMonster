"use node"
import { v } from "convex/values";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { User } from "../../../../service/UserManager";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";
const REFRESH_TOKEN_EXPIRE = 60 * 1000;
const ACCESS_TOKEN_SECRET = "12222222";
const TELEGRAM_BOT_TOKEN_SECRET = "5369641667:AAGdoOdBJaZVi2QsAHOunEX0DuEhezjFYLQ";
export interface CUser {
    cid?: string;
    cuid: string;
    name?: string;
    data?: { [k: string]: any };
}


export const authenticate = action({
    args: { initData: v.string() },
    handler: async (ctx, { initData }): Promise<User | null> => {

        const params = new URLSearchParams(initData);
        const receivedHash = params.get('hash');
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
                console.log("user", user)
                const cuid = user.id + "";
                const userDoc = await ctx.runQuery(internal.dao.userDao.findByPlatform, { cuid, platformId: 1 });
                if (userDoc?.uid) {
                    const token = jwt.sign({ uid: userDoc.uid, expire: REFRESH_TOKEN_EXPIRE }, ACCESS_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRE });
                    await ctx.runMutation(internal.dao.userDao.update, { uid: userDoc.uid, data: { token, expire: REFRESH_TOKEN_EXPIRE + Date.now(), name: user.username } });
                    return Object.assign({}, userDoc, { token, expire: REFRESH_TOKEN_EXPIRE, _id: undefined, _creationTime: undefined });
                } else {
                    const uid = 1 + "-" + cuid;
                    const token = jwt.sign({ uid, expire: REFRESH_TOKEN_EXPIRE }, ACCESS_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRE });
                    const userDoc = await ctx.runMutation(internal.dao.userDao.create, { partner: 1, token, platform: 1, cuid, data: { name: user.username } });
                    return Object.assign({}, userDoc, { token, expire: REFRESH_TOKEN_EXPIRE, _id: undefined, _creationTime: undefined });
                }
            }
        }
        return null;
    }
})

