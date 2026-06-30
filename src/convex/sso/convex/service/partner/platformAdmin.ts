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
      out.push({
        uid: row.uid,
        role: row.role as PlatformStaffRole,
        email: identity?.email,
        name: identity?.name,
        createdAt: row.createdAt,
      });
    }
    return out.sort((a, b) => a.createdAt - b.createdAt);
  },
});

export const applyAddPlatformStaff = internalMutation({
  args: {
    actorUid: v.string(),
    accountId: v.string(),
    platformUid: v.string(),
    passwordHash: v.string(),
    role: platformStaffRoleValidator,
  },
  handler: async (ctx, { actorUid, accountId, platformUid, passwordHash, role }) => {
    await requirePlatformStaff({ ...ctx, user: { uid: actorUid } }, "owner");
    const targetUid = await provisionWebStaffAccount(
      ctx,
      accountId,
      passwordHash,
      platformUid,
      PLATFORM_NAMESPACE_PARTNER_ID
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
