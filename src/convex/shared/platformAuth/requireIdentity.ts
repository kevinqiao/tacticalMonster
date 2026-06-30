/** Resolve platform JWT identity (Convex customJwt / setAuth). */

export async function requireIdentityUid(ctx: {
  auth: { getUserIdentity: () => Promise<{ subject: string } | null> };
}): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity?.subject) {
    throw new Error("unauthenticated");
  }
  return identity.subject;
}

export type PlatformTokenArg = { token?: string };

export async function optionalIdentityUid(ctx: {
  auth: { getUserIdentity: () => Promise<{ subject: string } | null> };
}): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  return identity?.subject ?? null;
}
