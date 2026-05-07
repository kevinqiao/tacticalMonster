/** 与 `casual_activities.target` 一致（判别联合） */
export type CasualActivityTarget =
  | { type: "global" }
  | { type: "tournament_match"; tournamentId?: string }
  | { type: "season_shelf_sku"; shelfSkuId?: string }
  | { type: "casual_shop_sku"; shopSkuId?: string };

export interface CasualActivitySeed {
  activityId: string;
  title: string;
  target: CasualActivityTarget;
  seasonId?: string;
  startsAt: number;
  endsAt: number;
  active: boolean;
  effects: {
    voucherCostMultiplier?: number;
    voucherCostDelta?: number;
    passXpMultiplier?: number;
    passXpDelta?: number;
    coinsCostMultiplier?: number;
    coinsCostDelta?: number;
    gemsCostMultiplier?: number;
    gemsCostDelta?: number;
    iapGrantGemsMultiplier?: number;
    iapGrantGemsDelta?: number;
  };
}

/**
 * 默认活动种子（当前留空，交由运营后台/脚本写入）。
 * 示例：
 * {
 *   activityId: "s1_challenge_wk1_discount",
 *   title: "W1 专场入场 5 折",
 *   target: { type: "tournament_match", tournamentId: "season_challenge_bb_1" },
 *   seasonId: "casual_s1",
 *   startsAt: 0,
 *   endsAt: 0,
 *   active: true,
 *   effects: { voucherCostMultiplier: 0.5 }
 * }
 */
export const DEFAULT_CASUAL_ACTIVITIES: CasualActivitySeed[] = [];
