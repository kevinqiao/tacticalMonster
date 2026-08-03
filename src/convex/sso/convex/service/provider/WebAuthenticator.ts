"use node";

import { internal } from "../../_generated/api";
import { User } from "../../dataTypes";
import {
  hashWebPassword,
  verifyWebPassword,
} from "../auth/webPassword";
import {
  Authenticator,
  normalizeWebEmail,
  webAccountIdForEmail,
  webPlatformUidForAccount,
  PLATFORM_NAMESPACE_PARTNER_ID,
} from "./AuthenticatorFactory";

async function migrateWebUserAccountId(
  ctx: any,
  webUser: Record<string, unknown>,
  canonicalAccountId: string,
  contactEmail: string | undefined
) {
  if (webUser.accountId === canonicalAccountId) return webUser;

  await ctx.runMutation(internal.dao.userDao.upgradeWebUserAccountId, {
    fromAccountId: String(webUser.accountId),
    accountId: canonicalAccountId,
    email: contactEmail,
  });

  return {
    ...webUser,
    accountId: canonicalAccountId,
    ...(contactEmail ? { email: contactEmail } : {}),
  };
}

export class WebAuthenticator implements Authenticator {
  private channel: { cid: number; provider: string };
  constructor(channel: { cid: number; provider: string }) {
    this.channel = channel;
  }

  async signIn(ctx: any, partner: number | undefined, data: any): Promise<User | null> {
    const { email, password } = data;
    if (!email || !password || !this.channel) {
      return null;
    }

    // Web is staff-only; identity namespace is always partnerId=0.
    const partnerId = PLATFORM_NAMESPACE_PARTNER_ID;
    const canonicalAccountId = webAccountIdForEmail(email);
    const uid = webPlatformUidForAccount(email, partnerId);
    const contactEmail = canonicalAccountId.includes("@")
      ? normalizeWebEmail(canonicalAccountId)
      : undefined;

    let webUser = (await ctx.runQuery(internal.dao.userDao.findByLoginId, {
      loginId: email,
    })) as Record<string, unknown> | null;

    // Legacy: password lived on auth_identities before `user` table split.
    if (!webUser) {
      const legacyIdentity = await ctx.runQuery(internal.dao.authIdentityDao.findByProviderSubject, {
        provider: "web",
        subject: canonicalAccountId,
      });
      const legacyByHash = legacyIdentity
        ? null
        : await ctx.runQuery(internal.dao.authIdentityDao.findByProviderSubject, {
            provider: "web",
            subject: uid,
          });
      const legacy = legacyIdentity ?? legacyByHash;
      if (legacy && verifyWebPassword(password, legacy as Record<string, unknown>)) {
        await ctx.runMutation(internal.dao.userDao.createWebUser, {
          accountId: canonicalAccountId,
          email: contactEmail,
          passwordHash: hashWebPassword(password),
        });
        webUser = (await ctx.runQuery(internal.dao.userDao.findByLoginId, {
          loginId: email,
        })) as Record<string, unknown> | null;
      }
    }

    if (!webUser || !verifyWebPassword(password, webUser)) {
      return null;
    }

    webUser = await migrateWebUserAccountId(ctx, webUser, canonicalAccountId, contactEmail);

    const identity = await ctx.runMutation(internal.dao.authIdentityDao.ensureWebIdentity, {
      accountId: canonicalAccountId,
      email: webUser.email ?? contactEmail,
      uid,
      partnerId,
      name: webUser.name as string | undefined,
      phone: webUser.phone as string | undefined,
    });
    if (!identity?.uid) return null;

    const session = await ctx.runMutation(internal.dao.authIdentityDao.refreshWebSession, {
      uid: identity.uid,
      partnerId: partner ?? partnerId,
    });
    if (!session?.uid) return null;
    return session as User;
  }

  async signUp(ctx: any, partner: number | undefined, data: any): Promise<User | null> {
    const { email, password, name, phone } = data;
    if (!email || !password || !this.channel) {
      return null;
    }

    const partnerId = PLATFORM_NAMESPACE_PARTNER_ID;
    const accountId = webAccountIdForEmail(email);
    const uid = webPlatformUidForAccount(email, partnerId);
    const contactEmail = accountId.includes("@") ? normalizeWebEmail(accountId) : undefined;

    const created = await ctx.runMutation(internal.dao.userDao.createWebUser, {
      accountId,
      email: contactEmail,
      passwordHash: hashWebPassword(password),
      name: typeof name === "string" ? name : undefined,
      phone: typeof phone === "string" ? phone : undefined,
    });
    if (!created) return null;

    const identity = await ctx.runMutation(internal.dao.authIdentityDao.ensureWebIdentity, {
      accountId,
      email: contactEmail,
      uid,
      partnerId,
      name: typeof name === "string" ? name : undefined,
      phone: typeof phone === "string" ? phone : undefined,
    });
    if (!identity?.uid) return null;

    const session = await ctx.runMutation(internal.dao.authIdentityDao.refreshWebSession, {
      uid: identity.uid,
      partnerId: partner ?? partnerId,
    });
    if (!session?.uid) return null;
    return session as User;
  }
}
