import type { PortalWeeklyLeagueTierView } from "../service/usePortalManager";

export type PortalWeeklyCloseDisplay = {
  outcome?: "promote" | "safe" | "demote";
  finalRank?: number;
  pendingRewards?: { coins?: number };
};

/** 结算弹窗展示数据：优先未领奖励，其次未读结算摘要。 */
export function resolvePortalWeeklyCloseDisplay(
  league: PortalWeeklyLeagueTierView | null | undefined
): PortalWeeklyCloseDisplay | null {
  if (!league) return null;
  if (league.unclaimedRewards) {
    return {
      outcome: league.unclaimedRewards.outcome,
      finalRank: league.unclaimedRewards.finalRank,
      pendingRewards: { coins: league.unclaimedRewards.coins },
    };
  }
  if (league.unreadCloseResult) {
    return {
      outcome: league.lastOutcome,
      finalRank: league.lastFinalRank,
    };
  }
  return null;
}
