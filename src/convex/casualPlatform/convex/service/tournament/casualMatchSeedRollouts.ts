import type { ScoreBand } from "../bridge/casualMatchSeedBridge";
import {
  scoreForRankSlot,
  type BotScoreSlot,
} from "./casualBotDifficultyService";

export type { BotScoreSlot };

export type RolloutPick = { rolloutIndex: number; finalScore: number };

function pseudoUnit(seed: number, i: number): number {
  let x = Math.imul(seed ^ (i * 374761393), 2654435761);
  x ^= x >>> 13;
  x ^= x << 17;
  x ^= x >>> 5;
  return (x >>> 0) / 4294967296;
}

function bandKey(low: number, high: number): string {
  const h = Number.isFinite(high) ? String(high) : "inf";
  return `${low}|${h}`;
}

function slotMatchesBand(slot: BotScoreSlot, band: { min: number; max?: number }): boolean {
  if (slot.low !== band.min) return false;
  const slotMax = Number.isFinite(slot.high) ? slot.high : undefined;
  return slotMax === band.max;
}

/** 同 (low, high) 区间合并 count；保持首次出现顺序 */
export function botSlotsToScoreBands(slots: BotScoreSlot[]): ScoreBand[] {
  const bands: ScoreBand[] = [];
  const keyToIndex = new Map<string, number>();

  for (const s of slots) {
    const key = bandKey(s.low, s.high);
    let idx = keyToIndex.get(key);
    if (idx === undefined) {
      idx = bands.length;
      keyToIndex.set(key, idx);
      bands.push({
        min: s.low,
        max: Number.isFinite(s.high) ? s.high : undefined,
        count: 1,
      });
    } else {
      const band = bands[idx]!;
      band.count = (band.count ?? 1) + 1;
    }
  }
  return bands;
}

/** 从 rollouts HTTP 某 band 结果中确定性选一条 */
export function pickRolloutScoreForSlot(
  rollouts: RolloutPick[],
  sessionSeed: number,
  slotIndex: number,
  low: number,
  high: number,
  gameType: "solitaire" | "block_blast"
): number {
  if (rollouts.length > 0) {
    const idx = Math.floor(pseudoUnit(sessionSeed, slotIndex + 41) * rollouts.length);
    return rollouts[idx]!.finalScore;
  }
  return scoreForRankSlot(low, high, slotIndex, sessionSeed, gameType);
}

export function pickScoresFromRolloutBands(args: {
  slots: BotScoreSlot[];
  bands: Array<{ min: number; max?: number; rollouts: RolloutPick[] }>;
  sessionSeed: number;
  gameType: "solitaire" | "block_blast";
}): Array<{ rank: number; score: number }> {
  const bandPickCount = new Array(args.bands.length).fill(0);
  const fills: Array<{ rank: number; score: number }> = [];

  for (let i = 0; i < args.slots.length; i++) {
    const slot = args.slots[i]!;
    let bandIdx = args.bands.findIndex((b) => slotMatchesBand(slot, b));
    if (bandIdx < 0) bandIdx = Math.min(i, args.bands.length - 1);
    const band = args.bands[bandIdx];
    const rollouts = band?.rollouts ?? [];
    const pickIdx = bandPickCount[bandIdx] ?? 0;
    bandPickCount[bandIdx] = pickIdx + 1;

    let score: number;
    if (rollouts.length > pickIdx) {
      score = rollouts[pickIdx]!.finalScore;
    } else if (rollouts.length > 0) {
      score = pickRolloutScoreForSlot(
        rollouts,
        args.sessionSeed,
        i,
        slot.low,
        slot.high,
        args.gameType
      );
    } else {
      score = scoreForRankSlot(slot.low, slot.high, i, args.sessionSeed, args.gameType);
    }

    fills.push({ rank: slot.rank, score });
  }
  return fills;
}
