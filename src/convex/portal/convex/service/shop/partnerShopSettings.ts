import { v } from "convex/values";

import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { internalMutation, internalQuery } from "../../_generated/server";
import {
  defaultPortalPartnerShopSettings,
  type PortalPartnerShopSettings,
} from "../../data/portalPartnerShopSettings";

const overrideValidator = v.object({
  priceCoins: v.optional(v.number()),
  title: v.optional(v.string()),
  weeklyPurchaseLimit: v.optional(v.union(v.number(), v.null())),
  sortOrder: v.optional(v.number()),
  active: v.optional(v.boolean()),
  tangoUtid: v.optional(v.string()),
});

function normalize(
  partnerId: number,
  row: {
    enabled: boolean;
    giftCardsEnabled: boolean;
    virtualEnabled: boolean;
    vouchersEnabled?: boolean;
    adCoinEnabled?: boolean;
    assortmentMode: "all_shared" | "allowlist";
    skuIds?: string[];
    excludeSkuIds?: string[];
    overrides?: Record<string, PortalPartnerShopSettings["overrides"][string]>;
    updatedAt: number;
  } | null
): PortalPartnerShopSettings {
  if (!row) return defaultPortalPartnerShopSettings(partnerId);
  return {
    partnerId,
    enabled: row.enabled,
    giftCardsEnabled: row.giftCardsEnabled,
    virtualEnabled: row.virtualEnabled,
    vouchersEnabled: row.vouchersEnabled !== false,
    adCoinEnabled: row.adCoinEnabled !== false,
    assortmentMode: row.assortmentMode,
    skuIds: row.skuIds ?? [],
    excludeSkuIds: row.excludeSkuIds ?? [],
    overrides: row.overrides ?? {},
    updatedAt: row.updatedAt,
  };
}

/** Load a partner's shop settings, or null when no row exists. */
export async function loadPartnerShopSettings(
  ctx: QueryCtx | MutationCtx,
  partnerId: number
): Promise<PortalPartnerShopSettings | null> {
  const row = await ctx.db
    .query("portal_partner_shop_settings")
    .withIndex("by_partnerId", (q) => q.eq("partnerId", partnerId))
    .unique();
  if (!row) return null;
  return normalize(partnerId, row);
}

export const getPartnerShopSettingsInternal = internalQuery({
  args: { partnerId: v.number() },
  handler: async (ctx, { partnerId }) => {
    const row = await ctx.db
      .query("portal_partner_shop_settings")
      .withIndex("by_partnerId", (q) => q.eq("partnerId", partnerId))
      .unique();
    return normalize(partnerId, row);
  },
});

export const upsertPartnerShopSettingsInternal = internalMutation({
  args: {
    partnerId: v.number(),
    enabled: v.boolean(),
    giftCardsEnabled: v.boolean(),
    virtualEnabled: v.boolean(),
    vouchersEnabled: v.boolean(),
    adCoinEnabled: v.boolean(),
    assortmentMode: v.union(v.literal("all_shared"), v.literal("allowlist")),
    skuIds: v.array(v.string()),
    excludeSkuIds: v.array(v.string()),
    overrides: v.record(v.string(), overrideValidator),
  },
  handler: async (ctx, args) => {
    if (!Number.isInteger(args.partnerId) || args.partnerId < 0) throw new Error("invalid_partner");
    if (args.skuIds.length > 200 || args.excludeSkuIds.length > 200 || Object.keys(args.overrides).length > 200) {
      throw new Error("shop_settings_too_large");
    }
    const cleanIds = (ids: string[]) => [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
    const now = Date.now();
    const payload = {
      ...args,
      skuIds: cleanIds(args.skuIds),
      excludeSkuIds: cleanIds(args.excludeSkuIds),
      updatedAt: now,
    };
    const row = await ctx.db
      .query("portal_partner_shop_settings")
      .withIndex("by_partnerId", (q) => q.eq("partnerId", args.partnerId))
      .unique();
    if (row) await ctx.db.patch(row._id, payload);
    else await ctx.db.insert("portal_partner_shop_settings", payload);
    return { ok: true as const, settings: normalize(args.partnerId, payload) };
  },
});
