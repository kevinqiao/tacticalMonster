"use node";

import { verifyPlatformAccessToken } from "./platformJwtVerify";

import {
  requireIdentityUid,
  type PlatformTokenArg,
} from "./requireIdentity";

/** Convex setAuth identity, or explicit platform JWT in action args (legacy / HTTP bridge). */
export async function requireIdentityUidFromAuthOrToken(
  ctx: { auth: { getUserIdentity: () => Promise<{ subject: string } | null> } },
  args?: PlatformTokenArg
): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity?.subject) return identity.subject;

  const token = typeof args?.token === "string" ? args.token.trim() : "";
  if (token) {
    const uid = verifyPlatformAccessToken(token);
    if (uid) return uid;
  }

  return requireIdentityUid(ctx);
}
