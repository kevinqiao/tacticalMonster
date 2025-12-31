"use node"
import crypto from "crypto";
import { TelegramAuthenticator } from "./TelegramAuthenticator";
import { WebAuthenticator } from "./WebAuthenticator";
export const generateRandomString = (length: number): string => {
    return crypto
        .randomBytes(Math.ceil(length / 2))
        .toString('hex')
        .slice(0, length);
}

export const hashString = (str: string): string => {
    // 将 email 转为小写并去除首尾空格，确保一致性
    const normalizedEmail = str.toLowerCase().trim();
    const uuid = crypto.createHash("md5").update(normalizedEmail).digest('hex');
    return uuid;
}

export interface Authenticator {
    signIn: (ctx: any, partner: number | undefined, data: any) => Promise<any>;
    signUp?: (ctx: any, partner: number | undefined, data: any) => Promise<any>;
}

export class AuthenticatorFactory {
    static createAuthenticator(channel: { cid: number, provider: string }): Authenticator | undefined {
        switch (channel.provider) {
            case "web":
                return new WebAuthenticator(channel);
            case "telegram":
                return new TelegramAuthenticator(channel);
            default:
                return
        }
    }
}
