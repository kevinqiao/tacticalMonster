import type {
  BandThresholds,
  RolloutSummary,
  SeedPoolEntry,
  SolitaireSeedTier,
} from "./solitaireRecordedOpTypes";
import type { RolloutTerminalReason } from "./solitaireRecordedOpTypes";
import {
  computeBandThresholds,
  PERFORMANCE_BAND_HIGH_CUMULATIVE_FRACTION,
  PERFORMANCE_BAND_LOW_FRACTION,
} from "./solitaireSeedDifficulty";

/** Score-relative band on this seed: low=bottom 30%, mid=middle 40%, high=top 30% */
export type ScoreBand = "low" | "mid" | "high";

export type PlayerSeedScoreResult = {
  seedId: string;
  playerScore: number;
  layoutTier: SolitaireSeedTier;
  scoreBand: ScoreBand;
  percentileOnSeed: number;
  bandThresholds: BandThresholds;
  nearestRollout: {
    rolloutIndex: number;
    finalScore: number;
    scoreDelta: number;
    terminalReason: RolloutTerminalReason;
  };
};

/** Map rollout rank percentile to band: bottom 30% / middle 40% / top 30% */
export function resolveScoreBandFromPercentile(percentileOnSeed: number): ScoreBand {
  if (percentileOnSeed <= PERFORMANCE_BAND_LOW_FRACTION) return "low";
  if (percentileOnSeed <= PERFORMANCE_BAND_HIGH_CUMULATIVE_FRACTION) return "mid";
  return "high";
}

/** Score-threshold fallback when only precomputed cut points are available */
export function resolveScoreBandFromThresholds(
  playerScore: number,
  thresholds: BandThresholds
): ScoreBand {
  if (playerScore <= thresholds.lowMax) return "low";
  if (playerScore <= thresholds.midMax) return "mid";
  return "high";
}

export function computePercentileOnSeed(scores: number[], playerScore: number): number {
  if (scores.length === 0) return 0;
  const count = scores.filter((s) => s <= playerScore).length;
  return count / scores.length;
}

export function findNearestRollout(
  summaries: RolloutSummary[],
  playerScore: number
): PlayerSeedScoreResult["nearestRollout"] {
  if (summaries.length === 0) {
    return {
      rolloutIndex: 0,
      finalScore: 0,
      scoreDelta: Math.abs(playerScore),
      terminalReason: "stuck",
    };
  }
  let best = summaries[0]!;
  let bestDelta = Math.abs(best.finalScore - playerScore);
  for (const s of summaries) {
    const delta = Math.abs(s.finalScore - playerScore);
    if (delta < bestDelta || (delta === bestDelta && s.rolloutIndex < best.rolloutIndex)) {
      best = s;
      bestDelta = delta;
    }
  }
  return {
    rolloutIndex: best.rolloutIndex,
    finalScore: best.finalScore,
    scoreDelta: bestDelta,
    terminalReason: best.terminalReason,
  };
}

export function resolvePlayerSeedScoreFromSummaries(
  seedId: string,
  layoutTier: SolitaireSeedTier,
  summaries: RolloutSummary[],
  playerScore: number,
  bandThresholds?: BandThresholds
): PlayerSeedScoreResult {
  const scores = summaries.map((s) => s.finalScore).sort((a, b) => a - b);
  const thresholds = bandThresholds ?? computeBandThresholds(scores);
  const percentileOnSeed = computePercentileOnSeed(scores, playerScore);
  return {
    seedId,
    playerScore,
    layoutTier,
    scoreBand: resolveScoreBandFromPercentile(percentileOnSeed),
    percentileOnSeed,
    bandThresholds: thresholds,
    nearestRollout: findNearestRollout(summaries, playerScore),
  };
}

/** Use precomputed band cuts when index.json has no rolloutSummaries (index-only pool). */
export function resolvePlayerSeedScoreFromMetrics(
  entry: SeedPoolEntry,
  playerScore: number
): PlayerSeedScoreResult {
  const thresholds = entry.metrics.bandThresholds;
  const probeScore = entry.metrics.scoreP50;
  return {
    seedId: entry.seedId,
    playerScore,
    layoutTier: entry.tier,
    scoreBand: resolveScoreBandFromThresholds(playerScore, thresholds),
    percentileOnSeed: computePercentileOnSeed(
      [entry.metrics.scoreMin, entry.metrics.scoreP50, entry.metrics.scoreMax],
      playerScore
    ),
    bandThresholds: thresholds,
    nearestRollout: {
      rolloutIndex: 0,
      finalScore: probeScore,
      scoreDelta: Math.abs(playerScore - probeScore),
      terminalReason: "exited",
    },
  };
}

export function resolvePlayerSeedScore(
  entry: SeedPoolEntry,
  playerScore: number
): PlayerSeedScoreResult {
  const summaries = entry.rolloutSummaries;
  if (!summaries?.length) {
    return resolvePlayerSeedScoreFromMetrics(entry, playerScore);
  }
  return resolvePlayerSeedScoreFromSummaries(
    entry.seedId,
    entry.tier,
    summaries,
    playerScore,
    entry.metrics.bandThresholds
  );
}
