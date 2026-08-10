import { v } from "convex/values";

import type { Id } from "../../_generated/dataModel";
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

type ShopSettingsRow = {
  enabled: boolean;
  giftCardsEnabled: boolean;
  virtualEnabled: boolean;
  vouchersEnabled?: boolean;
  adCoinEnabled?: boolean;
  iapEnabled?: boolean;
  checkinEnabled?: boolean;
  assortmentMode: "all_shared" | "allowlist";
  skuIds?: string[];
  excludeSkuIds?: string[];
  overrides?: Record<string, PortalPartnerShopSettings["overrides"][string]>;
  updatedAt: number;
};

function normalize(
  partnerId: number,
  row: ShopSettingsRow | null
): PortalPartnerShopSettings {
  if (!row) return defaultPortalPartnerShopSettings(partnerId);
  return {
    partnerId,
    enabled: row.enabled,
    giftCardsEnabled: row.giftCardsEnabled,
    virtualEnabled: row.virtualEnabled,
    vouchersEnabled: row.vouchersEnabled !== false,
    adCoinEnabled: row.adCoinEnabled !== false,
    iapEnabled: row.iapEnabled !== false,
    checkinEnabled: row.checkinEnabled !== false,
    assortmentMode: row.assortmentMode,
    skuIds: row.skuIds ?? [],
    excludeSkuIds: row.excludeSkuIds ?? [],
    overrides: row.overrides ?? {},
    updatedAt: row.updatedAt,
  };
}

/** Partner-base shop row (lobbyId unset). Lobby overlays are separate rows. */
async function loadPartnerBaseShopRow(
  ctx: QueryCtx | MutationCtx,
  partnerId: number
) {
  const rows = await ctx.db
    .query("portal_partner_shop_settings")
    .withIndex("by_partnerId", (q) => q.eq("partnerId", partnerId))
    .collect();
  return rows.find((r) => r.lobbyId == null) ?? null;
}

async function loadLobbyOverlayRow(
  ctx: QueryCtx | MutationCtx,
  partnerId: number,
  lobbyId: Id<"portal_lobbies">
) {
  return await ctx.db
    .query("portal_partner_shop_settings")
    .withIndex("by_partnerId_lobbyId", (q) =>
      q.eq("partnerId", partnerId).eq("lobbyId", lobbyId)
    )
    .unique();
}

/** Pure merge for partner base ⊕ lobby overlay (exported for tests). */
export function mergePartnerShopSettingsRows(
  partnerId: number,
  base: ShopSettingsRow | null,
  overlay: ShopSettingsRow | null
): PortalPartnerShopSettings | null {
  if (!base && !overlay) return null;
  const defaults = defaultPortalPartnerShopSettings(partnerId);
  const merged: ShopSettingsRow = {
    enabled: overlay?.enabled ?? base?.enabled ?? defaults.enabled,
    giftCardsEnabled:
      overlay?.giftCardsEnabled ??
      base?.giftCardsEnabled ??
      defaults.giftCardsEnabled,
    virtualEnabled:
      overlay?.virtualEnabled ?? base?.virtualEnabled ?? defaults.virtualEnabled,
    vouchersEnabled: overlay?.vouchersEnabled ?? base?.vouchersEnabled,
    adCoinEnabled: overlay?.adCoinEnabled ?? base?.adCoinEnabled,
    iapEnabled: overlay?.iapEnabled ?? base?.iapEnabled,
    checkinEnabled: overlay?.checkinEnabled ?? base?.checkinEnabled,
    assortmentMode:
      overlay?.assortmentMode ??
      base?.assortmentMode ??
      defaults.assortmentMode,
    // Prefer overlay list only when overlay explicitly uses allowlist.
    skuIds:
      overlay?.assortmentMode === "allowlist"
        ? (overlay.skuIds ?? [])
        : overlay?.assortmentMode === "all_shared"
          ? []
          : (base?.skuIds ?? defaults.skuIds),
    excludeSkuIds:
      overlay?.excludeSkuIds ?? base?.excludeSkuIds ?? defaults.excludeSkuIds,
    overrides: {
      ...(base?.overrides ?? {}),
      ...(overlay?.overrides ?? {}),
    },
    updatedAt: Math.max(base?.updatedAt ?? 0, overlay?.updatedAt ?? 0),
  };
  return normalize(partnerId, merged);
}

/**
 * Merge lobby overlay onto partner base.
 * Overlay fields win when present. Missing toggles fall back to defaults
 * (enabled/on), not false — otherwise a partial overlay could blank the shop.
 */
