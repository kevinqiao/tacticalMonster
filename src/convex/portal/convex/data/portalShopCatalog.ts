/**
 * Portal 兑换商店静态配表（与 casualPlatform 独立）。
 */

import {
  giftCardPriceCoins,
  formatFaceValueDisplay,
  PORTAL_GIFTCARD_DEFAULT_MIN_ACCOUNT_AGE_DAYS,
} from "./portalGiftCardEconomy";

export type PortalShopSkuKind = "virtual" | "giftcard";

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
};

export const PORTAL_SHOP_SKU_CATALOG: PortalShopSkuSeed[] = [
  {
    skuId: "gc_amazon_5_us",
    skuKind: "giftcard",
    title: "Amazon 礼品卡 $5",
    description: "美国区 Amazon.com 电子礼品卡，兑换后通过链接领取。",
    region: "US",
    faceValueUsd: 5,
    faceValueLocal: 5,
    faceValueCurrency: "USD",
    tangoUtid: "U163059",
    brandName: "Amazon.com",
    priceCoins: giftCardPriceCoins(5),
    weeklyPurchaseLimit: 1,
    minAccountAgeDays: PORTAL_GIFTCARD_DEFAULT_MIN_ACCOUNT_AGE_DAYS,
    requiresVerifiedContact: true,
    sortOrder: 100,
  },
  {
    skuId: "gc_amazon_5_ca",
    skuKind: "giftcard",
    title: "Amazon 礼品卡 CA$5",
    description: "加拿大区 Amazon 电子礼品卡，兑换后通过链接领取。",
    region: "CA",
    faceValueUsd: 3.7,
    faceValueLocal: 5,
    faceValueCurrency: "CAD",
    tangoUtid: "U945313",
    brandName: "Amazon.ca",
    priceCoins: giftCardPriceCoins(3.7, 1.05),
    weeklyPurchaseLimit: 1,
    minAccountAgeDays: PORTAL_GIFTCARD_DEFAULT_MIN_ACCOUNT_AGE_DAYS,
    requiresVerifiedContact: true,
    sortOrder: 110,
  },
];

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
  };
}
