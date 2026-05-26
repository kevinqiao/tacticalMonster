import React, { useMemo, useState, type RefObject } from "react";
import { simulateRollout } from "@/convex/solitaireArena/convex/service/seedPool/solitaireSeedSimulator";
import { useSolitaireRolloutReplayer } from "./useSolitaireRolloutReplayer";
import type { SoloBoardDimension, SoloCard, SoloGameState } from "../types/SoloTypes";
import { createRolloutReplayState } from "./solitaireRolloutReplay";

type Props = {
  seedId: string;
  rolloutIndex?: number;
  /** Optional live state to merge replay into (e.g. from SoloGameProvider). */
  gameState?: SoloGameState | null;
  boardDimensionRef?: RefObject<SoloBoardDimension | null>;
  saveUpdate?: (cards: SoloCard[]) => void;
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
  saveUpdate,
  className,
}) => {
  const [speed, setSpeed] = useState(1);
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
    playbackSpeed: speed,
  });

  return (
    <div
      className={className}
      style={{
        position: "absolute",
        top: 8,
        right: 8,
        zIndex: 50,
        background: "rgba(0,0,0,0.75)",
        color: "#fff",
        padding: "8px 10px",
        borderRadius: 8,
        fontSize: 12,
        maxWidth: 280,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Rollout replay (dev)</div>
      <div style={{ opacity: 0.85, marginBottom: 8 }}>
        {seedId} · #{rolloutIndex} · {replayer.stepIndex}/{replayer.totalSteps} ·{" "}
        {rollout.terminalReason} · score {rollout.finalScore}
        {replayer.usesAnimations ? " · animated" : " · silent"}
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
        <button type="button" onClick={() => replayer.reset()}>
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
  );
};

export default SolitaireRolloutDevViewer;
