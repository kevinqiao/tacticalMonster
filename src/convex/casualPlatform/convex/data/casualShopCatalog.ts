/**
 * 普通商店货架（`casual_shop_skus`）静态配表。
 * 与 `seedShopSkusIfEmpty` / `listActiveShopSkus`（DB 为空时的回退）同源。
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
}

/** 三档钻→币 + 三档法币→钻（展示）；运营改价改量只改此表后重新 deploy + 必要时迁移 DB */
export const CASUAL_SHOP_SKU_CATALOG: CasualShopSkuSeed[] = [
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
    skuId: "shop_skin_steam_punk",
    title: "Steam Punk Card Skin",
    skuKind: "skin",
    priceGems: 280,
    grantSkinId: "shop_steam_punk",
  },
  {
    skuId: "shop_replay_pass_3pack",
    title: "Replay Pass × 3",
    skuKind: "virtual",
    priceGems: 15,
    grantReplayTokenCount: 3,
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
  };
}
