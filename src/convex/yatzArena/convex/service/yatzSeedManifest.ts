/**
 * Yatz seed manifest — 13 轮 × (roll1 + reroll2Pool + reroll3Pool)。
 *
 * 同 seedId 全员展开同一份 manifest；重掷只从未保留位从左到右消费 pool。
 * 变更规则须 bump YATZ_MANIFEST_POLICY_VERSION 并重跑 seed pool。
 */
import {
  YATZ_DICE_COUNT,
  YATZ_ROUND_COUNT,
} from "../types/YatzTypes";
import { createSeededRandom } from "../utils/seedRandom";

export const YATZ_MANIFEST_POLICY_VERSION = "yatz-manifest-v1";

export type YatzDice5 = [number, number, number, number, number];

export type YatzRoundManifest = {
  roll1: YatzDice5;
  reroll2Pool: YatzDice5;
  reroll3Pool: YatzDice5;
};

export type YatzSeedManifest = {
  policyVersion: typeof YATZ_MANIFEST_POLICY_VERSION;
  seedId: string;
  rounds: YatzRoundManifest[];
};

function rollOneDie(rng: () => number): number {
  return 1 + Math.floor(rng() * 6);
}

function rollFiveDice(rng: () => number): YatzDice5 {
  return [
    rollOneDie(rng),
    rollOneDie(rng),
    rollOneDie(rng),
    rollOneDie(rng),
    rollOneDie(rng),
  ];
}

function manifestRoundSeed(base: string, roundIndex: number, part: string): string {
  return `${base}:r${roundIndex}:${part}`;
}

/** 从 seedId 展开整局 manifest（纯函数，不落库）。 */
export function expandYatzSeedManifest(seedId: string): YatzSeedManifest {
  const base = `${seedId}:${YATZ_MANIFEST_POLICY_VERSION}`;
  const rounds: YatzRoundManifest[] = [];
  for (let r = 0; r < YATZ_ROUND_COUNT; r++) {
    rounds.push({
      roll1: rollFiveDice(createSeededRandom(manifestRoundSeed(base, r, "roll1"))),
      reroll2Pool: rollFiveDice(createSeededRandom(manifestRoundSeed(base, r, "pool2"))),
      reroll3Pool: rollFiveDice(createSeededRandom(manifestRoundSeed(base, r, "pool3"))),
    });
  }
  return {
    policyVersion: YATZ_MANIFEST_POLICY_VERSION,
    seedId,
    rounds,
  };
}

/** 第 2/3 次掷骰：未保留位按 index 0→4 依次取 pool。 */
export function applyRerollPool(
  current: readonly number[],
  held: readonly boolean[],
  pool: readonly number[]
): number[] {
  if (current.length !== YATZ_DICE_COUNT || held.length !== YATZ_DICE_COUNT) {
    throw new Error("applyRerollPool: bad dice/held length");
  }
  let poolIdx = 0;
  return current.map((die, i) => {
    if (held[i]) return die;
    if (poolIdx >= pool.length) {
      throw new Error("applyRerollPool: pool exhausted");
    }
    return pool[poolIdx++]!;
  });
}

export function diceFromRoundManifest(
  manifest: YatzSeedManifest,
  roundIndex: number,
  rollCount: 0 | 1 | 2,
  currentDice: readonly number[],
  held: readonly boolean[]
): YatzDice5 {
  const round = manifest.rounds[roundIndex];
  if (!round) {
    throw new Error(`diceFromRoundManifest: missing round ${roundIndex}`);
  }
  if (rollCount === 0) {
    return [...round.roll1] as YatzDice5;
  }
  if (rollCount === 1) {
    return applyRerollPool(currentDice, held, round.reroll2Pool) as YatzDice5;
  }
  return applyRerollPool(currentDice, held, round.reroll3Pool) as YatzDice5;
}
