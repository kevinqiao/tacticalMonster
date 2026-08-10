import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { internalMutation, internalQuery } from "../../_generated/server";
import { authedMutation, authedQuery } from "../../custom/session";
import { getPartnerByPid, nextPartnerId } from "./partnerStaff";
import { isPlatformOperator } from "./platformOperator";
import { provisionWebStaffAccount } from "./ensureStaffIdentity";
import { DEFAULT_PLAYER_AUTH, DEFAULT_STAFF_AUTH } from "../auth/partnerAuth";
import {
  isFirstPartyPartnerId,
  PLATFORM_NAMESPACE_PARTNER_ID,
} from "../auth/platformUid";
import {
  getPlatformStaffRow,
  listPlatformStaffRows,
  requirePlatformStaff,
  type PlatformStaffRole,
} from "./platformStaff";
import { PARTNER_GAME_TYPES, readPartnerGames } from "./portalPartnerConfig";
import {
  readPartnerCapabilities,
  requirePartnerSlug,
  validatePartnerSlug,
  type PartnerCapabilities,
} from "./partnerCapabilities";
import { DEFAULT_NEW_PARTNER_LOBBY_OPS_MODE } from "./partnerLobbyOpsMode";

function dataWithoutEnabledContexts(data: Record<string, unknown>): Record<string, unknown> {
  const { enabledContexts: _drop, ...rest } = data;
  return rest;
}

/** Drop GC ops leftovers from partner.data (SoT is Portal). */
function stripLegacyGcOpsFromData(
  data: Record<string, unknown>
): Record<string, unknown> {
  const next = { ...data };
  for (const key of [
    "replay",
    "lobbyOpsMode",
    "quotaScope",
    "adEntryEnabled",
    "ticketEntryEnabled",
    "adReplayDailyCap",
    "maxReplaysPerMatch",
    "adReplayEnabled",
    "ticketReplayEnabled",
    "ticketReplayPriceTickets",
    "coinReplayEnabled",
    "coinReplayPriceCoins",
    "coinReplayDailyCap",
    "freePlaySoloDailyCap",
    "freePlayMultiDailyCap",
    "adEntrySoloDailyCap",
    "adEntryMultiDailyCap",
    "ticketEntrySoloPriceTickets",
    "ticketEntrySoloDailyCap",
    "ticketEntryMultiPriceTickets",
    "ticketEntryMultiDailyCap",
    "soloSuccessDailyEnabled",
    "soloSuccessDailyCap",
    "soloSuccessAfterCapMode",
    "soloSuccessAllowPlayAfterCap",
  ] as const) {
    delete next[key];
  }
  return next;
}

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

/** For actions that need platform-operator checks (no db on ActionCtx). */
export const assertPlatformOperatorInternal = internalQuery({
  args: { uid: v.string() },
  handler: async (ctx, { uid }) => {
    if (!(await isPlatformOperator(ctx, uid.trim()))) {
      return { ok: false as const, error: "forbidden" as const };
    }
    return { ok: true as const };
  },
});

/** Role-gated check for Node actions (viewer / admin / owner). */
export const assertPlatformStaffInternal = internalQuery({
  args: {
    uid: v.string(),
    minRole: platformStaffRoleValidator,
  },
  handler: async (ctx, { uid, minRole }) => {
    try {
      await requirePlatformStaff({ ...ctx, user: { uid: uid.trim() } }, minRole);
      return { ok: true as const };
    } catch {
      return { ok: false as const, error: "forbidden" as const };
    }
  },
});

