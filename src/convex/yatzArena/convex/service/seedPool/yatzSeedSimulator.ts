import { YatzGameStatus } from "../../types/YatzTypes";
import { YATZ_MANIFEST_POLICY_VERSION } from "../yatzSeedManifest";
import { playGreedyTurn } from "./yatzGreedyHoldPolicy";
import { YATZ_DECISION_POLICY_VERSION } from "./yatzHumanPersonas";
import { buildInitialState } from "./yatzOpCodec";
import type { YatzRecordedStep, YatzRolloutScript } from "./yatzRecordedOpTypes";
import { buildReplayPacingMs } from "./yatzSimTime";
import { createYatzPolicyContext } from "./yatzStochasticPolicy";

/**
 * Game/manifest seed for watch replay.
 * Manifest is fixed to seedId (rollouts only change policy RNG + persona).
 */
export function rolloutReplaySeed(seedId: string, _rolloutIndex?: number): string {
  return seedId;
}

/** Bot rollout: fixed Manifest(seedId) + persona/RNG from rolloutIndex. */
export function simulateRollout(seedId: string, rolloutIndex: number): YatzRolloutScript {
  const policy = createYatzPolicyContext(seedId, rolloutIndex);
  let state = buildInitialState(seedId);
  const ops: YatzRecordedStep[] = [];

  while (state.status === YatzGameStatus.PLAYING) {
    const next = playGreedyTurn(state, (step) => ops.push(step), policy);
    if (!next) break;
    state = next;
  }

  const replayPacingMs = buildReplayPacingMs(ops, seedId, rolloutIndex);

  return {
    rolloutIndex,
    policyVersion: YATZ_MANIFEST_POLICY_VERSION,
    decisionPolicyVersion: YATZ_DECISION_POLICY_VERSION,
    ops,
    replayPacingMs,
    finalScore: state.score,
    completed: state.status === YatzGameStatus.COMPLETED,
  };
}
