/**
 * Portal 多人竞技名次积分（与 `portalTournamentConfigs.ts` PORTAL_MULTI_RANK_POINTS 对齐）。
 * 活动累计榜真人与 Bot 共用同一套步进。
 */
export const CAMPAIGN_MULTI_RANK_POINTS: Record<number, number> = {
  1: 5,
  2: 3,
  3: 1,
  4: -1,
  5: -2,
};

/** 5 人桌名次权重（与 Portal CASUAL_RANK_RATES_5 一致） */
export const CAMPAIGN_MULTI_RANK_WEIGHTS: ReadonlyArray<{ rank: number; weight: number }> = [
  { rank: 1, weight: 30 },
  { rank: 2, weight: 25 },
  { rank: 3, weight: 20 },
  { rank: 4, weight: 15 },
  { rank: 5, weight: 10 },
];

export function campaignMultiRankPointsForPlace(rank: number): number {
  return CAMPAIGN_MULTI_RANK_POINTS[rank] ?? 0;
}

/** 按 Portal 规则：每局名次 → 累计 rankPoints 增量（可负） */
export function campaignMultiRankPointsDeltaForPlace(rank: number): number {
  return campaignMultiRankPointsForPlace(rank);
}

export function campaignMultiRankPointsWeightTotal(): number {
  return CAMPAIGN_MULTI_RANK_WEIGHTS.reduce((s, r) => s + r.weight, 0);
}

export function campaignMultiExpectedPointsPerMatch(persona: number): number {
  const total = campaignMultiRankPointsWeightTotal();
  let sum = 0;
  for (const row of CAMPAIGN_MULTI_RANK_WEIGHTS) {
    sum += row.weight * campaignMultiRankPointsForPlace(row.rank);
  }
  const base = sum / total;
  return base * (0.82 + persona * 0.36);
}
