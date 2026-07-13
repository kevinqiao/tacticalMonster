import { v } from "convex/values";

import type { QueryCtx } from "../../_generated/server";
import { internalMutation } from "../../_generated/server";
import { authedMutation, authedQuery } from "../../custom/session";
import {
  getPartnerByPid,
  getPartnerStaffRow,
  requirePartnerStaff,
  type PartnerRole,
} from "./partnerStaff";
import { listAuthChannelCatalog as catalogRows } from "../auth/authChannelCatalog";
import {
  resolvePartnerChannels,
  sanitizeConsumerAuthChannelIds,
  sanitizeStaffAuthChannelIds,
} from "../auth/partnerChannelPolicy";
import { isPlatformOperator } from "./platformOperator";
import { provisionWebStaffAccount } from "./ensureStaffIdentity";
import {
  PORTAL_GAME_TYPES,
  readPortalGamesFromPartnerData,
  sanitizePortalGames,
  validatePortalKey,
} from "./portalPartnerConfig";

async function requirePartnerAdmin(
  ctx: { user: { uid: string } } & Parameters<typeof requirePartnerStaff>[0],
  partnerId: number,
  minRole: PartnerRole
) {
  if (await isPlatformOperator(ctx, ctx.user.uid)) return;
  await requirePartnerStaff(ctx, partnerId, minRole);
}

const enabledContextValidator = v.union(
  v.literal("casual"),
  v.literal("portal"),
  v.literal("campaign"),
  v.literal("tactical")
);

const partnerRoleValidator = v.union(
  v.literal("owner"),
  v.literal("admin"),
  v.literal("developer"),
  v.literal("viewer")
);

async function loadPartnerView(ctx: QueryCtx, partnerId: number) {
  const partner = await getPartnerByPid(ctx, partnerId);
  if (!partner) return null;

  const resolved = resolvePartnerChannels(partner);

  return {
    pid: partner.pid,
    name: partner.name ?? "",
    host: partner.host ?? "",
    auth_channels: resolved.consumerChannelIds,
    staff_auth_channels: resolved.staffChannelIds,
    authChannelDefs: resolved.authChannelDefs,
    staffAuthChannelDefs: resolved.staffAuthChannelDefs,
    authChannelIds: resolved.consumerChannelIds,
    staffAuthChannelIds: resolved.staffChannelIds,
    data: (partner.data ?? {}) as {
      allowedOrigins?: string[];
      enabledContexts?: string[];
      defaultLandingPath?: string;
      branding?: { logoUrl?: string; primaryColor?: string };
    },
  };
}

export const listMyPartners = authedQuery({
  args: {},
  handler: async (ctx) => {
    const uid = ctx.user.uid;
    const staffRows = await ctx.db
      .query("partner_staff")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .collect();

    const out = [];
    for (const staff of staffRows) {
      const partner = await getPartnerByPid(ctx, staff.partnerId);
      if (!partner) continue;
      out.push({
        pid: partner.pid,
        name: partner.name ?? `Partner ${partner.pid}`,
        host: partner.host ?? "",
        role: staff.role as PartnerRole,
      });
    }
    return out.sort((a, b) => a.pid - b.pid);
  },
});

export const listAuthChannelCatalog = authedQuery({
  args: {},
  handler: async () => catalogRows(),
});

export const getPartnerAdminDetail = authedQuery({
  args: { partnerId: v.number() },
  handler: async (ctx, { partnerId }) => {
    await requirePartnerAdmin(ctx, partnerId, "viewer");
    return await loadPartnerView(ctx, partnerId);
  },
});

