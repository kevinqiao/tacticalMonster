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
import { getPortalTournamentDefinition } from "../../data/portalTournamentConfigs";
import { internalMutation, internalQuery, mutation, query } from "../../_generated/server";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";

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
      soloPoints: v.optional(v.object({ success: v.number(), fail: v.number() })),
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
}) {
  const offerings = enabledOfferings(row.offerings ?? []);
  const solo = offeringsByMode(row.offerings ?? [], "solo");
  const multi = offeringsByMode(row.offerings ?? [], "multi");
  const branding = resolveLobbyBranding(row.branding);
  return {
    lobbyId: row._id,
    partnerId: row.partnerId,
    slug: row.slug,
    title: row.title,
    isDefault: row.isDefault,
    enabled: row.enabled,
    branding,
    offerings: offerings.map((o) => {
      const def = getPortalTournamentDefinition(o.tournamentId);
      return {
        ...o,
        title: o.titleOverride ?? def?.title ?? o.tournamentId,
        gameType: def?.gameType ?? null,
        matchType: def?.matchType ?? null,
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

async function readLobbyQuotaScope(
  ctx: QueryCtx | MutationCtx,
  partnerId: number,
  lobbyId: Id<"portal_lobbies">
): Promise<PortalQuotaScope | null> {
  const rows = await ctx.db
    .query("portal_partner_play_entry_settings")
    .withIndex("by_partner_lobby", (q) =>
      q.eq("partnerId", partnerId).eq("lobbyId", lobbyId)
    )
    .collect();
  const lobbyRow = rows.find(
    (r) => r.tournamentId == null || r.tournamentId === ""
  );
  return normalizePortalQuotaScope(lobbyRow?.quotaScope) ?? null;
}

async function writeLobbyQuotaScope(
  ctx: MutationCtx,
  args: {
    partnerId: number;
    lobbyId: Id<"portal_lobbies">;
    quotaScope: PortalQuotaScope | null | undefined;
  }
) {
  if (args.quotaScope === undefined) return;
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
  if (args.quotaScope === null) {
    if (!match) return;
    const {
      _id,
      _creationTime,
      quotaScope: _qs,
      ...keep
    } = match as typeof match & { quotaScope?: string };
    void _creationTime;
    void _qs;
    await ctx.db.replace(_id, { ...keep, updatedAt: now } as never);
    return;
  }
  if (match) {
    await ctx.db.patch(match._id, { quotaScope: args.quotaScope, updatedAt: now });
    return;
  }
  await ctx.db.insert("portal_partner_play_entry_settings", {
    partnerId: args.partnerId,
    lobbyId: args.lobbyId,
    quotaScope: args.quotaScope,
    updatedAt: now,
  });
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
    return rows.map(serializeLobby);
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

  if (targetLobbyId) {
    const existing = await ctx.db.get(targetLobbyId);
    if (!existing || existing.partnerId !== args.partnerId) {
      throw new Error("lobby_not_found");
    }
    await ctx.db.patch(targetLobbyId, {
      slug,
      title: args.title.trim() || slug,
      isDefault: isDefault || existing.isDefault,
      enabled: args.enabled !== false,
      branding: args.branding,
      offerings: args.offerings,
      updatedAt: now,
    });
    await writeLobbyQuotaScope(ctx, {
      partnerId: args.partnerId,
      lobbyId: targetLobbyId,
      quotaScope: args.quotaScope,
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
  });
  await writeLobbyQuotaScope(ctx, {
    partnerId: args.partnerId,
    lobbyId,
    quotaScope: args.quotaScope,
  });
  return { ok: true as const, lobbyId };
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
      rows.map(async (row) => ({
        ...serializeLobby(row),
        quotaScope: await readLobbyQuotaScope(ctx, partnerId, row._id),
      }))
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
