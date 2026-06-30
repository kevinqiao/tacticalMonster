export type CampaignCouponView = {
  couponId: string;
  code: string;
  campaignId: string;
  rewardSnapshot?: {
    type?: string;
    displayText?: string;
    itemLabel?: string;
    amountCents?: number;
    percent?: number;
  };
  issuedAt: number;
  expiresAt: number;
  status: string;
};

export type CampaignPlayHistoryEntry = {
  matchId: string;
  runTournamentId: string;
  gameType: string;
  score: number | null;
  rank: number | null;
  status: "open" | "finished" | "confirmed" | "settled" | "replaying";
  playedAt: number;
  startedAt: number;
};
