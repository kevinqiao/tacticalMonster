"use node"
import jwt from "jsonwebtoken";
import { internal } from "../../_generated/api";
import { User } from "../../dataTypes";
import { Authenticator, generateRandomString, hashString } from "./AuthenticatorFactory";

const REFRESH_TOKEN_EXPIRE = 600 * 1000;
const ACCESS_TOKEN_SECRET = "12222222";

// /**
//  * 将 email 转换成固定长度的字符串（使用 MD5，返回 32 字符）
//  * @param email 邮箱地址
//  * @returns 固定长度的哈希字符串（MD5 返回 32 个字符的十六进制字符串）
//  */
// function hashEmail(email: string): string {
//     // 将 email 转为小写并去除首尾空格，确保一致性
//     const normalizedEmail = email.toLowerCase().trim();
//     const uuid = crypto.createHash("md5").update(normalizedEmail).digest('hex');
//     return uuid;
// }



export class WebAuthenticator implements Authenticator {
    private channel: { cid: number, provider: string };
    constructor(channel: { cid: number, provider: string }) {
        this.channel = channel;
    }
    async signIn(ctx: any, partner: number | undefined, data: any): Promise<User | null> {
        const { email, password } = data;
        if (!email || !this.channel) {
            return null;
        }
        const cuid = hashString(email);
        const uid = this.channel.cid + "_" + cuid;
        let user: User | null = await ctx.runQuery(internal.dao.userDao.find, { uid });
        if (user?.uid && user?.data?.password === password) {
            const token = jwt.sign({ uid: user.uid, expire: REFRESH_TOKEN_EXPIRE }, ACCESS_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRE });
            await ctx.runMutation(internal.dao.userDao.updateToken, { uid: user.uid, token });
            return Object.assign({}, user, { token, expire: REFRESH_TOKEN_EXPIRE, _id: undefined, _creationTime: undefined, cuid: undefined, cid: undefined });
        }
        return null;
    }
    async signUp(ctx: any, partner: number | undefined, data: any): Promise<User | null> {
        const { email, password } = data;
        console.log("data", data);
        if (!email || !this.channel) {
            return null;
        }
        const cuid = hashString(email);
        const token = generateRandomString(20);
        const userDoc = await ctx.runMutation(internal.dao.userDao.create, { cuid, cid: this.channel.cid, token, partner, data: { email, password } });
        return Object.assign({}, userDoc, { token, expire: REFRESH_TOKEN_EXPIRE, _id: undefined, _creationTime: undefined, cuid: undefined, cid: undefined });

    }
}



