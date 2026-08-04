/**
 * Greedy hold + target selection for seed-pool / watch bot.
 * Manifest fixed to seedId; persona + seeded policy RNG supply decision variance.
 */
import {
  YATZ_CATEGORIES,
  YATZ_DICE_COUNT,
  YATZ_ROUND_COUNT,
  YatzGameStatus,
  type YatzCategory,
  type YatzCategoryScores,
  type YatzGameState,
} from "../../types/YatzTypes";
import { scoreCategory } from "../yatzScoring";
import {
  createInitialGameState,
  pickCategory,
  rollDice,
  toggleHold,
} from "../YatzGameEngine";
import {
  personaForRollout,
  type YatzDecisionKnobs,
  type YatzPersona,
  type YatzStochasticKnobs,
} from "./yatzHumanPersonas";
import type { YatzRecordedStep } from "./yatzRecordedOpTypes";
import {
  createYatzPolicyContext,
  type YatzPolicyContext,
} from "./yatzStochasticPolicy";

const UPPER_FACE: Partial<Record<YatzCategory, number>> = {
  ones: 1,
  twos: 2,
  threes: 3,
  fours: 4,
  fives: 5,
  sixes: 6,
};

const BIG_BOXES: readonly YatzCategory[] = [
  "yahtzee",
  "large_straight",
  "four_kind",
  "full_house",
  "small_straight",
  "three_kind",
];

const SAFE_BOXES: readonly YatzCategory[] = [
  "sixes",
  "fives",
  "fours",
  "chance",
  "threes",
  "twos",
  "ones",
];

function countsByFace(dice: readonly number[]): number[] {
  const c = [0, 0, 0, 0, 0, 0, 0];
  for (const d of dice) {
    if (d >= 1 && d <= 6) c[d]! += 1;
  }
  return c;
}

function dominantFace(dice: readonly number[]): number {
  const c = countsByFace(dice);
  let bestFace = 6;
  let bestCount = -1;
  for (let f = 6; f >= 1; f--) {
    if ((c[f] ?? 0) > bestCount) {
      bestCount = c[f]!;
      bestFace = f;
    }
  }
  return bestFace;
}

function uniqueSorted(dice: readonly number[]): number[] {
  return [...new Set(dice.filter((d) => d >= 1 && d <= 6))].sort((a, b) => a - b);
}

function straightKeepFaces(dice: readonly number[]): Set<number> {
  const uniq = uniqueSorted(dice);
  if (uniq.length === 0) return new Set();
  let best: number[] = [uniq[0]!];
  let cur: number[] = [uniq[0]!];
  for (let i = 1; i < uniq.length; i++) {
    if (uniq[i] === uniq[i - 1]! + 1) {
      cur.push(uniq[i]!);
    } else {
      if (cur.length > best.length) best = cur;
      cur = [uniq[i]!];
    }
  }
  if (cur.length > best.length) best = cur;
  return new Set(best);
}

function bestImmediate(
  dice: readonly number[],
  available: readonly YatzCategory[]
): { cat: YatzCategory; score: number } {
  let cat = available[0]!;
  let score = -1;
  for (const c of available) {
    const s = scoreCategory([...dice], c);
    if (s > score) {
      score = s;
      cat = c;
    }
  }
  return { cat, score };
}

function preferOrder(prefer: YatzDecisionKnobs["pickPrefer"]): readonly YatzCategory[] {
  if (prefer === "big") return BIG_BOXES;
  if (prefer === "safe") return SAFE_BOXES;
  return [];
}

function pushUnique(list: YatzCategory[], cat: YatzCategory | undefined): void {
  if (cat == null) return;
  if (!list.includes(cat)) list.push(cat);
}

function jitterInt(base: number, amp: number, rng: () => number): number {
  if (amp <= 0) return base;
  return Math.round(base + (rng() * 2 - 1) * amp);
}

function applyHoldNoise(
  mask: readonly boolean[],
  rng: () => number,
  rate: number
): boolean[] {
  const out = [...mask];
  if (rate <= 0 || rng() >= rate) return out;
  const i = Math.floor(rng() * YATZ_DICE_COUNT);
  out[i] = !out[i];
  return out;
}

