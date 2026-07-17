"use node";

import { v } from "convex/values";
import { action } from "../../_generated/server";
import type { User } from "../../../../host/service/UserManager";
import { internal } from "../../_generated/api";
import { EMBED_AUTH_METHODS } from "../embed/embedAuthConstants";
import { EMBED_AUTH_CHANNEL_CID } from "./authChannelCatalog";
import { authenticateWithChannel } from "./authenticateWithChannel";
import {
  attachPlatformAccess,
  stripUserForClient,
} from "./platformClientUser";
import { verifyPlatformAccessToken } from "./platformJwtVerify";

const embedMethodValidator = v.optional(
  v.union(
    v.literal("jwt_local"),
    v.literal("crazygames_jwt"),
    v.literal("code_exchange"),
    v.literal("session_introspect")
  )
);

/** Partner WebView embed — thin wrapper over unified `authenticateWithChannel` (embed channel). */
export const exchangeEmbedCredential = action({
  args: {
    pid: v.number(),
    credential: v.string(),
    method: embedMethodValidator,
    partnerSlug: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<User | null> => {
    return authenticateWithChannel(ctx, EMBED_AUTH_CHANNEL_CID, args.pid, {
      credential: args.credential,
      method: args.method,
      partnerSlug: args.partnerSlug,
    });
  },
});

/** Refresh platform JWT (Clerk-style token rotation). */
export const refreshPlatformAccess = action({
  args: { platformAccessToken: v.string() },
  handler: async (ctx, { platformAccessToken }) => {
    const uid = verifyPlatformAccessToken(platformAccessToken);
    if (!uid) return null;
    const row = await ctx.runQuery(internal.dao.authIdentityDao.findByUid, { uid });
    if (!row) return null;
    await ctx.runMutation(internal.dao.authIdentityDao.refreshExpire, { uid });
    return attachPlatformAccess(stripUserForClient(row as Record<string, unknown>));
  },
});

/** Restore session from stored platform JWT on page load. */
export const restorePlatformSession = action({
  args: { platformAccessToken: v.string() },
  handler: async (ctx, { platformAccessToken }) => {
    const uid = verifyPlatformAccessToken(platformAccessToken);
    if (!uid) return null;
    const row = await ctx.runQuery(internal.dao.authIdentityDao.findByUid, { uid });
    if (!row) return null;
    await ctx.runMutation(internal.dao.authIdentityDao.refreshExpire, { uid });
    return attachPlatformAccess(stripUserForClient(row as Record<string, unknown>));
  },
});

export const verifyPlatformTokenForUid = action({
  args: { uid: v.string(), platformAccessToken: v.string() },
  handler: async (_ctx, { uid, platformAccessToken }) => {
    return verifyPlatformAccessToken(platformAccessToken) === uid;
  },
});

export { EMBED_AUTH_METHODS };
