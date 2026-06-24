import { pseudoUnit } from "../../shared/pseudoUnit";
import type { ScoreQuantiles } from "../../shared/scoreQuantiles";
import { SCORE_QUANTILE_KEYS_DESC } from "../../shared/scoreQuantiles";
import { scoreEpsilon } from "./gameTypeConfig";

/** 合战总分 quantiles：各 leg quantiles 同 key 相加（独立近似） */
export function sumLegScoreQuantiles(legs: ScoreQuantiles[]): ScoreQuantiles {
  const out = {} as ScoreQuantiles;
  for (const key of SCORE_QUANTILE_KEYS_DESC) {
    out[key] = legs.reduce((sum, leg) => sum + (leg[key] ?? 0), 0);
  }
  return out;
}

export type TriathlonLegRollout = {
  gameIndex: number;
  gameType: string;
  rolloutIndex: number;
  finalScore: number;
  elapsedTime?: number;
};

export type TriathlonRolloutTriple = {
  legs: TriathlonLegRollout[];
  totalScore: number;
};

const TRIATHLON_ROLLOUT_CANDIDATES_PER_LEG = 16;
const TRIATHLON_TOTAL_EPS = scoreEpsilon("block_blast");

/** 真人各局分优先；否则用各 leg p50 占比 */
export function computeLegProfileWeights(
  humanLegScores: number[] | undefined,
  legQuantiles: ScoreQuantiles[]
): number[] {
  const n = legQuantiles.length;
  if (n === 0) return [];

  if (humanLegScores?.length === n) {
    const total = humanLegScores.reduce((s, x) => s + (Number.isFinite(x) ? x : 0), 0);
    if (total > 0) {
      return humanLegScores.map((s) => (Number.isFinite(s) ? s : 0) / total);
    }
  }

  const p50s = legQuantiles.map((q) => q.p50);
  const sum = p50s.reduce((a, b) => a + b, 0);
  if (sum <= 0) return p50s.map(() => 1 / n);
  return p50s.map((p) => p / sum);
}

/** 单局 rollout 筛选容差：与 spread 成比例 */
export function legScoreTolerance(quantiles: ScoreQuantiles): number {
  const spread = Math.max(0, quantiles.p75 - quantiles.p25);
  return Math.max(5, Math.round(0.15 * spread));
}

/** 将 bot 总分 T 按 profile 拆到各局（最后一局吃余数） */
export function decomposeTotalToLegTargets(total: number, weights: number[]): number[] {
  if (weights.length === 0) return [];
  const sumW = weights.reduce((a, b) => a + b, 0);
  if (sumW <= 0) {
    const per = Math.floor(total / weights.length);
    const out = weights.map(() => per);
    out[out.length - 1] = total - per * (weights.length - 1);
    return out;
  }

  const targets: number[] = [];
  let allocated = 0;
  for (let i = 0; i < weights.length; i++) {
    if (i === weights.length - 1) {
      targets.push(total - allocated);
    } else {
      const t = Math.round(total * (weights[i]! / sumW));
      targets.push(t);
      allocated += t;
    }
  }
  return targets;
}

/** 在 bot 总分 slot 内取确定性目标 T */
export function proposeBotTotalForSlot(args: {
  slotLow: number;
  slotHigh: number;
  maxScoreExclusive?: number;
  sessionSeed: number;
  rank: number;
}): number {
  const finiteHigh = Number.isFinite(args.slotHigh)
    ? args.slotHigh
    : args.slotLow + 5000;
  let cap = finiteHigh;
  if (args.maxScoreExclusive != null) {
    cap = Math.min(cap, args.maxScoreExclusive - TRIATHLON_TOTAL_EPS);
  }
  const low = args.slotLow;
  if (cap <= low) return low;
  const r = pseudoUnit(args.sessionSeed, args.rank);
  return Math.floor(low + (cap - low) * (0.35 + 0.5 * r));
}

function totalInSlot(
  total: number,
  slotLow: number,
  slotHigh: number,
  maxScoreExclusive?: number
): boolean {
  const finiteHigh = Number.isFinite(slotHigh) ? slotHigh : Number.POSITIVE_INFINITY;
  if (total < slotLow || total > finiteHigh) return false;
  if (maxScoreExclusive != null && total >= maxScoreExclusive) return false;
  return true;
}

type LegPool = {
  gameIndex: number;
  gameType: string;
  rollouts: Array<{ rolloutIndex: number; finalScore: number; elapsedTime?: number }>;
};

