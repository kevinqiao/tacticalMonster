import { v } from "convex/values";

import {
  DEFAULT_LOBBY_SLUG,
  defaultOfferingsForGames,
  deriveGamesFromOfferings,
  enabledOfferings,
  offeringsByMode,
  resolveLobbyBranding,
  validateLobbySlug,
  type PortalLobbyOffering,
} from "../../data/portalLobbyConfig";
import {
  normalizePortalQuotaScope,
  type PortalQuotaScope,
} from "../../data/portalQuotaScope";
import {
  isValidPortalWeekKey,
  portalNextSeasonStartWeekKey,
} from "../../data/portalSeasonHonorConfig";
import { getPortalTournamentDefinition } from "../../data/portalTournamentConfigs";
import { weeklyPeriodKey } from "../../utils/casualTaskPeriod";
import { internalMutation, internalQuery, mutation, query } from "../../_generated/server";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { readPartnerSeasonEpochWeekKey } from "../season/resolvePortalSeasonHonor";

const seasonHonorModeValidator = v.optional(
  v.union(v.literal("join_now"), v.literal("next_season"), v.null())
);

const quotaScopeValidator = v.optional(
  v.union(
    v.literal("mode"),
    v.literal("lobby"),
    v.literal("tournament"),
    v.null()
  )
);

const offeringValidator = v.object({
  tournamentId: v.string(),
  sortOrder: v.number(),
  titleOverride: v.optional(v.string()),
  rewardsOverride: v.optional(
    v.object({
      soloPoints: v.optional(
        v.union(
          v.object({
            success: v.number(),
            fail: v.number(),
            clearBonus: v.optional(v.number()),
          }),
          v.object({
            fail: v.number(),
            ritual_a: v.object({ clear: v.number(), bonus: v.number() }),
            transition_b: v.object({ clear: v.number(), bonus: v.number() }),
            merged_c: v.object({ p75: v.number(), p90: v.number() }),
          })
        )
      ),
      rankPoints: v.optional(v.record(v.string(), v.number())),
      coins: v.optional(
        v.object({
          soloSuccess: v.optional(v.number()),
          soloFail: v.optional(v.number()),
          rankCoins: v.optional(v.record(v.string(), v.number())),
        })
      ),
    })
  ),
  enabled: v.optional(v.boolean()),
  unlockSeasonLevel: v.optional(v.number()),
});

const brandingValidator = v.object({
  logoUrl: v.optional(v.string()),
  backgroundLandscapeUrl: v.optional(v.string()),
  backgroundPortraitUrl: v.optional(v.string()),
});

async function listLobbiesForPartner(ctx: QueryCtx | MutationCtx, partnerId: number) {
  return ctx.db
    .query("portal_lobbies")
    .withIndex("by_partnerId", (q) => q.eq("partnerId", partnerId))
    .collect();
}

export async function ensureDefaultLobby(
  ctx: MutationCtx,
  partnerId: number,
  games: string[]
): Promise<Id<"portal_lobbies">> {
  const existing = await ctx.db
    .query("portal_lobbies")
    .withIndex("by_partnerId_default", (q) =>
      q.eq("partnerId", partnerId).eq("isDefault", true)
    )
    .first();
  if (existing) return existing._id;

  const now = Date.now();
  return ctx.db.insert("portal_lobbies", {
    partnerId,
    slug: DEFAULT_LOBBY_SLUG,
    title: "Game Center",
    isDefault: true,
    enabled: true,
    offerings: defaultOfferingsForGames(games),
    createdAt: now,
    updatedAt: now,
  });
}

