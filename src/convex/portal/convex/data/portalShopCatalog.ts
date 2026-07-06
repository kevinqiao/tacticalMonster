/**
 * Portal 兑换商店静态配表（与 casualPlatform 独立）。
 */

export type PortalShopSkuSeed = {
  skuId: string;
  title: string;
  description?: string;
  priceCoins: number;
  grantReplayTokenCount?: number;
  weeklyPurchaseLimit?: number;
  sortOrder: number;
};

export const PORTAL_SHOP_SKU_CATALOG: PortalShopSkuSeed[] = [
  {
    skuId: "portal_shop_replay_3",
    title: "再战令 ×3",
    description: "单局结算后可再战一次，适用于支持的挑战模式。",
    priceCoins: 180,
    grantReplayTokenCount: 3,
    weeklyPurchaseLimit: 5,
    sortOrder: 10,
  },
  {
    skuId: "portal_shop_replay_10",
    title: "再战令 ×10",
    description: "超值再战包，适合高频竞技玩家。",
    priceCoins: 520,
    grantReplayTokenCount: 10,
    weeklyPurchaseLimit: 3,
    sortOrder: 20,
  },
];

export function mapPortalShopSkuRow(r: PortalShopSkuSeed) {
  return {
    skuId: r.skuId,
    title: r.title,
    description: r.description ?? "",
    priceCoins: r.priceCoins,
    grantReplayTokenCount: r.grantReplayTokenCount ?? 0,
    weeklyPurchaseLimit: r.weeklyPurchaseLimit ?? null,
    sortOrder: r.sortOrder,
  };
}
