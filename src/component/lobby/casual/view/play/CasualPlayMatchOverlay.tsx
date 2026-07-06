import React from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import "./casualPlayTab.css";

export type CasualPlayMatchOverlayPhase = "waiting" | "claiming";

export interface CasualPlayMatchOverlayProps {
  /** 是否展示全屏遮罩 */
  open: boolean;
  phase: CasualPlayMatchOverlayPhase;
  /** true = 等待其他玩家；false = 正在创建对局（不区分是否含 bot） */
  waitingForPeer?: boolean;
  tournamentTitle?: string;
  leaving?: boolean;
  onLeave?: () => void;
  className?: string;
}

/**
 * Play 页匹配中 / 创建对局全屏遮罩（经 createPortal 挂到 document.body）。
 */
const CasualPlayMatchOverlay: React.FC<CasualPlayMatchOverlayProps> = ({
  open,
  phase,
  waitingForPeer = true,
  tournamentTitle,
  leaving = false,
  onLeave,
  className,
}) => {
  const { t } = useTranslation("shared.casual");

  if (!open || typeof document === "undefined") {
    return null;
  }

  const isClaiming = phase === "claiming";
  const showWaitingForPeer = waitingForPeer && phase === "waiting";

  const title =
    isClaiming || !waitingForPeer
      ? t("matchOverlay.creatingTitle")
      : t("matchOverlay.matchingTitle");
  const subtitle =
    isClaiming || !waitingForPeer
      ? t("matchOverlay.creatingSubtitle")
      : tournamentTitle
        ? t("matchOverlay.waitingWithTitle", { title: tournamentTitle })
        : t("matchOverlay.waitingSubtitle");

  return createPortal(
    <div
      className={`casual-play-match-overlay ${className ?? ""}`}
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
        {showWaitingForPeer && onLeave ? (
          <button
            type="button"
            className="casual-play-match-overlay__leave"
            disabled={leaving}
            onClick={onLeave}
          >
            {leaving ? t("matchOverlay.leaving") : t("matchOverlay.leave")}
          </button>
        ) : null}
      </div>
    </div>,
    document.body
  );
};

export default CasualPlayMatchOverlay;
