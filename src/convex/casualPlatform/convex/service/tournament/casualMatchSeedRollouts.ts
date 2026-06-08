import type { ScoreBand } from "../bridge/casualMatchSeedBridge";
import { pickDurationFallbackMs } from "../../data/casualBotFillStaggerConfig";
import {
  scoreForRankSlot,
  type BotScoreSlot,
} from "./casualBotDifficultyService";

export type { BotScoreSlot };

export type RolloutPick = {
  rolloutIndex: number;
  finalScore: number;
  elapsedTime?: number;
};

export type AsyncBotFillFromRollout = {
  rank: number;
  score: number;
  duration: number;
  rolloutIndex?: number;
};

function pseudoUnit(seed: number, i: number): number {
  let x = Math.imul(seed ^ (i * 374761393), 2654435761);
  x ^= x >>> 13;
  x ^= x << 17;
  x ^= x >>> 5;
  return (x >>> 0) / 4294967296;
}

function durationMsFromRollout(
  pick: RolloutPick | undefined,
  sessionSeed: number,
  slotIndex: number
): number {
  if (pick?.elapsedTime != null && Number.isFinite(pick.elapsedTime) && pick.elapsedTime >= 0) {
    return Math.round(pick.elapsedTime * 1000);
  }
  return pickDurationFallbackMs(sessionSeed, slotIndex);
}

function pickRolloutForSlot(
  rollouts: RolloutPick[],
  sessionSeed: number,
  slotIndex: number
): RolloutPick | undefined {
  if (rollouts.length === 0) return undefined;
  const idx = Math.floor(pseudoUnit(sessionSeed, slotIndex + 41) * rollouts.length);
  return rollouts[idx];
}

function scoreEpsilon(gameType: "solitaire" | "block_blast"): number {
  return gameType === "block_blast" ? 50 : 5;
}

/** 合并各 band HTTP 结果，按 rolloutIndex 全局去重 */
function mergeGlobalRolloutPool(
  bands: Array<{ rollouts: RolloutPick[] }>
): RolloutPick[] {
  const seen = new Set<number>();
  const out: RolloutPick[] = [];
  for (const band of bands) {
    for (const r of band.rollouts ?? []) {
      if (seen.has(r.rolloutIndex)) continue;
      seen.add(r.rolloutIndex);
      out.push(r);
    }
  }
  return out;
}

function clampScoreToSlot(
  score: number,
  slot: BotScoreSlot,
  gameType: "solitaire" | "block_blast"
): number {
  const eps = scoreEpsilon(gameType);
  let s = Math.floor(score);
  s = Math.max(slot.low, s);
  if (Number.isFinite(slot.high)) {
    s = Math.min(slot.high, s);
  }
  if (s <= slot.low) {
    s = Math.min(slot.low + eps, Number.isFinite(slot.high) ? slot.high : slot.low + eps);
  }
  return s;
}

/** rollout 用尽时：在 slot 内生成合成分，且严格低于上一名次 bot */
function fallbackScoreForSlotCapped(args: {
  slot: BotScoreSlot;
  slotIndex: number;
  sessionSeed: number;
  gameType: "solitaire" | "block_blast";
  maxScoreExclusive?: number;
  usedScores: Set<number>;
}): number {
  const eps = scoreEpsilon(args.gameType);
  let cap = args.maxScoreExclusive;
  if (cap != null) {
    cap = Math.min(cap, Number.isFinite(args.slot.high) ? args.slot.high + 1 : cap);
  }
  if (cap != null && cap <= args.slot.low) {
    let score = cap - eps;
    while (args.usedScores.has(score) && score > 0) {
      score -= eps;
    }
    return score;
  }

  let score = fallbackScoreForSlot(
    args.slot,
    args.slotIndex,
    args.sessionSeed,
    args.gameType
  );
  if (cap != null && score >= cap) {
    score = cap - eps;
  }
  score = clampScoreToSlot(score, args.slot, args.gameType);
  while (args.usedScores.has(score) && score > args.slot.low) {
    score -= eps;
    score = clampScoreToSlot(score, args.slot, args.gameType);
  }
  return score;
}

function finiteSlotHigh(
  low: number,
  high: number,
  gameType: "solitaire" | "block_blast"
): number {
  if (Number.isFinite(high)) return high;
  return low + (gameType === "block_blast" ? 5000 : 2000);
}

function fallbackScoreForSlot(
  slot: BotScoreSlot,
  slotIndex: number,
  sessionSeed: number,
  gameType: "solitaire" | "block_blast"
): number {
  return scoreForRankSlot(
    slot.low,
    finiteSlotHigh(slot.low, slot.high, gameType),
    slotIndex,
    sessionSeed,
    gameType
  );
}

function highBandKey(high: number): string {
  return Number.isFinite(high) ? String(high) : "inf";
}

