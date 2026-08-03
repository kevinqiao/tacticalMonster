/** Convex `listActiveActivities` 行（与 casualPlatform schema 对齐，供前端订阅/UI） */

export type CasualActivityTarget =
  | { type: "global" }
  | { type: "tournament_match"; tournamentId?: string }
  | { type: "casual_shop_sku"; shopSkuId?: string };

export interface CasualActivityPublicRow {
  activityId: string;
  title: string;
  target: CasualActivityTarget;
  seasonId?: string;
  startsAt: number;
  endsAt: number;
  effects: {
    voucherCostMultiplier?: number;
    voucherCostDelta?: number;
    passXpMultiplier?: number;
    passXpDelta?: number;
    coinsCostMultiplier?: number;
    coinsCostDelta?: number;
    gemsCostMultiplier?: number;
    gemsCostDelta?: number;
    /** 法币 IAP 钻石到账基数修正（与后端 `fulfillIapShopPurchase` 一致） */
    iapGrantGemsMultiplier?: number;
    iapGrantGemsDelta?: number;
  };
}
