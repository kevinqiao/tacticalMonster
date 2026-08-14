import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { sessionPartnerIdFromUid } from "../../../../shared/platformAuth/parsePlatformUid";
import {
  DEFAULT_TOWN_SLUG,
  DEFAULT_TOWN_TEMPLATE_ID,
  DEFAULT_TOWN_TITLE,
  defaultSkinForTemplate,
  resolveTownBranding,
  type PortalTownBranding,
} from "../../data/portalTownConfig";
import { townPlayScopeKey } from "../../data/portalPlayContext";
import { ZONE_GLOBAL } from "./zoneEconomyConfig";

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

export type TownSessionScope = {
  townId: string;
  playScopeKey: string;
  partnerId: number;
  slug: string;
  title: string;
  templateId: string;
  walletSeedCoins: number;
  branding: ReturnType<typeof resolveTownBranding>;
};

export function townIdFromPlayScopeKey(playScopeKey: string | undefined | null): string | undefined {
  if (!playScopeKey?.startsWith("town:")) return undefined;
  const id = playScopeKey.slice("town:".length);
  return id.length > 0 ? id : undefined;
}

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
  const slug = townSlug.trim().toLowerCase();
  return (await ctx.db
    .query("portal_towns")
    .withIndex("by_partnerId_slug", (q) => q.eq("partnerId", partnerId).eq("slug", slug))
    .unique()) as PortalTownRow | null;
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
    walletSeedCoins: ZONE_GLOBAL.startingCoins,
    createdAt: now,
    updatedAt: now,
  });
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
    walletSeedCoins: row.walletSeedCoins ?? ZONE_GLOBAL.startingCoins,
    playScopeKey: townPlayScopeKey(String(row._id)),
    branding,
    defaultSkinId: defaultSkinForTemplate(row.templateId),
  };
}

export async function resolveTownSessionScope(
  ctx: QueryCtx | MutationCtx,
  uid: string,
  townSlug?: string | null
): Promise<TownSessionScope | null> {
  const partnerId = sessionPartnerIdFromUid(uid) ?? 0;
  let row = await getTownByPartnerAndSlug(ctx, partnerId, townSlug);
  if (!row && (!townSlug || townSlug === DEFAULT_TOWN_SLUG)) {
    await ensureDefaultTown(ctx, partnerId);
    row = await getTownByPartnerAndSlug(ctx, partnerId, townSlug);
  }
  if (!row || row.enabled === false) return null;

  const townId = String(row._id);
  const walletSeedCoins = row.walletSeedCoins ?? ZONE_GLOBAL.startingCoins;
  return {
    townId,
    playScopeKey: townPlayScopeKey(townId),
    partnerId,
    slug: row.slug,
    title: row.title,
    templateId: row.templateId,
    walletSeedCoins,
    branding: resolveTownBranding(row.branding, row.title),
  };
}

export async function requireTownSessionScope(
  ctx: QueryCtx | MutationCtx,
  uid: string,
  townSlug?: string | null
): Promise<TownSessionScope> {
  const scope = await resolveTownSessionScope(ctx, uid, townSlug);
  if (!scope) throw new Error("town_unavailable");
  return scope;
}

export type TownScopedCtx = {
  db: MutationCtx["db"] | QueryCtx["db"];
  uid: string;
  townId: string;
  playScopeKey: string;
};

export function toTownScopedCtx(
  ctx: { db: MutationCtx["db"] | QueryCtx["db"]; uid: string },
  scope: TownSessionScope
): TownScopedCtx {
  return {
    db: ctx.db,
    uid: ctx.uid,
    townId: scope.townId,
    playScopeKey: scope.playScopeKey,
  };
}

export async function listPartnerTowns(ctx: QueryCtx | MutationCtx, partnerId: number) {
  const rows = await listTownsForPartner(ctx, partnerId);
  return rows.map((row) => serializeTown(row as PortalTownRow));
}
