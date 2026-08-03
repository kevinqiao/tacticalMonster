"use node"

import crypto from "crypto";

import { internal } from "../../_generated/api";

import { User } from "../../dataTypes";

import { Authenticator, platformUidForSubject, PLATFORM_NAMESPACE_PARTNER_ID } from "./AuthenticatorFactory";



const TELEGRAM_BOT_TOKEN_SECRET = "5369641667:AAGdoOdBJaZVi2QsAHOunEX0DuEhezjFYLQ";



export class TelegramAuthenticator implements Authenticator {

    private channel: { cid: number, provider: string };

    constructor(channel: { cid: number, provider: string }) {

        this.channel = channel;

    }

    async signIn(ctx: any, _partner: number | undefined, data: any): Promise<User | null> {

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

            .sort(([a], [b]) => a.localeCompare(b))

            .map(([key, value]) => `${key}=${value}`)

            .join('\n');



        const secretKey = crypto

            .createHmac('sha256', 'WebAppData')

            .update(TELEGRAM_BOT_TOKEN_SECRET)

            .digest();



        const calculatedHash = crypto

            .createHmac('sha256', secretKey)

            .update(dataCheckString)

            .digest('hex');



        const isValid = calculatedHash === receivedHash;

        if (isValid) {

            const userString = params.get('user');

            if (userString) {

                const user = JSON.parse(decodeURIComponent(userString));

                const cuid = user.id + "";

                const partnerId = _partner ?? PLATFORM_NAMESPACE_PARTNER_ID;
                const uid = platformUidForSubject(this.channel.cid, partnerId, cuid);
                const row = await ctx.runMutation(internal.dao.authIdentityDao.signInTelegram, {
                    cid: this.channel.cid,
                    cuid,
                    uid,
                    profile: user,
                    partnerId,
                });

                if (!row?.uid) return null;

                return row as User;

            }

        }

        return null;

    }

}