export async function getLobbyByPartnerAndSlug(
  ctx: QueryCtx | MutationCtx,
  partnerId: number,
  lobbySlug: string | null | undefined
) {
  if (!lobbySlug || lobbySlug === DEFAULT_LOBBY_SLUG) {
    const def = await ctx.db
      .query("portal_lobbies")
      .withIndex("by_partnerId_default", (q) =>
        q.eq("partnerId", partnerId).eq("isDefault", true)
      )
      .first();
    if (def) return def;
    // Fallback: slug === "default"
    return ctx.db
      .query("portal_lobbies")
      .withIndex("by_partnerId_slug", (q) =>
        q.eq("partnerId", partnerId).eq("slug", DEFAULT_LOBBY_SLUG)
      )
      .unique();
  }
  const slug = lobbySlug.trim().toLowerCase();
  return ctx.db
    .query("portal_lobbies")
    .withIndex("by_partnerId_slug", (q) =>
      q.eq("partnerId", partnerId).eq("slug", slug)
    )
    .unique();
}

function serializeLobby(row: {
  _id: Id<"portal_lobbies">;
  partnerId: number;
  slug: string;
  title: string;
  isDefault: boolean;
  enabled: boolean;
  branding?: {
    logoUrl?: string;
    backgroundLandscapeUrl?: string;
    backgroundPortraitUrl?: string;
  };
  offerings: PortalLobbyOffering[];
  seasonHonorMode?: "join_now" | "next_season";
  seasonHonorStartsWeekKey?: string;
}) {
  const offerings = enabledOfferings(row.offerings ?? []);
  const solo = offeringsByMode(row.offerings ?? [], "solo");
  const multi = offeringsByMode(row.offerings ?? [], "multi");
  const branding = resolveLobbyBranding(row.branding, null);
  return {
    lobbyId: row._id,
    partnerId: row.partnerId,
    slug: row.slug,
    title: row.title,
    isDefault: row.isDefault,
    enabled: row.enabled,
    seasonHonorMode: row.seasonHonorMode ?? "join_now",
    seasonHonorStartsWeekKey: row.seasonHonorStartsWeekKey ?? null,
    branding,
    offerings: offerings.map((o) => {
      const def = getPortalTournamentDefinition(o.tournamentId);
      const titleOverride = o.titleOverride?.trim() || undefined;
      const unlockSeasonLevel =
        typeof o.unlockSeasonLevel === "number" &&
        Number.isFinite(o.unlockSeasonLevel) &&
        o.unlockSeasonLevel >= 2
          ? Math.floor(o.unlockSeasonLevel)
          : undefined;
      return {
        ...o,
        titleOverride,
        title: titleOverride ?? def?.title ?? o.tournamentId,
        gameType: def?.gameType ?? null,
        matchType: def?.matchType ?? null,
        ...(unlockSeasonLevel != null ? { unlockSeasonLevel } : {}),
      };
    }),
    soloCount: solo.length,
    multiCount: multi.length,
    /** True when home can use direct Solo/Multi like legacy portal. */
    directPlayHome: solo.length === 1 && multi.length === 1,
    soloTournamentId: solo.length === 1 ? solo[0]!.tournamentId : null,
    multiTournamentId: multi.length === 1 ? multi[0]!.tournamentId : null,
    derivedGames: deriveGamesFromOfferings(row.offerings ?? []),
  };
}

async function readLobbyPlayEntryOverlayRow(
  ctx: QueryCtx | MutationCtx,
  partnerId: number,
  lobbyId: Id<"portal_lobbies">
) {
  const rows = await ctx.db
    .query("portal_partner_play_entry_settings")
    .withIndex("by_partner_lobby", (q) =>
      q.eq("partnerId", partnerId).eq("lobbyId", lobbyId)
    )
    .collect();
  return rows.find((r) => r.tournamentId == null || r.tournamentId === "") ?? null;
}

async function readLobbyQuotaScope(
  ctx: QueryCtx | MutationCtx,
  partnerId: number,
  lobbyId: Id<"portal_lobbies">
): Promise<PortalQuotaScope | null> {
  const lobbyRow = await readLobbyPlayEntryOverlayRow(ctx, partnerId, lobbyId);
  return normalizePortalQuotaScope(lobbyRow?.quotaScope) ?? null;
}

