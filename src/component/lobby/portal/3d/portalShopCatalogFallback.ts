import type { PortalShopSkuRow } from "./PortalShopPanel";

/** 与 `portalShopCatalog.ts` 同步；Convex 未返回商品时用于展示与交互 */
export const PORTAL_SHOP_FALLBACK_SKUS: PortalShopSkuRow[] = [
  {
    skuId: "portal_shop_replay_3",
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
    title: "再战令 ×10",
    description: "超值再战包，适合高频竞技玩家。",
    priceCoins: 520,
    grantReplayTokenCount: 10,
    weeklyPurchaseLimit: 3,
    purchasedThisWeek: 0,
    remainingThisWeek: 3,
  },
];

export function resolvePortalShopSkus(
  serverSkus: PortalShopSkuRow[] | null | undefined
): PortalShopSkuRow[] {
  if (serverSkus && serverSkus.length > 0) return serverSkus;
  return PORTAL_SHOP_FALLBACK_SKUS;
}
