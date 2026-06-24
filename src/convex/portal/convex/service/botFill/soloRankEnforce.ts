import { scoreEpsilon, type BotFillGameType } from "./gameTypeConfig";
import type { AsyncBotFillFromRollout } from "./rolloutPick";

function clampScoreToRange(
  score: number,
  low: number,
  high: number,
  gameType: BotFillGameType
): number {
  const eps = scoreEpsilon(gameType);
  let s = Math.floor(score);
  s = Math.max(low, s);
  if (Number.isFinite(high)) {
    s = Math.min(high, s);
  }
  if (s <= low && Number.isFinite(high) && high > low) {
    s = Math.min(high, low + eps);
  }
  return s;
}

function dedupeScoreInRange(args: {
  score: number;
  low: number;
  high: number;
  usedScores: Set<number>;
  gameType: BotFillGameType;
  direction: "down" | "up";
}): number {
  const eps = scoreEpsilon(args.gameType);
  const finiteHigh = Number.isFinite(args.high) ? args.high : args.low + 10_000;
  let score = clampScoreToRange(args.score, args.low, args.high, args.gameType);
  let guard = 0;
  while (args.usedScores.has(score) && guard++ < 256) {
    const next = args.direction === "down" ? score - eps : score + eps;
    if (args.direction === "down" && next < args.low) break;
    if (args.direction === "up" && next > finiteHigh) break;
    score = clampScoreToRange(next, args.low, args.high, args.gameType);
  }
  return score;
}

function targetScoreAboveHuman(args: {
  humanScore: number;
  effectiveRank: number;
  rank: number;
  gameType: BotFillGameType;
}): number {
  const eps = scoreEpsilon(args.gameType);
  return args.humanScore + eps * (args.effectiveRank - args.rank);
}

function targetScoreBelowHuman(args: {
  humanScore: number;
  effectiveRank: number;
  rank: number;
  gameType: BotFillGameType;
}): number {
  const eps = scoreEpsilon(args.gameType);
  return args.humanScore - eps * (args.rank - args.effectiveRank);
}

/** 按 score 降序推算人类在 bot 补位后的 1-based 名次（同分按 rank 数字更小者优先）。 */
export function simulateSoloHumanRank(args: {
  humanScore: number;
  effectiveRank: number;
  botFills: Array<{ rank: number; score: number }>;
}): number {
  const rows = [
    { rank: args.effectiveRank, score: args.humanScore, isHuman: true as const },
    ...args.botFills.map((f) => ({ rank: f.rank, score: f.score, isHuman: false as const })),
  ];
  rows.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.rank - b.rank;
  });
  const idx = rows.findIndex((r) => r.isHuman);
  return idx >= 0 ? idx + 1 : args.effectiveRank;
}

/**
 * Solo 多人：保证 bot 分数严格单调且人类 settle 后 rank === effectiveRank。
 * 保留 rolloutIndex / duration，仅在必要时修正 score。
 */
export function enforceSoloBotFillsForEffectiveRank(args: {
  humanScore: number;
  effectiveRank: number;
  maxPlayers: number;
  scoreLow: number;
  fills: AsyncBotFillFromRollout[];
  gameType: BotFillGameType;
}): AsyncBotFillFromRollout[] {
  const eps = scoreEpsilon(args.gameType);
  const fillByRank = new Map(args.fills.map((f) => [f.rank, f] as const));
  const usedScores = new Set<number>([args.humanScore]);
  const out: AsyncBotFillFromRollout[] = [];

  let ceiling = Number.POSITIVE_INFINITY;
  for (let r = 1; r < args.effectiveRank; r++) {
    const base = fillByRank.get(r);
    const low = targetScoreAboveHuman({
      humanScore: args.humanScore,
      effectiveRank: args.effectiveRank,
      rank: r,
      gameType: args.gameType,
    });
    const high = Number.isFinite(ceiling) ? ceiling - eps : ceiling;
    let target =
      base?.score != null && base.score > args.humanScore
        ? base.score
        : low;
    if (Number.isFinite(high)) {
      target = Math.min(target, high);
    }
    target = Math.max(target, low);
    const score = dedupeScoreInRange({
      score: target,
      low,
      high: Number.isFinite(high) ? high : low + eps * (args.effectiveRank - r + 1),
      usedScores,
      gameType: args.gameType,
      direction: "down",
    });
    usedScores.add(score);
    ceiling = score;
    out.push({
      rank: r,
      score,
      duration: base?.duration ?? 0,
      rolloutIndex: base?.rolloutIndex,
      legs: base?.legs,
    });
  }

  let floor = Number.NEGATIVE_INFINITY;
  for (let r = args.maxPlayers; r > args.effectiveRank; r--) {
    const base = fillByRank.get(r);
    const high = targetScoreBelowHuman({
      humanScore: args.humanScore,
      effectiveRank: args.effectiveRank,
      rank: r,
      gameType: args.gameType,
    });
    const low = Math.max(
      args.scoreLow,
      Number.isFinite(floor) ? floor + eps : args.scoreLow
    );
    let target =
      base?.score != null && base.score < args.humanScore ? base.score : high;
    target = Math.min(target, high);
    target = Math.max(target, low);
    const score = dedupeScoreInRange({
      score: target,
      low,
      high,
      usedScores,
      gameType: args.gameType,
      direction: "up",
    });
    usedScores.add(score);
    floor = score;
    out.push({
      rank: r,
      score,
      duration: base?.duration ?? 0,
      rolloutIndex: base?.rolloutIndex,
      legs: base?.legs,
    });
  }

  const humanRank = simulateSoloHumanRank({
    humanScore: args.humanScore,
    effectiveRank: args.effectiveRank,
    botFills: out,
  });
  if (humanRank !== args.effectiveRank) {
    throw new Error(
      `solo_bot_fill_rank_mismatch: expected=${args.effectiveRank} got=${humanRank}`
    );
  }

  return out.sort((a, b) => a.rank - b.rank);
}
