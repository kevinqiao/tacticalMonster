import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { SolitaireRecordedOp } from "@/convex/solitaireArena/convex/service/seedPool/solitaireRecordedOpTypes";
import type { SolitaireRolloutScript } from "@/convex/solitaireArena/convex/service/seedPool/solitaireRecordedOpTypes";
import type { SoloBoardDimension, SoloCard, SoloGameState } from "../types/SoloTypes";
import { playRolloutOpAnimation } from "./playRolloutOpAnimation";
import { cloneSimState } from "@/convex/solitaireArena/convex/service/seedPool/solitaireOpCodec";
import {
  applyRecordedOp,
  createRolloutReplayState,
  mergeReplayStateInto,
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
  /** When set, steps use PlayEffects (same as live play). Otherwise silent applyOp merge. */
  saveUpdate?: (cards: SoloCard[]) => void;
  onStep?: (payload: RolloutReplayStepPayload) => void | Promise<void>;
  playbackSpeed?: number;
};

export function useSolitaireRolloutReplayer({
  rollout,
  seedId,
  gameState,
  boardDimensionRef,
  saveUpdate,
  onStep,
  playbackSpeed = 1,
}: UseSolitaireRolloutReplayerOptions) {
  const [playing, setPlaying] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const simStateRef = useRef<SoloGameState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const useAnimations = Boolean(boardDimensionRef && saveUpdate && gameState);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setPlaying(false);
    setStepIndex(0);
    simStateRef.current = createRolloutReplayState(seedId);
    if (gameState && simStateRef.current) {
      mergeReplayStateInto(gameState, simStateRef.current);
      saveUpdate?.(gameState.cards);
    }
  }, [gameState, saveUpdate, seedId]);

  useEffect(() => {
    reset();
  }, [rollout?.rolloutIndex, seedId, reset]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const playOneStep = useCallback(async () => {
    if (!rollout || !gameState) return false;
    if (!simStateRef.current) {
      simStateRef.current = createRolloutReplayState(seedId);
      mergeReplayStateInto(gameState, simStateRef.current);
    }
    const op = rollout.ops[stepIndex];
    if (!op) return false;

    let ok = false;
    if (useAnimations && boardDimensionRef && saveUpdate) {
      ok = await playRolloutOpAnimation({
        gameState,
        boardDimensionRef,
        op,
        saveUpdate,
        autoFoundationMove: op.op === "move" && op.to.startsWith("foundation-"),
      });
      if (ok) {
        simStateRef.current = cloneSimState(gameState);
      }
    } else {
      const applied = applyRecordedOp(simStateRef.current, op);
      if (!applied.ok) {
        console.warn("[rollout replay] step failed", applied.reason, op);
        setPlaying(false);
        return false;
      }
      simStateRef.current = applied.state;
      mergeReplayStateInto(gameState, applied.state);
      ok = true;
    }

    if (!ok) {
      setPlaying(false);
      return false;
    }

    await onStep?.({ op, stepIndex, stateAfter: gameState });
    setStepIndex((i) => i + 1);
    return true;
  }, [
    boardDimensionRef,
    gameState,
    onStep,
    rollout,
    saveUpdate,
    seedId,
    stepIndex,
    useAnimations,
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