type LobbyPlayEntryOverlayPatch = {
  partnerId: number;
  lobbyId: Id<"portal_lobbies">;
  quotaScope?: PortalQuotaScope | null;
  soloSuccessDailyEnabled?: boolean | null;
  soloSuccessDailyCap?: number | null;
  soloSuccessAfterCapMode?: "zero_all" | null;
  soloSuccessAllowPlayAfterCap?: boolean | null;
};

const LOBBY_PLAY_ENTRY_CLEAR_KEYS = [
  "quotaScope",
  "soloSuccessDailyEnabled",
  "soloSuccessDailyCap",
  "soloSuccessAfterCapMode",
  "soloSuccessAllowPlayAfterCap",
] as const;

async function writeLobbyPlayEntryOverlay(
  ctx: MutationCtx,
  args: LobbyPlayEntryOverlayPatch
) {
  const hasAny =
    args.quotaScope !== undefined ||
    args.soloSuccessDailyEnabled !== undefined ||
    args.soloSuccessDailyCap !== undefined ||
    args.soloSuccessAfterCapMode !== undefined ||
    args.soloSuccessAllowPlayAfterCap !== undefined;
  if (!hasAny) return;

  const rows = await ctx.db
    .query("portal_partner_play_entry_settings")
    .withIndex("by_partner_lobby", (q) =>
      q.eq("partnerId", args.partnerId).eq("lobbyId", args.lobbyId)
    )
    .collect();
  const match = rows.find(
    (r) => r.tournamentId == null || r.tournamentId === ""
  );
  const now = Date.now();
  const clearKeys: string[] = [];
  const patch: Record<string, unknown> = { updatedAt: now };

  const applyClearable = (key: string, value: unknown) => {
    if (value === undefined) return;
    if (value === null) clearKeys.push(key);
    else patch[key] = value;
  };
  applyClearable("quotaScope", args.quotaScope);
  applyClearable("soloSuccessDailyEnabled", args.soloSuccessDailyEnabled);
  applyClearable("soloSuccessDailyCap", args.soloSuccessDailyCap);
  applyClearable("soloSuccessAfterCapMode", args.soloSuccessAfterCapMode);
  applyClearable("soloSuccessAllowPlayAfterCap", args.soloSuccessAllowPlayAfterCap);

  if (match) {
    if (clearKeys.length > 0) {
      const {
        _id,
        _creationTime,
        ...keep
      } = match as typeof match & Record<string, unknown>;
      void _creationTime;
      for (const key of clearKeys) {
        delete (keep as Record<string, unknown>)[key];
      }
      await ctx.db.replace(_id, {
        ...keep,
        ...patch,
        partnerId: args.partnerId,
        lobbyId: args.lobbyId,
        updatedAt: now,
      } as never);
    } else {
      await ctx.db.patch(match._id, patch);
    }
    return;
  }

  const insertDoc: Record<string, unknown> = {
    partnerId: args.partnerId,
    lobbyId: args.lobbyId,
    ...patch,
  };
  const meaningful = Object.keys(insertDoc).filter(
    (k) => k !== "partnerId" && k !== "lobbyId" && k !== "updatedAt"
  );
  if (meaningful.length > 0) {
    await ctx.db.insert("portal_partner_play_entry_settings", insertDoc as never);
  }
  void LOBBY_PLAY_ENTRY_CLEAR_KEYS;
}

/** @deprecated name kept for local call sites; writes full lobby play-entry overlay. */
async function writeLobbyQuotaScope(
  ctx: MutationCtx,
  args: LobbyPlayEntryOverlayPatch
) {
  await writeLobbyPlayEntryOverlay(ctx, args);
}

/** Player: resolve lobby for current partner (+ optional slug). Auto-creates default if missing. */
export const resolvePortalLobby = mutation({
  args: {
    partnerId: v.number(),
    lobbySlug: v.optional(v.string()),
    /** Games used when creating the default lobby. */
    games: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { partnerId, lobbySlug, games }) => {
    let row = await getLobbyByPartnerAndSlug(ctx, partnerId, lobbySlug);
    if (!row && (!lobbySlug || lobbySlug === DEFAULT_LOBBY_SLUG)) {
      await ensureDefaultLobby(
        ctx,
        partnerId,
        games && games.length > 0 ? games : ["solitaire"]
      );
      row = await getLobbyByPartnerAndSlug(ctx, partnerId, lobbySlug);
    }
    if (!row || row.enabled === false) return null;
    return serializeLobby(row);
  },
});

