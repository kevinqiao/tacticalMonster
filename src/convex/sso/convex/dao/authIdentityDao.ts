import { v } from "convex/values";

import { internalMutation, internalQuery, mutation, query } from "../_generated/server";
import {
  dedupeAuthIdentitiesByUid,
  findIdentityByUid,
  findWebIdentityByPartnerSubject,
  findWebIdentityBySubject,
  listIdentitiesByUid,
} from "./authIdentityHelpers";
import { PLATFORM_NAMESPACE_PARTNER_ID } from "../service/auth/platformUid";
import { EMBED_AUTH_CHANNEL_CID } from "../service/auth/authChannelCatalog";

const REFRESH_TOKEN_EXPIRE_MS = 600 * 1000;

export function newInternalUid(): string {
  return `usr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function sanitizeIdentityData(data: unknown) {
  if (!data || typeof data !== "object") return data;
  const copy = { ...(data as Record<string, unknown>) };
  delete copy.password;
  delete copy.passwordHash;
  return copy;
}

function stripIdentityForClient(row: Record<string, unknown>) {
  const {
    _id: _a,
    _creationTime: _b,
    provider: _p,
    subject: _s,
    partnerId,
    data: _d,
    expire: _x,
    lastUpdate: _lu,
    createdAt: _ca,
    updatedAt: _ua,
    ...rest
  } = row;
  return {
    ...rest,
    ...(partnerId != null ? { partner: partnerId } : {}),
    data: sanitizeIdentityData(_d),
  };
}

export const findByUid = internalQuery({
  args: { uid: v.string() },
  handler: async (ctx, { uid }) => {
    return await findIdentityByUid(ctx, uid);
  },
});

export const findByProviderSubject = internalQuery({
  args: {
    provider: v.string(),
    subject: v.string(),
  },
  handler: async (ctx, { provider, subject }) => {
    return await ctx.db
      .query("auth_identities")
      .withIndex("by_provider_subject", (q) =>
        q.eq("provider", provider).eq("subject", subject)
      )
      .unique();
  },
});

export const findByPartnerSubject = internalQuery({
  args: {
    partnerId: v.number(),
    subject: v.string(),
  },
  handler: async (ctx, { partnerId, subject }) => {
    return await ctx.db
      .query("auth_identities")
      .withIndex("by_partner_subject", (q) =>
        q.eq("partnerId", partnerId).eq("subject", subject)
      )
      .unique();
  },
});

export const findIdentity = query({
  args: { uid: v.string() },
  handler: async (ctx, { uid }) => {
    const row = await findIdentityByUid(ctx, uid);
    if (!row) return null;
    return stripIdentityForClient(row as Record<string, unknown>);
  },
});

export const resolvePartnerIdentity = internalMutation({
  args: {
    partnerId: v.number(),
    subject: v.string(),
    uid: v.string(),
    email: v.optional(v.string()),
    cid: v.optional(v.number()),
    provider: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, { partnerId, subject, uid, email, cid, provider, name }) => {
    const existing = await ctx.db
      .query("auth_identities")
      .withIndex("by_partner_subject", (q) =>
        q.eq("partnerId", partnerId).eq("subject", subject)
      )
      .unique();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        lastUpdate: now,
        expire: now + REFRESH_TOKEN_EXPIRE_MS,
        ...(email ? { email } : {}),
        ...(name !== undefined ? { name } : {}),
        updatedAt: now,
      });
      return { uid: existing.uid, created: false as const };
    }

    await ctx.db.insert("auth_identities", {
      uid,
      provider: provider ?? "partner",
      partnerId,
      subject,
      email,
      ...(name !== undefined ? { name } : {}),
      cid: cid ?? EMBED_AUTH_CHANNEL_CID,
      lastUpdate: now,
      expire: now + REFRESH_TOKEN_EXPIRE_MS,
      createdAt: now,
      updatedAt: now,
    });

    return { uid, created: true as const };
  },
});

/** Ensure platform identity for a web account (`user.accountId` → `subject`). */
export const ensureWebIdentity = internalMutation({
  args: {
    accountId: v.string(),
    email: v.optional(v.string()),
    uid: v.string(),
    partnerId: v.optional(v.number()),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, { accountId, email, uid, partnerId: _partnerId, name, phone }) => {
    // Web = staff console only; identity namespace is always platform partnerId=0.
    const scopedPartnerId = PLATFORM_NAMESPACE_PARTNER_ID;
    const contactEmail = email?.trim()
      ? email.toLowerCase().trim()
      : undefined;

    let existing =
      (await findWebIdentityByPartnerSubject(ctx, scopedPartnerId, accountId)) ??
      (await findIdentityByUid(ctx, uid)) ??
      (await findWebIdentityBySubject(ctx, accountId));

    if (!existing && contactEmail) {
      existing =
        (await findWebIdentityByPartnerSubject(ctx, scopedPartnerId, contactEmail)) ??
        (await findWebIdentityBySubject(ctx, contactEmail));
    }

    const profilePatch = {
      ...(contactEmail ? { email: contactEmail } : {}),
      ...(name !== undefined ? { name } : {}),
      ...(phone !== undefined ? { phone } : {}),
    };

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        subject: accountId,
        provider: "web",
        partnerId: scopedPartnerId,
        lastUpdate: now,
        expire: now + REFRESH_TOKEN_EXPIRE_MS,
        updatedAt: now,
        ...profilePatch,
      });

      for (const dup of await listIdentitiesByUid(ctx, existing.uid)) {
        if (dup._id !== existing._id) {
          await ctx.db.delete(dup._id);
        }
      }

      return stripIdentityForClient({
        ...existing,
        uid: existing.uid,
        subject: accountId,
        partnerId: scopedPartnerId,
        ...profilePatch,
        lastUpdate: now,
        expire: now + REFRESH_TOKEN_EXPIRE_MS,
      });
    }

    await ctx.db.insert("auth_identities", {
      uid,
      provider: "web",
      subject: accountId,
      cid: 0,
      partnerId: scopedPartnerId,
      ...profilePatch,
      lastUpdate: now,
      expire: now + REFRESH_TOKEN_EXPIRE_MS,
      createdAt: now,
      updatedAt: now,
    });

    return stripIdentityForClient({
      uid,
      subject: accountId,
      ...(contactEmail ? { email: contactEmail } : {}),
      cid: 0,
      partnerId: scopedPartnerId,
      ...profilePatch,
    });
  },
});

export const refreshWebSession = internalMutation({
  args: {
    uid: v.string(),
    /** Operating partner for client session only (membership). Not written on web identities. */
    partnerId: v.optional(v.number()),
  },
  handler: async (ctx, { uid, partnerId }) => {
    const row = await findIdentityByUid(ctx, uid);
    if (!row) return null;

    const now = Date.now();
    const isWebStaff = row.provider === "web";
    // Staff Web identity is always platform-wide (partnerId=0). Membership partner
    // stays in partner_staff / client `partner` only.
    await ctx.db.patch(row._id, {
      lastUpdate: now,
      expire: now + REFRESH_TOKEN_EXPIRE_MS,
      updatedAt: now,
      ...(isWebStaff
        ? { partnerId: PLATFORM_NAMESPACE_PARTNER_ID }
        : partnerId != null
          ? { partnerId }
          : {}),
    });

    return stripIdentityForClient({
      ...row,
      partnerId: isWebStaff
        ? (partnerId ?? PLATFORM_NAMESPACE_PARTNER_ID)
        : (partnerId ?? row.partnerId),
      lastUpdate: now,
      expire: now + REFRESH_TOKEN_EXPIRE_MS,
    });
  },
});

export const signInTelegram = internalMutation({
  args: {
    cid: v.number(),
    cuid: v.string(),
    uid: v.string(),
    profile: v.any(),
    partnerId: v.optional(v.number()),
  },
  handler: async (ctx, { cid, cuid, uid, profile, partnerId }) => {
    const scopedPartnerId = partnerId ?? PLATFORM_NAMESPACE_PARTNER_ID;
    const subject = cuid;
    const provider = "telegram";
    let row =
      (await findIdentityByUid(ctx, uid)) ??
      (await ctx.db
        .query("auth_identities")
        .withIndex("by_partner_subject", (q) =>
          q.eq("partnerId", scopedPartnerId).eq("subject", subject)
        )
        .unique());

    const now = Date.now();
    if (!row) {
      await ctx.db.insert("auth_identities", {
        uid,
        provider,
        subject,
        cid,
        partnerId: scopedPartnerId,
        data: profile,
        lastUpdate: now,
        expire: now + REFRESH_TOKEN_EXPIRE_MS,
        createdAt: now,
        updatedAt: now,
      });
      row = await findIdentityByUid(ctx, uid);
    } else {
      await ctx.db.patch(row._id, {
        lastUpdate: now,
        expire: now + REFRESH_TOKEN_EXPIRE_MS,
        updatedAt: now,
        partnerId: scopedPartnerId,
      });
    }
    if (!row) return null;
    return stripIdentityForClient(row as Record<string, unknown>);
  },
});

export const refreshExpire = internalMutation({
  args: { uid: v.string() },
  handler: async (ctx, { uid }) => {
    const row = await findIdentityByUid(ctx, uid);
    if (!row) return false;
    const now = Date.now();
    await ctx.db.patch(row._id, {
      lastUpdate: now,
      expire: now + REFRESH_TOKEN_EXPIRE_MS,
      updatedAt: now,
    });
    return true;
  },
});

export const logout = internalMutation({
  args: { uid: v.string() },
  handler: async (ctx, { uid }) => {
    const row = await findIdentityByUid(ctx, uid);
    if (!row) return false;
    const now = Date.now();
    await ctx.db.patch(row._id, { lastUpdate: now, expire: now, updatedAt: now });
    return true;
  },
});

export const updateIdentityData = internalMutation({
  args: { uid: v.string(), data: v.any() },
  handler: async (ctx, { uid, data }) => {
    const row = await findIdentityByUid(ctx, uid);
    if (!row) return false;
    const now = Date.now();
    const merged = row.data ? { ...row.data, ...data } : data;
    delete merged.password;
    delete merged.passwordHash;
    await ctx.db.patch(row._id, {
      data: merged,
      lastUpdate: now,
      updatedAt: now,
    });
    return true;
  },
});

export const updateIdentityProfile = internalMutation({
  args: {
    uid: v.string(),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    data: v.optional(v.any()),
  },
  handler: async (ctx, { uid, name, phone, data }) => {
    const row = await findIdentityByUid(ctx, uid);
    if (!row) return false;

    const now = Date.now();
    const patch: Record<string, unknown> = { updatedAt: now, lastUpdate: now };
    if (name !== undefined) patch.name = name;
    if (phone !== undefined) patch.phone = phone;
    if (data !== undefined) {
      const merged = row.data ? { ...row.data, ...data } : data;
      delete merged.password;
      delete merged.passwordHash;
      patch.data = merged;
    }
    await ctx.db.patch(row._id, patch);
    return true;
  },
});

const DEV_BOOTSTRAP_SECRET = "dev-local-platform-bootstrap";

function assertBootstrapSecret(provided: string) {
  const secret = process.env.PLATFORM_BOOTSTRAP_SECRET?.trim() || DEV_BOOTSTRAP_SECRET;
  if (provided !== secret) {
    throw new Error("forbidden");
  }
}

/** Dev: remove duplicate auth_identities rows that share the same uid. */
export const dedupeAuthIdentities = mutation({
  args: { bootstrapSecret: v.string() },
  handler: async (ctx, { bootstrapSecret }) => {
    assertBootstrapSecret(bootstrapSecret);
    return await dedupeAuthIdentitiesByUid(ctx);
  },
});
