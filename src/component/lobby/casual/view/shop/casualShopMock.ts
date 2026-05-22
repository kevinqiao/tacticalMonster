/** 与 Convex `listActiveShopSkus` 返回字段对齐；预览列表与后端 fallback 一致 */
export interface CasualShopSkuRow {
  skuId: string;
  title: string;
  skuKind?: "virtual" | "iap" | "skin";
  iapPriceLabel?: string;
  priceCoins?: number;
  priceGems?: number;
  grantCoins?: number;
  grantGems?: number;
  grantSkinId?: string;
  grantReplayTokenCount?: number;
}

export interface CasualShopWalletMock {
  coins: number;
  gems: number;
}

/** 三档钻→币 + 三档法币→钻（IAP 占位，`purchaseSku` 不可用） */
export const MOCK_SHOP_SKUS: CasualShopSkuRow[] = [
  {
    skuId: "shop_coin_tier_1",
    title: "Coin pack I",
    skuKind: "virtual",
    priceGems: 10,
    grantCoins: 220,
  },
  {
    skuId: "shop_coin_tier_2",
    title: "Coin pack II",
    skuKind: "virtual",
    priceGems: 48,
    grantCoins: 1200,
  },
  {
    skuId: "shop_coin_tier_3",
    title: "Coin pack III",
    skuKind: "virtual",
    priceGems: 198,
    grantCoins: 5200,
  },
  {
    skuId: "iap_gem_tier_1",
    title: "Gem pack I (IAP)",
    skuKind: "iap",
    iapPriceLabel: "¥6",
    grantGems: 60,
  },
  {
    skuId: "iap_gem_tier_2",
    title: "Gem pack II (IAP)",
    skuKind: "iap",
    iapPriceLabel: "¥30",
    grantGems: 330,
  },
  {
    skuId: "iap_gem_tier_3",
    title: "Gem pack III (IAP)",
    skuKind: "iap",
    iapPriceLabel: "¥98",
    grantGems: 1200,
  },
  {
    skuId: "shop_replay_pass_3pack",
    title: "Replay Pass × 3",
    skuKind: "virtual",
    priceGems: 15,
    grantReplayTokenCount: 3,
  },
];

/** 预览钱包：能买部分钻→币、不足以买完大三档 */
export function createInitialShopWallet(): CasualShopWalletMock {
  return { coins: 8200, gems: 120 };
}
