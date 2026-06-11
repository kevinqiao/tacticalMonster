export type ScoreQuantiles = {
  p10: number;
  p25: number;
  p30: number;
  p33: number;
  p50: number;
  p66: number;
  p70: number;
  p75: number;
  p90: number;
};

export type RankScoreFloorsByRank = Record<number, number>;

/** 9 档反序 key（名次 1 = p90 档） */
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

/** 为名次 1..maxPlayers 生成本场分数门槛：取反序 quantile，名次越靠后门槛 strictly 更低 */
export function deriveRankScoreFloorsFromQuantiles(
  scoreQuantiles: ScoreQuantiles,
  maxPlayers: number
): RankScoreFloorsByRank {
  const out: RankScoreFloorsByRank = {};
  let keyCursor = 0;
  let prevFloor = Number.POSITIVE_INFINITY;
  for (let rank = 1; rank <= maxPlayers; rank++) {
    let floor: number | undefined;
    while (keyCursor < SCORE_QUANTILE_KEYS_DESC.length) {
      const key = SCORE_QUANTILE_KEYS_DESC[keyCursor]!;
      keyCursor += 1;
      const candidate = scoreQuantiles[key];
      if (rank === 1 || candidate < prevFloor) {
        floor = candidate;
        break;
      }
    }
    if (floor == null) {
      floor = prevFloor - 5;
    }
    out[rank] = floor;
    prevFloor = floor;
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
