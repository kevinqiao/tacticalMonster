/**
 * 休闲统一奖励类型；`skin` 见 `casualSkinService.grantSkin`。
 */
export type CasualRewardKind = "coins" | "gems" | "seasonXp" | "seasonVoucher" | "skin";

export interface CasualRewardGrant {
  kind: CasualRewardKind;
  amount: number;
  skinId?: string;
  /** Pass 奖励按赛季解析，见 `resolveSeasonPassSkinId` */
  skinToken?: string;
  meta?: Record<string, unknown>;
}
