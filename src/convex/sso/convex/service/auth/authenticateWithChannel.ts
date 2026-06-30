"use node";

import type { ActionCtx } from "../../_generated/server";
import type { User } from "../../../../host/service/UserManager";
import { internal } from "../../_generated/api";
import { AuthenticatorFactory } from "../provider/AuthenticatorFactory";
import { attachPlatformAccess, stripUserForClient } from "./platformClientUser";
import { assertConsumerAuthChannel } from "./partnerChannelPolicy";

function toClientUser(user: Record<string, unknown>): User {
  return attachPlatformAccess(stripUserForClient(user));
}

/** Shared authenticate path for consumer auth channels (Clerk, embed, …). */
export async function authenticateWithChannel(
  ctx: ActionCtx,
  cid: number,
  partner: number | undefined,
  data: unknown
): Promise<User | null> {
  const channel = await ctx.runQuery(internal.dao.authChannelDao.find, { cid });
  if (!channel) return null;

  if (partner != null) {
    const partnerRow = await ctx.runQuery(internal.service.PartnerManager.findInternal, {
      pid: partner,
    });
    try {
      assertConsumerAuthChannel(partnerRow, cid);
    } catch {
      return null;
    }
  }

  const authenticator = AuthenticatorFactory.createAuthenticator(channel);
  if (!authenticator) return null;

  const user = await authenticator.signIn(ctx, partner, data);
  if (user?.uid) {
    return toClientUser(user as Record<string, unknown>);
  }
  return user as User | null;
}
