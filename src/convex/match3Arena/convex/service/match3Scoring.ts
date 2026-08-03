/**
 * Match-3 scoring — base clear score + combo multiplier at ingest.
 */

export const MATCH3_MATCH_TIME_LIMIT_SEC = 300;
export const MATCH3_BASE_CLEAR_SCORE = 10;

export function scoreForClearCount(cleared: number, comboIndex: number): number {
  if (cleared <= 0) return 0;
  const comboMultiplier = 1 + Math.max(0, comboIndex - 1) * 0.5;
  return Math.floor(cleared * MATCH3_BASE_CLEAR_SCORE * comboMultiplier);
}

export function computeMatch3TotalScore(baseScore: number): number {
  return Math.max(0, Math.floor(baseScore));
}

export function buildMatch3GameReport(baseScore: number) {
  const base = computeMatch3TotalScore(baseScore);
  return {
    baseScore: base,
    totalScore: base,
  };
}
