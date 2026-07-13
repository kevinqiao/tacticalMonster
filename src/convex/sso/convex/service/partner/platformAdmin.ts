import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";
import { authedMutation, authedQuery } from "../../custom/session";
import { nextPartnerId } from "./partnerStaff";
import { isPlatformOperator } from "./platformOperator";
import { provisionWebStaffAccount } from "./ensureStaffIdentity";
import { CLERK_AUTH_CHANNEL_CID, WEB_AUTH_CHANNEL_CID } from "../auth/authChannelCatalog";
import { PLATFORM_NAMESPACE_PARTNER_ID } from "../auth/platformUid";
import {
  getPlatformStaffRow,
  listPlatformStaffRows,
  requirePlatformStaff,
  type PlatformStaffRole,
} from "./platformStaff";

const platformStaffRoleValidator = v.union(
  v.literal("owner"),
  v.literal("admin"),
  v.literal("viewer")
);

export const getPlatformOperatorAccess = authedQuery({
  args: {},
  handler: async (ctx) => {
    const row = await getPlatformStaffRow(ctx, ctx.user.uid);
    return {
      isOperator: await isPlatformOperator(ctx, ctx.user.uid),
      role: row?.role as PlatformStaffRole | undefined,
    };
  },
});

export const listAllPartners = authedQuery({
  args: {},
  handler: async (ctx) => {
    await requirePlatformStaff(ctx, "viewer");
    const rows = await ctx.db.query("partner").collect();
    return rows
      .map((p) => ({
        pid: p.pid,
        name: p.name ?? `Partner ${p.pid}`,
        host: p.host ?? "",
      }))
      .sort((a, b) => a.pid - b.pid);
  },
});

export const createPartner = authedMutation({
  args: {
    name: v.string(),
    host: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePlatformStaff(ctx, "admin");

    const pid = await nextPartnerId(ctx);
    await ctx.db.insert("partner", {
      pid,
      name: args.name.trim(),
      host: args.host?.trim() || undefined,
      auth_channels: [CLERK_AUTH_CHANNEL_CID],
      staff_auth_channels: [WEB_AUTH_CHANNEL_CID],
      data: {
        enabledContexts: ["casual", "portal", "campaign"],
      },
    });
    return { pid };
  },
});

export const listPlatformTeam = authedQuery({
  args: {},
  handler: async (ctx) => {
    await requirePlatformStaff(ctx, "viewer");
    const rows = await listPlatformStaffRows(ctx);
    const out = [];
    for (const row of rows) {
      const identity = await ctx.db
        .query("auth_identities")
        .withIndex("by_uid", (q) => q.eq("uid", row.uid))
        .unique();
      let webAccountId: string | undefined;
      let webUserName: string | undefined;
      if (identity?.provider === "web" && identity.subject) {
        const webUser = await ctx.db
          .query("user")
          .withIndex("by_accountId", (q) => q.eq("accountId", identity.subject))
          .unique();
        webAccountId = webUser?.accountId ?? identity.subject;
        webUserName = webUser?.name;
      }
      out.push({
        uid: row.uid,
        role: row.role as PlatformStaffRole,
        email: identity?.email,
        name: identity?.name ?? webUserName,
        webAccountId,
        createdAt: row.createdAt,
      });
    }
    return out.sort((a, b) => a.createdAt - b.createdAt);
  },
});

export const applyUpdatePlatformStaffProfile = internalMutation({
  args: {
    actorUid: v.string(),
    uid: v.string(),
    name: v.optional(v.string()),
    role: v.optional(platformStaffRoleValidator),
    passwordHash: v.optional(v.string()),
  },
  handler: async (ctx, { actorUid, uid, name, role, passwordHash }) => {
    await requirePlatformStaff({ ...ctx, user: { uid: actorUid } }, "owner");
    const targetUid = uid.trim();
    const row = await getPlatformStaffRow(ctx, targetUid);
    if (!row) throw new Error("not_found");

    if (role && role !== row.role) {
      if (row.role === "owner" && role !== "owner") {
        const owners = (await listPlatformStaffRows(ctx)).filter((r) => r.role === "owner");
        if (owners.length <= 1) throw new Error("last_owner");
      }
      await ctx.db.patch(row._id, { role });
    }

    const identity = await ctx.db
      .query("auth_identities")
      .withIndex("by_uid", (q) => q.eq("uid", targetUid))
      .unique();
    if (!identity) throw new Error("user_not_found");

    const now = Date.now();
    const identityPatch: { name?: string; updatedAt: number } = { updatedAt: now };
    if (name !== undefined) {
      identityPatch.name = name.trim();
    }

    await ctx.db.patch(identity._id, identityPatch);

    if (identity.provider === "web" && identity.subject) {
      const webUser = await ctx.db
        .query("user")
        .withIndex("by_accountId", (q) => q.eq("accountId", identity.subject))
        .unique();
      if (webUser) {
        const userPatch: { name?: string; passwordHash?: string; updatedAt: number } = {
          updatedAt: now,
        };
        if (name !== undefined) userPatch.name = name.trim();
        if (passwordHash) userPatch.passwordHash = passwordHash;
        await ctx.db.patch(webUser._id, userPatch);
      } else if (passwordHash) {
        throw new Error("user_not_found");
      }
    } else if (passwordHash) {
      throw new Error("user_not_found");
    }

    return { ok: true as const, uid: targetUid };
  },
});

export const applyAddPlatformStaff = internalMutation({
  args: {
    actorUid: v.string(),
    accountId: v.string(),
    platformUid: v.string(),
    passwordHash: v.string(),
    role: platformStaffRoleValidator,
    name: v.optional(v.string()),
  },
  handler: async (ctx, { actorUid, accountId, platformUid, passwordHash, role, name }) => {
    await requirePlatformStaff({ ...ctx, user: { uid: actorUid } }, "owner");
    const targetUid = await provisionWebStaffAccount(
      ctx,
      accountId,
      passwordHash,
      platformUid,
      PLATFORM_NAMESPACE_PARTNER_ID,
      name
    );

    const existing = await getPlatformStaffRow(ctx, targetUid);
    if (existing) throw new Error("already_member");

    await ctx.db.insert("platform_staff", {
      uid: targetUid,
      role,
      createdAt: Date.now(),
    });
    return { ok: true as const, uid: targetUid };
  },
});

export const removePlatformStaff = authedMutation({
  args: { uid: v.string() },
  handler: async (ctx, { uid }) => {
    await requirePlatformStaff(ctx, "owner");
    const targetUid = uid.trim();
    const row = await getPlatformStaffRow(ctx, targetUid);
    if (!row) throw new Error("not_found");
    if (row.role === "owner") {
      const owners = (await listPlatformStaffRows(ctx)).filter((r) => r.role === "owner");
      if (owners.length <= 1) throw new Error("last_owner");
    }
    await ctx.db.delete(row._id);
    return { ok: true as const };
  },
});
