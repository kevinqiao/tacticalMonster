"use node"
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { internal } from "../../_generated/api";
import { User } from "../../dataTypes";
import { Authenticator } from "./AuthenticatorFactory";
const TELEGRAM_BOT_TOKEN_SECRET = "5369641667:AAGdoOdBJaZVi2QsAHOunEX0DuEhezjFYLQ";
const REFRESH_TOKEN_EXPIRE = 600 * 1000;
const ACCESS_TOKEN_SECRET = "12222222";
export class TelegramAuthenticator implements Authenticator {
    private channel: { cid: number, provider: string };
    constructor(channel: { cid: number, provider: string }) {
        this.channel = channel;
    }
    async signIn(ctx: any, data: any): Promise<User | null> {
        if (!data.initData) {
            return null;
        }
        const params = new URLSearchParams(data.initData);
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
                const uid = this.channel.cid + "_" + cuid;
                const userDoc = await ctx.runQuery(internal.dao.userDao.find, { uid });
                if (userDoc?.uid) {
                    const token = jwt.sign({ uid: userDoc.uid, expire: REFRESH_TOKEN_EXPIRE }, ACCESS_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRE });
                    await ctx.runMutation(internal.dao.userDao.updateToken, { uid: userDoc.uid, token });
                    return Object.assign({}, userDoc, { token, expire: REFRESH_TOKEN_EXPIRE, _id: undefined, _creationTime: undefined });
                } else {
                    const token = jwt.sign({ uid, expire: REFRESH_TOKEN_EXPIRE }, ACCESS_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRE });
                    const newUserDoc = await ctx.runMutation(internal.dao.userDao.create, { token, cuid, cid: this.channel.cid, email: user.email, name: user.username, phone: user.phone, data: user });
                    return Object.assign({}, newUserDoc, { token, expire: REFRESH_TOKEN_EXPIRE, _id: undefined, _creationTime: undefined, cuid: undefined, cid: undefined, email: undefined, name: undefined, phone: undefined });
                }
            }
        }
        return null;
    }

}