/** profile 约束下组合三局 rollout，总分落在 slot 内且局内接近 target */
export function pickTriathlonRolloutTriple(args: {
  legPools: LegPool[];
  slotLow: number;
  slotHigh: number;
  maxScoreExclusive?: number;
  legTargets: number[];
  sessionSeed: number;
}): TriathlonRolloutTriple | null {
  const { legPools, slotLow, slotHigh, maxScoreExclusive, legTargets } = args;
  if (legPools.length === 0 || legPools.length !== legTargets.length) return null;

  const pools = legPools.map((pool, i) => {
    const target = legTargets[i] ?? 0;
    const sorted = [...pool.rollouts].sort(
      (a, b) =>
        Math.abs(a.finalScore - target) - Math.abs(b.finalScore - target) ||
        a.rolloutIndex - b.rolloutIndex
    );
    return {
      ...pool,
      rollouts:
        sorted.length > 0
          ? sorted.slice(0, TRIATHLON_ROLLOUT_CANDIDATES_PER_LEG)
          : [{ rolloutIndex: 0, finalScore: target }],
    };
  });

  let best: TriathlonRolloutTriple | null = null;
  let bestCost = Number.POSITIVE_INFINITY;

  const partial: TriathlonLegRollout[] = [];

  function search(legIdx: number, runningTotal: number) {
    if (legIdx >= pools.length) {
      if (!totalInSlot(runningTotal, slotLow, slotHigh, maxScoreExclusive)) return;
      const cost = partial.reduce(
        (s, leg, i) => s + (leg.finalScore - legTargets[i]!) ** 2,
        0
      );
      if (
        cost < bestCost ||
        (cost === bestCost && runningTotal > (best?.totalScore ?? -1))
      ) {
        bestCost = cost;
        best = { legs: [...partial], totalScore: runningTotal };
      }
      return;
    }

    const pool = pools[legIdx]!;
    for (const r of pool.rollouts) {
      partial.push({
        gameIndex: pool.gameIndex,
        gameType: pool.gameType,
        rolloutIndex: r.rolloutIndex,
        finalScore: r.finalScore,
        elapsedTime: r.elapsedTime,
      });
      search(legIdx + 1, runningTotal + r.finalScore);
      partial.pop();
    }
  }

  search(0, 0);
  return best;
}

/** 无合法 triple 时：各局取最接近 target 的 rollout，末局微调总分 */
export function fallbackTriathlonLegRollouts(args: {
  legPools: LegPool[];
  legTargets: number[];
  botTotal: number;
  slotLow: number;
  slotHigh: number;
  maxScoreExclusive?: number;
}): TriathlonRolloutTriple {
  const legs: TriathlonLegRollout[] = [];
  for (let i = 0; i < args.legPools.length; i++) {
    const pool = args.legPools[i]!;
    const target = args.legTargets[i] ?? 0;
    const rollouts = pool.rollouts;
    let pick = rollouts[0];
    if (rollouts.length > 0) {
      pick = rollouts.reduce((best, r) => {
        const d = Math.abs(r.finalScore - target);
        const bd = Math.abs(best.finalScore - target);
        return d < bd ? r : best;
      });
    } else {
      pick = { rolloutIndex: 0, finalScore: target };
    }
    legs.push({
      gameIndex: pool.gameIndex,
      gameType: pool.gameType,
      rolloutIndex: pick.rolloutIndex,
      finalScore: pick.finalScore,
      elapsedTime: pick.elapsedTime,
    });
  }

  let total = legs.reduce((s, l) => s + l.finalScore, 0);
  const last = legs[legs.length - 1];
  if (last) {
    const delta = args.botTotal - total;
    last.finalScore = Math.max(0, last.finalScore + delta);
    total = legs.reduce((s, l) => s + l.finalScore, 0);
  }

  if (!totalInSlot(total, args.slotLow, args.slotHigh, args.maxScoreExclusive)) {
    const finiteHigh = Number.isFinite(args.slotHigh)
      ? args.slotHigh
      : args.slotLow + 5000;
    let cap = finiteHigh;
    if (args.maxScoreExclusive != null) {
      cap = Math.min(cap, args.maxScoreExclusive - TRIATHLON_TOTAL_EPS);
    }
    const clamped = Math.max(args.slotLow, Math.min(cap, args.botTotal));
    if (last) {
      last.finalScore += clamped - total;
    }
    total = legs.reduce((s, l) => s + l.finalScore, 0);
  }

  return { legs, totalScore: total };
}
