import { internalMutation, internalQuery, query } from "../../_generated/server";
import type { QueryCtx } from "../../_generated/server";
import { v } from "convex/values";

import { authedMutation, authedQuery } from "../../custom/session";
import { findIdentityByUid } from "../../dao/authIdentityHelpers";
import {
  getPartnerByPid,
  getPartnerStaffRow,
  requirePartnerStaff,
  type PartnerRole,
} from "./partnerStaff";
import {
  playerAuthValidator,
  resolvePlayerAuth,
  resolveStaffAuth,
  sanitizePlayerAuth,
  sanitizeStaffAuth,
  staffAuthValidator,
} from "../auth/partnerAuth";
import { isPlatformOperator } from "./platformOperator";
import { provisionWebStaffAccount } from "./ensureStaffIdentity";
import {
  PARTNER_GAME_LABELS,
  readPartnerGames,
} from "./portalPartnerConfig";
import {
  partnerHasCampaignOps,
  readPartnerCapabilities,
} from "./partnerCapabilities";

const ROLE_RANK: Record<PartnerRole, number> = {
  viewer: 1,
  developer: 2,
  admin: 3,
  owner: 4,
};

async function requirePartnerAdmin(
  ctx: { user: { uid: string } } & Parameters<typeof requirePartnerStaff>[0],
  partnerId: number,
  minRole: PartnerRole
) {
  if (await isPlatformOperator(ctx, ctx.user.uid)) return;
  await requirePartnerStaff(ctx, partnerId, minRole);
}

const partnerRoleValidator = v.union(
  v.literal("owner"),
  v.literal("admin"),
  v.literal("developer"),
  v.literal("viewer")
);

async function loadPartnerView(ctx: QueryCtx, partnerId: number) {
  const partner = await getPartnerByPid(ctx, partnerId);
  if (!partner) return null;

  const capabilities = readPartnerCapabilities(partner);
  const playerAuth = resolvePlayerAuth(partner);
  const staffAuth = resolveStaffAuth(partner);

  return {
    pid: partner.pid,
    name: partner.name ?? "",
    host: partner.host ?? "",
    slug: partner.slug ?? "",
    capabilities,
    playerAuth,
    staffAuth,
    data: (partner.data ?? {}) as {
      allowedOrigins?: string[];
      defaultLandingPath?: string;
      branding?: { logoUrl?: string; primaryColor?: string };
    },
  };
}