export function holdMaskForTarget(dice: readonly number[], target: YatzCategory): boolean[] {
  const mask = Array.from({ length: YATZ_DICE_COUNT }, () => false);
  const face = UPPER_FACE[target];
  if (face != null) {
    for (let i = 0; i < YATZ_DICE_COUNT; i++) {
      mask[i] = dice[i] === face;
    }
    return mask;
  }

  if (target === "chance") {
    for (let i = 0; i < YATZ_DICE_COUNT; i++) {
      mask[i] = (dice[i] ?? 0) >= 5;
    }
    return mask;
  }

  if (target === "small_straight" || target === "large_straight") {
    const keep = straightKeepFaces(dice);
    const used = new Set<number>();
    for (let i = 0; i < YATZ_DICE_COUNT; i++) {
      const d = dice[i]!;
      if (keep.has(d) && !used.has(d)) {
        mask[i] = true;
        used.add(d);
      }
    }
    return mask;
  }

  if (target === "full_house") {
    const c = countsByFace(dice);
    const faces = [1, 2, 3, 4, 5, 6].sort((a, b) => (c[b]! - c[a]!) * 10 + (b - a));
    const primary = faces[0]!;
    const secondary = faces.find((f) => f !== primary && c[f]! > 0) ?? primary;
    for (let i = 0; i < YATZ_DICE_COUNT; i++) {
      const d = dice[i]!;
      mask[i] = d === primary || d === secondary;
    }
    return mask;
  }

  const dom = dominantFace(dice);
  for (let i = 0; i < YATZ_DICE_COUNT; i++) {
    mask[i] = dice[i] === dom;
  }
  return mask;
}

export type ChooseDecisionOptions = {
  rng?: () => number;
  stochastic?: YatzStochasticKnobs;
};

export function chooseGreedyTarget(
  dice: readonly number[],
  available: readonly YatzCategory[],
  knobs: YatzDecisionKnobs = personaForRollout(1).decision,
  opts?: ChooseDecisionOptions
): YatzCategory {
  if (available.length === 0) return "chance";

  const rng = opts?.rng;
  const stoch = opts?.stochastic;
  const bankMin =
    rng && stoch
      ? Math.max(0, jitterInt(knobs.bankImmediateMin, stoch.bankJitterAmp, rng))
      : knobs.bankImmediateMin;

  const { cat: bestCat, score: bestScore } = bestImmediate(dice, available);
  const skipBank = Boolean(rng && stoch && rng() < stoch.skipBankRate);
  if (bestScore >= bankMin && !skipBank) return bestCat;

  const c = countsByFace(dice);
  const dom = dominantFace(dice);
  const domCount = c[dom] ?? 0;
  const keep = straightKeepFaces(dice);
  const candidates: YatzCategory[] = [];

  if (domCount >= knobs.minDomForYahtzeeChase) pushUnique(candidates, "yahtzee");
  if (domCount >= 3) pushUnique(candidates, "four_kind");
  if (domCount >= 2) pushUnique(candidates, "three_kind");
  if (domCount >= 2) pushUnique(candidates, "full_house");
  if (keep.size >= knobs.minStraightKeepForLarge) pushUnique(candidates, "large_straight");
  if (keep.size >= knobs.minStraightKeepForSmall) pushUnique(candidates, "small_straight");

  const upper = (
    ["sixes", "fives", "fours", "threes", "twos", "ones"] as YatzCategory[]
  ).find((cat) => UPPER_FACE[cat] === dom && available.includes(cat));
  if (upper && domCount >= 1) pushUnique(candidates, upper);

  pushUnique(candidates, available.includes("chance") ? "chance" : undefined);
  if (bestScore > 0) pushUnique(candidates, bestCat);
  pushUnique(candidates, available[0]);

  const open = candidates.filter((cat) => available.includes(cat));
  if (open.length === 0) return available[0]!;

  if (rng && stoch && open.length > 1 && rng() < stoch.exploreTargetRate) {
    const top = open.slice(0, Math.min(3, open.length));
    return top[Math.floor(rng() * top.length)]!;
  }
  return open[0]!;
}

export function availableCategories(scores: YatzCategoryScores): YatzCategory[] {
  return YATZ_CATEGORIES.filter((c) => scores[c] == null);
}

