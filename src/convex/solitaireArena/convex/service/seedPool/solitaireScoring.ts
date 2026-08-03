/**
 * Solitaire Cash (Papaya) scoring — verified rules:
 * - draw: 0
 * - recycle: -20
 * - waste → foundation: +100
 * - waste → tableau: +20
 * - tableau → foundation: +120
 * - tableau flip (uncover): +20 per card
 * - foundation → tableau: -100
 * Time bonus at end: baseScore × timeRemaining / 5min
 */

export const SOLITAIRE_CASH_RECYCLE_SCORE = -20;
export const SOLITAIRE_CASH_WASTE_TO_FOUNDATION = 100;
export const SOLITAIRE_CASH_WASTE_TO_TABLEAU = 20;
export const SOLITAIRE_CASH_TABLEAU_TO_FOUNDATION = 120;
export const SOLITAIRE_CASH_TABLEAU_FLIP = 20;
export const SOLITAIRE_CASH_FOUNDATION_TO_TABLEAU = -100;
export const SOLITAIRE_CASH_MAX_BASE_SCORE = 6100;
export const SOLITAIRE_MATCH_TIME_LIMIT_SEC = 300;

export function scoreDeltaForDraw(): number {
  return 0;
}

export function scoreDeltaForRecycle(): number {
  return SOLITAIRE_CASH_RECYCLE_SCORE;
}

export function scoreDeltaForMove(from: string, to: string, flipCount: number): number {
  let delta = 0;
  const toFoundation = to.startsWith("foundation-");
  const toTableau = to.startsWith("tableau-");
  const fromWaste = from === "waste";
  const fromTableau = from.startsWith("tableau-");
  const fromFoundation = from.startsWith("foundation-");

  if (fromFoundation && toTableau) {
    delta += SOLITAIRE_CASH_FOUNDATION_TO_TABLEAU;
  } else if (fromWaste && toFoundation) {
    delta += SOLITAIRE_CASH_WASTE_TO_FOUNDATION;
  } else if (fromWaste && toTableau) {
    delta += SOLITAIRE_CASH_WASTE_TO_TABLEAU;
  } else if (fromTableau && toFoundation) {
    delta += SOLITAIRE_CASH_TABLEAU_TO_FOUNDATION;
  }

  if (flipCount > 0 && fromTableau) {
    delta += flipCount * SOLITAIRE_CASH_TABLEAU_FLIP;
  }

  return delta;
}

export function computeSolitaireCashTimeBonus(
  baseScore: number,
  timeRemainingSec: number,
  matchLimitSec: number = SOLITAIRE_MATCH_TIME_LIMIT_SEC
): number {
  if (baseScore <= 0 || timeRemainingSec <= 0 || matchLimitSec <= 0) return 0;
  return Math.floor((baseScore * timeRemainingSec) / matchLimitSec);
}

export function computeSolitaireCashTotalScore(
  baseScore: number,
  elapsedSec: number,
  matchLimitSec: number = SOLITAIRE_MATCH_TIME_LIMIT_SEC
): number {
  const elapsed = Math.max(0, Math.min(elapsedSec, matchLimitSec));
  const timeRemaining = Math.max(0, matchLimitSec - elapsed);
  return baseScore + computeSolitaireCashTimeBonus(baseScore, timeRemaining, matchLimitSec);
}

export function resolveLiveGameElapsedSec(
  playStartedAtMs: number | undefined,
  nowMs: number = Date.now()
): number {
  if (playStartedAtMs == null) return 0;
  return Math.max(0, (nowMs - playStartedAtMs) / 1000);
}

export function buildSolitaireCashGameReport(
  baseScore: number,
  elapsedSec: number,
  matchLimitSec: number = SOLITAIRE_MATCH_TIME_LIMIT_SEC
): {
  baseScore: number;
  timeBonus: number;
  completeBonus: number;
  totalScore: number;
} {
  const elapsed = Math.max(0, Math.min(elapsedSec, matchLimitSec));
  const timeRemaining = Math.max(0, matchLimitSec - elapsed);
  const timeBonus = computeSolitaireCashTimeBonus(baseScore, timeRemaining, matchLimitSec);
  return {
    baseScore,
    timeBonus,
    completeBonus: 0,
    totalScore: baseScore + timeBonus,
  };
}
