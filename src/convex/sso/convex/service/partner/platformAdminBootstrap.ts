import { v } from "convex/values";

import { mutation } from "../../_generated/server";
import {
  PLATFORM_ADMIN_EMAIL,
} from "./platformAdminAccount";
import { getPlatformStaffRow } from "./platformStaff";
import { getPartnerStaffRow } from "./partnerStaff";
import { dedupeAuthIdentitiesByUid } from "../../dao/authIdentityHelpers";
import { normalizeWebAccountId } from "../../utils/webIdentity";
import { provisionWebStaffAccount } from "./ensureStaffIdentity";
import { getPartnerByPid } from "./partnerStaff";
import {
  sanitizeConsumerAuthChannelIds,
  sanitizeStaffAuthChannelIds,
  legacyPartnerChannelPatch,
} from "../auth/partnerChannelPolicy";

const DEV_BOOTSTRAP_SECRET = "dev-local-platform-bootstrap";

const platformStaffRoleValidator = v.union(
  v.literal("owner"),
  v.literal("admin"),
  v.literal("viewer")
);

const partnerStaffRoleValidator = v.union(
  v.literal("owner"),
  v.literal("admin"),
  v.literal("developer"),
  v.literal("viewer")
);

function assertBootstrapSecret(provided: string) {
  const secret = process.env.PLATFORM_BOOTSTRAP_SECRET?.trim() || DEV_BOOTSTRAP_SECRET;
  if (provided !== secret) {
    throw new Error("forbidden");
  }
}

/** Seed admin/admin: user + auth_identities + platform_staff for /platform/admin. */
export const bootstrapPlatformAdminAccount = mutation({
  args: {
    bootstrapSecret: v.string(),
    passwordHash: v.string(),
    email: v.optional(v.string()),
    platformUid: v.string(),
  },
  handler: async (ctx, args) => {
    assertBootstrapSecret(args.bootstrapSecret);

    const dedupe = await dedupeAuthIdentitiesByUid(ctx);

    const accountId = normalizeWebAccountId(args.email?.trim() || PLATFORM_ADMIN_EMAIL);
    const uid = args.platformUid.trim();
    if (!uid) throw new Error("uid_required");
    const contactEmail = accountId.includes("@") ? accountId : undefined;
    const now = Date.now();

    let userCreated = false;
    const existingUserByAccount = await ctx.db
      .query("user")
      .withIndex("by_accountId", (q) => q.eq("accountId", accountId))
      .unique();
    const existingUserByEmail = contactEmail
      ? await ctx.db
          .query("user")
          .withIndex("by_email", (q) => q.eq("email", contactEmail))
          .unique()
      : null;

    if (!existingUserByAccount && !existingUserByEmail) {
      await ctx.db.insert("user", {
        accountId,
        ...(contactEmail ? { email: contactEmail } : {}),
        passwordHash: args.passwordHash,
        name: "Platform Admin",
        createdAt: now,
        updatedAt: now,
      });
      userCreated = true;
    } else {
      const row = existingUserByAccount ?? existingUserByEmail!;
      await ctx.db.patch(row._id, {
        accountId,
        ...(contactEmail ? { email: contactEmail } : {}),
        passwordHash: args.passwordHash,
        updatedAt: now,
      });
    }

    let identityCreated = false;
    let identity = await ctx.db
      .query("auth_identities")
      .withIndex("by_partner_subject", (q) =>
        q.eq("partnerId", 0).eq("subject", accountId)
      )
      .unique();
    if (!identity) {
      identity = await ctx.db
        .query("auth_identities")
        .withIndex("by_uid", (q) => q.eq("uid", uid))
        .unique();
    }

    if (!identity) {
      await ctx.db.insert("auth_identities", {
        uid,
        provider: "web",
        subject: accountId,
        partnerId: 0,
        ...(contactEmail ? { email: contactEmail } : {}),
        name: "Platform Admin",
        cid: 0,
        lastUpdate: now,
        expire: now + 600_000,
        createdAt: now,
        updatedAt: now,
      });
      identityCreated = true;
    } else {
      await ctx.db.patch(identity._id, {
        uid,
        provider: "web",
        subject: accountId,
        partnerId: 0,
        ...(contactEmail ? { email: contactEmail } : {}),
        name: identity.name ?? "Platform Admin",
        cid: 0,
        lastUpdate: now,
        expire: now + 600_000,
        updatedAt: now,
      });
    }

    const existingStaff = await getPlatformStaffRow(ctx, uid);
    let staffCreated = false;
    if (!existingStaff) {
      await ctx.db.insert("platform_staff", {
        uid,
        role: "owner",
        createdAt: now,
      });
      staffCreated = true;
    }

    return {
      ok: true as const,
      accountId,
      uid,
      dedupe,
      userCreated,
      identityCreated,
      staffCreated,
      login: { username: accountId, password: "(see PLATFORM_ADMIN_PASSWORD or default admin)" },
    };
  },
});