/** 同 high 的 slot 合并为一条 band：HTTP min=0、max=槽 high、count=待补 bot 数 */
export function botSlotsToScoreBands(slots: BotScoreSlot[]): ScoreBand[] {
  if (slots.length === 0) return [];

  const groups: Array<{ max?: number; slots: BotScoreSlot[] }> = [];
  const highKeyToIndex = new Map<string, number>();

  for (const s of slots) {
    const key = highBandKey(s.high);
    let idx = highKeyToIndex.get(key);
    if (idx === undefined) {
      idx = groups.length;
      highKeyToIndex.set(key, idx);
      groups.push({
        max: Number.isFinite(s.high) ? s.high : undefined,
        slots: [s],
      });
    } else {
      groups[idx]!.slots.push(s);
    }
  }

  return groups.map((g) => ({
    min: 0,
    count: g.slots.length,
    ...(g.max !== undefined ? { max: g.max } : {}),
  }));
}

export type LocalBotFillRef = {
  rank: number;
  score: number;
  duration?: number;
};

/** 从 rollouts HTTP 某 band 结果中确定性选一条 */
export function pickRolloutScoreForSlot(
  rollouts: RolloutPick[],
  sessionSeed: number,
  slotIndex: number,
  low: number,
  high: number,
  gameType: "solitaire" | "block_blast"
): number {
  const pick = pickRolloutForSlot(rollouts, sessionSeed, slotIndex);
  if (pick) return pick.finalScore;
  return scoreForRankSlot(low, high, slotIndex, sessionSeed, gameType);
}

function localFillForSlot(
  localByRank: Map<number, LocalBotFillRef>,
  rank: number,
  maxScoreExclusive?: number
): LocalBotFillRef | undefined {
  const local = localByRank.get(rank);
  if (!local) return undefined;
  if (maxScoreExclusive != null && local.score >= maxScoreExclusive) {
    return undefined;
  }
  return local;
}

export function pickScoresFromRolloutBands(args: {
  slots: BotScoreSlot[];
  bands: Array<{ min: number; max?: number; rollouts: RolloutPick[] }>;
  sessionSeed: number;
  gameType: "solitaire" | "block_blast";
  /** rollout 不足时，未命中 rollout 的槽位用本地规划分补 bot */
  localFills?: LocalBotFillRef[];
}): AsyncBotFillFromRollout[] {
  const eps = scoreEpsilon(args.gameType);
  const globalPool = mergeGlobalRolloutPool(args.bands);
  const localByRank = new Map(
    (args.localFills ?? []).map((f) => [f.rank, f] as const)
  );
  const usedRolloutIndices = new Set<number>();
  const usedScores = new Set<number>();
  const fills: AsyncBotFillFromRollout[] = [];

  const slotsOrdered = [...args.slots].sort((a, b) => a.rank - b.rank);
  let nextMaxScore = Number.POSITIVE_INFINITY;

  for (let i = 0; i < slotsOrdered.length; i++) {
    const slot = slotsOrdered[i]!;
    const maxScoreExclusive =
      Number.isFinite(nextMaxScore) ? nextMaxScore : undefined;

    const candidates = globalPool
      .filter(
        (r) =>
          !usedRolloutIndices.has(r.rolloutIndex) &&
          (maxScoreExclusive == null || r.finalScore < maxScoreExclusive)
      )
      .sort((a, b) => b.finalScore - a.finalScore);

    let pick: RolloutPick | undefined;
    let local: LocalBotFillRef | undefined;
    let score: number;

    if (candidates.length > 0) {
      pick = candidates[0]!;
      usedRolloutIndices.add(pick.rolloutIndex);
      score = pick.finalScore;
    } else {
      local = localFillForSlot(localByRank, slot.rank, maxScoreExclusive);
      if (local) {
        score = local.score;
      } else {
        score = fallbackScoreForSlotCapped({
          slot,
          slotIndex: slot.rank + i,
          sessionSeed: args.sessionSeed,
          gameType: args.gameType,
          maxScoreExclusive,
          usedScores,
        });

        while (usedScores.has(score) && score > slot.low) {
          score -= eps;
          score = clampScoreToSlot(score, slot, args.gameType);
        }
      }
    }

    usedScores.add(score);
    nextMaxScore = score - eps;

    const duration =
      pick != null
        ? durationMsFromRollout(pick, args.sessionSeed, i)
        : local?.duration != null && Number.isFinite(local.duration)
          ? Math.round(local.duration)
          : pickDurationFallbackMs(args.sessionSeed, i);

    fills.push({
      rank: slot.rank,
      score,
      duration,
      ...(pick?.rolloutIndex != null ? { rolloutIndex: pick.rolloutIndex } : {}),
    });
  }

  return fills.sort((a, b) => a.rank - b.rank);
}
