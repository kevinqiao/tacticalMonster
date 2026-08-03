import React, { useEffect, useMemo, useState, type RefObject } from "react";
import { simulateRollout } from "@/convex/solitaireArena/convex/service/seedPool/solitaireSeedSimulator";
import { useSolitaireRolloutReplayer } from "./useSolitaireRolloutReplayer";
import type { GameInteractionPhase, SoloBoardDimension, SoloCard, SoloGameState } from "../types/SoloTypes";
import { createRolloutReplayState } from "./solitaireRolloutReplay";
import { describeRolloutOps, formatRolloutOp } from "./formatRolloutOp";
import SolitaireRolloutEndOverlay from "./SolitaireRolloutEndOverlay";

type Props = {
  seedId: string;
  rolloutIndex?: number;
  /** Optional live state to merge replay into (e.g. from SoloGameProvider). */
  gameState?: SoloGameState | null;
  boardDimensionRef?: RefObject<SoloBoardDimension | null>;
  boardDimension?: SoloBoardDimension | null;
  saveUpdate?: (cards: SoloCard[]) => void;
  syncReplayState?: (source: SoloGameState) => void;
  syncReplayScore?: (source: SoloGameState) => void;
  setInteractionPhase?: (phase: GameInteractionPhase) => void;
  className?: string;
};

/**
 * Dev-only rollout replay controls. Mount beside GamePlayer to step through
 * `simulateRollout` ops with persona pacing.
 */
export const SolitaireRolloutDevViewer: React.FC<Props> = ({
  seedId,
  rolloutIndex = 0,
  gameState: externalState,
  boardDimensionRef,
  boardDimension,
  saveUpdate,
  syncReplayState,
  syncReplayScore,
  setInteractionPhase,
  className,
}) => {
  const [speed, setSpeed] = useState(1);
  const [endOverlayOpen, setEndOverlayOpen] = useState(false);
  const rollout = useMemo(
    () => simulateRollout(seedId, rolloutIndex),
    [seedId, rolloutIndex]
  );

  const [localState] = useState(() => createRolloutReplayState(seedId));
  const gameState = externalState ?? localState;

  const replayer = useSolitaireRolloutReplayer({
    rollout,
    seedId,
    gameState,
    boardDimensionRef,
    boardDimension,
    saveUpdate,
    syncReplayState,
    syncReplayScore,
    setInteractionPhase,
    playbackSpeed: speed,
  });

  const currentOp = rollout.ops[replayer.stepIndex];
  const prevOp = replayer.stepIndex > 0 ? rollout.ops[replayer.stepIndex - 1] : undefined;

  useEffect(() => {
    setEndOverlayOpen(false);
  }, [seedId, rolloutIndex]);

  useEffect(() => {
    if (
      replayer.done &&
      replayer.totalSteps > 0 &&
      replayer.stepIndex >= replayer.totalSteps
    ) {
      setEndOverlayOpen(true);
    }
  }, [replayer.done, replayer.stepIndex, replayer.totalSteps]);

  const handleReset = () => {
    replayer.reset();
    setEndOverlayOpen(false);
  };

  return (
    <>
      <SolitaireRolloutEndOverlay
        open={endOverlayOpen}
        terminalReason={rollout.terminalReason}
        finalScore={rollout.finalScore}
        moves={rollout.moves}
        elapsedSimSeconds={rollout.elapsedSimSeconds}
        totalSteps={replayer.totalSteps}
        onClose={() => setEndOverlayOpen(false)}
        onReplayAgain={handleReset}
      />
    <div
      className={className}
      style={{
        position: "absolute",
        bottom: 8,
        left: 8,
        right: 8,
        zIndex: 50,
        background: "rgba(0,0,0,0.75)",
        color: "#fff",
        padding: "8px 10px",
        borderRadius: 8,
        fontSize: 12,
        pointerEvents: "auto",
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Rollout replay (dev)</div>
      <div style={{ opacity: 0.85, marginBottom: 6 }}>
        {seedId} · #{rolloutIndex} · {replayer.stepIndex}/{replayer.totalSteps} ·{" "}
        {rollout.terminalReason} · score {rollout.finalScore}
        {replayer.usesAnimations ? " · animated" : " · silent"}
      </div>
      <div style={{ opacity: 0.9, marginBottom: 4, fontFamily: "monospace", fontSize: 11 }}>
        prev: {formatRolloutOp(prevOp)} · next: {formatRolloutOp(currentOp)}
      </div>
      <div style={{ opacity: 0.75, marginBottom: 8, fontSize: 10, lineHeight: 1.35 }}>
        {describeRolloutOps(rollout)}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        <button type="button" onClick={() => replayer.play()}>
          Play
        </button>
        <button type="button" onClick={() => replayer.pause()}>
          Pause
        </button>
        <button type="button" onClick={() => void replayer.stepForward()}>
          Step
        </button>
        <button type="button" onClick={handleReset}>
          Reset
        </button>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
        Speed
        <input
          type="range"
          min={0.25}
          max={4}
          step={0.25}
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
        />
        <span>{speed}x</span>
      </label>
    </div>
    </>
  );
};

export default SolitaireRolloutDevViewer;