export const listMyPartners = authedQuery({
  args: {},
  handler: async (ctx) => {
    const uid = ctx.user.uid;
    const staffByPartner = new Map<
      number,
      { partnerId: number; uid: string; role: string; createdAt: number }
    >();

    const addStaff = (staff: {
      partnerId: number;
      uid: string;
      role: string;
      createdAt: number;
    }) => {
      if (!staffByPartner.has(staff.partnerId)) {
        staffByPartner.set(staff.partnerId, staff);
      }
    };

    for (const staff of await ctx.db
      .query("partner_staff")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .collect()) {
      addStaff(staff);
    }

    // Same web accountId may have partner_staff under another namespaced uid
    // (legacy bootstrap / dual platform+partner identities).
    const identity = await findIdentityByUid(ctx, uid);
    if (identity?.provider === "web" && identity.subject) {
      const siblingIdentities = await ctx.db
        .query("auth_identities")
        .withIndex("by_provider_subject", (q) =>
          q.eq("provider", "web").eq("subject", identity.subject)
        )
        .collect();
      for (const sib of siblingIdentities) {
        if (!sib.uid || sib.uid === uid) continue;
        for (const staff of await ctx.db
          .query("partner_staff")
          .withIndex("by_uid", (q) => q.eq("uid", sib.uid))
          .collect()) {
          addStaff(staff);
        }
      }
    }

    const out = [];
    for (const staff of staffByPartner.values()) {
      const partner = await getPartnerByPid(ctx, staff.partnerId);
      if (!partner) continue;
      out.push({
        pid: partner.pid,
        name: partner.name ?? `Partner ${partner.pid}`,
        host: partner.host ?? "",
        slug: partner.slug ?? "",
        capabilities: readPartnerCapabilities(partner),
        role: staff.role as PartnerRole,
      });
    }
    return out.sort((a, b) => a.pid - b.pid);
  },
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
    defaultLandingPath: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    primaryColor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePartnerAdmin(ctx, args.partnerId, "admin");
    const partner = await getPartnerByPid(ctx, args.partnerId);
    if (!partner) throw new Error("not_found");

    const prevData = (partner.data ?? {}) as Record<string, unknown>;
    const { enabledContexts: _drop, ...dataRest } = prevData;
    const branding = {
      ...((dataRest.branding as object) ?? {}),
      ...(args.logoUrl !== undefined ? { logoUrl: args.logoUrl.trim() || undefined } : {}),
      ...(args.primaryColor !== undefined
        ? { primaryColor: args.primaryColor.trim() || undefined }
        : {}),
    };

    await ctx.db.patch(partner._id, {
      name: args.name.trim(),
      host: args.host?.trim() || undefined,
      data: {
        ...dataRest,
        ...(args.allowedOrigins !== undefined
          ? {
              allowedOrigins: args.allowedOrigins
                .map((s) => s.trim())
                .filter(Boolean),
            }
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

export const updatePartnerPlayerAuth = authedMutation({
  args: {
    partnerId: v.number(),
    playerAuth: playerAuthValidator,
  },
  handler: async (ctx, { partnerId, playerAuth }) => {
    await requirePartnerAdmin(ctx, partnerId, "admin");
    const partner = await getPartnerByPid(ctx, partnerId);
    if (!partner) throw new Error("not_found");

    const next = sanitizePlayerAuth(playerAuth, partner.data);
    await ctx.db.patch(partner._id, { playerAuth: next });
    return { ok: true as const, playerAuth: next };
  },
});

export const updatePartnerStaffAuth = authedMutation({
  args: {
    partnerId: v.number(),
    staffAuth: staffAuthValidator,
  },
  handler: async (ctx, { partnerId, staffAuth }) => {
    await requirePartnerAdmin(ctx, partnerId, "admin");
    const partner = await getPartnerByPid(ctx, partnerId);
    if (!partner) throw new Error("not_found");

    const next = sanitizeStaffAuth(staffAuth);
    await ctx.db.patch(partner._id, { staffAuth: next });
    return { ok: true as const, staffAuth: next };
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

/** Partner-enabled games for portal + merchant campaign pickers (public allowlist). */
export const getPartnerGames = query({
  args: { partnerId: v.number() },
  handler: async (ctx, { partnerId }) => {
    const partner = await getPartnerByPid(ctx, partnerId);
    if (!partner && partnerId !== 0) return null;
    const games = readPartnerGames(partner ?? { games: undefined });
    return {
      partnerId,
      games,
      options: games.map((gameType) => ({
        value: gameType,
        label: PARTNER_GAME_LABELS[gameType] ?? gameType,
      })),
    };
  },
});

/**
 * merchantCampaign bridge: verify uid is partner_staff with campaignOps.
 * Used by HTTP POST /internal/assert-partner-staff.
 */
export const assertPartnerStaffInternal = internalQuery({
  args: {
    partnerId: v.number(),
    uid: v.string(),
    minRole: v.optional(
      v.union(
        v.literal("owner"),
        v.literal("admin"),
        v.literal("developer"),
        v.literal("viewer")
      )
    ),
  },
  handler: async (ctx, { partnerId, uid, minRole }) => {
    const partner = await getPartnerByPid(ctx, partnerId);
    if (!partner) return { ok: false as const, error: "not_found" };
    if (!partnerHasCampaignOps(partner)) {
      return { ok: false as const, error: "campaign_ops_disabled", hasCampaignOps: false as const };
    }
    const row = await getPartnerStaffRow(ctx, partnerId, uid.trim());
    const required = (minRole ?? "viewer") as PartnerRole;
    if (!row || ROLE_RANK[row.role as PartnerRole] < ROLE_RANK[required]) {
      return { ok: false as const, error: "forbidden", hasCampaignOps: true as const };
    }
    return {
      ok: true as const,
      hasCampaignOps: true as const,
      partnerId,
      role: row.role as PartnerRole,
      slug: partner.slug ?? "",
    };
  },
});

/** Authorization predicate for Portal voucher fulfillment (not campaignOps-gated). */
export const assertPartnerVoucherAdminInternal = internalQuery({
  args: {
    partnerId: v.number(),
    uid: v.string(),
    minRole: v.optional(partnerRoleValidator),
  },
  handler: async (ctx, { partnerId, uid, minRole }) => {
    const partner = await getPartnerByPid(ctx, partnerId);
    if (!partner) return { ok: false as const, error: "not_found" as const };
    if (await isPlatformOperator(ctx, uid)) {
      return { ok: true as const, partnerId, role: "owner" as const };
    }
    const row = await getPartnerStaffRow(ctx, partnerId, uid.trim());
    const required = minRole ?? "viewer";
    if (!row || ROLE_RANK[row.role as PartnerRole] < ROLE_RANK[required]) {
      return { ok: false as const, error: "forbidden" as const };
    }
    return { ok: true as const, partnerId, role: row.role as PartnerRole };
  },
});

