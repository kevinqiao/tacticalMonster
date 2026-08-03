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
  weeklyPurchaseLimit?: number;
}

export interface CasualShopWalletMock {
  coins: number;
  gems: number;
}

/** 法币→钻 + 单币种 discretionary（与 `CASUAL_SHOP_SKU_CATALOG` 一致） */
export const MOCK_SHOP_SKUS: CasualShopSkuRow[] = [
  {
    skuId: "iap_gem_tier_1",
    title: "Gem pack I (IAP)",
    skuKind: "iap",
    iapPriceLabel: "¥6",
    grantGems: 60,
    grantCoins: 350,
  },
  {
    skuId: "iap_gem_tier_2",
    title: "Gem pack II (IAP)",
    skuKind: "iap",
    iapPriceLabel: "¥30",
    grantGems: 330,
    grantCoins: 1800,
  },
  {
    skuId: "iap_gem_tier_3",
    title: "Gem pack III (IAP)",
    skuKind: "iap",
    iapPriceLabel: "¥98",
    grantGems: 1200,
    grantCoins: 7200,
  },
  {
    skuId: "shop_replay_pass_3pack",
    title: "Replay Pass × 3",
    skuKind: "virtual",
    priceGems: 18,
    grantReplayTokenCount: 3,
    weeklyPurchaseLimit: 2,
  },
  {
    skuId: "shop_profile_flair_coin",
    title: "Weekly lobby flair",
    skuKind: "virtual",
    priceCoins: 75,
    weeklyPurchaseLimit: 1,
  },
  {
    skuId: "shop_emote_pack_gems",
    title: "Emote pack",
    skuKind: "virtual",
    priceGems: 12,
    weeklyPurchaseLimit: 3,
  },
];

/** 预览钱包：足以购买再战令与周饰 */
export function createInitialShopWallet(): CasualShopWalletMock {
  return { coins: 8200, gems: 120 };
}
