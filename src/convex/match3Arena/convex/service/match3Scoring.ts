/**
 * Match-3 scoring — base clear score + combo multiplier + time bonus at ingest.
 */

export const MATCH3_MATCH_TIME_LIMIT_SEC = 180;
export const MATCH3_BASE_CLEAR_SCORE = 10;

export function scoreForClearCount(cleared: number, comboIndex: number): number {
  if (cleared <= 0) return 0;
  const comboMultiplier = 1 + Math.max(0, comboIndex - 1) * 0.5;
  return Math.floor(cleared * MATCH3_BASE_CLEAR_SCORE * comboMultiplier);
}

export function computeMatch3TimeBonus(
  baseScore: number,
  timeRemainingSec: number,
  matchLimitSec: number = MATCH3_MATCH_TIME_LIMIT_SEC
): number {
  if (baseScore <= 0 || timeRemainingSec <= 0 || matchLimitSec <= 0) return 0;
  return Math.floor((baseScore * timeRemainingSec) / matchLimitSec);
}

export function computeMatch3TotalScore(
  baseScore: number,
  elapsedSec: number,
  matchLimitSec: number = MATCH3_MATCH_TIME_LIMIT_SEC
): number {
  const elapsed = Math.max(0, Math.min(elapsedSec, matchLimitSec));
  const timeRemaining = Math.max(0, matchLimitSec - elapsed);
  return baseScore + computeMatch3TimeBonus(baseScore, timeRemaining, matchLimitSec);
}

export function resolveLiveGameElapsedSec(
  playStartedAtMs: number | undefined,
  nowMs: number = Date.now()
): number {
  if (playStartedAtMs == null) return 0;
  return Math.max(0, (nowMs - playStartedAtMs) / 1000);
}

export function buildMatch3GameReport(baseScore: number, elapsedSec: number) {
  const base = Math.max(0, Math.floor(baseScore));
  const elapsed = Math.min(MATCH3_MATCH_TIME_LIMIT_SEC, Math.max(0, elapsedSec));
  const timeRemainingSec = Math.max(0, MATCH3_MATCH_TIME_LIMIT_SEC - elapsed);
  const timeBonus = computeMatch3TimeBonus(base, timeRemainingSec);
  return {
    baseScore: base,
    timeBonus,
    totalScore: base + timeBonus,
    elapsedSec: elapsed,
    timeRemainingSec,
    matchLimitSec: MATCH3_MATCH_TIME_LIMIT_SEC,
  };
}
