"use node";

import { v } from "convex/values";

import type { User } from "../../../../host/service/UserManager";
import { internal } from "../../_generated/api";
import { action, type ActionCtx } from "../../_generated/server";
import { attachPlatformAccess, stripUserForClient } from "./platformClientUser";
import { verifyWebPassword } from "./webPassword";
import {
  AuthenticatorFactory,
  PLATFORM_NAMESPACE_PARTNER_ID,
  WEB_AUTH_CHANNEL_CID,
  webAccountIdForEmail,
} from "../provider/AuthenticatorFactory";
import { assertStaffAuthChannel } from "./partnerChannelPolicy";

const staffGateValidator = v.union(
  v.literal("none"),
  v.literal("platform"),
  v.literal("partner"),
  v.literal("merchant")
);

function toClientUser(user: Record<string, unknown>): User {
  return attachPlatformAccess(stripUserForClient(user));
}

async function loadPartnerRow(ctx: ActionCtx, pid: number) {
  return ctx.runQuery(internal.service.PartnerManager.findInternal, { pid });
}

async function ensurePlatformStaffForSignIn(ctx: ActionCtx, uid: string) {
  const existing = await ctx.runQuery(internal.dao.platformStaffDao.findByUid, { uid });
  if (existing) return;

  const anyStaff = await ctx.runQuery(internal.dao.platformStaffDao.anyExists, {});
  if (!anyStaff) {
    await ctx.runMutation(internal.dao.platformStaffDao.insertStaff, {
      uid,
      role: "owner",
    });
    return;
  }

  throw new Error("not_platform_staff");
}

async function signInPartnerStaffWebAccount(
  ctx: ActionCtx,
  args: {
    accountId: string;
    password: string;
    partnerId?: number;
  }
): Promise<User> {
  // Channel check uses Default Partner when partnerId omitted (shared staff Web).
  const channelPartnerId = args.partnerId ?? PLATFORM_NAMESPACE_PARTNER_ID;
  const channelPartnerRow = await loadPartnerRow(ctx, channelPartnerId);
  assertStaffAuthChannel(channelPartnerRow, WEB_AUTH_CHANNEL_CID);

  const loginId = args.accountId.trim();
  const webUser = await ctx.runQuery(internal.dao.userDao.findByLoginId, { loginId });
  if (!webUser || !verifyWebPassword(args.password, webUser as Record<string, unknown>)) {
    throw new Error("invalid_credentials");
  }

  const canonicalAccountId = webAccountIdForEmail(loginId);
  const session = await ctx.runQuery(
    internal.dao.partnerStaffDao.resolveWebPartnerStaffSession,
    {
      accountId: canonicalAccountId,
      partnerId: args.partnerId,
    }
  );
  if (!session) {
    throw new Error("not_partner_staff");
  }

  // Prefer asserting the resolved partner also allows staff Web when scoped.
  if (session.partnerId !== channelPartnerId) {
    const resolvedPartner = await loadPartnerRow(ctx, session.partnerId);
    try {
      assertStaffAuthChannel(resolvedPartner, WEB_AUTH_CHANNEL_CID);
    } catch {
      // Fall back to Default Partner channel policy already checked above.
    }
  }

  const refreshed = await ctx.runMutation(internal.dao.authIdentityDao.refreshWebSession, {
    uid: session.uid,
    partnerId: session.partnerId,
  });
  if (!refreshed?.uid) {
    throw new Error("invalid_credentials");
  }

  return toClientUser(refreshed as Record<string, unknown>);
}

