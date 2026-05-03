/**
 * 休闲统一奖励类型占位；后续按 casual-platform-battle-pass-skins-achievements 扩展 handler registry。
 */
export type CasualRewardKind = "coins" | "gems" | "seasonXp" | "seasonVoucher";

export interface CasualRewardGrant {
  kind: CasualRewardKind;
  amount: number;
  meta?: Record<string, unknown>;
}
