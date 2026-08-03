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

/** 在 slot + 单调约束内，选 finalScore 最接近 targetScore 的未用 rollout */
function pickFallbackRolloutInSlot(
  globalPool: RolloutPick[],
  usedRolloutIndices: Set<number>,
  slot: BotScoreSlot,
  maxScoreExclusive: number | undefined,
  targetScore: number
): RolloutPick | undefined {
  const available = globalPool.filter(
    (r) =>
      !usedRolloutIndices.has(r.rolloutIndex) &&
      matchesSlotScore(r.finalScore, slot, maxScoreExclusive)
  );
  if (available.length === 0) return undefined;
  return available.reduce((a, b) =>
    Math.abs(a.finalScore - targetScore) <= Math.abs(b.finalScore - targetScore) ? a : b
  );
}

/** 无 slot 匹配时：从未用 pool 中挑 finalScore 最接近 targetScore 的 rollout（仅绑 replay） */
function pickNearestRolloutInPool(
  globalPool: RolloutPick[],
  usedRolloutIndices: Set<number>,
  targetScore: number
): RolloutPick | undefined {
  const available = globalPool.filter((r) => !usedRolloutIndices.has(r.rolloutIndex));
  if (available.length === 0) return undefined;
  return available.reduce((a, b) =>
    Math.abs(a.finalScore - targetScore) <= Math.abs(b.finalScore - targetScore) ? a : b
  );
}

function syntheticScoreForSlot(args: {
  slot: BotScoreSlot;
  slotIndex: number;
  sessionSeed: number;
  gameType: BotFillGameType;
  maxScoreExclusive: number | undefined;
  usedScores: Set<number>;
}): number {
  const eps = scoreEpsilon(args.gameType);
  let score = fallbackScoreForSlot(
    args.slot,
    args.slotIndex,
    args.sessionSeed,
    args.gameType
  );
  if (args.maxScoreExclusive != null && score >= args.maxScoreExclusive) {
    score = args.maxScoreExclusive - eps;
  }
  score = clampScoreToSlot(score, args.slot, args.gameType);
  while (args.usedScores.has(score) && score > args.slot.low) {
    score -= eps;
    score = clampScoreToSlot(score, args.slot, args.gameType);
  }
  return score;
}

export function pickScoresFromRolloutBands(args: {
  slots: BotScoreSlot[];
  bands: Array<{ min: number; max?: number; rollouts: RolloutPick[] }>;
  sessionSeed: number;
  gameType: BotFillGameType;
  localFills?: LocalBotFillRef[];
}): AsyncBotFillFromRollout[] {
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

    /** 分数与 replay 同源（slot 内 rollout 命中） */
    let scorePick: RolloutPick | undefined;
    /** 仅 replay：slot 无匹配时按 bot 分数就近绑 rolloutIndex */
    let replayPick: RolloutPick | undefined;
    let score: number;

    if (candidates.length > 0) {
      scorePick = candidates[0]!;
      usedRolloutIndices.add(scorePick.rolloutIndex);
      score = clampScoreToSlot(scorePick.finalScore, slot, args.gameType);
    } else {
      const local = localByRank.get(slot.rank);
      const targetHint =
        local?.score ??
        fallbackScoreForSlot(slot, slot.rank + i, args.sessionSeed, args.gameType);
      const fallbackPick = pickFallbackRolloutInSlot(
        globalPool,
        usedRolloutIndices,
        slot,
        maxScoreExclusive,
        targetHint
      );
      if (fallbackPick) {
        scorePick = fallbackPick;
        usedRolloutIndices.add(scorePick.rolloutIndex);
        score = clampScoreToSlot(scorePick.finalScore, slot, args.gameType);
      } else if (local && matchesSlotScore(local.score, slot, maxScoreExclusive)) {
        score = clampScoreToSlot(local.score, slot, args.gameType);
      } else {
        score = syntheticScoreForSlot({
          slot,
          slotIndex: slot.rank + i,
          sessionSeed: args.sessionSeed,
          gameType: args.gameType,
          maxScoreExclusive,
          usedScores,
        });
      }

      if (!scorePick) {
        replayPick = pickNearestRolloutInPool(globalPool, usedRolloutIndices, score);
        if (replayPick) {
          usedRolloutIndices.add(replayPick.rolloutIndex);
        }
      }
    }

    usedScores.add(score);
    nextMaxScore = score - scoreEpsilon(args.gameType);

    const rolloutForDuration = scorePick ?? replayPick;
    const duration = durationMsFromRollout(rolloutForDuration, args.sessionSeed, i);

    fills.push({
      rank: slot.rank,
      score,
      duration,
      rolloutIndex: scorePick?.rolloutIndex ?? replayPick?.rolloutIndex ?? 0,
    });
  }

  return fills.sort((a, b) => a.rank - b.rank);
}
