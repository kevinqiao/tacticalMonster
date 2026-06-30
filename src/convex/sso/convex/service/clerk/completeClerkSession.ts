"use node";

import type { ActionCtx } from "../../_generated/server";

import { internal } from "../../_generated/api";

import type { User } from "../../../../host/service/UserManager";
import { CLERK_AUTH_CHANNEL_CID } from "../auth/authChannelCatalog";
import { toClientUser } from "../auth/platformClientUser";
import { platformUidForSubject } from "../provider/AuthenticatorFactory";

export type ClerkIdentity = {
  subject: string;
  email?: string;
  name?: string;
};

/** Map verified Clerk identity → platform uid + Platform JWT. */
export async function completeClerkSession(
  ctx: ActionCtx,
  partnerId: number,
  identity: ClerkIdentity
): Promise<User | null> {
  const uid = platformUidForSubject(CLERK_AUTH_CHANNEL_CID, partnerId, identity.subject);

  const resolved = await ctx.runMutation(internal.dao.authIdentityDao.resolvePartnerIdentity, {
    partnerId,
    subject: identity.subject,
    uid,
    email: identity.email,
    cid: CLERK_AUTH_CHANNEL_CID,
    provider: "clerk",
    name: identity.name,
  });

  const row = await ctx.runQuery(internal.dao.authIdentityDao.findByUid, {
    uid: resolved.uid,
  });
  if (!row) return null;

  return toClientUser(row as Record<string, unknown>, partnerId);
}
