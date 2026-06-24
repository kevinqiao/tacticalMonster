import { pseudoUnit } from "../../shared/pseudoUnit";
import type { RankScoreFloorsByRank } from "../../shared/scoreQuantiles";
import { scoreEpsilon, scoreSpan, type BotFillGameType } from "./gameTypeConfig";

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

/** v3 solo：bot slot 仅由 humanRank + humanScore 划分；below-bot 下界用 seed p10。 */
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
  for (let r = 1; r <= maxPlayers; r++) {
    if (r === humanRank) continue;
    let low: number;
    let high: number;
    if (r < humanRank) {
      low = humanScore + eps;
      high = low + Math.max(eps * 20, span);
    } else {
      low = scoreLow;
      high = humanScore - eps;
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
