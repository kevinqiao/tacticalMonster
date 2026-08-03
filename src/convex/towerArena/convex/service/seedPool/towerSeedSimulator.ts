import { generateTowerSeedFromId, mapFingerprint } from "../../shared/towerSeedCatalog";
import type { TowerArenaSeed } from "../../types/TowerArenaSeed";
import { TowerGamePhase } from "../../types/TowerArenaTypes";
import { computeTowerFinalScore } from "../towerScoring";
import { computeDistributionMetrics } from "./towerSeedDifficulty";
import type {
  RolloutSummary,
  TowerRolloutScript,
} from "./towerRecordedOpTypes";
import { TOWER_STOCHASTIC_POLICY_VERSION } from "./towerRecordedOpTypes";
import { DEFAULT_MATCH_TIME_LIMIT_SEC } from "./towerSimTime";
import { runPolicyOnSeed } from "./towerStochasticHumanPolicy";

function metricsLayoutFingerprint(seed: TowerArenaSeed): string {
  return mapFingerprint(seed);
}

export function simulateRollout(
  seed: TowerArenaSeed,
  seedId: string,
  rolloutIndex: number
): TowerRolloutScript {
  const { ops, state } = runPolicyOnSeed(seed, seedId, rolloutIndex);
  const completed =
    state.wavesCleared >= seed.waves.length && state.lives > 0;
  const terminalReason = completed
    ? ("completed" as const)
    : state.lives <= 0
      ? ("stuck" as const)
      : state.phase === TowerGamePhase.ENDED
        ? ("exited" as const)
        : ("time_up" as const);
  return {
    rolloutIndex,
    policyVersion: TOWER_STOCHASTIC_POLICY_VERSION,
    ops,
    finalScore: computeTowerFinalScore(state),
    moves: state.moves,
    completed,
    terminalReason,
    elapsedSimSeconds: Math.floor(state.elapsedSimMs / 1000),
  };
}

export function simulateSeedRollouts(
  seedId: string,
  rolloutCount: number,
  matchSeconds = DEFAULT_MATCH_TIME_LIMIT_SEC
): { seed: TowerArenaSeed; rollouts: TowerRolloutScript[] } {
  const seed = generateTowerSeedFromId(seedId);
  seed.matchTimeLimitSec = matchSeconds;
  const rollouts: TowerRolloutScript[] = [];
  for (let i = 0; i < rolloutCount; i++) {
    rollouts.push(simulateRollout(seed, seedId, i));
  }
  return { seed, rollouts };
}

export function toRolloutSummaries(rollouts: TowerRolloutScript[]): RolloutSummary[] {
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

export function simulateSeedRolloutsWithMetrics(
  seedId: string,
  rolloutCount: number,
  matchSeconds = DEFAULT_MATCH_TIME_LIMIT_SEC
) {
  const { seed, rollouts } = simulateSeedRollouts(seedId, rolloutCount, matchSeconds);
  const summaries = toRolloutSummaries(rollouts);
  const metrics = computeDistributionMetrics(rollouts, {
    openingMoveCount: seed.towerSlots.length,
    layoutFingerprint: metricsLayoutFingerprint(seed),
    matchTimeLimitSec: matchSeconds,
  });
  return { seed, rollouts, summaries, metrics };
}