export const updatePartnerProfile = authedMutation({
  args: {
    partnerId: v.number(),
    name: v.string(),
    host: v.optional(v.string()),
    allowedOrigins: v.optional(v.array(v.string())),
    enabledContexts: v.optional(v.array(enabledContextValidator)),
    defaultLandingPath: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    primaryColor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePartnerAdmin(ctx, args.partnerId, "admin");
    const partner = await getPartnerByPid(ctx, args.partnerId);
    if (!partner) throw new Error("not_found");

    const prevData = (partner.data ?? {}) as Record<string, unknown>;
    const branding = {
      ...((prevData.branding as object) ?? {}),
      ...(args.logoUrl !== undefined ? { logoUrl: args.logoUrl.trim() || undefined } : {}),
      ...(args.primaryColor !== undefined
        ? { primaryColor: args.primaryColor.trim() || undefined }
        : {}),
    };

    await ctx.db.patch(partner._id, {
      name: args.name.trim(),
      host: args.host?.trim() || undefined,
      data: {
        ...prevData,
        ...(args.allowedOrigins !== undefined
          ? {
              allowedOrigins: args.allowedOrigins
                .map((s) => s.trim())
                .filter(Boolean),
            }
          : {}),
        ...(args.enabledContexts !== undefined
          ? { enabledContexts: args.enabledContexts }
          : {}),
        ...(args.defaultLandingPath !== undefined
          ? { defaultLandingPath: args.defaultLandingPath.trim() || undefined }
          : {}),
        branding,
      },
    });
    return { ok: true as const };
  },
});

export const updatePartnerAuthChannels = authedMutation({
  args: {
    partnerId: v.number(),
    authChannelIds: v.array(v.number()),
  },
  handler: async (ctx, { partnerId, authChannelIds }) => {
    await requirePartnerAdmin(ctx, partnerId, "admin");
    const partner = await getPartnerByPid(ctx, partnerId);
    if (!partner) throw new Error("not_found");

    const unique = sanitizeConsumerAuthChannelIds(authChannelIds);
    if (unique.length === 0) {
      throw new Error("auth_channels_required");
    }

    await ctx.db.patch(partner._id, { auth_channels: unique });
    return { ok: true as const, authChannelIds: unique };
  },
});

export const updatePartnerStaffAuthChannels = authedMutation({
  args: {
    partnerId: v.number(),
    staffAuthChannelIds: v.array(v.number()),
  },
  handler: async (ctx, { partnerId, staffAuthChannelIds }) => {
    await requirePartnerAdmin(ctx, partnerId, "admin");
    const partner = await getPartnerByPid(ctx, partnerId);
    if (!partner) throw new Error("not_found");

    const unique = sanitizeStaffAuthChannelIds(staffAuthChannelIds);
    await ctx.db.patch(partner._id, { staff_auth_channels: unique });
    return { ok: true as const, staffAuthChannelIds: unique };
  },
});

export const listPartnerTeam = authedQuery({
  args: { partnerId: v.number() },
  handler: async (ctx, { partnerId }) => {
    await requirePartnerAdmin(ctx, partnerId, "viewer");
    const rows = await ctx.db
      .query("partner_staff")
      .withIndex("by_partner", (q) => q.eq("partnerId", partnerId))
      .collect();

    const out = [];
    for (const row of rows) {
      const identity = await ctx.db
        .query("auth_identities")
        .withIndex("by_uid", (q) => q.eq("uid", row.uid))
        .unique();

      let webAccountId: string | undefined;
      let hasWebUser = false;
      let webUserName: string | undefined;
      if (identity?.provider === "web") {
        const subject = identity.subject;
        const webUser = subject
          ? await ctx.db
              .query("user")
              .withIndex("by_accountId", (q) => q.eq("accountId", subject))
              .unique()
          : null;
        hasWebUser = Boolean(webUser?.passwordHash);
        webAccountId = webUser?.accountId ?? identity.subject;
        webUserName = webUser?.name;
      }

      out.push({
        uid: row.uid,
        role: row.role as PartnerRole,
        provider: identity?.provider,
        email: identity?.email,
        name: identity?.name ?? webUserName,
        webAccountId,
        hasWebUser,
        createdAt: row.createdAt,
      });
    }
    return out.sort((a, b) => a.createdAt - b.createdAt);
  },
});

export const applyAddPartnerStaff = internalMutation({
  args: {
    actorUid: v.string(),
    partnerId: v.number(),
    accountId: v.string(),
    platformUid: v.string(),
    passwordHash: v.string(),
    role: partnerRoleValidator,
    name: v.optional(v.string()),
  },
  handler: async (ctx, { actorUid, partnerId, accountId, platformUid, passwordHash, role, name }) => {
    if (!(await isPlatformOperator(ctx, actorUid))) {
      await requirePartnerStaff({ ...ctx, user: { uid: actorUid } }, partnerId, "owner");
    }

    const targetUid = await provisionWebStaffAccount(
      ctx,
      accountId,
      passwordHash,
      platformUid,
      partnerId,
      name
    );

    const existing = await getPartnerStaffRow(ctx, partnerId, targetUid);
    if (existing) throw new Error("already_member");

    await ctx.db.insert("partner_staff", {
      partnerId,
      uid: targetUid,
      role,
      createdAt: Date.now(),
    });
    return { ok: true as const, uid: targetUid };
  },
});