export const getPortalLobby = query({
  args: {
    partnerId: v.number(),
    lobbySlug: v.optional(v.string()),
  },
  handler: async (ctx, { partnerId, lobbySlug }) => {
    const row = await getLobbyByPartnerAndSlug(ctx, partnerId, lobbySlug);
    if (!row || row.enabled === false) return null;
    return serializeLobby(row);
  },
});

export const listPortalLobbies = query({
  args: { partnerId: v.number() },
  handler: async (ctx, { partnerId }) => {
    const rows = await listLobbiesForPartner(ctx, partnerId);
    return rows.map((row) => serializeLobby(row));
  },
});

/** Platform/admin: upsert lobby. */
export const upsertPortalLobby = mutation({
  args: {
    partnerId: v.number(),
    lobbyId: v.optional(v.id("portal_lobbies")),
    slug: v.string(),
    title: v.string(),
    isDefault: v.optional(v.boolean()),
    enabled: v.optional(v.boolean()),
    branding: v.optional(brandingValidator),
    offerings: v.array(offeringValidator),
    quotaScope: quotaScopeValidator,
    soloSuccessDailyEnabled: v.optional(v.union(v.boolean(), v.null())),
    soloSuccessDailyCap: v.optional(v.union(v.number(), v.null())),
    soloSuccessAfterCapMode: v.optional(v.union(v.literal("zero_all"), v.null())),
    soloSuccessAllowPlayAfterCap: v.optional(v.union(v.boolean(), v.null())),
    seasonHonorMode: seasonHonorModeValidator,
  },
  handler: async (ctx, args) => upsertLobbyCore(ctx, args),
});

export const deletePortalLobby = mutation({
  args: {
    partnerId: v.number(),
    lobbyId: v.id("portal_lobbies"),
  },
  handler: async (ctx, { partnerId, lobbyId }) => {
    return deleteLobbyCore(ctx, partnerId, lobbyId);
  },
});