export async function loadPartnerShopSettings(
  ctx: QueryCtx | MutationCtx,
  partnerId: number,
  lobbyId?: string | null
): Promise<PortalPartnerShopSettings | null> {
  const base = await loadPartnerBaseShopRow(ctx, partnerId);
  if (!lobbyId) {
    if (!base) return null;
    return normalize(partnerId, base);
  }
  const overlay = await loadLobbyOverlayRow(
    ctx,
    partnerId,
    lobbyId as Id<"portal_lobbies">
  );
  return mergePartnerShopSettingsRows(partnerId, base, overlay);
}

export const getPartnerShopSettingsInternal = internalQuery({
  args: {
    partnerId: v.number(),
    lobbyId: v.optional(v.id("portal_lobbies")),
  },
  handler: async (ctx, { partnerId, lobbyId }) => {
    const settings = await loadPartnerShopSettings(ctx, partnerId, lobbyId ?? null);
    return settings ?? defaultPortalPartnerShopSettings(partnerId);
  },
});

export const clearPartnerLobbyShopOverlayInternal = internalMutation({
  args: {
    partnerId: v.number(),
    lobbyId: v.id("portal_lobbies"),
  },
  handler: async (ctx, { partnerId, lobbyId }) => {
    if (!Number.isInteger(partnerId) || partnerId < 0) throw new Error("invalid_partner");
    const row = await loadLobbyOverlayRow(ctx, partnerId, lobbyId);
    if (row) await ctx.db.delete(row._id);
    const settings = await loadPartnerShopSettings(ctx, partnerId, lobbyId);
    return {
      ok: true as const,
      settings: settings ?? defaultPortalPartnerShopSettings(partnerId),
    };
  },
});

export const upsertPartnerShopSettingsInternal = internalMutation({
  args: {
    partnerId: v.number(),
    lobbyId: v.optional(v.id("portal_lobbies")),
    enabled: v.boolean(),
    giftCardsEnabled: v.boolean(),
    virtualEnabled: v.boolean(),
    vouchersEnabled: v.boolean(),
    adCoinEnabled: v.boolean(),
    iapEnabled: v.boolean(),
    checkinEnabled: v.boolean(),
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
    const { lobbyId, ...rest } = args;
    // all_shared ignores allowlist ids; keep row clean so merge/inheritance stay obvious.
    const skuIds =
      args.assortmentMode === "all_shared" ? [] : cleanIds(args.skuIds);
    const payload = {
      ...rest,
      skuIds,
      excludeSkuIds: cleanIds(args.excludeSkuIds),
      updatedAt: now,
      ...(lobbyId ? { lobbyId } : {}),
    };

    // Lobby overlay needs a partner base to inherit from for other lobbies.
    if (lobbyId) {
      const base = await loadPartnerBaseShopRow(ctx, args.partnerId);
      if (!base) {
        const { lobbyId: _omit, ...basePayload } = payload;
        await ctx.db.insert("portal_partner_shop_settings", basePayload);
      }
    }

    let row = lobbyId
      ? await loadLobbyOverlayRow(ctx, args.partnerId, lobbyId)
      : await loadPartnerBaseShopRow(ctx, args.partnerId);
    if (row) await ctx.db.patch(row._id, payload);
    else await ctx.db.insert("portal_partner_shop_settings", payload);

    // Partner base → all_shared: heal accidental empty-allowlist lobby overlays
    // that hide shared SKUs while the admin form on base shows 全部共享.
    if (!lobbyId && args.assortmentMode === "all_shared") {
      const rows = await ctx.db
        .query("portal_partner_shop_settings")
        .withIndex("by_partnerId", (q) => q.eq("partnerId", args.partnerId))
        .collect();
      for (const overlay of rows) {
        if (overlay.lobbyId == null) continue;
        if (overlay.assortmentMode !== "allowlist") continue;
        if ((overlay.skuIds?.length ?? 0) > 0) continue;
        await ctx.db.patch(overlay._id, {
          assortmentMode: "all_shared",
          skuIds: [],
          updatedAt: now,
        });
      }
    }

    const effective = lobbyId
      ? await loadPartnerShopSettings(ctx, args.partnerId, lobbyId)
      : normalize(args.partnerId, payload);
    return {
      ok: true as const,
      settings: effective ?? defaultPortalPartnerShopSettings(args.partnerId),
    };
  },
});
