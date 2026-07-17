import type { MutationCtx } from "../_generated/server";

import {
  findIdentityByUid,
  findWebIdentityByPartnerSubject,
  findWebIdentityBySubject,
  listIdentitiesByUid,
} from "../../dao/authIdentityHelpers";
import { PLATFORM_NAMESPACE_PARTNER_ID } from "../auth/platformUid";
import {
  normalizeWebAccountId,
  optionalWebContactEmail,
} from "../../utils/webIdentity";

const REFRESH_TOKEN_EXPIRE_MS = 600 * 1000;

/** Staff Web identities are platform-wide: auth_identities.partnerId is always 0. */
const STAFF_IDENTITY_PARTNER_ID = PLATFORM_NAMESPACE_PARTNER_ID;

export async function resolveWebStaffLogin(
  ctx: MutationCtx,
  raw: string,
  platformUid: string
): Promise<{ accountId: string; contactEmail?: string; uid: string }> {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("account_id_required");
  }

  let accountId = normalizeWebAccountId(trimmed);

  if (trimmed.startsWith("0_")) {
    const legacyIdentity = await findIdentityByUid(ctx, trimmed);
    if (legacyIdentity?.subject && !legacyIdentity.subject.startsWith("0_")) {
      accountId = legacyIdentity.subject;
    } else {
      const legacyUser = await ctx.db
        .query("user")
        .withIndex("by_accountId", (q) => q.eq("accountId", trimmed))
        .unique();
      if (legacyUser?.accountId && !legacyUser.accountId.startsWith("0_")) {
        accountId = legacyUser.accountId;
      }
    }
  }

  const contactEmail = optionalWebContactEmail(accountId);
  // One staff person per subject: reuse any existing web identity (legacy partner-scoped
  // rows included) so partner_staff memberships keep resolving.
  const existingIdentity =
    (await findWebIdentityByPartnerSubject(ctx, STAFF_IDENTITY_PARTNER_ID, accountId)) ??
    (await findIdentityByUid(ctx, platformUid)) ??
    (await findWebIdentityBySubject(ctx, accountId));

  const uid = existingIdentity?.uid ?? platformUid;

  return { accountId, contactEmail, uid };
}

async function upsertWebUser(
  ctx: MutationCtx,
  accountId: string,
  contactEmail: string | undefined,
  passwordHash: string,
  name?: string
) {
  const existingByAccount = await ctx.db
    .query("user")
    .withIndex("by_accountId", (q) => q.eq("accountId", accountId))
    .unique();

  if (contactEmail) {
    const existingByEmail = await ctx.db
      .query("user")
      .withIndex("by_email", (q) => q.eq("email", contactEmail))
      .unique();
    if (
      existingByEmail &&
      existingByAccount &&
      existingByEmail._id !== existingByAccount._id
    ) {
      throw new Error("email_already_used");
    }
  }

  const now = Date.now();
  const existing = existingByAccount;
  const trimmedName = name?.trim();

  if (existing) {
    await ctx.db.patch(existing._id, {
      accountId,
      ...(contactEmail ? { email: contactEmail } : {}),
      ...(trimmedName ? { name: trimmedName } : {}),
      passwordHash,
      updatedAt: now,
    });
    return;
  }

  await ctx.db.insert("user", {
    accountId,
    ...(contactEmail ? { email: contactEmail } : {}),
    ...(trimmedName ? { name: trimmedName } : {}),
    passwordHash,
    createdAt: now,
    updatedAt: now,
  });
}

async function ensureWebAuthIdentity(
  ctx: MutationCtx,
  uid: string,
  accountId: string,
  contactEmail: string | undefined,
  name?: string
) {
  const existing =
    (await findWebIdentityByPartnerSubject(ctx, STAFF_IDENTITY_PARTNER_ID, accountId)) ??
    (await findIdentityByUid(ctx, uid)) ??
    (await findWebIdentityBySubject(ctx, accountId));

  const now = Date.now();
  const trimmedName = name?.trim();

  if (existing) {
    await ctx.db.patch(existing._id, {
      subject: accountId,
      provider: "web",
      partnerId: STAFF_IDENTITY_PARTNER_ID,
      cid: 0,
      ...(contactEmail ? { email: contactEmail } : {}),
      ...(trimmedName ? { name: trimmedName } : {}),
      updatedAt: now,
    });
    for (const dup of await listIdentitiesByUid(ctx, existing.uid)) {
      if (dup._id !== existing._id) {
        await ctx.db.delete(dup._id);
      }
    }
    return existing.uid;
  }

  await ctx.db.insert("auth_identities", {
    uid,
    provider: "web",
    subject: accountId,
    partnerId: STAFF_IDENTITY_PARTNER_ID,
    ...(contactEmail ? { email: contactEmail } : {}),
    ...(trimmedName ? { name: trimmedName } : {}),
    cid: 0,
    lastUpdate: now,
    expire: now + REFRESH_TOKEN_EXPIRE_MS,
    createdAt: now,
    updatedAt: now,
  });
  return uid;
}

/**
 * Create/update `user` + staff `auth_identities` (partnerId always 0).
 * Team membership (`partner_staff.partnerId`) is separate and uses the real Partner id.
 */
export async function provisionWebStaffAccount(
  ctx: MutationCtx,
  loginAccountIdRaw: string,
  passwordHash: string,
  platformUid: string,
  name?: string
): Promise<string> {
  if (!passwordHash) {
    throw new Error("password_required");
  }

  const { accountId, contactEmail, uid } = await resolveWebStaffLogin(
    ctx,
    loginAccountIdRaw,
    platformUid
  );
  await upsertWebUser(ctx, accountId, contactEmail, passwordHash, name);
  return await ensureWebAuthIdentity(ctx, uid, accountId, contactEmail, name);
}