export const listAllPartners = authedQuery({
  args: {},
  handler: async (ctx) => {
    await requirePlatformStaff(ctx, "viewer");
    const rows = await ctx.db.query("partner").collect();
    const mapped = rows.map((p) => {
      const capabilities = readPartnerCapabilities(p);
      return {
        pid: p.pid,
        name: p.name ?? `Partner ${p.pid}`,
        host: p.host ?? "",
        slug: p.slug ?? "",
        capabilities,
      };
    });
    // Always surface Default Partner (PID 0) even before a DB row exists.
    if (!mapped.some((p) => isFirstPartyPartnerId(p.pid))) {
      mapped.push({
        pid: PLATFORM_NAMESPACE_PARTNER_ID,
        name: "Default Partner",
        host: "",
        slug: "",
        capabilities: { portalGames: false, campaignOps: false },
      });
    }
    return mapped.sort((a, b) => a.pid - b.pid);
  },
});

export const createPartner = authedMutation({
  args: {
    name: v.string(),
    host: v.optional(v.string()),
    /** Explicit capability flags; default both false (strict). */
    portalGames: v.optional(v.boolean()),
    campaignOps: v.optional(v.boolean()),
    /** Required when campaignOps; public /campaign/{slug} segment. */
    slug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePlatformStaff(ctx, "admin");

    const capabilities: PartnerCapabilities = {
      portalGames: args.portalGames === true,
      campaignOps: args.campaignOps === true,
    };
    let slug: string | undefined;
    if (capabilities.campaignOps) {
      slug = validatePartnerSlug(args.slug);
      if (!slug) throw new Error("slug_required");
      const conflict = await ctx.db
        .query("partner")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique();
      if (conflict) throw new Error("slug_taken");
    }

    const pid = await nextPartnerId(ctx);
    await ctx.db.insert("partner", {
      pid,
      name: args.name.trim(),
      host: args.host?.trim() || undefined,
      playerAuth: DEFAULT_PLAYER_AUTH,
      staffAuth: DEFAULT_STAFF_AUTH,
      capabilities,
      ...(slug ? { slug } : {}),
    });
    // Seed Portal SoT (lobbyOps); do not store GC ops on SSO partner.gameCenter.
    await ctx.scheduler.runAfter(
      0,
      internal.service.bridge.portalGcOpsBridge.upsertPartnerGcOpsToPortal,
      { partnerId: pid, lobbyOpsMode: DEFAULT_NEW_PARTNER_LOBBY_OPS_MODE }
    );
    // No Campaign brand sync — slug→partnerId resolves only via SSO `partner.slug`.
    return { pid, capabilities, slug: slug ?? "" };
  },
});

/**
 * Platform-only: set portalGames / campaignOps (+ optional campaign slug).
 */
export const updatePartnerCapabilities = authedMutation({
  args: {
    partnerId: v.number(),
    portalGames: v.boolean(),
    campaignOps: v.boolean(),
    slug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePlatformStaff(ctx, "admin");
    const partner = await getPartnerByPid(ctx, args.partnerId);
    if (!partner) throw new Error("not_found");

    const capabilities: PartnerCapabilities = {
      portalGames: args.portalGames === true,
      campaignOps: args.campaignOps === true,
    };

    let slug: string | undefined = partner.slug;
    if (capabilities.campaignOps) {
      const nextSlug =
        args.slug !== undefined ? validatePartnerSlug(args.slug) : partner.slug;
      if (!nextSlug) throw new Error("slug_required");
      const conflict = await ctx.db
        .query("partner")
        .withIndex("by_slug", (q) => q.eq("slug", nextSlug))
        .unique();
      if (conflict && conflict.pid !== partner.pid) throw new Error("slug_taken");
      slug = nextSlug;
    } else if (args.slug !== undefined) {
      slug = validatePartnerSlug(args.slug);
    }

    const prevData = (partner.data ?? {}) as Record<string, unknown>;
    await ctx.db.patch(partner._id, {
      capabilities,
      slug,
      data: dataWithoutEnabledContexts(prevData),
    });
    // No Campaign brand sync — slug→partnerId resolves only via SSO `partner.slug`.
    return { ok: true as const, capabilities, slug: slug ?? "" };
  },
});

