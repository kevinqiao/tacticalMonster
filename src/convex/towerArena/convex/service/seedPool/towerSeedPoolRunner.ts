import { mapFingerprintFromSeed, assignTiers, computeDistributionMetrics } from "./towerSeedDifficulty";
import type {
  RolloutSummary,
  SeedPoolEntry,
  SeedPoolRejectedEntry,
  SeedPoolTierQuotas,
  TierCandidate,
} from "./towerRecordedOpTypes";
import { generateTowerSeedFromId, makeTowerSeedId } from "../../shared/towerSeedCatalog";
import { simulateSeedRollouts, toRolloutSummaries } from "./towerSeedSimulator";
import { DEFAULT_MATCH_TIME_LIMIT_SEC } from "./towerSimTime";

export type GeneratePoolOptions = {
  poolVersion: string;
  start: number;
  count: number;
  tierQuotas: SeedPoolTierQuotas;
  rolloutCount: number;
  matchSeconds: number;
  writeRolloutSummaries: boolean;
};

export type ProcessOneSeedResult =
  | { kind: "accepted"; candidate: TierCandidate; rollouts: ReturnType<typeof simulateSeedRollouts>["rollouts"] }
  | { kind: "rejected"; entry: SeedPoolRejectedEntry };

export function makeSeedId(poolVersion: string, index: number): string {
  return makeTowerSeedId(poolVersion, index);
}

export function processOneSeed(
  seedIndex: number,
  poolVersion: string,
  opts: Pick<GeneratePoolOptions, "rolloutCount" | "matchSeconds">,
  seenFingerprints: Set<string>
): ProcessOneSeedResult {
  const seedId = makeSeedId(poolVersion, seedIndex);
  const seed = generateTowerSeedFromId(seedId);
  const fp = mapFingerprintFromSeed(seed);
  if (seenFingerprints.has(fp)) {
    return {
      kind: "rejected",
      entry: { seedId, reason: "duplicate_map", detail: fp },
    };
  }

  const { rollouts } = simulateSeedRollouts(seedId, opts.rolloutCount, opts.matchSeconds);
  const metrics = computeDistributionMetrics(rollouts, {
    openingMoveCount: seed.towerSlots.length,
    layoutFingerprint: fp,
    matchTimeLimitSec: opts.matchSeconds,
  });

  if (metrics.completedRate === 0 && metrics.scoreMax < 100) {
    return {
      kind: "rejected",
      entry: { seedId, reason: "unwinnable", metrics },
    };
  }
  if (metrics.completedRate > 0.95 && metrics.scoreP50 > 5000) {
    return {
      kind: "rejected",
      entry: { seedId, reason: "trivial", metrics },
    };
  }

  seenFingerprints.add(fp);
  const summaries = toRolloutSummaries(rollouts);
  return {
    kind: "accepted",
    candidate: {
      seedId,
      poolVersion,
      difficultyScore: metrics.scoreP50,
      metrics,
      rolloutSummaries: summaries,
    },
    rollouts,
  };
}

export function generatePool(options: GeneratePoolOptions): {
  entries: SeedPoolEntry[];
  rejected: SeedPoolRejectedEntry[];
} {
  const seen = new Set<string>();
  const candidates: TierCandidate[] = [];
  const rejected: SeedPoolRejectedEntry[] = [];

  for (let i = 0; i < options.count; i++) {
    const idx = options.start + i;
    const result = processOneSeed(
      idx,
      options.poolVersion,
      { rolloutCount: options.rolloutCount, matchSeconds: options.matchSeconds },
      seen
    );
    if (result.kind === "accepted") {
      candidates.push(result.candidate);
    } else {
      rejected.push(result.entry);
    }
  }

  const tiered = assignTiers(candidates, options.tierQuotas);
  return { entries: tiered, rejected };
}

export const DEFAULT_TIER_QUOTAS: SeedPoolTierQuotas = { easy: 0.3, medium: 0.4 };

export { DEFAULT_MATCH_TIME_LIMIT_SEC };
