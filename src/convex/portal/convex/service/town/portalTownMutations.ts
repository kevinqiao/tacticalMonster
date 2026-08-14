import { v } from "convex/values";

import { internalMutation, internalQuery, mutation, query } from "../../_generated/server";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import {
  DEFAULT_TOWN_SLUG,
  DEFAULT_TOWN_TEMPLATE_ID,
  DEFAULT_TOWN_TITLE,
  resolveTownBranding,
  validateTownSlug,
  type PortalTownBranding,
} from "../../data/portalTownConfig";
import { STARTING_COINS } from "./config";

const brandingValidator = v.object({
  logoUrl: v.optional(v.string()),
  titleOverride: v.optional(v.string()),
  mapThemeId: v.optional(v.string()),
});

export type PortalTownRow = {
  _id: Id<"portal_towns">;
  partnerId: number;
  slug: string;
  title: string;
  isDefault: boolean;
  enabled: boolean;
  templateId: string;
  economyProfileId?: string;
  branding?: PortalTownBranding;
  walletSeedCoins?: number;
  createdAt: number;
  updatedAt: number;
};

async function listTownsForPartner(ctx: QueryCtx | MutationCtx, partnerId: number) {
  return ctx.db
    .query("portal_towns")
    .withIndex("by_partnerId", (q) => q.eq("partnerId", partnerId))
    .collect();
}

export async function getTownByPartnerAndSlug(
  ctx: QueryCtx | MutationCtx,
  partnerId: number,
  townSlug: string | null | undefined
): Promise<PortalTownRow | null> {
  if (!townSlug || townSlug === DEFAULT_TOWN_SLUG) {
    const def = await ctx.db
      .query("portal_towns")
      .withIndex("by_partnerId_default", (q) =>
        q.eq("partnerId", partnerId).eq("isDefault", true)
      )
      .first();
    if (def) return def as PortalTownRow;
    return (await ctx.db
      .query("portal_towns")
      .withIndex("by_partnerId_slug", (q) =>
        q.eq("partnerId", partnerId).eq("slug", DEFAULT_TOWN_SLUG)
      )
      .unique()) as PortalTownRow | null;
  }
  const slug = validateTownSlug(townSlug);
  return (await ctx.db
    .query("portal_towns")
    .withIndex("by_partnerId_slug", (q) => q.eq("partnerId", partnerId).eq("slug", slug))
    .unique()) as PortalTownRow | null;
}

export function serializeTown(row: PortalTownRow) {
  const branding = resolveTownBranding(row.branding, row.title);
  return {
    townId: String(row._id),
    partnerId: row.partnerId,
    slug: row.slug,
    title: row.title,
    isDefault: row.isDefault,
    enabled: row.enabled,
    templateId: row.templateId,
    economyProfileId: row.economyProfileId ?? null,
    walletSeedCoins: row.walletSeedCoins ?? STARTING_COINS,
    playScopeKey: `town:${String(row._id)}`,
    branding,
  };
}

export async function ensureDefaultTown(
  ctx: MutationCtx,
  partnerId: number
): Promise<Id<"portal_towns">> {
  const existing = await ctx.db
    .query("portal_towns")
    .withIndex("by_partnerId_default", (q) =>
      q.eq("partnerId", partnerId).eq("isDefault", true)
    )
    .first();
  if (existing) return existing._id;

  const now = Date.now();
  return ctx.db.insert("portal_towns", {
    partnerId,
    slug: DEFAULT_TOWN_SLUG,
    title: DEFAULT_TOWN_TITLE,
    isDefault: true,
    enabled: true,
    templateId: DEFAULT_TOWN_TEMPLATE_ID,
    walletSeedCoins: STARTING_COINS,
    createdAt: now,
    updatedAt: now,
  });
}

