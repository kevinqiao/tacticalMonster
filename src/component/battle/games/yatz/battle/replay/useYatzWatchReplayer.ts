import { useCallback, useEffect, useMemo, useRef, useState } from 'react';



import type { YatzRecordedStep } from '@/convex/yatzArena/convex/service/seedPool/yatzRecordedOpTypes';



import type { YatzGameState } from '../types/YatzTypes';

import {

  applyWatchStep,

  cloneYatzGameStateForUi,

  createWatchReplayState,

  pacingMsForStep,

  resolveWatchSteps,

  type YatzWatchStepSource,

} from './yatzWatchReplay';



export type UseYatzWatchReplayerOptions = {
  source: YatzWatchStepSource | null;
  gameState: YatzGameState | null;
  syncReplayState: (state: YatzGameState) => void;
  playbackSpeed?: number;
  initialStepIndex?: number;
  /** Bot rollout: scale step delays to platform duration when set. */
  targetDurationMs?: number;
};



export function useYatzWatchReplayer({
  source,
  gameState,
  syncReplayState,
  playbackSpeed = 1,
  initialStepIndex = 0,
  targetDurationMs,
}: UseYatzWatchReplayerOptions) {
  const resolved = useMemo(
    () =>
      source
        ? resolveWatchSteps(source, {
            targetDurationMs,
          })
        : null,
    [source, targetDurationMs]
  );



  const [playing, setPlaying] = useState(false);

  const [stepIndex, setStepIndex] = useState(initialStepIndex);

  const [stepError, setStepError] = useState<string | null>(null);

  const simStateRef = useRef<YatzGameState | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncReplayStateRef = useRef(syncReplayState);

  syncReplayStateRef.current = syncReplayState;



  const steps = resolved?.steps ?? [];

  const pacingMs = resolved?.pacingMs ?? [];

  const replaySeedId = resolved?.seedId ?? '';

  const replayGameId = source?.kind === 'recorded' ? source.gameId : undefined;



  const publishSim = useCallback((sim: YatzGameState) => {

    syncReplayStateRef.current(cloneYatzGameStateForUi(sim));

  }, []);



  const reset = useCallback(() => {

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = null;

    setPlaying(false);

    setStepError(null);

    setStepIndex(0);

    if (!replaySeedId) return;

    simStateRef.current = createWatchReplayState(replaySeedId, replayGameId);

    publishSim(simStateRef.current);

  }, [publishSim, replayGameId, replaySeedId]);



  useEffect(() => {

    if (!source || !resolved) return;

    setStepError(null);

    simStateRef.current = createWatchReplayState(resolved.seedId, replayGameId);

    setPlaying(false);



    if (initialStepIndex > 0 && steps.length > 0) {

      let sim = simStateRef.current;

      const target = Math.min(initialStepIndex, steps.length);

      for (let i = 0; i < target; i++) {

        const applied = applyWatchStep(sim, steps[i]!);

        if (!applied.ok) {

          setStepError(`回放步骤 ${i + 1} 失败：${applied.reason}`);

          break;

        }

        sim = applied.state;

      }

      simStateRef.current = sim;

      publishSim(sim);

      setStepIndex(target);

      return;

    }



    setStepIndex(0);

    publishSim(simStateRef.current);

  }, [source, resolved, replayGameId, initialStepIndex, steps, publishSim]);



  useEffect(() => {

    return () => {

      if (timerRef.current) clearTimeout(timerRef.current);

    };

  }, []);



  const playOneStep = useCallback(async () => {

    if (!resolved) return false;

    if (!simStateRef.current) {

      simStateRef.current = createWatchReplayState(resolved.seedId, replayGameId);

    }

    const step = steps[stepIndex] as YatzRecordedStep | undefined;

    if (!step) return false;



    const result = applyWatchStep(simStateRef.current, step);

    if (!result.ok) {

      console.warn('[yatz watch] step failed', result.reason, step);

      setStepError(`回放步骤 ${stepIndex + 1} 失败：${result.reason}`);

      setPlaying(false);

      return false;

    }



    setStepError(null);

    simStateRef.current = result.state;

    publishSim(result.state);

    setStepIndex((i) => i + 1);

    return true;

  }, [resolved, replayGameId, stepIndex, steps, publishSim]);



  const play = useCallback(() => {

    if (!resolved || !gameState || steps.length === 0) return;

    setStepError(null);

    setPlaying(true);

  }, [gameState, resolved, steps.length]);



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

    const delay = Math.max(50, pacingMsForStep(step, pacingMs[stepIndex]) / playbackSpeed);

    timerRef.current = setTimeout(() => {

      void playOneStep().then((ok) => {

        if (!ok) setPlaying(false);

      });

    }, delay);



    return () => {

      if (timerRef.current) clearTimeout(timerRef.current);

    };

  }, [playOneStep, pacingMs, playbackSpeed, playing, resolved, stepIndex, steps]);



  const stepForward = useCallback(async () => {

    pause();

    await playOneStep();

  }, [pause, playOneStep]);



  return {

    playing,

    stepIndex,

    totalSteps: steps.length,

    stepError,

    rollout: resolved?.rollout,

    play,

    pause,

    reset,

    stepForward,

    done: steps.length > 0 && stepIndex >= steps.length,

  };

}


