import i18n from "@/i18n";

import type { PortalShopSkuRow } from "../service/usePortalManager";

type PortalShopFallbackSku = PortalShopSkuRow & {
  partnerIds?: number[];
};

/** Empty or omitted partnerIds → visible to all partners. */
export function isPortalShopSkuVisibleForPartner(
  partnerIds: number[] | undefined,
  partnerPid: number
): boolean {
  if (!partnerIds || partnerIds.length === 0) return true;
  return partnerIds.includes(partnerPid);
}

/** 与 `portalShopCatalog.ts` 同步；Convex 未返回商品时用于展示与交互 */
export const PORTAL_SHOP_FALLBACK_SKUS: PortalShopFallbackSku[] = [
  {
    skuId: "portal_shop_replay_3",
    skuKind: "virtual",
    title: "再战令 ×3",
    description: "单局结算后可再战一次，适用于支持的挑战模式。",
    priceCoins: 180,
    grantReplayTokenCount: 3,
    weeklyPurchaseLimit: 5,
    purchasedThisWeek: 0,
    remainingThisWeek: 5,
  },
  {
    skuId: "portal_shop_replay_10",
    skuKind: "virtual",
    title: "再战令 ×10",
    description: "超值再战包，适合高频竞技玩家。",
    priceCoins: 520,
    grantReplayTokenCount: 10,
    weeklyPurchaseLimit: 3,
    purchasedThisWeek: 0,
    remainingThisWeek: 3,
  },
  {
    skuId: "gc_amazon_5_us",
    skuKind: "giftcard",
    title: "Amazon 礼品卡 $5",
    description: "美国区 Amazon.com 电子礼品卡。",
    region: "US",
    faceValueDisplay: "$5",
    brandName: "Amazon.com",
    priceCoins: 750,
    grantReplayTokenCount: 0,
    weeklyPurchaseLimit: 1,
    purchasedThisWeek: 0,
    remainingThisWeek: 1,
  },
];

function localizeFallbackSku(sku: PortalShopFallbackSku): PortalShopSkuRow {
  const titleKey = `shopSkus.${sku.skuId}.title`;
  const descKey = `shopSkus.${sku.skuId}.description`;
  const title = i18n.exists(titleKey, { ns: "portal.player" })
    ? i18n.t(titleKey, { ns: "portal.player" })
    : sku.title;
  const description = i18n.exists(descKey, { ns: "portal.player" })
    ? i18n.t(descKey, { ns: "portal.player" })
    : sku.description;
  const { partnerIds: _partnerIds, ...row } = sku;
  return { ...row, title, description };
}

/**
 * Server catalog is already partner-filtered. Fallback applies the same rule locally
 * when Convex has not returned a catalog yet.
 */
export function resolvePortalShopSkus(
  serverSkus: PortalShopSkuRow[] | null | undefined,
  partnerPid = 0
): PortalShopSkuRow[] {
  if (serverSkus != null) return serverSkus;
  return PORTAL_SHOP_FALLBACK_SKUS.filter((sku) =>
    isPortalShopSkuVisibleForPartner(sku.partnerIds, partnerPid)
  ).map(localizeFallbackSku);
}

export function portalShopHasVisibleSkus(
  serverSkus: PortalShopSkuRow[] | null | undefined,
  partnerPid = 0,
  catalogLoaded = serverSkus != null
): boolean {
  if (!catalogLoaded) {
    return resolvePortalShopSkus(undefined, partnerPid).length > 0;
  }
  return resolvePortalShopSkus(serverSkus, partnerPid).length > 0;
}