/** Deletes partner row and its partner_staff memberships. Does not purge auth_identities / users. */
export const deletePartner = authedMutation({
  args: { pid: v.number() },
  handler: async (ctx, { pid }) => {
    await requirePlatformStaff(ctx, "admin");

    // pid 0 = platform namespace / synthetic "Default Partner" â€” never delete.
    if (isFirstPartyPartnerId(pid)) {
      throw new Error("default_partner_protected");
    }

    const partner = await ctx.db
      .query("partner")
      .withIndex("by_pid", (q) => q.eq("pid", pid))
      .unique();
    if (!partner) throw new Error("not_found");

    const staffRows = await ctx.db
      .query("partner_staff")
      .withIndex("by_partner", (q) => q.eq("partnerId", pid))
      .collect();
    for (const row of staffRows) {
      await ctx.db.delete(row._id);
    }

    await ctx.db.delete(partner._id);
    return { ok: true as const, pid, removedStaff: staffRows.length };
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

/**
 * SSO identity slice for platform admin (slug / capabilities).
 * GC ops SoT lives on Portal — see platformPartnerGcOpsAdmin actions.
 * Games = static catalog (full open).
 */
export const getPartnerPortalIdentityInternal = internalQuery({
  args: { partnerId: v.number() },
  handler: async (ctx, { partnerId }) => {
    const partner = await getPartnerByPid(ctx, partnerId);
    const isFirstParty = isFirstPartyPartnerId(partnerId);
    if (!partner && !isFirstParty) return null;
    const games = readPartnerGames();
    const partnerSlug =
      typeof partner?.slug === "string" && partner.slug.trim()
        ? partner.slug.trim().toLowerCase()
        : "";
    const lobbyUrl = partnerSlug ? `/gc/${partnerSlug}` : "/gc";
    return {
      partnerId,
      partnerSlug,
      games,
      isFirstParty,
      capabilities: readPartnerCapabilities(partner),
      lobbyUrl,
      launchUrls: [lobbyUrl],
      registryGames: [...PARTNER_GAME_TYPES],
    };
  },
});

/** Patch SSO partner identity (slug / capabilities). GC ops live on Portal. */
export const patchPartnerPortalIdentityInternal = internalMutation({
  args: {
    partnerId: v.number(),
    partnerSlug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const isFirstParty = isFirstPartyPartnerId(args.partnerId);
    let partner = await getPartnerByPid(ctx, args.partnerId);

    if (!partner) {
      if (!isFirstParty) throw new Error("not_found");
      const bootstrapCaps: PartnerCapabilities = {
        portalGames: true,
        campaignOps: false,
      };
      await ctx.db.insert("partner", {
        pid: PLATFORM_NAMESPACE_PARTNER_ID,
        name: "Default Partner",
        playerAuth: DEFAULT_PLAYER_AUTH,
        staffAuth: DEFAULT_STAFF_AUTH,
        capabilities: bootstrapCaps,
      });
      partner = await getPartnerByPid(ctx, args.partnerId);
      if (!partner) throw new Error("not_found");
    }

    const partnerSlug = isFirstParty
      ? validatePartnerSlug(args.partnerSlug ?? partner.slug ?? "")
      : requirePartnerSlug(args.partnerSlug ?? partner.slug ?? "");

    if (partnerSlug) {
      const conflict = await ctx.db
        .query("partner")
        .withIndex("by_slug", (q) => q.eq("slug", partnerSlug))
        .unique();
      if (conflict && conflict.pid !== partner.pid) throw new Error("slug_taken");
    }

    const capabilities: PartnerCapabilities = {
      ...readPartnerCapabilities(partner),
      portalGames: true,
    };

    const prevData = (partner.data ?? {}) as Record<string, unknown>;
    const cleaned = stripLegacyGcOpsFromData(dataWithoutEnabledContexts(prevData));

    await ctx.db.patch(partner._id, {
      slug: partnerSlug,
      capabilities,
      data: Object.keys(cleaned).length > 0 ? cleaned : undefined,
    });
    return {
      ok: true as const,
      partnerSlug: partnerSlug ?? "",
      games: readPartnerGames(),
      capabilities,
    };
  },
});
