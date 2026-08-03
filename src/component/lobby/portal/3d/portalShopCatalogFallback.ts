import i18n from "@/i18n";

import type { PortalShopSkuRow } from "../service/usePortalManager";

type PortalShopFallbackSku = PortalShopSkuRow & {
  partnerIds?: number[];
};

const PORTAL_PLAYER_NS = "portal.player";

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
    skuId: "gc_amazon_5_us",
    skuKind: "giftcard",
    title: "Amazon 礼品卡 $5",
    description: "美国区 Amazon.com 电子礼品卡，兑换后通过链接领取。",
    region: "US",
    faceValueDisplay: "$5",
    brandName: "Amazon.com",
    priceCoins: 750,
    grantTicketCount: 0,
    weeklyPurchaseLimit: 1,
    purchasedThisWeek: 0,
    remainingThisWeek: 1,
  },
];

/** Shared catalog copy via `shopSkus.{skuId}.*`; partner/custom SKUs keep API text. */
export function localizePortalShopSku(sku: PortalShopSkuRow): PortalShopSkuRow {
  const titleKey = `shopSkus.${sku.skuId}.title`;
  const descKey = `shopSkus.${sku.skuId}.description`;
  const title = i18n.exists(titleKey, { ns: PORTAL_PLAYER_NS })
    ? i18n.t(titleKey, { ns: PORTAL_PLAYER_NS })
    : sku.title;
  const description = i18n.exists(descKey, { ns: PORTAL_PLAYER_NS })
    ? i18n.t(descKey, { ns: PORTAL_PLAYER_NS })
    : sku.description;
  return { ...sku, title, description };
}

function localizeFallbackSku(sku: PortalShopFallbackSku): PortalShopSkuRow {
  const { partnerIds: _partnerIds, ...row } = sku;
  return localizePortalShopSku(row);
}

/**
 * Server catalog is already partner-filtered. Fallback applies the same rule locally
 * when Convex has not returned a catalog yet. Always localize shared SKU copy by skuId.
 */
export function resolvePortalShopSkus(
  serverSkus: PortalShopSkuRow[] | null | undefined,
  partnerPid = 0
): PortalShopSkuRow[] {
  if (serverSkus != null) return serverSkus.map(localizePortalShopSku);
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
