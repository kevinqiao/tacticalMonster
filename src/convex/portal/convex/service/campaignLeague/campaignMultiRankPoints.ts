import { PORTAL_MULTI_RANK_POINTS } from "../../data/portalTournamentConfigs";

/** Multi rank-points delta for campaign league (single source: PORTAL_MULTI_RANK_POINTS). */
export const CAMPAIGN_LEAGUE_MULTI_RANK_POINTS: Record<number, number> =
  PORTAL_MULTI_RANK_POINTS;

export const CAMPAIGN_LEAGUE_MULTI_RANK_WEIGHTS: ReadonlyArray<{
  rank: number;
  weight: number;
}> = [
  { rank: 1, weight: 30 },
  { rank: 2, weight: 25 },
  { rank: 3, weight: 20 },
  { rank: 4, weight: 15 },
  { rank: 5, weight: 10 },
];

export function campaignMultiRankPointsForPlace(rank: number): number {
  return CAMPAIGN_LEAGUE_MULTI_RANK_POINTS[rank] ?? 0;
}

export function campaignMultiRankPointsDeltaForPlace(rank: number): number {
  return campaignMultiRankPointsForPlace(rank);
}

export function campaignMultiRankPointsWeightTotal(): number {
  return CAMPAIGN_LEAGUE_MULTI_RANK_WEIGHTS.reduce((s, r) => s + r.weight, 0);
}

export function campaignMultiExpectedPointsPerMatch(persona: number): number {
  const total = campaignMultiRankPointsWeightTotal();
  let sum = 0;
  for (const row of CAMPAIGN_LEAGUE_MULTI_RANK_WEIGHTS) {
    sum += row.weight * campaignMultiRankPointsForPlace(row.rank);
  }
  const base = sum / total;
  return base * (0.82 + persona * 0.36);
}
