import { flushSync } from 'react-dom';

import { Match3GameEngine } from '@/convex/match3Arena/convex/service/Match3GameEngine';
import {
  applyRecordedOp,
  buildInitialState,
} from '@/convex/match3Arena/convex/service/seedPool/match3OpCodec';
import type {
  Match3GameStateForReplay,
  Match3RecordedStep,
  Match3RolloutScript,
} from '@/convex/match3Arena/convex/service/seedPool/match3RecordedOpTypes';
import { simulateRollout } from '@/convex/match3Arena/convex/service/seedPool/match3SeedSimulator';

import type { Match3BoardMetrics } from '../animation/boardMetrics';
import type { GridCellRefs } from '../animation/gridCellRefs';
import {
  gridAfterSwap,
  playMatch3TurnScript,
  turnScriptAfterSwap,
} from '../animation/match3TurnPlayback';
import type { Match3Cell, Match3GameState } from '../types/Match3Types';
import { MATCH3_GRID_COLS, MATCH3_GRID_ROWS } from '../types/Match3Types';

export type Match3WatchStepSource =
  | { kind: 'rollout'; seedId: string; rolloutIndex: number }
  | { kind: 'recorded'; seedId: string; steps: Match3RecordedStep[] };

export function resolveWatchSteps(source: Match3WatchStepSource): {
  seedId: string;
  steps: Match3RecordedStep[];
  rollout?: Match3RolloutScript;
} {
  if (source.kind === 'recorded') {
    return { seedId: source.seedId, steps: source.steps };
  }
  const rollout = simulateRollout(source.seedId, source.rolloutIndex);
  const steps: Match3RecordedStep[] = rollout.ops.map((op, i) => ({
    ...op,
    pacingMs: rollout.replayPacingMs?.[i],
  }));
  return { seedId: source.seedId, steps, rollout };
}

export function createWatchReplayState(seedId: string): Match3GameStateForReplay {
  return buildInitialState(seedId);
}

export function pacingMsForStep(step: Match3RecordedStep | undefined): number {
  if (step?.pacingMs != null && step.pacingMs > 0) return step.pacingMs;
  return 400;
}

export function mergeSimIntoGameState(
  target: Match3GameState,
  sim: Match3GameStateForReplay
): void {
  target.grid = sim.grid;
  target.score = sim.score;
  target.moves = sim.moves;
  target.status = sim.status;
  target.refillCounter = sim.refillCounter;
}

export function estimateStepIndexForBotProgress(args: {
  steps: Match3RecordedStep[];
  revealAt?: number;
  duration?: number;
  nowMs?: number;
}): number {
  const { steps, revealAt, duration, nowMs = Date.now() } = args;
  if (steps.length === 0) return 0;
  if (revealAt == null || duration == null || duration <= 0) return 0;
  const progress = Math.min(1, Math.max(0, (nowMs - revealAt) / duration));
  return Math.min(steps.length, Math.floor(progress * steps.length));
}

function waitPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

export async function playWatchStep(args: {
  simState: Match3GameStateForReplay;
  step: Match3RecordedStep;
  gridCellRefs: GridCellRefs;
  boardMetrics: Match3BoardMetrics;
  commitGrid: (grid: Match3Cell[][]) => void;
}): Promise<{ ok: true; state: Match3GameStateForReplay } | { ok: false; reason: string }> {
  if (args.step.op === 'concede') {
    const applied = applyRecordedOp(args.simState, args.step);
    if (!applied.ok) return { ok: false, reason: applied.reason };
    return { ok: true, state: applied.state };
  }

  const { r1, c1, r2, c2 } = args.step;
  const local = Match3GameEngine.applySwap(
    {
      grid: args.simState.grid,
      score: args.simState.score,
      moves: args.simState.moves,
      seed: args.simState.seed ?? 'replay',
      refillCounter: args.simState.refillCounter ?? MATCH3_GRID_ROWS * MATCH3_GRID_COLS,
    },
    r1,
    c1,
    r2,
    c2
  );
  if (!local.ok) {
    return { ok: false, reason: local.error };
  }

  const swappedGrid = gridAfterSwap(args.simState.grid, r1, c1, r2, c2);
  flushSync(() => args.commitGrid(swappedGrid));
  await waitPaint();

  try {
    await playMatch3TurnScript({
      turnScript: turnScriptAfterSwap(local.turnScript),
      finalGrid: local.grid,
      gridCellRefs: args.gridCellRefs,
      initialWorkingGrid: swappedGrid,
      boardMetrics: args.boardMetrics,
      commitGrid: (grid) => {
        flushSync(() => args.commitGrid(grid));
      },
    });
  } catch (e) {
    console.warn('[match3 watch] animation failed', e);
    flushSync(() => args.commitGrid(local.grid));
  }

  const applied = applyRecordedOp(args.simState, args.step);
  if (!applied.ok) return { ok: false, reason: applied.reason };
  return { ok: true, state: applied.state };
}
