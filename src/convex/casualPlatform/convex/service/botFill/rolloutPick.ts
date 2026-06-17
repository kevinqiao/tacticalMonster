import { pickDurationFallbackMs } from "./durationFallback";
import { scoreForRankSlot, type BotScoreSlot } from "./botScoreSlots";
import { finiteSlotHighDefault, scoreEpsilon, type BotFillGameType } from "./gameTypeConfig";

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
  legs?: Array<{
    gameIndex: number;
    score: number;
    rolloutIndex?: number;
    duration?: number;
  }>;
};

function mergeGlobalRolloutPool(bands: Array<{ rollouts: RolloutPick[] }>): RolloutPick[] {
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
  gameType: BotFillGameType
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

function finiteSlotHigh(
  low: number,
  high: number,
  gameType: BotFillGameType
): number {
  if (Number.isFinite(high)) return high;
  return low + finiteSlotHighDefault(gameType);
}

function fallbackScoreForSlot(
  slot: BotScoreSlot,
  slotIndex: number,
  sessionSeed: number,
  gameType: BotFillGameType
): number {
  return scoreForRankSlot(
    slot.low,
    finiteSlotHigh(slot.low, slot.high, gameType),
    slotIndex,
    sessionSeed,
    gameType
  );
}

function matchesSlotScore(
  score: number,
  slot: BotScoreSlot,
  maxScoreExclusive?: number
): boolean {
  if (score < slot.low) return false;
  if (Number.isFinite(slot.high) && score > slot.high) return false;
  if (maxScoreExclusive != null && score >= maxScoreExclusive) return false;
  return true;
}

export type ScoreBand = { min: number; max?: number; count?: number };

/** 每个 slot 独立 band（min=slot.low），便于 catalog 精确查询 */
export function botSlotsToScoreBands(slots: BotScoreSlot[]): ScoreBand[] {
  return slots.map((slot) => ({
    min: slot.low,
    count: 1,
    ...(Number.isFinite(slot.high) ? { max: slot.high } : {}),
  }));
}

export type LocalBotFillRef = { rank: number; score: number; duration?: number };

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

export function pickScoresFromRolloutBands(args: {
  slots: BotScoreSlot[];
  bands: Array<{ min: number; max?: number; rollouts: RolloutPick[] }>;
  sessionSeed: number;
  gameType: BotFillGameType;
  localFills?: LocalBotFillRef[];
}): AsyncBotFillFromRollout[] {
  const eps = scoreEpsilon(args.gameType);
  const globalPool = mergeGlobalRolloutPool(args.bands);
  const localByRank = new Map((args.localFills ?? []).map((f) => [f.rank, f] as const));
  const usedRolloutIndices = new Set<number>();
  const usedScores = new Set<number>();
  const fills: AsyncBotFillFromRollout[] = [];

  const slotsOrdered = [...args.slots].sort((a, b) => a.rank - b.rank);
  let nextMaxScore = Number.POSITIVE_INFINITY;

  for (let i = 0; i < slotsOrdered.length; i++) {
    const slot = slotsOrdered[i]!;
    const maxScoreExclusive = Number.isFinite(nextMaxScore) ? nextMaxScore : undefined;

    const candidates = globalPool
      .filter(
        (r) =>
          !usedRolloutIndices.has(r.rolloutIndex) &&
          matchesSlotScore(r.finalScore, slot, maxScoreExclusive)
      )
      .sort((a, b) => b.finalScore - a.finalScore);

    let pick: RolloutPick | undefined;
    let local: LocalBotFillRef | undefined;
    let score: number;

    if (candidates.length > 0) {
      pick = candidates[0]!;
      usedRolloutIndices.add(pick.rolloutIndex);
      score = clampScoreToSlot(pick.finalScore, slot, args.gameType);
    } else {
      local = localByRank.get(slot.rank);
      if (local && matchesSlotScore(local.score, slot, maxScoreExclusive)) {
        score = clampScoreToSlot(local.score, slot, args.gameType);
      } else {
        score = fallbackScoreForSlot(slot, slot.rank + i, args.sessionSeed, args.gameType);
        if (maxScoreExclusive != null && score >= maxScoreExclusive) {
          score = maxScoreExclusive - eps;
        }
        score = clampScoreToSlot(score, slot, args.gameType);
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
