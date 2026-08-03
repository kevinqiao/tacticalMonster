export type CouponSource = "pass_run" | "campaign_settle";

export type CampaignCouponView = {
  couponId: string;
  code: string;
  campaignId: string;
  source?: CouponSource;
  /** pass_run：与历史 runTournamentId 对齐 */
  runTournamentId?: string;
  matchId?: string;
  settlementId?: string;
  rewardSnapshot?: {
    type?: string;
    displayText?: string;
    itemLabel?: string;
    amountCents?: number;
    percent?: number;
  };
  issuedAt: number;
  activatesAt?: number;
  expiresAt: number;
  status: string;
};

export type CampaignPlayHistoryEntry = {
  matchId: string;
  runTournamentId: string;
  gameType: string;
  mode: "solo" | "multi";
  campaignRewardMode: "pass_per_run" | "competitive_leaderboard" | null;
  score: number | null;
  rank: number | null;
  status: "open" | "finished" | "confirmed" | "settled" | "replaying";
  playedAt: number;
  startedAt: number;
  challengeSuccess: boolean | null;
  seedScoreThreshold: number | null;
  /** 积分排名：本局积分 delta */
  pointsDelta: number | null;
  /** 单局奖励：Portal match 快照（pass_run 回写） */
  rewardLabel?: string | null;
  rewardSyncStatus?: "none" | "pending" | "synced" | "failed" | null;
  /** 是否展示「战报」入口 */
  canOpenReport?: boolean;
};
