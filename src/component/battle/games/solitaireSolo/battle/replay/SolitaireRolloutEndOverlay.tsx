import React, { useId } from "react";
import type { RolloutTerminalReason } from "@/convex/solitaireArena/convex/service/seedPool/solitaireRecordedOpTypes";
import "../../../shared/manualSettleConfirmOverlay.css";
import { rolloutEndCopy } from "./rolloutTerminalLabels";

type Props = {
  open: boolean;
  terminalReason: RolloutTerminalReason;
  finalScore: number;
  moves: number;
  elapsedSimSeconds: number;
  totalSteps: number;
  onClose: () => void;
  onReplayAgain?: () => void;
};

const SolitaireRolloutEndOverlay: React.FC<Props> = ({
  open,
  terminalReason,
  finalScore,
  moves,
  elapsedSimSeconds,
  totalSteps,
  onClose,
  onReplayAgain,
}) => {
  const titleId = useId();
  if (!open) return null;

  const copy = rolloutEndCopy(terminalReason);
  const elapsedLabel = `${Math.floor(elapsedSimSeconds / 60)}:${String(
    Math.floor(elapsedSimSeconds % 60)
  ).padStart(2, "0")}`;

  return (
    <div className="msc-overlay" role="presentation">
      <button
        type="button"
        className="msc-backdrop"
        aria-label="关闭"
        onClick={onClose}
      />
      <div className="msc-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="ssc">
          <h2 id={titleId} className="ssc__title">
            {copy.title}
          </h2>
          <p className="ssc__body">{copy.body}</p>
          <dl
            style={{
              margin: "0 0 18px",
              fontSize: 13,
              lineHeight: 1.5,
              color: "#334155",
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: "4px 12px",
            }}
          >
            <dt style={{ opacity: 0.75 }}>终局分</dt>
            <dd style={{ margin: 0, fontWeight: 700 }}>{finalScore}</dd>
            <dt style={{ opacity: 0.75 }}>步数</dt>
            <dd style={{ margin: 0 }}>{moves}</dd>
            <dt style={{ opacity: 0.75 }}>模拟用时</dt>
            <dd style={{ margin: 0 }}>{elapsedLabel}</dd>
            <dt style={{ opacity: 0.75 }}>操作数</dt>
            <dd style={{ margin: 0 }}>{totalSteps}</dd>
            <dt style={{ opacity: 0.75 }}>结束原因</dt>
            <dd style={{ margin: 0, fontFamily: "monospace" }}>{terminalReason}</dd>
          </dl>
          <div className="ssc__actions">
            {onReplayAgain ? (
              <button type="button" className="ssc__btn ssc__btn--ghost" onClick={onReplayAgain}>
                重新播放
              </button>
            ) : null}
            <button type="button" className="ssc__btn ssc__btn--primary" onClick={onClose}>
              知道了
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SolitaireRolloutEndOverlay;
