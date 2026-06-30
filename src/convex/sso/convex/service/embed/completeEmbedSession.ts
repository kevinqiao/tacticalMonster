"use node";

import type { ActionCtx } from "../../_generated/server";

import { internal } from "../../_generated/api";

import type { User } from "../../../../host/service/UserManager";
import { toClientUser } from "../auth/platformClientUser";
import { EMBED_AUTH_CHANNEL_CID } from "./embedAuthConstants";
import type { EmbedIdentity } from "./embedAuthTypes";
import { platformUidForSubject } from "../provider/AuthenticatorFactory";

/** Map verified embed identity → platform uid + Platform JWT. */
export async function completeEmbedSession(
  ctx: ActionCtx,
  pid: number,
  identity: EmbedIdentity
): Promise<User | null> {
  const uid = platformUidForSubject(EMBED_AUTH_CHANNEL_CID, pid, identity.subject);

  const resolved = await ctx.runMutation(internal.dao.authIdentityDao.resolvePartnerIdentity, {
    partnerId: pid,
    subject: identity.subject,
    uid,
    email: identity.email,
    cid: EMBED_AUTH_CHANNEL_CID,
  });

  const row = await ctx.runQuery(internal.dao.authIdentityDao.findByUid, {
    uid: resolved.uid,
  });
  if (!row) return null;

  return toClientUser(row as Record<string, unknown>, pid);
}
