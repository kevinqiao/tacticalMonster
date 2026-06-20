import { simulateGreedyGame } from "../YatzGameEngine";
import { YATZ_MANIFEST_POLICY_VERSION } from "../yatzSeedManifest";
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
    policyVersion: typeof YATZ_MANIFEST_POLICY_VERSION;
  };
};

export function makeSeedId(poolVersion: string, index: number): string {
  return formatYatzSeedId(poolVersion, index);
}

export function processOneSeed(
  seedIndex: number,
  options: GeneratePoolOptions
): { kind: "accepted"; entry: SeedPoolEntry } | { kind: "rejected"; seedId: string; reason: string } {
  const seedId = makeSeedId(options.poolVersion, seedIndex);
  const scores: number[] = [];
  for (let r = 0; r < options.rolloutCount; r++) {
    const sim = simulateGreedyGame(`${seedId}:rollout:${r}`);
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
  const tier: "easy" | "medium" | "hard" =
    p50 >= 220 ? "hard" : p50 >= 180 ? "medium" : "easy";
  return {
    kind: "accepted",
    entry: {
      seedId,
      poolVersion: options.poolVersion,
      tier,
      difficultyScore: p50,
      metrics: {
        rolloutCount: scores.length,
        scoreMin: sorted[0] ?? 0,
        scoreP50: p50,
        scoreP90: q.p90,
        scoreMax: sorted[sorted.length - 1] ?? 0,
        scoreSpread: (sorted[sorted.length - 1] ?? 0) - (sorted[0] ?? 0),
        scoreQuantiles: q,
        policyVersion: YATZ_MANIFEST_POLICY_VERSION,
      },
    },
  };
}

export function generateSeedPoolBatch(options: GeneratePoolOptions): {
  entries: SeedPoolEntry[];
  rejected: Array<{ seedId: string; reason: string }>;
} {
  const entries: SeedPoolEntry[] = [];
  const rejected: Array<{ seedId: string; reason: string }> = [];
  for (let i = options.start; i < options.start + options.count; i++) {
    const result = processOneSeed(i, options);
    if (result.kind === "accepted") entries.push(result.entry);
    else rejected.push({ seedId: result.seedId, reason: result.reason });
  }
  return { entries, rejected };
}
