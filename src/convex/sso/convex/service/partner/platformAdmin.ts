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
import {
  PARTNER_GAME_TYPES,
  readPartnerGames,
  sanitizePartnerGames,
} from "./portalPartnerConfig";
import {
  readPartnerCapabilities,
  requirePartnerSlug,
  validatePartnerSlug,
  type PartnerCapabilities,
} from "./partnerCapabilities";
import {
  applyPartnerReplayPartialToPartnerData,
  DEFAULT_MAX_REPLAYS_PER_MATCH,
  effectiveAdReplayDailyCap,
  effectivePartnerReplaySettings,
  readAdReplayDailyCapFromPartnerData,
  sanitizeAdReplayDailyCapInput,
  sanitizeMaxReplaysPerMatchInput,
  sanitizeTicketReplayPriceInput,
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

/** Sync partner.games from Lobby-derived game types (allowlist for campaign/gates). */
export const syncPartnerGamesFromLobbiesInternal = internalMutation({
  args: {
    partnerId: v.number(),
    games: v.array(v.string()),
  },
  handler: async (ctx, { partnerId, games }) => {
    const partner = await getPartnerByPid(ctx, partnerId);
    if (!partner) throw new Error("not_found");
    // Empty derived set: keep existing games (sanitizePartnerGames rejects []).
    if (games.length === 0) {
      return { ok: true as const, games: readPartnerGames(partner), skipped: true as const };
    }
    const sanitized = sanitizePartnerGames(games);
    const capabilities: PartnerCapabilities = {
      ...readPartnerCapabilities(partner),
      portalGames: true,
    };
    await ctx.db.patch(partner._id, { games: sanitized, capabilities });
    return { ok: true as const, games: sanitized, skipped: false as const };
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

/** Platform-only: read partner slug (partnerSlug) + games activation. */
export const getPartnerPortalConfig = authedQuery({
  args: { partnerId: v.number() },
  handler: async (ctx, { partnerId }) => {
    await requirePlatformStaff(ctx, "viewer");
    const partner = await getPartnerByPid(ctx, partnerId);
    const isFirstParty = isFirstPartyPartnerId(partnerId);
    // PID 0 may be synthetic (no row yet) — still allow configuring games.
    if (!partner && !isFirstParty) return null;
    const games = readPartnerGames(partner ?? { games: undefined });
    const partnerSlug =
      (typeof partner?.slug === "string" && partner.slug.trim()
        ? partner.slug.trim().toLowerCase()
        : "") ||
      (typeof partner?.portal_key === "string" && partner.portal_key.trim()
        ? partner.portal_key.trim().toLowerCase()
        : "");
    const data =
      partner?.data && typeof partner.data === "object"
        ? (partner.data as Record<string, unknown>)
        : null;
    const adReplayOverride = readAdReplayDailyCapFromPartnerData(data);
    const replay = effectivePartnerReplaySettings(data);
    const replayBag =
      data?.replay && typeof data.replay === "object"
        ? (data.replay as Record<string, unknown>)
        : null;
    return {
      partnerId,
      partnerSlug,
      /** @deprecated Use partnerSlug */
      portalKey: partnerSlug,
      games,
      isFirstParty,
      lobbyUrl: isFirstParty || !partnerSlug ? "/gc" : "/gc/" + partnerSlug,
      launchUrls: games.map((gameType) =>
        isFirstParty || !partnerSlug
          ? "/gc/" + gameType
          : "/gc/" + partnerSlug + "/" + gameType
      ),
      registryGames: [...PARTNER_GAME_TYPES],
      adReplayDailyCap: adReplayOverride,
      adReplayDailyCapEffective: effectiveAdReplayDailyCap(data),
      /** null = unlimited (UI); numeric only for finite platform default docs. */
      adReplayDailyCapDefault: null as number | null,
      maxReplaysPerMatch:
        typeof replayBag?.maxReplaysPerMatch === "number"
          ? replayBag.maxReplaysPerMatch
          : null,
      maxReplaysPerMatchEffective: replay.maxReplaysPerMatch,
      maxReplaysPerMatchDefault: DEFAULT_MAX_REPLAYS_PER_MATCH,
      adReplayEnabled: replay.adReplayEnabled,
      ticketReplayEnabled: replay.ticketReplayEnabled,
      ticketReplayPriceTickets:
        typeof replayBag?.ticketReplayPriceTickets === "number"
          ? replayBag.ticketReplayPriceTickets
          : null,
      ticketReplayPriceTicketsEffective: replay.ticketReplayPriceTickets,
      freePlaySoloDailyCap: data?.freePlaySoloDailyCap ?? null,
      freePlayMultiDailyCap: data?.freePlayMultiDailyCap ?? null,
      quotaScope:
        data?.quotaScope === "mode" ||
        data?.quotaScope === "lobby" ||
        data?.quotaScope === "tournament"
          ? data.quotaScope
          : null,
      adEntryEnabled:
        typeof data?.adEntryEnabled === "boolean" ? data.adEntryEnabled : null,
      adEntrySoloDailyCap: data?.adEntrySoloDailyCap ?? null,
      adEntryMultiDailyCap: data?.adEntryMultiDailyCap ?? null,
      ticketEntryEnabled:
        typeof data?.ticketEntryEnabled === "boolean" ? data.ticketEntryEnabled : null,
      ticketEntrySoloPriceTickets: data?.ticketEntrySoloPriceTickets ?? null,
      ticketEntrySoloDailyCap: data?.ticketEntrySoloDailyCap ?? null,
      ticketEntryMultiPriceTickets: data?.ticketEntryMultiPriceTickets ?? null,
      ticketEntryMultiDailyCap: data?.ticketEntryMultiDailyCap ?? null,
    };
  },
});

/**
 * Platform-only: Partner base settings for Game Lobby (slug + economy/replay).
 * Enabled games are derived from Lobby offerings (see platformPartnerLobbyAdmin sync).
 * PID 0 (first-party) does not require partnerSlug — URLs are /gc/{gameType}.
 *
 * Optional `adReplayDailyCap`: omit = leave unchanged; null = clear override (default unlimited).
 * Optional `games`: omit = keep existing partner.games.
 */
export const updatePartnerPortalConfig = authedMutation({
  args: {
    partnerId: v.number(),
    /** Omit / empty for first-party (PID 0). Required for other partners. */
    partnerSlug: v.optional(v.string()),
    /** @deprecated Prefer partnerSlug */
    portalKey: v.optional(v.string()),
    /** Optional; omit to leave partner.games unchanged (Lobby-derived). */
    games: v.optional(v.array(v.string())),
    adReplayDailyCap: v.optional(v.union(v.number(), v.null())),
    maxReplaysPerMatch: v.optional(v.union(v.number(), v.null())),
    adReplayEnabled: v.optional(v.boolean()),
    ticketReplayEnabled: v.optional(v.boolean()),
    ticketReplayPriceTickets: v.optional(v.union(v.number(), v.null())),
    freePlaySoloDailyCap: v.optional(v.union(v.number(), v.null())),
    freePlayMultiDailyCap: v.optional(v.union(v.number(), v.null())),
    /** mode | lobby | tournament; null clears to default (mode). */
    quotaScope: v.optional(
      v.union(
        v.literal("mode"),
        v.literal("lobby"),
        v.literal("tournament"),
        v.null()
      )
    ),
    adEntryEnabled: v.optional(v.union(v.boolean(), v.null())),
    adEntrySoloDailyCap: v.optional(v.union(v.number(), v.null())),
    adEntryMultiDailyCap: v.optional(v.union(v.number(), v.null())),
    ticketEntryEnabled: v.optional(v.union(v.boolean(), v.null())),
    ticketEntrySoloPriceTickets: v.optional(v.union(v.number(), v.null())),
    ticketEntrySoloDailyCap: v.optional(v.union(v.number(), v.null())),
    ticketEntryMultiPriceTickets: v.optional(v.union(v.number(), v.null())),
    ticketEntryMultiDailyCap: v.optional(v.union(v.number(), v.null())),
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
        playerAuth: DEFAULT_PLAYER_AUTH,
        staffAuth: DEFAULT_STAFF_AUTH,
        capabilities: bootstrapCaps,
      });
      partner = await getPartnerByPid(ctx, args.partnerId);
      if (!partner) throw new Error("not_found");
    }

    let partnerSlug: string | undefined;
    if (isFirstParty) {
      // First-party uses /gc/{gameType}; never require partnerSlug.
      partnerSlug = undefined;
    } else {
      partnerSlug = requirePartnerSlug(args.partnerSlug ?? args.portalKey ?? "");
    }

    const games =
      args.games !== undefined
        ? sanitizePartnerGames(args.games)
        : readPartnerGames(partner);
    const prevData = dataWithoutEnabledContexts(
      (partner.data ?? {}) as Record<string, unknown>
    );
    const capInput = sanitizeAdReplayDailyCapInput(args.adReplayDailyCap);
    const maxReplaysInput = sanitizeMaxReplaysPerMatchInput(args.maxReplaysPerMatch);
    const ticketPriceInput = sanitizeTicketReplayPriceInput(args.ticketReplayPriceTickets);
    let nextData = applyPartnerReplayPartialToPartnerData(prevData, {
      adReplayDailyCap: capInput,
      maxReplaysPerMatch: maxReplaysInput,
      ...(args.adReplayEnabled !== undefined
        ? { adReplayEnabled: args.adReplayEnabled }
        : {}),
      ...(args.ticketReplayEnabled !== undefined
        ? { ticketReplayEnabled: args.ticketReplayEnabled }
        : {}),
      ticketReplayPriceTickets: ticketPriceInput,
    });
    if (args.adEntryEnabled !== undefined) {
      if (args.adEntryEnabled === null) delete nextData.adEntryEnabled;
      else nextData.adEntryEnabled = args.adEntryEnabled;
    }
    if (args.ticketEntryEnabled !== undefined) {
      if (args.ticketEntryEnabled === null) delete nextData.ticketEntryEnabled;
      else nextData.ticketEntryEnabled = args.ticketEntryEnabled;
    }
    if (args.quotaScope !== undefined) {
      if (args.quotaScope === null) delete nextData.quotaScope;
      else if (
        args.quotaScope === "mode" ||
        args.quotaScope === "lobby" ||
        args.quotaScope === "tournament"
      ) {
        nextData.quotaScope = args.quotaScope;
      } else {
        throw new Error("play_entry_setting_invalid");
      }
    }
    for (const key of [
      "freePlaySoloDailyCap", "freePlayMultiDailyCap",
      "adEntrySoloDailyCap", "adEntryMultiDailyCap",
      "ticketEntrySoloPriceTickets", "ticketEntrySoloDailyCap",
      "ticketEntryMultiPriceTickets", "ticketEntryMultiDailyCap",
    ] as const) {
      const value = args[key];
      if (value === undefined) continue;
      const max = key.includes("Price") ? 100 : 100;
      if (value !== null && (!Number.isInteger(value) || value < 0 || value > max ||
        (key.includes("Price") && value < 1))) throw new Error("play_entry_setting_invalid");
      if (value === null) delete nextData[key];
      else nextData[key] = value;
    }
    // Activating portal config implies portalGames capability.
    const capabilities: PartnerCapabilities = {
      ...readPartnerCapabilities(partner),
      portalGames: true,
    };

    if (partnerSlug) {
      const conflict = await ctx.db
        .query("partner")
        .withIndex("by_slug", (q) => q.eq("slug", partnerSlug))
        .unique();
      if (conflict && conflict.pid !== partner.pid) throw new Error("slug_taken");
      const legacyConflict = await ctx.db
        .query("partner")
        .withIndex("by_portal_key", (q) => q.eq("portal_key", partnerSlug))
        .unique();
      if (
        legacyConflict &&
        legacyConflict.pid !== partner.pid &&
        (legacyConflict.slug == null || legacyConflict.slug === "")
      ) {
        throw new Error("slug_taken");
      }
    }

    await ctx.db.patch(partner._id, {
      ...(isFirstParty ? {} : { slug: partnerSlug }),
      games,
      capabilities,
      data: nextData,
    });

    const effectiveReplay = effectivePartnerReplaySettings(nextData);
    await ctx.scheduler.runAfter(
      0,
      internal.service.bridge.portalAdReplayCapPush.pushPartnerAdReplayCapToPortal,
      {
        partnerId: args.partnerId,
        adReplayDailyCap: effectiveReplay.adReplayDailyCap,
        maxReplaysPerMatch: effectiveReplay.maxReplaysPerMatch,
        adReplayEnabled: effectiveReplay.adReplayEnabled,
        ticketReplayEnabled: effectiveReplay.ticketReplayEnabled,
        ticketReplayPriceTickets: effectiveReplay.ticketReplayPriceTickets,
        coinReplayEnabled: effectiveReplay.coinReplayEnabled,
        coinReplayPriceCoins: effectiveReplay.coinReplayPriceCoins,
        coinReplayDailyCap: effectiveReplay.coinReplayDailyCap,
      }
    );
    await ctx.scheduler.runAfter(
      0,
      internal.service.bridge.portalAdReplayCapPush.pushPartnerPlayEntrySettingsToPortal,
      {
        partnerId: args.partnerId,
        ...(args.quotaScope === null
          ? { quotaScope: null }
          : nextData.quotaScope === "mode" ||
              nextData.quotaScope === "lobby" ||
              nextData.quotaScope === "tournament"
            ? { quotaScope: nextData.quotaScope as "mode" | "lobby" | "tournament" }
            : {}),
        ...(typeof nextData.freePlaySoloDailyCap === "number" ? { freePlaySoloDailyCap: nextData.freePlaySoloDailyCap } : {}),
        ...(typeof nextData.freePlayMultiDailyCap === "number" ? { freePlayMultiDailyCap: nextData.freePlayMultiDailyCap } : {}),
        ...(typeof nextData.adEntryEnabled === "boolean" ? { adEntryEnabled: nextData.adEntryEnabled } : {}),
        ...(typeof nextData.adEntrySoloDailyCap === "number" ? { adEntrySoloDailyCap: nextData.adEntrySoloDailyCap } : {}),
        ...(typeof nextData.adEntryMultiDailyCap === "number" ? { adEntryMultiDailyCap: nextData.adEntryMultiDailyCap } : {}),
        ...(typeof nextData.ticketEntryEnabled === "boolean" ? { ticketEntryEnabled: nextData.ticketEntryEnabled } : {}),
        ...(typeof nextData.ticketEntrySoloPriceTickets === "number" ? { ticketEntrySoloPriceTickets: nextData.ticketEntrySoloPriceTickets } : {}),
        ...(typeof nextData.ticketEntrySoloDailyCap === "number" ? { ticketEntrySoloDailyCap: nextData.ticketEntrySoloDailyCap } : {}),
        ...(typeof nextData.ticketEntryMultiPriceTickets === "number" ? { ticketEntryMultiPriceTickets: nextData.ticketEntryMultiPriceTickets } : {}),
        ...(typeof nextData.ticketEntryMultiDailyCap === "number" ? { ticketEntryMultiDailyCap: nextData.ticketEntryMultiDailyCap } : {}),
      }
    );

    return {
      ok: true as const,
      partnerSlug: isFirstParty ? "" : (partnerSlug as string),
      /** @deprecated Use partnerSlug */
      portalKey: isFirstParty ? "" : (partnerSlug as string),
      games,
      capabilities,
      adReplayDailyCap: readAdReplayDailyCapFromPartnerData(nextData),
      adReplayDailyCapEffective: effectiveReplay.adReplayDailyCap,
      maxReplaysPerMatchEffective: effectiveReplay.maxReplaysPerMatch,
    };
  },
});
