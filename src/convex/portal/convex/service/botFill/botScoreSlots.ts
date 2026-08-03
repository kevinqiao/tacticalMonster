import { pseudoUnit } from "../../shared/pseudoUnit";
import type { RankScoreFloorsByRank } from "../../shared/scoreQuantiles";
import { scoreEpsilon, scoreSpan, type BotFillGameType } from "./gameTypeConfig";

export type SoloRolloutQueryBand = { min: number; max?: number; count?: number };

export function hashSessionSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function eligibleMaxRank(
  score: number,
  rankFloors: RankScoreFloorsByRank,
  maxPlayers: number
): number {
  let best = 0;
  for (let r = 1; r <= maxPlayers; r++) {
    const minS = rankFloors[r];
    if (minS != null && score >= minS) best = r;
  }
  return best;
}

export function clampTargetRank(
  targetRank: number,
  humanScore: number,
  rankFloors: RankScoreFloorsByRank,
  maxPlayers: number
): number {
  const cap = eligibleMaxRank(humanScore, rankFloors, maxPlayers);
  if (cap <= 0) return maxPlayers;
  return Math.min(Math.max(1, targetRank), cap);
}

export function scoreForRankSlot(
  low: number,
  high: number,
  botIndex: number,
  seed: number,
  gameType: BotFillGameType
): number {
  const eps = scoreEpsilon(gameType);
  const finiteHigh = Number.isFinite(high) ? high : low + scoreSpan(gameType);
  if (finiteHigh - low <= eps) {
    const mid = low + Math.floor((finiteHigh - low) * (botIndex % 2 === 0 ? 0.6 : 0.4));
    return Math.max(low + 1, Math.min(mid, finiteHigh - 1));
  }
  const r = pseudoUnit(seed, botIndex);
  const margin = 0.15;
  return Math.floor(low + (finiteHigh - low) * (margin + (1 - 2 * margin) * r));
}

export type BotScoreSlot = { rank: number; low: number; high: number };

/** mixed Strategy D：bot 占 rank 1..botCount，区间 [floor[r], floor[r-1]) / 顶档无上限 */
export function computeFixedTopBotScoreSlots(args: {
  botCount: number;
  rankFloors: RankScoreFloorsByRank;
  gameType: BotFillGameType;
}): BotScoreSlot[] {
  const { botCount, rankFloors, gameType } = args;
  const eps = scoreEpsilon(gameType);
  const slots: BotScoreSlot[] = [];
  for (let r = 1; r <= botCount; r++) {
    const low = rankFloors[r] ?? 0;
    const high =
      r === 1
        ? Number.POSITIVE_INFINITY
        : (rankFloors[r - 1] ?? low + scoreSpan(gameType)) - eps;
    slots.push({ rank: r, low, high });
  }
  return slots;
}

/** Solo catalog 查询：最多 2 band（人类上方 / 下方），count 为各侧 bot 数。 */
export function soloRolloutQueryBands(args: {
  humanScore: number;
  effectiveRank: number;
  maxPlayers: number;
  scoreLow: number;
  gameType: BotFillGameType;
}): SoloRolloutQueryBand[] {
  const { humanScore, effectiveRank, maxPlayers, scoreLow, gameType } = args;
  const eps = scoreEpsilon(gameType);
  const aboveCount = Math.max(0, effectiveRank - 1);
  const belowCount = Math.max(0, maxPlayers - effectiveRank);
  const bands: SoloRolloutQueryBand[] = [];
  if (aboveCount > 0) {
    bands.push({ min: humanScore + eps, count: aboveCount });
  }
  if (belowCount > 0) {
    bands.push({
      min: Math.max(0, scoreLow),
      max: humanScore - eps,
      count: belowCount,
    });
  }
  return bands;
}

/** Triathlon solo 仍用 per-rank slot 做 leg 分解；单局 solo 已改两 band + sort/enforce。 */
export function computeSoloBotScoreSlots(args: {
  humanScore: number;
  effectiveRank: number;
  scoreLow: number;
  maxPlayers: number;
  gameType: BotFillGameType;
}): BotScoreSlot[] {
  const { humanScore, effectiveRank, scoreLow, maxPlayers, gameType } = args;
  const humanRank = effectiveRank;
  const eps = scoreEpsilon(gameType);
  const span = scoreSpan(gameType);
  const slots: BotScoreSlot[] = [];
  const aboveCount = Math.max(0, humanRank - 1);
  const belowCount = Math.max(0, maxPlayers - humanRank);
  for (let r = 1; r <= maxPlayers; r++) {
    if (r === humanRank) continue;
    let low: number;
    let high: number;
    if (r < humanRank) {
      const step = Math.max(eps, Math.floor(span / Math.max(1, aboveCount)));
      const base = humanScore + eps;
      const indexFromHuman = humanRank - r - 1;
      low = base + indexFromHuman * step;
      high =
        r === 1
          ? Number.POSITIVE_INFINITY
          : base + (indexFromHuman + 1) * step - eps;
    } else {
      const step = Math.max(eps, Math.floor(span / Math.max(1, belowCount)));
      const indexBelow = r - humanRank - 1;
      high = humanScore - eps - indexBelow * step;
      low = r === maxPlayers ? Math.max(0, scoreLow) : high - step + 1;
      if (high <= low) high = low + eps;
    }
    slots.push({ rank: r, low, high });
  }
  return slots;
}

export function generateSoloBotScores(args: {
  humanScore: number;
  effectiveRank: number;
  scoreLow: number;
  maxPlayers: number;
  gameType: BotFillGameType;
  sessionSeed: number;
}): Array<{ rank: number; score: number }> {
  const slots = computeSoloBotScoreSlots(args);
  const fills: Array<{ rank: number; score: number }> = [];
  let botIdx = 0;
  for (const slot of slots) {
    const high = Number.isFinite(slot.high) ? slot.high : slot.low + 2000;
    fills.push({
      rank: slot.rank,
      score: scoreForRankSlot(slot.low, high, botIdx, args.sessionSeed, args.gameType),
    });
    botIdx++;
  }
  return fills;
}
