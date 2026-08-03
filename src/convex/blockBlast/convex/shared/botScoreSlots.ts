import type { CasualBotGameType } from "./constants";
import { pseudoUnit } from "./pseudoUnit";
import type { RankScoreFloorsByRank } from "./scoreQuantiles";

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

function scoreEpsilon(gameType: CasualBotGameType): number {
  return gameType === "block_blast" ? 50 : 5;
}

export function scoreForRankSlot(
  low: number,
  high: number,
  botIndex: number,
  seed: number,
  gameType: CasualBotGameType
): number {
  const eps = scoreEpsilon(gameType);
  if (high - low <= eps) {
    const mid = low + Math.floor((high - low) * (botIndex % 2 === 0 ? 0.6 : 0.4));
    return Math.max(low + 1, Math.min(mid, high - 1));
  }
  const r = pseudoUnit(seed, botIndex);
  const margin = 0.15;
  return Math.floor(low + (high - low) * (margin + (1 - 2 * margin) * r));
}

export type BotScoreSlot = { rank: number; low: number; high: number };

/** mixed D'：bot 固定占 rank 1..botCount，区间来自 rankFloors */
export function computeFixedTopBotScoreSlots(args: {
  botCount: number;
  rankFloors: RankScoreFloorsByRank;
  gameType: CasualBotGameType;
}): BotScoreSlot[] {
  const { botCount, rankFloors, gameType } = args;
  const eps = scoreEpsilon(gameType);
  const span = gameType === "block_blast" ? 400 : 500;
  const slots: BotScoreSlot[] = [];
  for (let r = 1; r <= botCount; r++) {
    const minS = rankFloors[r] ?? 0;
    let high: number;
    const nextFloor = rankFloors[r + 1];
    if (nextFloor != null && Number.isFinite(nextFloor)) {
      high = nextFloor - eps;
    } else {
      high = minS + Math.max(eps * 20, span);
    }
    if (high <= minS) high = minS + eps;
    slots.push({ rank: r, low: minS, high });
  }
  return slots;
}

export function computeSoloBotScoreSlots(args: {
  humanScore: number;
  effectiveRank: number;
  rankFloors: RankScoreFloorsByRank;
  maxPlayers: number;
  gameType: CasualBotGameType;
}): BotScoreSlot[] {
  const { humanScore, effectiveRank, rankFloors, maxPlayers, gameType } = args;
  const eps = scoreEpsilon(gameType);
  const span = gameType === "block_blast" ? 400 : 500;
  const slots: BotScoreSlot[] = [];
  for (let r = 1; r <= maxPlayers; r++) {
    if (r === effectiveRank) continue;
    const minS = rankFloors[r] ?? 0;
    let low: number;
    let high: number;
    if (r < effectiveRank) {
      low = Math.max(minS, humanScore + eps);
      high = low + Math.max(eps * 20, span);
    } else {
      low = minS;
      high = Math.max(minS + eps, humanScore - eps);
      if (high <= low) high = low + eps;
    }
    slots.push({ rank: r, low, high });
  }
  return slots;
}

export function generateSoloBotScores(args: {
  humanScore: number;
  effectiveRank: number;
  rankFloors: RankScoreFloorsByRank;
  maxPlayers: number;
  gameType: CasualBotGameType;
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

export type RankedEntity = {
  uid: string;
  score: number;
  isBot: boolean;
};

function sortRankedEntitiesByScoreDesc(entities: RankedEntity[]): RankedEntity[] {
  return [...entities].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.uid.localeCompare(b.uid);
  });
}

export function assignRanksByScoreDesc(entities: RankedEntity[]): Map<string, number> {
  const sorted = sortRankedEntitiesByScoreDesc(entities);
  const out = new Map<string, number>();
  for (let i = 0; i < sorted.length; i++) {
    out.set(sorted[i]!.uid, i + 1);
  }
  return out;
}
