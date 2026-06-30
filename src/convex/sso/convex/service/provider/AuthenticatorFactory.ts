"use node"
import crypto from "crypto";
import { TelegramAuthenticator } from "./TelegramAuthenticator";
import { WebAuthenticator } from "./WebAuthenticator";
import { EmbedAuthenticator } from "./EmbedAuthenticator";
import { ClerkAuthenticator } from "./ClerkAuthenticator";
import { PLATFORM_NAMESPACE_PARTNER_ID, WEB_AUTH_CHANNEL_CID } from "../auth/platformUid";

export const generateRandomString = (length: number): string => {
    return crypto
        .randomBytes(Math.ceil(length / 2))
        .toString('hex')
        .slice(0, length);
}

export const hashString = (str: string): string => {
    const normalizedEmail = str.toLowerCase().trim();
    return crypto.createHash("md5").update(normalizedEmail).digest('hex');
}

export function normalizeWebEmail(email: string): string {
    return email.toLowerCase().trim();
}

export function normalizeWebAccountId(loginId: string): string {
    const trimmed = loginId.trim();
    return trimmed.includes("@") ? normalizeWebEmail(trimmed) : trimmed.toLowerCase();
}

/** `user.accountId` = `auth_identities.subject` (e.g. admin). */
export function webAccountIdForEmail(loginId: string): string {
    return normalizeWebAccountId(loginId);
}

/** Platform JWT uid — `auth_identities.uid` = `${cid}_${partnerId}_${md5(subject)}`. */
export function platformUidForSubject(
  cid: number,
  partnerId: number,
  subject: string
): string {
  return `${cid}_${partnerId}_${hashString(subject)}`;
}

/** Web login uid for accountId / email within a partner namespace. */
export function webPlatformUidForAccount(loginId: string, partnerId: number): string {
  return platformUidForSubject(
    WEB_AUTH_CHANNEL_CID,
    partnerId,
    normalizeWebAccountId(loginId)
  );
}

/** @deprecated Use webPlatformUidForAccount(loginId, partnerId) */
export function webPlatformUidForEmail(loginId: string, partnerId: number = PLATFORM_NAMESPACE_PARTNER_ID): string {
  return webPlatformUidForAccount(loginId, partnerId);
}

export function platformStaffUidForAccount(loginId: string): string {
  return webPlatformUidForAccount(loginId, PLATFORM_NAMESPACE_PARTNER_ID);
}

export { PLATFORM_NAMESPACE_PARTNER_ID, WEB_AUTH_CHANNEL_CID };

export interface Authenticator {
    signIn: (ctx: any, partner: number | undefined, data: any) => Promise<any>;
    signUp?: (ctx: any, partner: number | undefined, data: any) => Promise<any>;
}

/**
 * All SSO channels for `AuthManager.authenticate` / `authenticateWithChannel`.
 * Embed: `data = { credential, method?, merchantSlug? }`, `partner` = pid.
 */
export class AuthenticatorFactory {
    static createAuthenticator(channel: { cid: number, provider: string }): Authenticator | undefined {
        switch (channel.provider) {
            case "web":
                return new WebAuthenticator(channel);
            case "telegram":
                return new TelegramAuthenticator(channel);
            case "embed":
                return new EmbedAuthenticator(channel);
            case "clerk":
                return new ClerkAuthenticator(channel);
            default:
                return undefined;
        }
    }
}
