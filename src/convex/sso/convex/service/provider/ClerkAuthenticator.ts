"use node";

import { verifyToken } from "@clerk/backend";

import type { ActionCtx } from "../../_generated/server";

import type { User } from "../../../../host/service/UserManager";
import { PLATFORM_NAMESPACE_PARTNER_ID } from "../auth/platformUid";
import { completeClerkSession } from "../clerk/completeClerkSession";
import { Authenticator } from "./AuthenticatorFactory";

function clerkSecretKey(): string | null {
  const key = process.env.CLERK_SECRET_KEY?.trim();
  return key || null;
}

export class ClerkAuthenticator implements Authenticator {
  private channel: { cid: number; provider: string };

  constructor(channel: { cid: number; provider: string }) {
    this.channel = channel;
  }

  async signIn(
    ctx: ActionCtx,
    partner: number | undefined,
    data: { sessionToken?: string }
  ): Promise<User | null> {
    void this.channel;
    const sessionToken = typeof data?.sessionToken === "string" ? data.sessionToken.trim() : "";
    if (!sessionToken) return null;

    const secretKey = clerkSecretKey();
    if (!secretKey) {
      console.error("[ClerkAuthenticator] CLERK_SECRET_KEY is not configured");
      return null;
    }

    let payload: { sub?: string; email?: string; name?: string };
    try {
      const verified = await verifyToken(sessionToken, { secretKey });
      payload = verified as { sub?: string; email?: string; name?: string };
    } catch (error) {
      console.error("[ClerkAuthenticator] verifyToken failed", error);
      return null;
    }

    const subject = typeof payload.sub === "string" ? payload.sub.trim() : "";
    if (!subject) return null;

    const partnerId = partner ?? PLATFORM_NAMESPACE_PARTNER_ID;
    const email = typeof payload.email === "string" ? payload.email.trim() : undefined;
    const name = typeof payload.name === "string" ? payload.name.trim() : undefined;

    return completeClerkSession(ctx, partnerId, {
      subject,
      ...(email ? { email } : {}),
      ...(name ? { name } : {}),
    });
  }
}