async function upsertLobbyCore(
  ctx: MutationCtx,
  args: {
    partnerId: number;
    lobbyId?: Id<"portal_lobbies">;
    slug: string;
    title: string;
    isDefault?: boolean;
    enabled?: boolean;
    branding?: {
      logoUrl?: string;
      backgroundLandscapeUrl?: string;
      backgroundPortraitUrl?: string;
    };
    offerings: PortalLobbyOffering[];
    /** null = clear lobby override (inherit partner). */
    quotaScope?: PortalQuotaScope | null;
    soloSuccessDailyEnabled?: boolean | null;
    soloSuccessDailyCap?: number | null;
    soloSuccessAfterCapMode?: "zero_all" | null;
    soloSuccessAllowPlayAfterCap?: boolean | null;
    /** null → join_now */
    seasonHonorMode?: "join_now" | "next_season" | null;
  }
) {
  const slug = validateLobbySlug(args.slug);
  for (const o of args.offerings) {
    if (!getPortalTournamentDefinition(o.tournamentId)) {
      throw new Error("lobby_tournament_invalid");
    }
  }
  const now = Date.now();
  const isDefault = args.isDefault === true;

  // Resolve target: explicit id, else same partner+slug (true upsert).
  // Admin form defaults slug to "default"; saving without Edit must update, not fail.
  let targetLobbyId = args.lobbyId;
  if (targetLobbyId) {
    const byId = await ctx.db.get(targetLobbyId);
    if (!byId || byId.partnerId !== args.partnerId) {
      throw new Error("lobby_not_found");
    }
    const slugOwner = await ctx.db
      .query("portal_lobbies")
      .withIndex("by_partnerId_slug", (q) =>
        q.eq("partnerId", args.partnerId).eq("slug", slug)
      )
      .unique();
    if (slugOwner && slugOwner._id !== targetLobbyId) {
      throw new Error("lobby_slug_taken");
    }
  } else {
    const bySlug = await ctx.db
      .query("portal_lobbies")
      .withIndex("by_partnerId_slug", (q) =>
        q.eq("partnerId", args.partnerId).eq("slug", slug)
      )
      .unique();
    if (bySlug) targetLobbyId = bySlug._id;
  }

  if (isDefault) {
    const others = await ctx.db
      .query("portal_lobbies")
      .withIndex("by_partnerId_default", (q) =>
        q.eq("partnerId", args.partnerId).eq("isDefault", true)
      )
      .collect();
    for (const other of others) {
      if (targetLobbyId && other._id === targetLobbyId) continue;
      await ctx.db.patch(other._id, { isDefault: false, updatedAt: now });
    }
  }

  const honorPatch = await resolveSeasonHonorPatch(ctx, {
    partnerId: args.partnerId,
    seasonHonorMode: args.seasonHonorMode,
    now,
  });

  if (targetLobbyId) {
    const existing = await ctx.db.get(targetLobbyId);
    if (!existing || existing.partnerId !== args.partnerId) {
      throw new Error("lobby_not_found");
    }
    const base = {
      partnerId: existing.partnerId,
      slug,
      title: args.title.trim() || slug,
      isDefault: isDefault || existing.isDefault,
      enabled: args.enabled !== false,
      branding: args.branding ?? existing.branding,
      offerings: args.offerings,
      createdAt: existing.createdAt,
      updatedAt: now,
    };
    if (honorPatch.clearStarts) {
      await ctx.db.replace(targetLobbyId, {
        ...base,
        seasonHonorMode: "join_now" as const,
      });
    } else if (honorPatch.seasonHonorMode === "next_season") {
      await ctx.db.replace(targetLobbyId, {
        ...base,
        seasonHonorMode: "next_season" as const,
        seasonHonorStartsWeekKey: honorPatch.seasonHonorStartsWeekKey,
      });
    } else {
      await ctx.db.replace(targetLobbyId, {
        ...base,
        ...(existing.seasonHonorMode
          ? { seasonHonorMode: existing.seasonHonorMode }
          : {}),
        ...(existing.seasonHonorStartsWeekKey
          ? { seasonHonorStartsWeekKey: existing.seasonHonorStartsWeekKey }
          : {}),
      });
    }
    await writeLobbyQuotaScope(ctx, {
      partnerId: args.partnerId,
      lobbyId: targetLobbyId,
      quotaScope: args.quotaScope,
      soloSuccessDailyEnabled: args.soloSuccessDailyEnabled,
      soloSuccessDailyCap: args.soloSuccessDailyCap,
      soloSuccessAfterCapMode: args.soloSuccessAfterCapMode,
      soloSuccessAllowPlayAfterCap: args.soloSuccessAllowPlayAfterCap,
    });
    return { ok: true as const, lobbyId: targetLobbyId };
  }

  const lobbyId = await ctx.db.insert("portal_lobbies", {
    partnerId: args.partnerId,
    slug,
    title: args.title.trim() || slug,
    isDefault,
    enabled: args.enabled !== false,
    branding: args.branding,
    offerings: args.offerings,
    createdAt: now,
    updatedAt: now,
    ...(honorPatch.seasonHonorMode === "next_season"
      ? {
          seasonHonorMode: "next_season" as const,
          seasonHonorStartsWeekKey: honorPatch.seasonHonorStartsWeekKey,
        }
      : honorPatch.seasonHonorMode === "join_now"
        ? { seasonHonorMode: "join_now" as const }
        : {}),
  });
  await writeLobbyQuotaScope(ctx, {
    partnerId: args.partnerId,
    lobbyId,
    quotaScope: args.quotaScope,
    soloSuccessDailyEnabled: args.soloSuccessDailyEnabled,
    soloSuccessDailyCap: args.soloSuccessDailyCap,
    soloSuccessAfterCapMode: args.soloSuccessAfterCapMode,
    soloSuccessAllowPlayAfterCap: args.soloSuccessAllowPlayAfterCap,
  });
  return { ok: true as const, lobbyId };
}

