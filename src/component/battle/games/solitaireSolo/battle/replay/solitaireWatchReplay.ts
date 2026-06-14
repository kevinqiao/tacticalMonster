import { simulateRollout } from '@/convex/solitaireArena/convex/service/seedPool/solitaireSeedSimulator';
import type {
  SolitaireRecordedStep,
  SolitaireRolloutScript,
} from '@/convex/solitaireArena/convex/service/seedPool/solitaireRecordedOpTypes';
import {
  HUMAN_STOCHASTIC_POLICY_VERSION,
  toSolitaireRecordedOp,
} from '@/convex/solitaireArena/convex/service/seedPool/solitaireRecordedOpTypes';

import {
  applyRecordedOp,
  createRolloutReplayState,
  pacingMsForRolloutStep,
} from './solitaireRolloutReplay';

export type SolitaireWatchStepSource =
  | { kind: 'rollout'; seedId: string; rolloutIndex: number }
  | { kind: 'recorded'; seedId: string; steps: SolitaireRecordedStep[] };

export function resolveWatchRollout(source: SolitaireWatchStepSource): {
  seedId: string;
  rollout: SolitaireRolloutScript;
} {
  if (source.kind === 'rollout') {
    return {
      seedId: source.seedId,
      rollout: simulateRollout(source.seedId, source.rolloutIndex),
    };
  }
  const ops = source.steps.map(toSolitaireRecordedOp);
  const replayPacingMs = source.steps.map((s) =>
    s.pacingMs != null && s.pacingMs > 0 ? s.pacingMs : 400
  );
  return {
    seedId: source.seedId,
    rollout: {
      rolloutIndex: 0,
      policyVersion: HUMAN_STOCHASTIC_POLICY_VERSION,
      ops,
      replayPacingMs,
      finalScore: 0,
      moves: 0,
      completed: false,
      terminalReason: 'exited',
      elapsedSimSeconds: 0,
    },
  };
}

export function pacingMsForWatchStep(
  rollout: SolitaireRolloutScript,
  stepIndex: number
): number {
  return pacingMsForRolloutStep(rollout, stepIndex);
}

export function estimateStepIndexForBotProgress(args: {
  rollout: SolitaireRolloutScript;
  revealAt?: number;
  duration?: number;
  nowMs?: number;
}): number {
  const { rollout, revealAt, duration, nowMs = Date.now() } = args;
  const steps = rollout.ops.length;
  if (steps === 0) return 0;
  if (revealAt == null || duration == null || duration <= 0) return 0;
  const progress = Math.min(1, Math.max(0, (nowMs - revealAt) / duration));
  return Math.min(steps, Math.floor(progress * steps));
}

export { applyRecordedOp, createRolloutReplayState };
