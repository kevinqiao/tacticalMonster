import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';

import type { Match3RecordedStep } from '@/convex/match3Arena/convex/service/seedPool/match3RecordedOpTypes';
import { applyRecordedOp } from '@/convex/match3Arena/convex/service/seedPool/match3OpCodec';

import type { Match3BoardMetrics } from '../animation/boardMetrics';
import type { GridCellRefs } from '../animation/gridCellRefs';
import {
  GameInteractionPhase,
  type Match3GameState,
} from '../types/Match3Types';
import {
  createWatchReplayState,
  mergeSimIntoGameState,
  pacingMsForStep,
  playWatchStep,
  resolveWatchSteps,
  type Match3WatchStepSource,
} from './match3WatchReplay';

export type UseMatch3WatchReplayerOptions = {
  source: Match3WatchStepSource | null;
  gameState: Match3GameState | null;
  gridCellRefs: RefObject<GridCellRefs | null>;
  boardMetricsRef: RefObject<Match3BoardMetrics>;
  syncReplayState: (sim: Match3GameState) => void;
  setInteractionPhase?: (phase: GameInteractionPhase) => void;
  playbackSpeed?: number;
  initialStepIndex?: number;
};

export function useMatch3WatchReplayer({
  source,
  gameState,
  gridCellRefs,
  boardMetricsRef,
  syncReplayState,
  setInteractionPhase,
  playbackSpeed = 1,
  initialStepIndex = 0,
}: UseMatch3WatchReplayerOptions) {
  const resolved = useMemo(
    () => (source ? resolveWatchSteps(source) : null),
    [source]
  );

  const [playing, setPlaying] = useState(false);
  const [stepIndex, setStepIndex] = useState(initialStepIndex);
  const simStateRef = useRef<ReturnType<typeof createWatchReplayState> | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gameStateRef = useRef(gameState);
  const syncReplayStateRef = useRef(syncReplayState);
  const setInteractionPhaseRef = useRef(setInteractionPhase);
  gameStateRef.current = gameState;
  syncReplayStateRef.current = syncReplayState;
  setInteractionPhaseRef.current = setInteractionPhase;

  const steps = resolved?.steps ?? [];
  const seedId = resolved?.seedId ?? '';

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setPlaying(false);
    setStepIndex(0);
    if (!seedId) return;
    simStateRef.current = createWatchReplayState(seedId);
    if (gameStateRef.current) {
      mergeSimIntoGameState(gameStateRef.current, simStateRef.current);
      syncReplayStateRef.current(gameStateRef.current);
    }
  }, [seedId]);

  useEffect(() => {
    if (!source || !gameStateRef.current) return;
    simStateRef.current = createWatchReplayState(
      source.kind === 'recorded' ? source.seedId : source.seedId
    );
    setPlaying(false);
    if (initialStepIndex > 0 && steps.length > 0) {
      let sim = simStateRef.current;
      const target = Math.min(initialStepIndex, steps.length);
      for (let i = 0; i < target; i++) {
        const applied = applyRecordedOp(sim, steps[i]!);
        if (!applied.ok) break;
        sim = applied.state;
      }
      simStateRef.current = sim;
      mergeSimIntoGameState(gameStateRef.current, sim);
      syncReplayStateRef.current(gameStateRef.current);
      setStepIndex(target);
      return;
    }
    setStepIndex(0);
    mergeSimIntoGameState(gameStateRef.current, simStateRef.current);
    syncReplayStateRef.current(gameStateRef.current);
  }, [source, initialStepIndex, steps]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const playOneStep = useCallback(async () => {
    if (!resolved || !gameStateRef.current) return false;
    if (!simStateRef.current) {
      simStateRef.current = createWatchReplayState(resolved.seedId);
    }
    const step = steps[stepIndex] as Match3RecordedStep | undefined;
    if (!step) return false;

    const refs = gridCellRefs.current;
    if (!refs) return false;

    setInteractionPhaseRef.current?.(GameInteractionPhase.animating);
    const result = await playWatchStep({
      simState: simStateRef.current,
      step,
      gridCellRefs: refs,
      boardMetrics: boardMetricsRef.current,
      commitGrid: (grid) => {
        if (!gameStateRef.current) return;
        gameStateRef.current.grid = grid;
        syncReplayStateRef.current({ ...gameStateRef.current });
      },
    });
    setInteractionPhaseRef.current?.(GameInteractionPhase.idle);

    if (!result.ok) {
      console.warn('[match3 watch] step failed', result.reason, step);
      setPlaying(false);
      return false;
    }

    simStateRef.current = result.state;
    mergeSimIntoGameState(gameStateRef.current, result.state);
    syncReplayStateRef.current(gameStateRef.current);
    setStepIndex((i) => i + 1);
    return true;
  }, [boardMetricsRef, gridCellRefs, resolved, stepIndex, steps]);

  const play = useCallback(() => {
    if (!resolved || !gameState) return;
    setPlaying(true);
  }, [gameState, resolved]);

  const pause = useCallback(() => {
    setPlaying(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  useEffect(() => {
    if (!playing || !resolved) return;
    if (stepIndex >= steps.length) {
      setPlaying(false);
      return;
    }

    const step = steps[stepIndex];
    const delay = Math.max(50, pacingMsForStep(step) / playbackSpeed);
    timerRef.current = setTimeout(() => {
      void playOneStep().then((ok) => {
        if (!ok) setPlaying(false);
      });
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [playOneStep, playbackSpeed, playing, resolved, stepIndex, steps]);

  const stepForward = useCallback(async () => {
    pause();
    await playOneStep();
  }, [pause, playOneStep]);

  return {
    playing,
    stepIndex,
    totalSteps: steps.length,
    rollout: resolved?.rollout,
    play,
    pause,
    reset,
    stepForward,
    done: steps.length > 0 && stepIndex >= steps.length,
  };
}