export function chooseBestPickCategory(
  dice: readonly number[],
  available: readonly YatzCategory[],
  knobs: YatzDecisionKnobs = personaForRollout(1).decision,
  opts?: ChooseDecisionOptions
): YatzCategory {
  if (available.length === 0) return "chance";

  const rng = opts?.rng;
  const stoch = opts?.stochastic;
  const slack =
    rng && stoch
      ? Math.max(0, jitterInt(knobs.pickSlack, stoch.pickSlackJitterAmp, rng))
      : knobs.pickSlack;

  const { score: bestScore } = bestImmediate(dice, available);
  const floor = Math.max(0, bestScore - slack);
  const contenders = available.filter((c) => scoreCategory([...dice], c) >= floor);
  const pool = contenders.length > 0 ? contenders : available;

  if (rng && stoch && pool.length > 1 && rng() < stoch.explorePickRate) {
    return pool[Math.floor(rng() * pool.length)]!;
  }

  const order = preferOrder(knobs.pickPrefer);
  if (order.length > 0 && pool.length > 1) {
    for (const preferred of order) {
      if (pool.includes(preferred)) return preferred;
    }
  }

  return bestImmediate(dice, pool).cat;
}

export function applyHoldMask(
  state: YatzGameState,
  mask: readonly boolean[],
  onStep?: (step: YatzRecordedStep) => void
): YatzGameState {
  let next = state;
  for (let i = 0; i < YATZ_DICE_COUNT; i++) {
    const want = mask[i] ?? false;
    if (next.held[i] === want) continue;
    const toggled = toggleHold(next, i);
    if (!toggled.ok) continue;
    next = toggled.state;
    onStep?.({ op: "toggle_hold", index: i });
  }
  return next;
}

function isPolicyContext(ctx: YatzPolicyContext | YatzPersona): ctx is YatzPolicyContext {
  return typeof (ctx as YatzPolicyContext).rng === "function" && "persona" in ctx;
}

/**
 * @param ctx Full policy context (persona + RNG) for pool/watch bots.
 *            Passing a bare persona keeps decisions deterministic (unit tests).
 */
export function playGreedyTurn(
  state: YatzGameState,
  onStep?: (step: YatzRecordedStep) => void,
  ctx: YatzPolicyContext | YatzPersona = personaForRollout(1)
): YatzGameState | null {
  const policy = isPolicyContext(ctx) ? ctx : null;
  const persona = policy?.persona ?? (ctx as YatzPersona);
  const knobs = persona.decision;
  const decideOpts: ChooseDecisionOptions | undefined = policy
    ? { rng: policy.rng, stochastic: persona.stochastic }
    : undefined;

  let next = state;

  const first = rollDice(next);
  if (!first.ok) return null;
  next = first.state;
  onStep?.({ op: "roll" });

  while (next.rollCount < 3) {
    const available = availableCategories(next.categoryScores);
    if (available.length === 0) return null;
    const target = chooseGreedyTarget(next.dice, available, knobs, decideOpts);
    let mask = holdMaskForTarget(next.dice, target);
    if (policy) {
      mask = applyHoldNoise(mask, policy.rng, persona.stochastic.holdNoiseRate);
    }
    next = applyHoldMask(next, mask, onStep);

    const rolled = rollDice(next);
    if (!rolled.ok) break;
    next = rolled.state;
    onStep?.({ op: "roll" });
  }

  const available = availableCategories(next.categoryScores);
  if (available.length === 0) return null;
  const bestCat = chooseBestPickCategory(next.dice, available, knobs, decideOpts);
  const picked = pickCategory(next, bestCat);
  if (!picked.ok) return null;
  next = picked.state;
  onStep?.({ op: "pick_category", category: bestCat });
  return next;
}

export type SimulateGreedyOptions = {
  /** Persona + policy RNG via createYatzPolicyContext. Default standard (index 1). */
  rolloutIndex?: number;
};

/** Full-game bot for seed pool rollouts. Dice from `seedId`; decisions from rolloutIndex. */
export function simulateGreedyGame(
  seedId: string,
  opts?: SimulateGreedyOptions
): { finalScore: number; completed: boolean; decisionStyle: YatzPersona["id"] } {
  const rolloutIndex = opts?.rolloutIndex ?? 1;
  const policy = createYatzPolicyContext(seedId, rolloutIndex);
  let state = createInitialGameState(seedId, `sim_${seedId}_${rolloutIndex}`) as YatzGameState;

  while (state.status === YatzGameStatus.PLAYING && state.roundIndex < YATZ_ROUND_COUNT) {
    const next = playGreedyTurn(state, undefined, policy);
    if (!next) break;
    state = next;
  }

  return {
    finalScore: state.score,
    completed: state.status === YatzGameStatus.COMPLETED,
    decisionStyle: policy.persona.id,
  };
}