async function resolveSeasonHonorPatch(
  ctx: MutationCtx,
  args: {
    partnerId: number;
    seasonHonorMode?: "join_now" | "next_season" | null;
    now: number;
  }
): Promise<{
  seasonHonorMode?: "join_now" | "next_season";
  seasonHonorStartsWeekKey?: string;
  clearStarts?: boolean;
}> {
  if (args.seasonHonorMode === undefined) return {};
  if (args.seasonHonorMode === null || args.seasonHonorMode === "join_now") {
    return {
      seasonHonorMode: "join_now",
      clearStarts: true,
    };
  }
  const epoch = await readPartnerSeasonEpochWeekKey(ctx, args.partnerId);
  const starts = portalNextSeasonStartWeekKey(weeklyPeriodKey(args.now), epoch);
  if (!isValidPortalWeekKey(starts)) {
    throw new Error("season_honor_starts_invalid");
  }
  return {
    seasonHonorMode: "next_season",
    seasonHonorStartsWeekKey: starts,
  };
}

async function deleteLobbyCore(
  ctx: MutationCtx,
  partnerId: number,
  lobbyId: Id<"portal_lobbies">
) {
  const row = await ctx.db.get(lobbyId);
  if (!row || row.partnerId !== partnerId) throw new Error("lobby_not_found");
  if (row.isDefault) throw new Error("lobby_default_undeletable");
  await ctx.db.delete(lobbyId);
  return { ok: true as const };
}

/** Bridge: Platform Admin → Portal list. */
export const listPortalLobbiesInternal = internalQuery({
  args: { partnerId: v.number() },
  handler: async (ctx, { partnerId }) => {
    const rows = await listLobbiesForPartner(ctx, partnerId);
    return await Promise.all(
      rows.map(async (row) => {
        const overlay = await readLobbyPlayEntryOverlayRow(ctx, partnerId, row._id);
        return {
          ...serializeLobby(row),
          quotaScope: normalizePortalQuotaScope(overlay?.quotaScope) ?? null,
          soloSuccessDailyEnabled:
            typeof overlay?.soloSuccessDailyEnabled === "boolean"
              ? overlay.soloSuccessDailyEnabled
              : null,
          soloSuccessDailyCap: overlay?.soloSuccessDailyCap ?? null,
          soloSuccessAfterCapMode:
            overlay?.soloSuccessAfterCapMode === "zero_all"
              ? ("zero_all" as const)
              : null,
          soloSuccessAllowPlayAfterCap:
            typeof overlay?.soloSuccessAllowPlayAfterCap === "boolean"
              ? overlay.soloSuccessAllowPlayAfterCap
              : null,
        };
      })
    );
  },
});

export const upsertPortalLobbyInternal = internalMutation({
  args: {
    partnerId: v.number(),
    lobbyId: v.optional(v.id("portal_lobbies")),
    slug: v.string(),
    title: v.string(),
    isDefault: v.optional(v.boolean()),
    enabled: v.optional(v.boolean()),
    branding: v.optional(brandingValidator),
    offerings: v.array(offeringValidator),
    quotaScope: quotaScopeValidator,
    soloSuccessDailyEnabled: v.optional(v.union(v.boolean(), v.null())),
    soloSuccessDailyCap: v.optional(v.union(v.number(), v.null())),
    soloSuccessAfterCapMode: v.optional(v.union(v.literal("zero_all"), v.null())),
    soloSuccessAllowPlayAfterCap: v.optional(v.union(v.boolean(), v.null())),
    seasonHonorMode: seasonHonorModeValidator,
  },
  handler: async (ctx, args) => upsertLobbyCore(ctx, args),
});

export const deletePortalLobbyInternal = internalMutation({
  args: {
    partnerId: v.number(),
    lobbyId: v.id("portal_lobbies"),
  },
  handler: async (ctx, { partnerId, lobbyId }) =>
    deleteLobbyCore(ctx, partnerId, lobbyId),
});
