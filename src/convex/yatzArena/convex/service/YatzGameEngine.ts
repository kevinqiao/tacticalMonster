/**
 * Yatz game engine — deterministic dice from seed manifest (13×3 骰面表).
 */
import {
  YATZ_CATEGORIES,
  YATZ_DICE_COUNT,
  YATZ_ROUND_COUNT,
  YatzGameStatus,
  type YatzCategory,
  type YatzCategoryScores,
  type YatzGameState,
} from "../types/YatzTypes";
import {
  diceFromRoundManifest,
  expandYatzSeedManifest,
  YATZ_MANIFEST_POLICY_VERSION,
  type YatzSeedManifest,
} from "./yatzSeedManifest";
import {
  computeTotalScore,
  isYahtzeeRoll,
  scoreCategory,
} from "./yatzScoring";

const manifestCache = new Map<string, YatzSeedManifest>();

function manifestForSeed(seed: string): YatzSeedManifest {
  let cached = manifestCache.get(seed);
  if (!cached) {
    cached = expandYatzSeedManifest(seed);
    manifestCache.set(seed, cached);
  }
  return cached;
}

function emptyCategoryScores(): YatzCategoryScores {
  return {};
}

function usedCategories(scores: YatzCategoryScores): Set<YatzCategory> {
  return new Set(
    YATZ_CATEGORIES.filter((c) => scores[c] != null)
  );
}

export function createInitialGameState(seed: string, gameId: string): Omit<YatzGameState, "_id"> {
  return {
    gameId,
    seed,
    dice: [0, 0, 0, 0, 0],
    held: [false, false, false, false, false],
    rollCount: 0,
    roundIndex: 0,
    categoryScores: emptyCategoryScores(),
    yahtzeeBonus: 0,
    yahtzeeScored: false,
    manifestPolicyVersion: YATZ_MANIFEST_POLICY_VERSION,
    score: 0,
    status: YatzGameStatus.PLAYING,
    recordedOps: [],
  };
}

export function refreshTotalScore(state: Pick<YatzGameState, "categoryScores" | "yahtzeeBonus">): number {
  return computeTotalScore(state.categoryScores, state.yahtzeeBonus);
}

export function rollDice(state: YatzGameState): { ok: true; state: YatzGameState } | { ok: false; error: string } {
  if (state.status !== YatzGameStatus.PLAYING) return { ok: false, error: "not_playing" };
  if (state.rollCount >= 3) return { ok: false, error: "max_rolls" };
  if (state.roundIndex >= YATZ_ROUND_COUNT) return { ok: false, error: "game_over" };

  const seed = state.seed ?? state.gameId;
  const manifest = manifestForSeed(seed);
  const rollSlot = state.rollCount as 0 | 1 | 2;
  const dice = diceFromRoundManifest(
    manifest,
    state.roundIndex,
    rollSlot,
    state.dice,
    state.held
  );
  const held = [...state.held];
  const rollCount = state.rollCount + 1;

  const next: YatzGameState = {
    ...state,
    dice: [...dice],
    held: rollCount === 1 ? [false, false, false, false, false] : held,
    rollCount,
  };
  return { ok: true, state: next };
}

export function toggleHold(
  state: YatzGameState,
  index: number
): { ok: true; state: YatzGameState } | { ok: false; error: string } {
  if (state.status !== YatzGameStatus.PLAYING) return { ok: false, error: "not_playing" };
  if (state.rollCount === 0) return { ok: false, error: "roll_first" };
  if (index < 0 || index >= YATZ_DICE_COUNT) return { ok: false, error: "bad_index" };

  const held = [...state.held];
  held[index] = !held[index];
  return { ok: true, state: { ...state, held } };
}

export function pickCategory(
  state: YatzGameState,
  category: YatzCategory
): { ok: true; state: YatzGameState } | { ok: false; error: string } {
  if (state.status !== YatzGameStatus.PLAYING) return { ok: false, error: "not_playing" };
  if (state.rollCount === 0) return { ok: false, error: "roll_first" };
  if (usedCategories(state.categoryScores).has(category)) return { ok: false, error: "category_used" };

  const dice = state.dice;
  const points = scoreCategory(dice, category);
  const categoryScores: YatzCategoryScores = { ...state.categoryScores, [category]: points };

  let yahtzeeBonus = state.yahtzeeBonus;
  let yahtzeeScored = state.yahtzeeScored;
  if (category === "yahtzee" && points === 50) {
    yahtzeeScored = true;
  } else if (isYahtzeeRoll(dice) && yahtzeeScored) {
    yahtzeeBonus += 100;
  }

  const roundIndex = state.roundIndex + 1;
  const completed = roundIndex >= YATZ_ROUND_COUNT;
  const score = computeTotalScore(categoryScores, yahtzeeBonus);

  const next: YatzGameState = {
    ...state,
    categoryScores,
    yahtzeeBonus,
    yahtzeeScored,
    roundIndex,
    rollCount: 0,
    held: [false, false, false, false, false],
    dice: [0, 0, 0, 0, 0],
    score,
    status: completed ? YatzGameStatus.COMPLETED : YatzGameStatus.PLAYING,
  };
  return { ok: true, state: next };
}

export { expandYatzSeedManifest, YATZ_MANIFEST_POLICY_VERSION } from "./yatzSeedManifest";
export { simulateGreedyGame } from "./seedPool/yatzGreedyHoldPolicy";
