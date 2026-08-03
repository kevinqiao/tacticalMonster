import { assignTiers, layoutFingerprint, type Match3TierCandidate } from "./match3SeedDifficulty";
import { findValidMoves } from "../Match3GameEngine";
import { buildInitialState } from "./match3OpCodec";
import type { Match3RolloutScript, SeedPoolEntry } from "./match3RecordedOpTypes";
import { formatMatch3SeedId } from "./match3RecordedOpTypes";
import { DEFAULT_MATCH_TIME_LIMIT_SEC } from "./match3SimTime";
import { simulateSeedRollouts } from "./match3SeedSimulator";

export type GeneratePoolOptions = {
  poolVersion: string;
  start: number;
  count: number;
  rolloutCount: number;
  matchSeconds: number;
  minOpeningMoves: number;
  minScoreP25: number;
};

export type SeedPoolRejectedEntry = {
  seedId: string;
  reason: string;
  detail?: string;
};

export function makeSeedId(poolVersion: string, index: number): string {
  return formatMatch3SeedId(poolVersion, index);
}

export function toRolloutSummaries(rollouts: Match3RolloutScript[]) {
  return rollouts.map((r) => ({
    rolloutIndex: r.rolloutIndex,
    finalScore: r.finalScore,
    moves: r.moves,
    completed: r.completed,
    terminalReason: r.terminalReason,
    elapsedSimSeconds: r.elapsedSimSeconds,
    opCount: r.ops.length,
  }));
}

export function processOneSeed(
  seedIndex: number,
  options: GeneratePoolOptions,
  seenFingerprints: Set<string>
):
  | { kind: "accepted"; candidate: Match3TierCandidate; rollouts: Match3RolloutScript[] }
  | { kind: "rejected"; entry: SeedPoolRejectedEntry } {
  const seedId = makeSeedId(options.poolVersion, seedIndex);

  try {
    const initial = buildInitialState(seedId);
    const openingMoves = findValidMoves(initial.grid).length;
    const fp = layoutFingerprint(seedId);
    if (seenFingerprints.has(fp)) {
      return { kind: "rejected", entry: { seedId, reason: "duplicate_layout", detail: fp } };
    }
    if (openingMoves < options.minOpeningMoves) {
      return {
        kind: "rejected",
        entry: { seedId, reason: "low_opening_moves", detail: String(openingMoves) },
      };
    }

    const { rollouts, metrics } = simulateSeedRollouts(seedId, options.rolloutCount, {
      matchSeconds: options.matchSeconds,
    });
    if (metrics.scoreQuantiles.p25 < options.minScoreP25) {
      return {
        kind: "rejected",
        entry: { seedId, reason: "low_score_p25", detail: String(metrics.scoreQuantiles.p25) },
      };
    }

    seenFingerprints.add(fp);
    const candidate: Match3TierCandidate = {
      seedId,
      poolVersion: options.poolVersion,
      difficultyScore: metrics.scoreP50,
      metrics,
      rolloutSummaries: toRolloutSummaries(rollouts),
    };
    return { kind: "accepted", candidate, rollouts };
  } catch (e) {
    return {
      kind: "rejected",
      entry: { seedId, reason: "build_failed", detail: String(e) },
    };
  }
}

export function generateSeedPoolBatch(options: GeneratePoolOptions): {
  entries: SeedPoolEntry[];
  rejected: SeedPoolRejectedEntry[];
} {
  const candidates: Match3TierCandidate[] = [];
  const rejected: SeedPoolRejectedEntry[] = [];
  const seen = new Set<string>();

  for (let i = options.start; i < options.start + options.count; i++) {
    const result = processOneSeed(i, options, seen);
    if (result.kind === "accepted") candidates.push(result.candidate);
    else rejected.push(result.entry);
  }

  const entries = assignTiers(candidates);
  return { entries, rejected };
}

export const DEFAULT_GENERATE_OPTIONS: GeneratePoolOptions = {
  poolVersion: "v1",
  start: 1,
  count: 50,
  rolloutCount: 20,
  matchSeconds: DEFAULT_MATCH_TIME_LIMIT_SEC,
  minOpeningMoves: 3,
  minScoreP25: 50,
};
