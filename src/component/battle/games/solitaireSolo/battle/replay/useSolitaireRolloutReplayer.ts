import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { SolitaireRecordedOp } from "@/convex/solitaireArena/convex/service/seedPool/solitaireRecordedOpTypes";
import type { SolitaireRolloutScript } from "@/convex/solitaireArena/convex/service/seedPool/solitaireRecordedOpTypes";
import {
  GameInteractionPhase,
  type SoloBoardDimension,
  type SoloCard,
  type SoloGameState,
} from "../types/SoloTypes";
import { playRolloutOpAnimation } from "./playRolloutOpAnimation";
import {
  applyRecordedOp,
  createRolloutReplayState,
  pacingMsForRolloutStep,
} from "./solitaireRolloutReplay";

export type RolloutReplayStepPayload = {
  op: SolitaireRecordedOp;
  stepIndex: number;
  stateAfter: SoloGameState;
};

export type UseSolitaireRolloutReplayerOptions = {
  rollout: SolitaireRolloutScript | null;
  seedId: string;
  gameState: SoloGameState | null;
  boardDimensionRef?: RefObject<SoloBoardDimension | null>;
  /** Measured board layout; required with ref for PlayEffects (ref alone does not re-render). */
  boardDimension?: SoloBoardDimension | null;
  /** When set, steps use PlayEffects (same as live play). Otherwise silent applyOp merge. */
  saveUpdate?: (cards: SoloCard[]) => void;
  /** Full state sync after each step (score/moves + all cards). */
  syncReplayState?: (source: SoloGameState) => void;
  /** Score/moves only — used when animation already patched cards. */
  syncReplayScore?: (source: SoloGameState) => void;
  setInteractionPhase?: (phase: GameInteractionPhase) => void;
  onStep?: (payload: RolloutReplayStepPayload) => void | Promise<void>;
  playbackSpeed?: number;
};

export function useSolitaireRolloutReplayer({
  rollout,
  seedId,
  gameState,
  boardDimensionRef,
  boardDimension,
  saveUpdate,
  syncReplayState,
  syncReplayScore,
  setInteractionPhase,
  onStep,
  playbackSpeed = 1,
}: UseSolitaireRolloutReplayerOptions) {
  const [playing, setPlaying] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const simStateRef = useRef<SoloGameState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gameStateRef = useRef(gameState);
  const saveUpdateRef = useRef(saveUpdate);
  const syncReplayStateRef = useRef(syncReplayState);
  const syncReplayScoreRef = useRef(syncReplayScore);
  const setInteractionPhaseRef = useRef(setInteractionPhase);
  gameStateRef.current = gameState;
  saveUpdateRef.current = saveUpdate;
  syncReplayStateRef.current = syncReplayState;
  syncReplayScoreRef.current = syncReplayScore;
  setInteractionPhaseRef.current = setInteractionPhase;

  const useAnimations = Boolean(
    boardDimensionRef?.current && boardDimension && saveUpdate && gameState
  );

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setPlaying(false);
    setStepIndex(0);
    simStateRef.current = createRolloutReplayState(seedId);
    syncReplayStateRef.current?.(simStateRef.current);
  }, [seedId]);

  useEffect(() => {
    reset();
    // reset is stable (no gameState dep); only re-run when rollout/seed changes
  }, [rollout?.rolloutIndex, seedId, reset]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const playOneStep = useCallback(async () => {
    if (!rollout || !gameStateRef.current) return false;
    if (!simStateRef.current) {
      simStateRef.current = createRolloutReplayState(seedId);
    }
    const op = rollout.ops[stepIndex];
    if (!op) return false;

    const applied = applyRecordedOp(simStateRef.current, op);
    if (!applied.ok) {
      console.warn("[rollout replay] step failed", applied.reason, op);
      setPlaying(false);
      return false;
    }
    simStateRef.current = applied.state;

    let animOk = false;
    if (useAnimations && boardDimensionRef && saveUpdateRef.current) {
      setInteractionPhaseRef.current?.(GameInteractionPhase.animating);
      animOk = await playRolloutOpAnimation({
        gameState: gameStateRef.current,
        boardDimensionRef,
        op,
        saveUpdate: saveUpdateRef.current,
        autoFoundationMove: op.op === "move" && op.to.startsWith("foundation-"),
      });
      setInteractionPhaseRef.current?.(GameInteractionPhase.idle);
      if (!animOk) {
        console.warn("[rollout replay] animation skipped, syncing state", op);
      }
    }

    syncReplayStateRef.current?.(applied.state);

    await onStep?.({ op, stepIndex, stateAfter: applied.state });
    setStepIndex((i) => i + 1);
    return true;
  }, [
    boardDimensionRef,
    onStep,
    rollout,
    seedId,
    stepIndex,
    useAnimations,
    boardDimension,
  ]);

  const play = useCallback(() => {
    if (!rollout || !gameState) return;
    setPlaying(true);
  }, [gameState, rollout]);

  const pause = useCallback(() => {
    setPlaying(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  useEffect(() => {
    if (!playing || !rollout) return;
    if (stepIndex >= rollout.ops.length) {
      setPlaying(false);
      return;
    }

    const delay = Math.max(50, pacingMsForRolloutStep(rollout, stepIndex) / playbackSpeed);
    timerRef.current = setTimeout(() => {
      void playOneStep().then((stepOk) => {
        if (!stepOk) setPlaying(false);
      });
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [playing, playOneStep, playbackSpeed, rollout, stepIndex]);

  const stepForward = useCallback(async () => {
    pause();
    await playOneStep();
  }, [pause, playOneStep]);

  return {
    playing,
    stepIndex,
    totalSteps: rollout?.ops.length ?? 0,
    terminalReason: rollout?.terminalReason,
    finalScore: rollout?.finalScore,
    play,
    pause,
    reset,
    stepForward,
    done: rollout != null && stepIndex >= rollout.ops.length,
    usesAnimations: useAnimations,
  };
}