async function upsertTownCore(
  ctx: MutationCtx,
  args: {
    partnerId: number;
    townId?: Id<"portal_towns">;
    slug: string;
    title: string;
    isDefault?: boolean;
    enabled?: boolean;
    templateId?: string;
    economyProfileId?: string | null;
    branding?: PortalTownBranding | null;
    walletSeedCoins?: number | null;
  }
) {
  const slug = validateTownSlug(args.slug);
  const now = Date.now();
  const isDefault = args.isDefault === true;

  let targetTownId = args.townId;
  if (targetTownId) {
    const byId = await ctx.db.get(targetTownId);
    if (!byId || byId.partnerId !== args.partnerId) {
      throw new Error("town_not_found");
    }
    const slugOwner = await ctx.db
      .query("portal_towns")
      .withIndex("by_partnerId_slug", (q) =>
        q.eq("partnerId", args.partnerId).eq("slug", slug)
      )
      .unique();
    if (slugOwner && slugOwner._id !== targetTownId) {
      throw new Error("town_slug_taken");
    }
  } else {
    const bySlug = await ctx.db
      .query("portal_towns")
      .withIndex("by_partnerId_slug", (q) =>
        q.eq("partnerId", args.partnerId).eq("slug", slug)
      )
      .unique();
    if (bySlug) targetTownId = bySlug._id;
  }

  if (isDefault) {
    const others = await ctx.db
      .query("portal_towns")
      .withIndex("by_partnerId_default", (q) =>
        q.eq("partnerId", args.partnerId).eq("isDefault", true)
      )
      .collect();
    for (const other of others) {
      if (targetTownId && other._id === targetTownId) continue;
      await ctx.db.patch(other._id, { isDefault: false, updatedAt: now });
    }
  }

  const patch: Record<string, unknown> = {
    slug,
    title: args.title.trim() || slug,
    ...(typeof args.isDefault === "boolean" ? { isDefault } : {}),
    ...(typeof args.enabled === "boolean" ? { enabled: args.enabled } : {}),
    ...(args.templateId ? { templateId: args.templateId } : {}),
    updatedAt: now,
  };

  if (args.economyProfileId === null) {
    patch.economyProfileId = undefined;
  } else if (typeof args.economyProfileId === "string") {
    patch.economyProfileId = args.economyProfileId;
  }

  if (args.branding === null) {
    patch.branding = undefined;
  } else if (args.branding && typeof args.branding === "object") {
    patch.branding = args.branding;
  }

  if (args.walletSeedCoins === null) {
    patch.walletSeedCoins = undefined;
  } else if (typeof args.walletSeedCoins === "number" && Number.isFinite(args.walletSeedCoins)) {
    patch.walletSeedCoins = Math.max(0, Math.floor(args.walletSeedCoins));
  }

  if (targetTownId) {
    await ctx.db.patch(targetTownId, patch);
    const row = await ctx.db.get(targetTownId);
    if (!row) throw new Error("town_patch_failed");
    return { townId: String(row._id), ...serializeTown(row as PortalTownRow) };
  }

  const id = await ctx.db.insert("portal_towns", {
    partnerId: args.partnerId,
    slug,
    title: String(patch.title),
    isDefault,
    enabled: args.enabled !== false,
    templateId: args.templateId ?? DEFAULT_TOWN_TEMPLATE_ID,
    ...(patch.economyProfileId ? { economyProfileId: patch.economyProfileId as string } : {}),
    ...(patch.branding ? { branding: patch.branding as PortalTownBranding } : {}),
    ...(typeof patch.walletSeedCoins === "number"
      ? { walletSeedCoins: patch.walletSeedCoins as number }
      : { walletSeedCoins: STARTING_COINS }),
    createdAt: now,
    updatedAt: now,
  });
  const row = await ctx.db.get(id);
  if (!row) throw new Error("town_insert_failed");
  return { townId: String(row._id), ...serializeTown(row as PortalTownRow) };
}

async function deleteTownCore(
  ctx: MutationCtx,
  partnerId: number,
  townId: Id<"portal_towns">
) {
  const row = await ctx.db.get(townId);
  if (!row || row.partnerId !== partnerId) {
    throw new Error("town_not_found");
  }
  if (row.isDefault) throw new Error("town_default_undeletable");
  await ctx.db.delete(townId);
  return { ok: true as const };
}

/** Player/runtime: resolve town for partner (+ optional slug). Auto-creates default if missing. */
export const resolvePortalTown = mutation({
  args: {
    partnerId: v.number(),
    townSlug: v.optional(v.string()),
  },
  handler: async (ctx, { partnerId, townSlug }) => {
    let row = await getTownByPartnerAndSlug(ctx, partnerId, townSlug);
    if (!row && (!townSlug || townSlug === DEFAULT_TOWN_SLUG)) {
      await ensureDefaultTown(ctx, partnerId);
      row = await getTownByPartnerAndSlug(ctx, partnerId, townSlug);
    }
    if (!row || row.enabled === false) return null;
    return serializeTown(row);
  },
});

export const getPortalTown = query({
  args: {
    partnerId: v.number(),
    townSlug: v.optional(v.string()),
  },
  handler: async (ctx, { partnerId, townSlug }) => {
    const row = await getTownByPartnerAndSlug(ctx, partnerId, townSlug);
    if (!row || row.enabled === false) return null;
    return serializeTown(row);
  },
});

export const listPortalTowns = query({
  args: { partnerId: v.number() },
  handler: async (ctx, { partnerId }) => {
    const rows = await listTownsForPartner(ctx, partnerId);
    return rows.map((row) => serializeTown(row as PortalTownRow));
  },
});

/** Bridge: operation scripts → Portal list. */
export const listPortalTownsInternal = internalQuery({
  args: { partnerId: v.number() },
  handler: async (ctx, { partnerId }) => {
    const rows = await listTownsForPartner(ctx, partnerId);
    return rows.map((row) => serializeTown(row as PortalTownRow));
  },
});

export const upsertPortalTownInternal = internalMutation({
  args: {
    partnerId: v.number(),
    townId: v.optional(v.id("portal_towns")),
    slug: v.string(),
    title: v.string(),
    isDefault: v.optional(v.boolean()),
    enabled: v.optional(v.boolean()),
    templateId: v.optional(v.string()),
    economyProfileId: v.optional(v.union(v.string(), v.null())),
    branding: v.optional(v.union(brandingValidator, v.null())),
    walletSeedCoins: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, args) => upsertTownCore(ctx, args),
});

export const deletePortalTownInternal = internalMutation({
  args: {
    partnerId: v.number(),
    townId: v.id("portal_towns"),
  },
  handler: async (ctx, { partnerId, townId }) => deleteTownCore(ctx, partnerId, townId),
});
