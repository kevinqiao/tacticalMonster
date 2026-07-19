import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { internalMutation } from "../../_generated/server";
import { authedMutation, authedQuery } from "../../custom/session";
import { getPartnerByPid, nextPartnerId } from "./partnerStaff";
import { isPlatformOperator } from "./platformOperator";
import { provisionWebStaffAccount } from "./ensureStaffIdentity";
import { CLERK_AUTH_CHANNEL_CID, WEB_AUTH_CHANNEL_CID } from "../auth/authChannelCatalog";
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
import {
  PARTNER_GAME_TYPES,
  readPartnerGames,
  sanitizePartnerGames,
  validatePortalKey,
} from "./portalPartnerConfig";
import {
  readPartnerCapabilities,
  validatePartnerSlug,
  type PartnerCapabilities,
} from "./partnerCapabilities";
import {
  applyAdReplayDailyCapToPartnerData,
  DEFAULT_AD_REPLAY_DAILY_CAP,
  effectiveAdReplayDailyCap,
  readAdReplayDailyCapFromPartnerData,
  sanitizeAdReplayDailyCapInput,
} from "./partnerAdReplayConfig";

function dataWithoutEnabledContexts(data: Record<string, unknown>): Record<string, unknown> {
  const { enabledContexts: _drop, ...rest } = data;
  return rest;
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
      auth_channels: [CLERK_AUTH_CHANNEL_CID],
      staff_auth_channels: [WEB_AUTH_CHANNEL_CID],
      capabilities,
      ...(slug ? { slug } : {}),
    });
    if (slug) {
      await ctx.scheduler.runAfter(
        0,
        internal.service.partner.platformAdminBrandSync.syncPartnerBrandSlug,
        { partnerId: pid, slug }
      );
    }
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
    if (capabilities.campaignOps && slug) {
      await ctx.scheduler.runAfter(
        0,
        internal.service.partner.platformAdminBrandSync.syncPartnerBrandSlug,
        { partnerId: args.partnerId, slug }
      );
    }
    return { ok: true as const, capabilities, slug: slug ?? "" };
  },
});

/** Deletes partner row and its partner_staff memberships. Does not purge auth_identities / users. */
export const deletePartner = authedMutation({
  args: { pid: v.number() },
  handler: async (ctx, { pid }) => {
    await requirePlatformStaff(ctx, "admin");

    // pid 0 = platform namespace / synthetic "Default Partner" — never delete.
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

/** Platform-only: read partner portal_key + games activation. */
export const getPartnerPortalConfig = authedQuery({
  args: { partnerId: v.number() },
  handler: async (ctx, { partnerId }) => {
    await requirePlatformStaff(ctx, "viewer");
    const partner = await getPartnerByPid(ctx, partnerId);
    const isFirstParty = isFirstPartyPartnerId(partnerId);
    // PID 0 may be synthetic (no row yet) — still allow configuring games.
    if (!partner && !isFirstParty) return null;
    const games = readPartnerGames(partner ?? { games: undefined });
    const key = partner?.portal_key ?? "";
    const data =
      partner?.data && typeof partner.data === "object"
        ? (partner.data as Record<string, unknown>)
        : null;
    const adReplayOverride = readAdReplayDailyCapFromPartnerData(data);
    return {
      partnerId,
      portalKey: key,
      games,
      isFirstParty,
      launchUrls: games.map((gameType) =>
        isFirstParty || !key ? "/portal/" + gameType : "/portal/" + key + "/" + gameType
      ),
      registryGames: [...PARTNER_GAME_TYPES],
      adReplayDailyCap: adReplayOverride,
      adReplayDailyCapEffective: effectiveAdReplayDailyCap(data),
      adReplayDailyCapDefault: DEFAULT_AD_REPLAY_DAILY_CAP,
    };
  },
});

/**
 * Platform-only: activate portal_key + games for a partner.
 * Partner staff cannot self-activate games.
 * PID 0 (first-party) does not require portal_key — URLs are /portal/{gameType}.
 *
 * Optional `adReplayDailyCap`: omit = leave unchanged; null = clear override (default 5).
 */
export const updatePartnerPortalConfig = authedMutation({
  args: {
    partnerId: v.number(),
    /** Omit / empty for first-party (PID 0). Required for other partners. */
    portalKey: v.optional(v.string()),
    games: v.array(v.string()),
    adReplayDailyCap: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, args) => {
    await requirePlatformStaff(ctx, "admin");
    const isFirstParty = isFirstPartyPartnerId(args.partnerId);
    let partner = await getPartnerByPid(ctx, args.partnerId);

    if (!partner) {
      if (!isFirstParty) throw new Error("not_found");
      // Ensure Default Partner row exists so games can be persisted.
      const bootstrapCaps: PartnerCapabilities = { portalGames: true, campaignOps: false };
      await ctx.db.insert("partner", {
        pid: PLATFORM_NAMESPACE_PARTNER_ID,
        name: "Default Partner",
        auth_channels: [CLERK_AUTH_CHANNEL_CID],
        staff_auth_channels: [WEB_AUTH_CHANNEL_CID],
        capabilities: bootstrapCaps,
      });
      partner = await getPartnerByPid(ctx, args.partnerId);
      if (!partner) throw new Error("not_found");
    }

    let portalKey: string | undefined;
    if (isFirstParty) {
      // First-party uses /portal/{gameType}; never validate or write portal_key.
      portalKey = undefined;
    } else {
      portalKey = validatePortalKey(args.portalKey ?? "");
    }

    const games = sanitizePartnerGames(args.games);
    const prevData = dataWithoutEnabledContexts(
      (partner.data ?? {}) as Record<string, unknown>
    );
    const capInput = sanitizeAdReplayDailyCapInput(args.adReplayDailyCap);
    const nextData = applyAdReplayDailyCapToPartnerData(prevData, capInput);
    // Activating portal config implies portalGames capability.
    const capabilities: PartnerCapabilities = {
      ...readPartnerCapabilities(partner),
      portalGames: true,
    };

    if (portalKey) {
      const conflict = await ctx.db
        .query("partner")
        .withIndex("by_portal_key", (q) => q.eq("portal_key", portalKey))
        .unique();
      if (conflict && conflict.pid !== partner.pid) throw new Error("portal_key_taken");
    }

    await ctx.db.patch(partner._id, {
      ...(isFirstParty ? {} : { portal_key: portalKey }),
      games,
      capabilities,
      data: nextData,
    });

    const effectiveCap = effectiveAdReplayDailyCap(nextData);
    await ctx.scheduler.runAfter(
      0,
      internal.service.bridge.portalAdReplayCapPush.pushPartnerAdReplayCapToPortal,
      { partnerId: args.partnerId, adReplayDailyCap: effectiveCap }
    );

    return {
      ok: true as const,
      portalKey: isFirstParty ? "" : (portalKey as string),
      games,
      capabilities,
      adReplayDailyCap: readAdReplayDailyCapFromPartnerData(nextData),
      adReplayDailyCapEffective: effectiveCap,
    };
  },
});
