import { simulateGreedyGame } from "../YatzGameEngine";
import { YATZ_MANIFEST_POLICY_VERSION } from "../yatzSeedManifest";
import { assignYatzTiers } from "./yatzSeedDifficulty";
import { YATZ_DECISION_POLICY_VERSION } from "./yatzHumanPersonas";
import { formatYatzSeedId } from "./yatzRecordedOpTypes";

export type ScoreQuantiles = {
  p10: number;
  p25: number;
  p30: number;
  p33: number;
  p50: number;
  p66: number;
  p70: number;
  p75: number;
  p90: number;
};

function quantile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * (sorted.length - 1))));
  return sorted[idx]!;
}

function buildQuantiles(scores: number[]): ScoreQuantiles {
  const sorted = [...scores].sort((a, b) => a - b);
  return {
    p10: quantile(sorted, 0.1),
    p25: quantile(sorted, 0.25),
    p30: quantile(sorted, 0.3),
    p33: quantile(sorted, 0.33),
    p50: quantile(sorted, 0.5),
    p66: quantile(sorted, 0.66),
    p70: quantile(sorted, 0.7),
    p75: quantile(sorted, 0.75),
    p90: quantile(sorted, 0.9),
  };
}

/**
 * Higher = friendlier for humans (floor + reliability − feast/famine).
 * Pure function of existing rollout metrics — no extra simulation.
 */
export function computePlayerEaseScore(args: {
  p25: number;
  spread: number;
  completedCount: number;
  rolloutCount: number;
}): number {
  const completion = args.rolloutCount > 0 ? args.completedCount / args.rolloutCount : 0;
  return Math.round(args.p25 * 0.5 + completion * 100 - args.spread * 0.25);
}

/** Platform ritual axis: completion + score floor (first-win feel), not spread-penalized ease. */
export function computeOnboardingScore(args: {
  p25: number;
  completedCount: number;
  rolloutCount: number;
}): number {
  const completion = args.rolloutCount > 0 ? args.completedCount / args.rolloutCount : 0;
  return Math.round(completion * 250 + args.p25 * 0.35);
}

export type GeneratePoolOptions = {
  poolVersion: string;
  start: number;
  count: number;
  rolloutCount: number;
};

export type SeedPoolEntry = {
  seedId: string;
  poolVersion: string;
  tier: "easy" | "medium" | "hard";
  difficultyScore: number;
  metrics: {
    rolloutCount: number;
    scoreMin: number;
    scoreP50: number;
    scoreP90: number;
    scoreMax: number;
    scoreSpread: number;
    scoreQuantiles: ScoreQuantiles;
    playerEaseScore: number;
    onboardingScore: number;
    policyVersion: typeof YATZ_MANIFEST_POLICY_VERSION;
    decisionPolicyVersion: typeof YATZ_DECISION_POLICY_VERSION;
  };
};

export function makeSeedId(poolVersion: string, index: number): string {
  return formatYatzSeedId(poolVersion, index);
}

/** Probe one seed; tier filled later by assignYatzTiers (high p50 → easy). */
export function processOneSeed(
  seedIndex: number,
  options: GeneratePoolOptions
):
  | { kind: "accepted"; entry: Omit<SeedPoolEntry, "tier"> & { tier?: SeedPoolEntry["tier"] } }
  | { kind: "rejected"; seedId: string; reason: string } {
  const seedId = makeSeedId(options.poolVersion, seedIndex);
  const scores: number[] = [];
  for (let r = 0; r < options.rolloutCount; r++) {
    const sim = simulateGreedyGame(seedId, { rolloutIndex: r });
    if (sim.completed) scores.push(sim.finalScore);
  }
  if (scores.length < Math.max(3, Math.floor(options.rolloutCount * 0.5))) {
    return { kind: "rejected", seedId, reason: "low_completion_rate" };
  }
  const q = buildQuantiles(scores);
  if (q.p25 < 80) {
    return { kind: "rejected", seedId, reason: "low_score_p25" };
  }
  const sorted = [...scores].sort((a, b) => a - b);
  const p50 = q.p50;
  const scoreMin = sorted[0] ?? 0;
  const scoreMax = sorted[sorted.length - 1] ?? 0;
  const scoreSpread = scoreMax - scoreMin;
  const playerEaseScore = computePlayerEaseScore({
    p25: q.p25,
    spread: scoreSpread,
    completedCount: scores.length,
    rolloutCount: options.rolloutCount,
  });
  const onboardingScore = computeOnboardingScore({
    p25: q.p25,
    completedCount: scores.length,
    rolloutCount: options.rolloutCount,
  });
  return {
    kind: "accepted",
    entry: {
      seedId,
      poolVersion: options.poolVersion,
      difficultyScore: p50,
      metrics: {
        rolloutCount: scores.length,
        scoreMin,
        scoreP50: p50,
        scoreP90: q.p90,
        scoreMax,
        scoreSpread,
        scoreQuantiles: q,
        playerEaseScore,
        onboardingScore,
        policyVersion: YATZ_MANIFEST_POLICY_VERSION,
        decisionPolicyVersion: YATZ_DECISION_POLICY_VERSION,
      },
    },
  };
}

export function generateSeedPoolBatch(options: GeneratePoolOptions): {
  entries: SeedPoolEntry[];
  rejected: Array<{ seedId: string; reason: string }>;
} {
  const candidates: Array<Omit<SeedPoolEntry, "tier"> & { tier?: SeedPoolEntry["tier"] }> = [];
  const rejected: Array<{ seedId: string; reason: string }> = [];
  for (let i = options.start; i < options.start + options.count; i++) {
    const result = processOneSeed(i, options);
    if (result.kind === "accepted") candidates.push(result.entry);
    else rejected.push({ seedId: result.seedId, reason: result.reason });
  }
  const entries = assignYatzTiers(candidates);
  return { entries, rejected };
}
