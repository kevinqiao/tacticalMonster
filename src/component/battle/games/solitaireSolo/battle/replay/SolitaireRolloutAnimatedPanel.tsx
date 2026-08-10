import React, { useMemo } from "react";
import type { RolloutSummary } from "@/convex/solitaireArena/convex/service/seedPool/solitaireRecordedOpTypes";
import { HUMAN_STOCHASTIC_POLICY_VERSION } from "@/convex/solitaireArena/convex/service/seedPool/solitaireRecordedOpTypes";
import { simulateRollout } from "@/convex/solitaireArena/convex/service/seedPool/solitaireSeedSimulator";
import { verifyRollout } from "@/convex/solitaireArena/convex/service/seedPool/solitaireSeedPoolReplayVerify";
import GamePlayer from "../GamePlayer";
import SoloGameProvider, { useSoloGameManager } from "../service/GameManager";
import SoloDnDProvider from "../service/SoloDnDProvider";
import SoloActHandlerProvider from "../service/handler/SoloActHandlerProvider";
import "../style.css";
import SolitaireRolloutDevViewer from "./SolitaireRolloutDevViewer";

type Props = {
  seedId: string;
  rolloutIndex: number;
  summary: RolloutSummary | null;
  /** policyVersion from imported pool entry metrics (may lag behind code). */
  poolPolicyVersion?: string | null;
};

function ReplayVerifyBadge({
  seedId,
  rolloutIndex,
  summary,
  poolPolicyVersion,
}: {
  seedId: string;
  rolloutIndex: number;
  summary: RolloutSummary | null;
  poolPolicyVersion?: string | null;
}) {
  const check = useMemo(() => {
    const rollout = simulateRollout(seedId, rolloutIndex);
    const result = verifyRollout(seedId, rollout);
    return { rollout, result };
  }, [seedId, rolloutIndex]);

  const internalOk = check.result.ok;
  const summaryMatch = summary != null && check.rollout.finalScore === summary.finalScore;
  const poolStale =
    poolPolicyVersion != null && poolPolicyVersion !== HUMAN_STOCHASTIC_POLICY_VERSION;
  const summaryStale = summary != null && (!summaryMatch || poolStale);

  const failReason = !internalOk && !check.result.ok ? check.result.reason : null;

  let tone: "ok" | "warn" | "fail" = "fail";
  if (internalOk && summaryMatch && !poolStale) tone = "ok";
  else if (internalOk) tone = "warn";

  const palette =
    tone === "ok"
      ? {
          bg: "rgba(40,120,60,0.35)",
          border: "rgba(80,200,100,0.5)",
        }
      : tone === "warn"
        ? {
            bg: "rgba(140,110,30,0.35)",
            border: "rgba(220,180,60,0.5)",
          }
        : {
            bg: "rgba(160,40,40,0.35)",
            border: "rgba(220,80,80,0.5)",
          };

  return (
    <div
      style={{
        marginBottom: 8,
        padding: "6px 8px",
        borderRadius: 6,
        fontSize: 11,
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        lineHeight: 1.4,
      }}
    >
      {tone === "ok" ? (
        <span>
          Verify OK — sim {check.rollout.finalScore} = summary {summary?.finalScore} ·{" "}
          {check.rollout.ops.length} ops · {HUMAN_STOCHASTIC_POLICY_VERSION}
        </span>
      ) : tone === "warn" ? (
        <span>
          Replay OK — live sim {check.rollout.finalScore}
          {summary != null ? ` · pool summary ${summary.finalScore}` : ""} ·{" "}
          {check.rollout.ops.length} ops
          {poolStale ? (
            <>
              {" "}
              · pool policy {poolPolicyVersion} ≠ code {HUMAN_STOCHASTIC_POLICY_VERSION}
            </>
          ) : summary != null && !summaryMatch ? (
            <> · summary score outdated</>
          ) : null}
          {poolStale || summaryStale ? (
            <span style={{ display: "block", opacity: 0.85, marginTop: 2 }}>
              Regenerate seed pool to refresh summaries.
            </span>
          ) : null}
        </span>
      ) : (
        <span>
          Replay FAIL — {failReason ?? "unknown"}
        </span>
      )}
    </div>
  );
}

const SolitaireRolloutAnimatedInner: React.FC<Props> = ({
  seedId,
  rolloutIndex,
  summary,
  poolPolicyVersion,
}) => {
  const {
    gameState,
    boardDimension,
    boardDimensionRef,
    saveUpdate,
    syncReplayState,
    syncReplayScore,
    setInteractionPhase,
  } = useSoloGameManager();

  return (
    <div
      style={{
        position: "relative",
        flex: 1,
        minHeight: 0,
        width: "100%",
        overflow: "hidden",
      }}
    >
      <GamePlayer />
      <div
        style={{
          position: "absolute",
          top: 40,
          left: 8,
          right: 8,
          zIndex: 60,
          pointerEvents: "auto",
          maxWidth: 420,
        }}
      >
        <ReplayVerifyBadge
          seedId={seedId}
          rolloutIndex={rolloutIndex}
          summary={summary}
          poolPolicyVersion={poolPolicyVersion}
        />
      </div>
      <SolitaireRolloutDevViewer
        seedId={seedId}
        rolloutIndex={rolloutIndex}
        gameState={gameState}
        boardDimensionRef={boardDimensionRef}
        boardDimension={boardDimension}
        saveUpdate={saveUpdate}
        syncReplayState={syncReplayState}
        syncReplayScore={syncReplayScore}
        setInteractionPhase={setInteractionPhase}
        className="rollout-replay-dev-viewer"
      />
    </div>
  );
};

const SolitaireRolloutAnimatedPanel: React.FC<Props> = (props) => {
  const { seedId, rolloutIndex } = props;

  return (
    <SoloGameProvider
      key={`${seedId}-${rolloutIndex}`}
      replaySeedId={seedId}
    >
      <SoloActHandlerProvider>
        <SoloDnDProvider>
          <SolitaireRolloutAnimatedInner {...props} />
        </SoloDnDProvider>
      </SoloActHandlerProvider>
    </SoloGameProvider>
  );
};

export default SolitaireRolloutAnimatedPanel;