async function signInMerchantStaffWebAccount(
  ctx: ActionCtx,
  args: {
    accountId: string;
    password: string;
    partnerId?: number;
  }
): Promise<User> {
  const scopedPartnerId = args.partnerId ?? PLATFORM_NAMESPACE_PARTNER_ID;
  const partnerRow = await loadPartnerRow(ctx, scopedPartnerId);
  assertStaffAuthChannel(partnerRow, WEB_AUTH_CHANNEL_CID);

  const loginId = args.accountId.trim();
  const webUser = await ctx.runQuery(internal.dao.userDao.findByLoginId, { loginId });
  if (!webUser || !verifyWebPassword(args.password, webUser as Record<string, unknown>)) {
    throw new Error("invalid_credentials");
  }

  const canonicalAccountId = webAccountIdForEmail(loginId);
  const candidates = await ctx.runQuery(
    internal.dao.storeStaffSignInDao.listWebStoreStaffCandidates,
    {
      accountId: canonicalAccountId,
      partnerId: scopedPartnerId,
    }
  );

  let session: { uid: string; partnerId: number } | null = null;
  for (const candidate of candidates) {
    const assert = await ctx.runQuery(
      internal.service.partner.storeAdmin.assertStoreStaffInternal,
      { uid: candidate.uid }
    );
    if (assert.ok) {
      session = candidate;
      break;
    }
  }

  if (!session) {
    if (candidates.length > 0) {
      throw new Error("not_store_staff");
    }
    throw new Error("invalid_credentials");
  }

  const refreshed = await ctx.runMutation(internal.dao.authIdentityDao.refreshWebSession, {
    uid: session.uid,
    partnerId: session.partnerId,
  });
  if (!refreshed?.uid) {
    throw new Error("invalid_credentials");
  }

  return toClientUser(refreshed as Record<string, unknown>);
}

export async function signInWebAccountHandler(
  ctx: ActionCtx,
  args: {
    accountId: string;
    password: string;
    staffGate: "none" | "platform" | "partner" | "merchant";
    partnerId?: number;
  }
): Promise<User> {
  const loginId = args.accountId.trim();
  if (!loginId) throw new Error("account_id_required");
  if (!args.password) throw new Error("password_required");

  if (args.staffGate === "none") {
    throw new Error("consumer_web_disabled");
  }

  if (args.staffGate === "partner") {
    return signInPartnerStaffWebAccount(ctx, {
      accountId: loginId,
      password: args.password,
      partnerId: args.partnerId,
    });
  }

  if (args.staffGate === "merchant") {
    return signInMerchantStaffWebAccount(ctx, {
      accountId: loginId,
      password: args.password,
      partnerId: args.partnerId,
    });
  }

  const partnerId = PLATFORM_NAMESPACE_PARTNER_ID;
  const partnerRow = await loadPartnerRow(ctx, partnerId);
  assertStaffAuthChannel(partnerRow, WEB_AUTH_CHANNEL_CID);

  const channel = { cid: WEB_AUTH_CHANNEL_CID, provider: "web" };
  const authenticator = AuthenticatorFactory.createAuthenticator(channel);
  if (!authenticator) {
    throw new Error("auth_channel_unavailable");
  }

  const user = await authenticator.signIn(ctx, partnerId, {
    email: loginId,
    password: args.password,
  });

  if (!user?.uid) {
    throw new Error("invalid_credentials");
  }

  if (args.staffGate === "platform") {
    await ensurePlatformStaffForSignIn(ctx, user.uid);
  }

  return toClientUser(user as Record<string, unknown>);
}

/** Expected auth failures — return to client (no Convex "Server Error" console noise). */
const EXPECTED_SIGN_IN_ERROR_CODES = new Set([
  "account_id_required",
  "password_required",
  "invalid_credentials",
  "not_platform_staff",
  "not_partner_staff",
  "not_merchant_staff",
  "not_store_staff",
  "auth_channel_unavailable",
  "staff_auth_channel_unavailable",
  "invalid_consumer_auth_channel",
  "invalid_staff_auth_channel",
  "consumer_web_disabled",
]);

export type SignInWebAccountResult =
  | { ok: true; user: User }
  | { ok: false; error: string };

function expectedSignInFailure(error: unknown): SignInWebAccountResult | null {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const code = raw.replace(/^Error:\s*/i, "").trim().split(/\s|\n/)[0] ?? "";
  if (EXPECTED_SIGN_IN_ERROR_CODES.has(code)) {
    return { ok: false, error: code };
  }
  return null;
}

export const signInWebAccount = action({
  args: {
    accountId: v.string(),
    password: v.string(),
    staffGate: staffGateValidator,
    partnerId: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<SignInWebAccountResult> => {
    try {
      const user = await signInWebAccountHandler(ctx, args);
      return { ok: true, user };
    } catch (e) {
      const failure = expectedSignInFailure(e);
      if (failure) return failure;
      throw e;
    }
  },
});