export const bootstrapPlatformStaff = mutation({
  args: {
    bootstrapSecret: v.string(),
    uid: v.string(),
    role: v.optional(platformStaffRoleValidator),
  },
  handler: async (ctx, args) => {
    assertBootstrapSecret(args.bootstrapSecret);

    const uid = args.uid.trim();
    if (!uid) throw new Error("uid_required");

    const existing = await getPlatformStaffRow(ctx, uid);
    if (existing) {
      return { ok: true as const, uid, role: existing.role, created: false };
    }

    await ctx.db.insert("platform_staff", {
      uid,
      role: args.role ?? "owner",
      createdAt: Date.now(),
    });
    return { ok: true as const, uid, role: args.role ?? "owner", created: true };
  },
});

export const bootstrapDefaultPlatformAdmin = mutation({
  args: {
    bootstrapSecret: v.string(),
    platformUid: v.string(),
  },
  handler: async (ctx, { bootstrapSecret, platformUid }) => {
    assertBootstrapSecret(bootstrapSecret);
    const uid = platformUid.trim();
    const existing = await getPlatformStaffRow(ctx, uid);
    if (existing) {
      return { ok: true as const, uid, role: existing.role, created: false };
    }
    await ctx.db.insert("platform_staff", {
      uid,
      role: "owner",
      createdAt: Date.now(),
    });
    return { ok: true as const, uid, role: "owner" as const, created: true };
  },
});

/** Seed partner_staff web account for /partner/admin (e.g. kqiao/12345). */
export const bootstrapPartnerStaffAccount = mutation({
  args: {
    bootstrapSecret: v.string(),
    partnerId: v.number(),
    passwordHash: v.string(),
    accountId: v.optional(v.string()),
    platformUid: v.string(),
    role: v.optional(partnerStaffRoleValidator),
  },
  handler: async (ctx, args) => {
    assertBootstrapSecret(args.bootstrapSecret);

    const partner = await getPartnerByPid(ctx, args.partnerId);
    if (!partner) throw new Error("not_found");

    const loginAccountId = args.accountId?.trim() || "admin";
    const platformUid = args.platformUid.trim();
    if (!platformUid) throw new Error("uid_required");

    const uid = await provisionWebStaffAccount(
      ctx,
      loginAccountId,
      args.passwordHash,
      platformUid,
      args.partnerId
    );

    const existingStaff = await getPartnerStaffRow(ctx, args.partnerId, uid);
    let staffCreated = false;
    if (!existingStaff) {
      await ctx.db.insert("partner_staff", {
        partnerId: args.partnerId,
        uid,
        role: args.role ?? "owner",
        createdAt: Date.now(),
      });
      staffCreated = true;
    }

    const accountId = normalizeWebAccountId(loginAccountId);
    return {
      ok: true as const,
      accountId,
      uid,
      partnerId: args.partnerId,
      staffCreated,
      login: { username: accountId, password: "(see script --password)" },
    };
  },
});

/** Ensure default partner row (pid=0) consumer + staff auth channels. */
export const bootstrapDefaultPartnerChannels = mutation({
  args: {
    bootstrapSecret: v.string(),
    authChannelIds: v.array(v.number()),
    staffAuthChannelIds: v.optional(v.array(v.number())),
  },
  handler: async (ctx, { bootstrapSecret, authChannelIds, staffAuthChannelIds }) => {
    assertBootstrapSecret(bootstrapSecret);

    const consumerIds = sanitizeConsumerAuthChannelIds(authChannelIds);
    if (consumerIds.length === 0) {
      throw new Error("auth_channels_required");
    }
    const staffIds = sanitizeStaffAuthChannelIds(staffAuthChannelIds ?? [0]);

    const existing = await ctx.db
      .query("partner")
      .withIndex("by_pid", (q) => q.eq("pid", 0))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        auth_channels: consumerIds,
        staff_auth_channels: staffIds,
      });
      return {
        ok: true as const,
        pid: 0,
        created: false as const,
        authChannelIds: consumerIds,
        staffAuthChannelIds: staffIds,
      };
    }

    await ctx.db.insert("partner", {
      pid: 0,
      name: "Default Partner",
      host: "https://default.com",
      auth_channels: consumerIds,
      staff_auth_channels: staffIds,
      data: {
        enabledContexts: ["casual", "portal", "campaign", "tactical"],
      },
    });
    return {
      ok: true as const,
      pid: 0,
      created: true as const,
      authChannelIds: consumerIds,
      staffAuthChannelIds: staffIds,
    };
  },
});

/** Split legacy `auth_channels: [0,1]` into consumer + staff columns for all partners. */
export const migrateLegacyPartnerAuthChannels = mutation({
  args: { bootstrapSecret: v.string() },
  handler: async (ctx, { bootstrapSecret }) => {
    assertBootstrapSecret(bootstrapSecret);
    const rows = await ctx.db.query("partner").collect();
    const migrated: Array<{ pid: number; auth_channels: number[]; staff_auth_channels: number[] }> =
      [];

    for (const row of rows) {
      const patch = legacyPartnerChannelPatch({
        auth_channels: row.auth_channels,
        staff_auth_channels: row.staff_auth_channels,
      });
      if (!patch) continue;
      await ctx.db.patch(row._id, patch);
      migrated.push({ pid: row.pid, ...patch });
    }

    return { ok: true as const, migrated };
  },
});
