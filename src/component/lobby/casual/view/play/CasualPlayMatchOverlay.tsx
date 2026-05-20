import React from "react";
import { createPortal } from "react-dom";

import "./casualPlayTab.css";

export type CasualPlayMatchOverlayPhase = "waiting" | "claiming";

export interface CasualPlayMatchOverlayProps {
  /** 是否展示全屏遮罩 */
  open: boolean;
  phase: CasualPlayMatchOverlayPhase;
  tournamentTitle?: string;
  leaving?: boolean;
  onLeave?: () => void;
}

/**
 * Play 页匹配中 / 创建对局全屏遮罩（经 createPortal 挂到 document.body）。
 */
const CasualPlayMatchOverlay: React.FC<CasualPlayMatchOverlayProps> = ({
  open,
  phase,
  tournamentTitle,
  leaving = false,
  onLeave,
}) => {
  if (!open || typeof document === "undefined") {
    return null;
  }

  const isWaiting = phase === "waiting";
  const title = isWaiting ? "正在匹配中" : "正在创建对局";
  const subtitle = isWaiting
    ? tournamentTitle
      ? `等待另一位玩家加入「${tournamentTitle}」`
      : "等待另一位玩家加入，凑满人数后将自动开桌"
    : "请稍候，对局即将开始…";

  return createPortal(
    <div
      className="casual-play-match-overlay"
      role="dialog"
      aria-modal="true"
      aria-busy="true"
      aria-labelledby="casual-play-match-overlay-title"
    >
      <div className="casual-play-match-overlay__backdrop" aria-hidden />
      <div className="casual-play-match-overlay__panel">
        <div className="casual-play-match-overlay__spinner" aria-hidden />
        <h2 id="casual-play-match-overlay-title" className="casual-play-match-overlay__title">
          {title}
        </h2>
        <p className="casual-play-match-overlay__sub">{subtitle}</p>
        {isWaiting && onLeave ? (
          <button
            type="button"
            className="casual-play-match-overlay__leave"
            disabled={leaving}
            onClick={onLeave}
          >
            {leaving ? "退出中…" : "退出匹配"}
          </button>
        ) : null}
      </div>
    </div>,
    document.body
  );
};

export default CasualPlayMatchOverlay;
