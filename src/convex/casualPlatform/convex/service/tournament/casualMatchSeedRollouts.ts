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

export function botSlotsToScoreBands(slots: BotScoreSlot[]): ScoreBand[] {
  return slots.map((s) => ({
    min: s.low,
    max: Number.isFinite(s.high) ? s.high : undefined,
    count: 1,
  }));
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
  const fills: Array<{ rank: number; score: number }> = [];
  for (let i = 0; i < args.slots.length; i++) {
    const slot = args.slots[i]!;
    const band = args.bands[i];
    const rollouts = band?.rollouts ?? [];
    fills.push({
      rank: slot.rank,
      score: pickRolloutScoreForSlot(
        rollouts,
        args.sessionSeed,
        i,
        slot.low,
        slot.high,
        args.gameType
      ),
    });
  }
  return fills;
}
