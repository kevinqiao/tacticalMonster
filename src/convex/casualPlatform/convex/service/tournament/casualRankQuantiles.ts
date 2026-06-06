import type { CasualMatchSeedBinding } from "./casualMatchSeedBinding";

export type RankScoreFloorsByRank = Record<number, number>;

export type ScoreQuantiles = CasualMatchSeedBinding["scoreQuantiles"];

/** 与推荐、bot 补位、mixed rerank 共用的 9 档反序 key（名次 1 = p90 档） */
export const SCORE_QUANTILE_KEYS_DESC = [
  "p90",
  "p75",
  "p70",
  "p66",
  "p50",
  "p33",
  "p30",
  "p25",
  "p10",
] as const satisfies ReadonlyArray<keyof ScoreQuantiles>;

/** 为名次 1..maxPlayers 生成本场分数门槛：取反序 quantile 的前 maxPlayers 档 */
export function deriveRankScoreFloorsFromQuantiles(
  scoreQuantiles: ScoreQuantiles,
  maxPlayers: number
): RankScoreFloorsByRank {
  const out: RankScoreFloorsByRank = {};
  for (let rank = 1; rank <= maxPlayers; rank++) {
    const key = SCORE_QUANTILE_KEYS_DESC[rank - 1];
    out[rank] = scoreQuantiles[key];
  }
  return out;
}

/** score < p50：找最接近的分位档，反序索引 i（1-based）→ targetRank = min(i, maxPlayers) */
export function recommendTargetRankFromQuantileProximity(
  humanScore: number,
  scoreQuantiles: ScoreQuantiles,
  maxPlayers: number
): number {
  let bestIndex = SCORE_QUANTILE_KEYS_DESC.length;
  let bestDist = Number.POSITIVE_INFINITY;

  for (let i = 0; i < SCORE_QUANTILE_KEYS_DESC.length; i++) {
    const key = SCORE_QUANTILE_KEYS_DESC[i]!;
    const qScore = scoreQuantiles[key];
    const dist = Math.abs(humanScore - qScore);
    const index = i + 1;
    if (dist < bestDist || (dist === bestDist && index < bestIndex)) {
      bestDist = dist;
      bestIndex = index;
    }
  }

  return Math.min(bestIndex, maxPlayers);
}
