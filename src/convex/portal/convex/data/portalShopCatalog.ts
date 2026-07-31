/**
 * Portal 兑换商店静态配表（与 casualPlatform 独立）。
 * title/description 为默认文案；玩家端按 skuId 走
 * `portal.player` → `shopSkus.{skuId}.{title|description}`（见 portalShopCatalogFallback）。
 * Catalog 数字来自 portalEconomyGenerated（SSOT: scripts/portal/economy/portal-economy.json）。
 */

import { formatFaceValueDisplay } from "./portalGiftCardEconomy";
import { PORTAL_SHOP_SKU_CATALOG as GENERATED_CATALOG } from "./portalEconomyGenerated";

export type PortalShopSkuKind = "virtual" | "giftcard" | "voucher";

export type PortalShopSkuSeed = {
  skuId: string;
  title: string;
  description?: string;
  priceCoins: number;
  grantReplayTokenCount?: number;
  weeklyPurchaseLimit?: number;
  sortOrder: number;
  skuKind?: PortalShopSkuKind;
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
};

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
  return {
    skuId: r.skuId,
    title: r.title,
    description: r.description ?? "",
    priceCoins: r.priceCoins,
    grantReplayTokenCount: r.grantReplayTokenCount ?? 0,
    weeklyPurchaseLimit: r.weeklyPurchaseLimit ?? null,
    sortOrder: r.sortOrder,
    skuKind,
    shopSection: r.shopSection,
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
