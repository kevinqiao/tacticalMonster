import {
  YATZ_CATEGORIES,
  type YatzCategory,
  type YatzCategoryScores,
} from "../types/YatzTypes";

export const YATZ_UPPER_BONUS_THRESHOLD = 63;
export const YATZ_UPPER_BONUS_POINTS = 35;

function countDice(dice: number[]): Record<number, number> {
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  for (const d of dice) {
    if (d >= 1 && d <= 6) counts[d] = (counts[d] ?? 0) + 1;
  }
  return counts;
}

function sumDice(dice: number[]): number {
  return dice.reduce((a, b) => a + b, 0);
}

export function isYahtzeeRoll(dice: number[]): boolean {
  if (dice.length !== 5) return false;
  return dice.every((d) => d === dice[0] && d >= 1 && d <= 6);
}

export function hasSmallStraight(dice: number[]): boolean {
  const set = new Set(dice);
  return (
    (set.has(1) && set.has(2) && set.has(3) && set.has(4)) ||
    (set.has(2) && set.has(3) && set.has(4) && set.has(5)) ||
    (set.has(3) && set.has(4) && set.has(5) && set.has(6))
  );
}

export function hasLargeStraight(dice: number[]): boolean {
  const sorted = [...dice].sort((a, b) => a - b).join(",");
  return sorted === "1,2,3,4,5" || sorted === "2,3,4,5,6";
}

export function scoreCategory(dice: number[], category: YatzCategory): number {
  const counts = countDice(dice);
  const total = sumDice(dice);
  switch (category) {
    case "ones":
      return counts[1] * 1;
    case "twos":
      return counts[2] * 2;
    case "threes":
      return counts[3] * 3;
    case "fours":
      return counts[4] * 4;
    case "fives":
      return counts[5] * 5;
    case "sixes":
      return counts[6] * 6;
    case "three_kind":
      return Object.values(counts).some((c) => c >= 3) ? total : 0;
    case "four_kind":
      return Object.values(counts).some((c) => c >= 4) ? total : 0;
    case "full_house":
      return Object.values(counts).includes(3) && Object.values(counts).includes(2) ? 25 : 0;
    case "small_straight":
      return hasSmallStraight(dice) ? 30 : 0;
    case "large_straight":
      return hasLargeStraight(dice) ? 40 : 0;
    case "yahtzee":
      return isYahtzeeRoll(dice) ? 50 : 0;
    case "chance":
      return total;
    default:
      return 0;
  }
}

export function computeUpperSectionTotal(scores: YatzCategoryScores): number {
  return (
    (scores.ones ?? 0) +
    (scores.twos ?? 0) +
    (scores.threes ?? 0) +
    (scores.fours ?? 0) +
    (scores.fives ?? 0) +
    (scores.sixes ?? 0)
  );
}

export function computeUpperBonus(scores: YatzCategoryScores): number {
  return computeUpperSectionTotal(scores) >= YATZ_UPPER_BONUS_THRESHOLD
    ? YATZ_UPPER_BONUS_POINTS
    : 0;
}

export function computeLowerSectionTotal(scores: YatzCategoryScores): number {
  let total = 0;
  for (const cat of YATZ_CATEGORIES) {
    if (
      cat === "ones" ||
      cat === "twos" ||
      cat === "threes" ||
      cat === "fours" ||
      cat === "fives" ||
      cat === "sixes"
    ) {
      continue;
    }
    total += scores[cat] ?? 0;
  }
  return total;
}

export function computeTotalScore(
  categoryScores: YatzCategoryScores,
  yahtzeeBonus: number
): number {
  const upper = computeUpperSectionTotal(categoryScores);
  const lower = computeLowerSectionTotal(categoryScores);
  const upperBonus = computeUpperBonus(categoryScores);
  return upper + lower + upperBonus + yahtzeeBonus;
}

export function resolveCasualIngestScoreFromRow(game: { score?: number }): number {
  return Math.max(0, Math.floor(Number(game.score ?? 0)));
}
