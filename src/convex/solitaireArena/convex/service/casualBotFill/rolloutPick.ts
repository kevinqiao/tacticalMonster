import {
  pickDurationFallbackMs,
  scoreForRankSlot,
  type BotScoreSlot,
} from "./botDifficulty";

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

function scoreEpsilon(gameType: "solitaire" | "block_blast"): number {
  return gameType === "block_blast" ? 50 : 5;
}

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

export type ScoreBand = { min: number; max?: number; count?: number };

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
  gameType: "solitaire" | "block_blast";
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
      local = localByRank.get(slot.rank);
      if (local && (maxScoreExclusive == null || local.score < maxScoreExclusive)) {
        score = local.score;
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
