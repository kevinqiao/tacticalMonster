import { v } from "convex/values";

import { internalMutation, internalQuery, mutation } from "../_generated/server";
import { normalizeWebAccountId } from "../utils/webIdentity";

const DEV_BOOTSTRAP_SECRET = "dev-local-sso-user-purge";

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

function isValidWebUserRow(row: {
  accountId?: string;
  passwordHash?: string;
}): boolean {
  return Boolean(row.accountId && row.passwordHash);
}

export const findByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const row = await ctx.db
      .query("user")
      .withIndex("by_email", (q) => q.eq("email", normalizeEmail(email)))
      .unique();
    if (!row || !isValidWebUserRow(row)) return null;
    return row;
  },
});

export const findByAccountId = internalQuery({
  args: { accountId: v.string() },
  handler: async (ctx, { accountId }) => {
    const row = await ctx.db
      .query("user")
      .withIndex("by_accountId", (q) => q.eq("accountId", normalizeWebAccountId(accountId)))
      .unique();
    if (!row || !isValidWebUserRow(row)) return null;
    return row;
  },
});

/** Resolve web user by login id (`accountId`) or legacy `user.email` / hash `accountId`. */
export const findByLoginId = internalQuery({
  args: { loginId: v.string() },
  handler: async (ctx, { loginId }) => {
    const accountId = normalizeWebAccountId(loginId);
    const byAccount = await ctx.db
      .query("user")
      .withIndex("by_accountId", (q) => q.eq("accountId", accountId))
      .unique();
    if (byAccount && isValidWebUserRow(byAccount)) return byAccount;

    const byEmail = await ctx.db
      .query("user")
      .withIndex("by_email", (q) => q.eq("email", accountId))
      .unique();
    if (byEmail && isValidWebUserRow(byEmail)) return byEmail;

    const identity = await ctx.db
      .query("auth_identities")
      .withIndex("by_provider_subject", (q) =>
        q.eq("provider", "web").eq("subject", accountId)
      )
      .unique();
    if (identity?.uid) {
      const byLegacyAccount = await ctx.db
        .query("user")
        .withIndex("by_accountId", (q) => q.eq("accountId", identity.uid))
        .unique();
      if (byLegacyAccount && isValidWebUserRow(byLegacyAccount)) return byLegacyAccount;
    }

    if (accountId.startsWith("0_")) {
      const byHash = await ctx.db
        .query("user")
        .withIndex("by_accountId", (q) => q.eq("accountId", accountId))
        .unique();
      if (byHash && isValidWebUserRow(byHash)) return byHash;
    }

    return null;
  },
});

/** Web SignUp — `accountId` = login id = `auth_identities.subject`; `email` optional. */
export const createWebUser = internalMutation({
  args: {
    accountId: v.string(),
    email: v.optional(v.string()),
    passwordHash: v.string(),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, { accountId, email, passwordHash, name, phone }) => {
    const normalizedAccountId = normalizeWebAccountId(accountId);
    const normalizedEmail = email ? normalizeEmail(email) : undefined;

    if (normalizedEmail) {
      const existingByEmail = await ctx.db
        .query("user")
        .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
        .unique();
      if (existingByEmail) return null;
    }

    const existingByAccount = await ctx.db
      .query("user")
      .withIndex("by_accountId", (q) => q.eq("accountId", normalizedAccountId))
      .unique();
    if (existingByAccount) return null;

    const now = Date.now();
    await ctx.db.insert("user", {
      accountId: normalizedAccountId,
      ...(normalizedEmail ? { email: normalizedEmail } : {}),
      passwordHash,
      name,
      phone,
      createdAt: now,
      updatedAt: now,
    });
    return { accountId: normalizedAccountId, email: normalizedEmail };
  },
});

export const upgradeWebUserAccountId = internalMutation({
  args: {
    fromAccountId: v.string(),
    accountId: v.string(),
    email: v.optional(v.string()),
  },
  handler: async (ctx, { fromAccountId, accountId, email }) => {
    const row = await ctx.db
      .query("user")
      .withIndex("by_accountId", (q) => q.eq("accountId", fromAccountId))
      .unique();
    if (!row) return false;

    const normalizedAccountId = normalizeWebAccountId(accountId);
    const normalizedEmail = email ? normalizeEmail(email) : undefined;
    await ctx.db.patch(row._id, {
      accountId: normalizedAccountId,
      ...(normalizedEmail ? { email: normalizedEmail } : {}),
      updatedAt: Date.now(),
    });
    return true;
  },
});

export const upgradePasswordHash = internalMutation({
  args: {
    accountId: v.string(),
    passwordHash: v.string(),
  },
  handler: async (ctx, { accountId, passwordHash }) => {
    const row = await ctx.db
      .query("user")
      .withIndex("by_accountId", (q) => q.eq("accountId", normalizeWebAccountId(accountId)))
      .unique();
    if (!row) return false;

    await ctx.db.patch(row._id, {
      passwordHash,
      updatedAt: Date.now(),
    });
    return true;
  },
});

export const updateProfile = internalMutation({
  args: {
    accountId: v.string(),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, { accountId, name, phone }) => {
    const row = await ctx.db
      .query("user")
      .withIndex("by_accountId", (q) => q.eq("accountId", normalizeWebAccountId(accountId)))
      .unique();
    if (!row) return false;

    await ctx.db.patch(row._id, {
      ...(name !== undefined ? { name } : {}),
      ...(phone !== undefined ? { phone } : {}),
      updatedAt: Date.now(),
    });
    return true;
  },
});

/** Dev: drop rows that do not match the new web-account shape. */
export const purgeInvalidUserRows = mutation({
  args: {
    bootstrapSecret: v.string(),
  },
  handler: async (ctx, { bootstrapSecret }) => {
    const secret = process.env.SSO_USER_PURGE_SECRET?.trim() || DEV_BOOTSTRAP_SECRET;
    if (bootstrapSecret !== secret) {
      throw new Error("forbidden");
    }

    const rows = await ctx.db.query("user").collect();
    let removed = 0;
    for (const row of rows) {
      if (!isValidWebUserRow(row)) {
        await ctx.db.delete(row._id);
        removed += 1;
      }
    }
    return { removed, remaining: rows.length - removed };
  },
});
