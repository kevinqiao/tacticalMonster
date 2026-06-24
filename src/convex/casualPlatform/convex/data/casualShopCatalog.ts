/**
 * 普通商店货架（`casual_shop_skus`）静态配表。
 * 与 `seedShopSkusIfEmpty` / `listActiveShopSkus`（DB 为空时的回退）同源。
 *
 * 货币简化口径：金币与钻不互通（无钻→币虚拟 SKU）；IAP 钻包可含一次性赠送金。
 */

export interface CasualShopSkuSeed {
  skuId: string;
  title: string;
  skuKind?: "virtual" | "iap" | "skin";
  iapPriceLabel?: string;
  priceCoins?: number;
  priceGems?: number;
  grantCoins?: number;
  grantGems?: number;
  grantSkinId?: string;
  /** 发放再战令数量 */
  grantReplayTokenCount?: number;
  /** 每运营周最多购买次数；缺省不限 */
  weeklyPurchaseLimit?: number;
}

/** 已从配表下架、同步时应置 `active: false` 的 legacy SKU */
export const DEPRECATED_CASUAL_SHOP_SKU_IDS = [
  "shop_coin_tier_1",
  "shop_coin_tier_2",
  "shop_coin_tier_3",
  "shop_replay_pass_3pack_coins",
] as const;

/** 法币→钻（IAP）+ 单币种 discretionary 消耗；改价后 deploy + `syncShopCatalogSkus` */
export const CASUAL_SHOP_SKU_CATALOG: CasualShopSkuSeed[] = [
  {
    skuId: "iap_gem_tier_1",
    title: "Gem pack I (IAP)",
    skuKind: "iap",
    iapPriceLabel: "¥6",
    grantGems: 120,
    grantCoins: 700,
  },
  {
    skuId: "iap_gem_tier_2",
    title: "Gem pack II (IAP)",
    skuKind: "iap",
    iapPriceLabel: "¥30",
    grantGems: 660,
    grantCoins: 3600,
  },
  {
    skuId: "iap_gem_tier_3",
    title: "Gem pack III (IAP)",
    skuKind: "iap",
    iapPriceLabel: "¥98",
    grantGems: 2400,
    grantCoins: 14400,
  },
  {
    skuId: "shop_skin_steam_punk",
    title: "Steam Punk Card Skin",
    skuKind: "skin",
    priceGems: 560,
    grantSkinId: "shop_steam_punk",
  },
  {
    skuId: "shop_replay_pass_3pack",
    title: "Replay Pass × 3",
    skuKind: "virtual",
    priceGems: 36,
    grantReplayTokenCount: 3,
    weeklyPurchaseLimit: 2,
  },
  {
    skuId: "shop_profile_flair_coin",
    title: "Weekly lobby flair",
    skuKind: "virtual",
    priceCoins: 150,
    weeklyPurchaseLimit: 1,
  },
  {
    skuId: "shop_emote_pack_gems",
    title: "Emote pack",
    skuKind: "virtual",
    priceGems: 24,
    weeklyPurchaseLimit: 3,
  },
];

export function mapCasualShopSkuRow(r: CasualShopSkuSeed) {
  return {
    skuId: r.skuId,
    title: r.title,
    skuKind: r.skuKind ?? ("virtual" as const),
    iapPriceLabel: r.iapPriceLabel,
    priceCoins: r.priceCoins,
    priceGems: r.priceGems,
    grantCoins: r.grantCoins,
    grantGems: r.grantGems,
    grantSkinId: r.grantSkinId,
    grantReplayTokenCount: r.grantReplayTokenCount,
    weeklyPurchaseLimit: r.weeklyPurchaseLimit,
  };
}
