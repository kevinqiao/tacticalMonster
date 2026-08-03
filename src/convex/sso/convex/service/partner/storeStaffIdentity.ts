import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";
import { authedQuery } from "../../custom/session";
import { findIdentityByUid } from "../../dao/authIdentityHelpers";
import { provisionWebStaffAccount } from "./ensureStaffIdentity";

export const applyProvisionStoreStaffWebLogin = internalMutation({
  args: {
    accountId: v.string(),
    platformUid: v.string(),
    passwordHash: v.string(),
    partnerId: v.number(),
  },
  handler: async (ctx, { accountId, platformUid, passwordHash, partnerId: _partnerId }) => {
    // partnerId on the action is the store's partner (membership context only).
    // Staff Web identity is always platform-wide (partnerId=0).
    const uid = await provisionWebStaffAccount(
      ctx,
      accountId,
      passwordHash,
      platformUid
    );
    return { uid };
  },
});

export const lookupIdentitiesForStoreTeam = authedQuery({
  args: { uids: v.array(v.string()) },
  handler: async (ctx, { uids }) => {
    const out = [];
    for (const uid of uids.slice(0, 50)) {
      const identity = await findIdentityByUid(ctx, uid.trim());
      if (!identity) continue;

      let webAccountId: string | undefined;
      let hasWebUser = false;
      if (identity.provider === "web" && identity.subject) {
        const webUser = await ctx.db
          .query("user")
          .withIndex("by_accountId", (q) => q.eq("accountId", identity.subject!))
          .unique();
        hasWebUser = Boolean(webUser?.passwordHash);
        webAccountId = webUser?.accountId ?? identity.subject;
      }

      out.push({
        uid: identity.uid,
        provider: identity.provider,
        email: identity.email,
        name: identity.name,
        webAccountId,
        hasWebUser,
      });
    }
    return out;
  },
});
