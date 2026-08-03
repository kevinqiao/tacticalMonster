import { applyRecordedOp, buildInitialState } from '@/convex/yatzArena/convex/service/seedPool/yatzOpCodec';

import type {

  YatzRecordedStep,

  YatzRolloutScript,

} from '@/convex/yatzArena/convex/service/seedPool/yatzRecordedOpTypes';

import {

  rolloutReplaySeed,

  simulateRollout,

} from '@/convex/yatzArena/convex/service/seedPool/yatzSeedSimulator';

import { scalePacingToTargetMs } from '@/convex/yatzArena/convex/service/seedPool/yatzSimTime';

import type { YatzGameState } from '../types/YatzTypes';



export type YatzWatchStepSource =

  | { kind: 'rollout'; seedId: string; rolloutIndex: number }

  | { kind: 'recorded'; seedId: string; steps: YatzRecordedStep[]; gameId?: string };



export function resolveWatchSteps(

  source: YatzWatchStepSource,

  opts?: { targetDurationMs?: number },

): {

  seedId: string;

  steps: YatzRecordedStep[];

  pacingMs: number[];

  rollout?: YatzRolloutScript;

} {

  if (source.kind === 'recorded') {

    const pacingMs = source.steps.map((s) => pacingMsForStep(s));

    return { seedId: source.seedId, steps: source.steps, pacingMs };

  }

  const rollout = simulateRollout(source.seedId, source.rolloutIndex);

  const steps = rollout.ops;

  let pacingMs =

    rollout.replayPacingMs?.length === steps.length

      ? rollout.replayPacingMs

      : steps.map((s) => pacingMsForStep(s));

  if (opts?.targetDurationMs != null && opts.targetDurationMs > 0) {

    pacingMs = scalePacingToTargetMs(pacingMs, opts.targetDurationMs);

  }

  return {

    seedId: rolloutReplaySeed(source.seedId, source.rolloutIndex),

    steps,

    pacingMs,

    rollout,

  };

}



export function createWatchReplayState(seedId: string, gameId?: string): YatzGameState {

  return buildInitialState(seedId, gameId);

}



/** Immutable copy so React re-renders after in-place sim updates. */

export function cloneYatzGameStateForUi(state: YatzGameState): YatzGameState {

  return {

    ...state,

    dice: [...state.dice],

    held: [...state.held],

    categoryScores: { ...state.categoryScores },

    recordedOps: state.recordedOps ? [...state.recordedOps] : undefined,

  };

}



export function pacingMsForStep(step: YatzRecordedStep | undefined, customMs?: number): number {

  if (customMs != null && customMs > 0) return customMs;

  if (step?.pacingMs != null && step.pacingMs > 0) return step.pacingMs;

  if (step?.op === 'pick_category') return 7500;

  if (step?.op === 'toggle_hold') return 1400;

  if (step?.op === 'concede') return 800;

  return 2800;

}



export function estimateStepIndexForBotProgress(args: {

  steps: YatzRecordedStep[];

  pacingMs: number[];

  revealAt?: number;

  duration?: number;

  nowMs?: number;

}): number {

  const { steps, pacingMs, revealAt, duration, nowMs = Date.now() } = args;

  if (steps.length === 0) return 0;

  if (revealAt == null || duration == null || duration <= 0) return 0;

  const progress = Math.min(1, Math.max(0, (nowMs - revealAt) / duration));

  const totalMs = pacingMs.reduce((a, b) => a + b, 0) || steps.length * 500;

  let acc = 0;

  const targetMs = progress * totalMs;

  for (let i = 0; i < steps.length; i++) {

    acc += pacingMs[i] ?? pacingMsForStep(steps[i]);

    if (acc >= targetMs) return Math.min(steps.length, i + 1);

  }

  return steps.length;

}



export function applyWatchStep(

  simState: YatzGameState,

  step: YatzRecordedStep

): { ok: true; state: YatzGameState } | { ok: false; reason: string } {

  return applyRecordedOp(simState, step);

}