export const applyUpdatePartnerStaffProfile = internalMutation({
  args: {
    actorUid: v.string(),
    partnerId: v.number(),
    uid: v.string(),
    name: v.optional(v.string()),
    role: v.optional(partnerRoleValidator),
    passwordHash: v.optional(v.string()),
  },
  handler: async (ctx, { actorUid, partnerId, uid, name, role, passwordHash }) => {
    if (!(await isPlatformOperator(ctx, actorUid))) {
      await requirePartnerStaff({ ...ctx, user: { uid: actorUid } }, partnerId, "owner");
    }

    const targetUid = uid.trim();
    const row = await getPartnerStaffRow(ctx, partnerId, targetUid);
    if (!row) throw new Error("not_found");

    if (role && role !== row.role) {
      if (row.role === "owner" && role !== "owner") {
        const owners = await ctx.db
          .query("partner_staff")
          .withIndex("by_partner", (q) => q.eq("partnerId", partnerId))
          .collect();
        const ownerCount = owners.filter((o) => o.role === "owner").length;
        if (ownerCount <= 1) throw new Error("last_owner");
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

export const removePartnerStaff = authedMutation({
  args: {
    partnerId: v.number(),
    uid: v.string(),
  },
  handler: async (ctx, { partnerId, uid }) => {
    const isOperator = await isPlatformOperator(ctx, ctx.user.uid);
    const actor = isOperator
      ? { uid: ctx.user.uid, role: "owner" as const }
      : await requirePartnerStaff(ctx, partnerId, "owner");
    const targetUid = uid.trim();
    const row = await getPartnerStaffRow(ctx, partnerId, targetUid);
    if (!row) throw new Error("not_found");
    if (row.role === "owner" && actor.uid !== targetUid) {
      const owners = await ctx.db
        .query("partner_staff")
        .withIndex("by_partner", (q) => q.eq("partnerId", partnerId))
        .collect();
      const ownerCount = owners.filter((o) => o.role === "owner").length;
      if (ownerCount <= 1) throw new Error("last_owner");
    }
    await ctx.db.delete(row._id);
    return { ok: true as const };
  },
});
export const getPartnerPortalConfig = authedQuery({
  args: { partnerId: v.number() },
  handler: async (ctx, { partnerId }) => {
    await requirePartnerAdmin(ctx, partnerId, "viewer");
    const partner = await getPartnerByPid(ctx, partnerId);
    if (!partner) return null;
    const portalGames = readPortalGamesFromPartnerData(partner.data);
    const key = partner.portal_key ?? "";
    return {
      partnerId: partner.pid,
      portalKey: key,
      portalGames,
      launchUrls: portalGames.map((gameType) => "/portal/" + key + "/" + gameType),
      registryGames: [...PORTAL_GAME_TYPES],
    };
  },
});

export const updatePartnerPortalConfig = authedMutation({
  args: {
    partnerId: v.number(),
    portalKey: v.string(),
    portalGames: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePartnerAdmin(ctx, args.partnerId, "admin");
    const partner = await getPartnerByPid(ctx, args.partnerId);
    if (!partner) throw new Error("not_found");

    const portalKey = validatePortalKey(args.portalKey);
    const portalGames = sanitizePortalGames(args.portalGames);
    const prevData = (partner.data ?? {}) as Record<string, unknown>;
    const enabled = (prevData.enabledContexts as string[] | undefined) ?? [];
    if (!enabled.includes("portal")) throw new Error("portal_context_required");

    const conflict = await ctx.db
      .query("partner")
      .withIndex("by_portal_key", (q) => q.eq("portal_key", portalKey))
      .unique();
    if (conflict && conflict.pid !== partner.pid) throw new Error("portal_key_taken");

    await ctx.db.patch(partner._id, {
      portal_key: portalKey,
      data: {
        ...prevData,
        portalGames,
      },
    });
    return { ok: true as const, portalKey, portalGames };
  },
});

