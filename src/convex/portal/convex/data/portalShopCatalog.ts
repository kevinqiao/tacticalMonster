/**
 * Portal 兑换商店静态配表（与 casualPlatform 独立）。
 * title/description 为默认文案；玩家端按 skuId 走
 * `portal.player` → `shopSkus.{skuId}.{title|description}`（见 portalShopCatalogFallback）。
 * Catalog 数字来自 portalEconomyGenerated（SSOT: scripts/portal/economy/portal-economy.json）。
 */

import { formatFaceValueDisplay } from "./portalGiftCardEconomy";
import { PORTAL_SHOP_SKU_CATALOG as GENERATED_CATALOG } from "./portalEconomyGenerated";

export type PortalShopSkuKind = "virtual" | "giftcard" | "voucher" | "iap";

export type PortalShopSurface = "lobby" | "town";

export type PortalShopSkuSeed = {
  skuId: string;
  title: string;
  description?: string;
  priceCoins: number;
  /** Tickets granted (entry + replay share the same wallet balance). */
  grantTicketCount?: number;
  /**
   * @deprecated Prefer grantTicketCount. Read fallback for legacy DB / admin payloads.
   */
  grantReplayTokenCount?: number;
  /** Soft-currency pack bonus; used by iap (and optionally virtual) SKUs. */
  grantCoinCount?: number;
  weeklyPurchaseLimit?: number;
  dailyPurchaseLimit?: number;
  sortOrder: number;
  skuKind?: PortalShopSkuKind;
  /** Stripe Price id for iap Checkout (server-side only). */
  stripePriceId?: string;
  /** Display fiat price in minor units (e.g. cents). */
  priceCents?: number;
  currency?: string;
  /** Optional UI section heading; omit for a flat catalog list. */
  shopSection?: string;
  /** Restrict SKU to these partner ids; omit or [] = all partners. */
  partnerIds?: number[];
  region?: string;
  faceValueUsd?: number;
  faceValueLocal?: number;
  faceValueCurrency?: string;
  tangoUtid?: string;
  brandName?: string;
  brandLogoUrl?: string;
  scarcityMultiplier?: number;
  minAccountAgeDays?: number;
  requiresVerifiedContact?: boolean;
  voucherRewardText?: string;
  voucherValidityDays?: number;
  listInShop?: boolean;
  /** Omit or [] = lobby only. Town shop uses `["town"]`. */
  surfaces?: PortalShopSurface[];
};

export function shopSkuSurfaces(
  sku: Pick<PortalShopSkuSeed, "surfaces">
): PortalShopSurface[] {
  return sku.surfaces?.length ? sku.surfaces : ["lobby"];
}

export function shopSkuMatchesSurface(
  sku: Pick<PortalShopSkuSeed, "surfaces">,
  surface: PortalShopSurface
): boolean {
  return shopSkuSurfaces(sku).includes(surface);
}

/** Resolve ticket grant with legacy field fallback. */
export function resolveGrantTicketCount(s: {
  grantTicketCount?: number | null;
  grantReplayTokenCount?: number | null;
}): number {
  return Math.max(0, Math.floor(s.grantTicketCount ?? s.grantReplayTokenCount ?? 0));
}

export const PORTAL_SHOP_SKU_CATALOG: PortalShopSkuSeed[] = GENERATED_CATALOG.map(
  (row) => ({ ...row })
);

export function mapPortalShopSkuRow(r: PortalShopSkuSeed) {
  const skuKind = r.skuKind ?? "virtual";
  const faceValueLocal = r.faceValueLocal;
  const faceValueCurrency = r.faceValueCurrency;
  const faceValueDisplay =
    faceValueLocal != null && faceValueCurrency
      ? formatFaceValueDisplay(faceValueLocal, faceValueCurrency)
      : undefined;
  const grantTicketCount = resolveGrantTicketCount(r);
  return {
    skuId: r.skuId,
    title: r.title,
    description: r.description ?? "",
    priceCoins: r.priceCoins,
    grantTicketCount,
    /** @deprecated Alias for older clients; same value as grantTicketCount. */
    grantReplayTokenCount: grantTicketCount,
    grantCoinCount: Math.max(0, Math.floor(r.grantCoinCount ?? 0)),
    weeklyPurchaseLimit: r.weeklyPurchaseLimit ?? null,
    dailyPurchaseLimit: r.dailyPurchaseLimit ?? null,
    sortOrder: r.sortOrder,
    skuKind,
    shopSection: r.shopSection,
    priceCents: r.priceCents,
    currency: r.currency,
    region: r.region,
    faceValueUsd: r.faceValueUsd,
    faceValueLocal,
    faceValueCurrency,
    faceValueDisplay,
    tangoUtid: r.tangoUtid,
    brandName: r.brandName,
    brandLogoUrl: r.brandLogoUrl,
    scarcityMultiplier: r.scarcityMultiplier,
    minAccountAgeDays: r.minAccountAgeDays,
    requiresVerifiedContact: r.requiresVerifiedContact ?? skuKind === "giftcard",
    voucherRewardText: r.voucherRewardText,
    voucherValidityDays: r.voucherValidityDays,
  };
}
