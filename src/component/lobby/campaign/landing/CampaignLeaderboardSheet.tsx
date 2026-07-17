import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";

import {
  CampaignLeaderboardPanel,
  type CampaignLeaderboardViewerReward,
} from "../shared/CampaignLeaderboardPanel";

type LeaderboardRow = {
  rank?: number;
  uid: string;
  displayName?: string;
  isBot?: boolean;
  bestScore?: number;
  rankPoints?: number;
  plays?: number;
};

type SettlementStatus = "pending" | "done" | "failed" | string;

type Props = {
  open: boolean;
  title: string;
  mode: "solo" | "multi";
  rows: LeaderboardRow[];
  viewerUid?: string;
  /** 榜头结算态；未结束可传 null 用默认 hint */
  settlementStatus?: SettlementStatus | null;
  /** 仅当前用户行；他人/Bot 不标 */
  viewerReward?: CampaignLeaderboardViewerReward | null;
  /** 上层弹窗打开时禁用 Esc，避免连关排行榜 */
  escapeDisabled?: boolean;
  onOpenChallengeHistory?: () => void;
  onClose: () => void;
};

function leaderboardHintKey(
  settlementStatus: SettlementStatus | null | undefined
): string {
  if (settlementStatus === "done") return "leaderboard.hintSettled";
  if (settlementStatus === "failed") return "leaderboard.hintSettleFailed";
  if (settlementStatus === "pending") return "leaderboard.hintSettlePending";
  return "leaderboard.hint";
}

export const CampaignLeaderboardSheet: React.FC<Props> = ({
  open,
  title,
  mode,
  rows,
  viewerUid,
  settlementStatus = null,
  viewerReward = null,
  escapeDisabled = false,
  onOpenChallengeHistory,
  onClose,
}) => {
  const { t } = useTranslation("campaign.player");

  useEffect(() => {
    if (!open || escapeDisabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, escapeDisabled, onClose]);

  if (!open) return null;

  const hintClass =
    settlementStatus === "done"
      ? "campaign-leaderboard__hint campaign-leaderboard__hint--settled"
      : settlementStatus === "failed"
        ? "campaign-leaderboard__hint campaign-leaderboard__hint--failed"
        : "campaign-leaderboard__hint";

  return (
    <div className="campaign-lb-sheet" role="presentation">
      <button
        type="button"
        className="campaign-lb-sheet__backdrop"
        aria-label={t("leaderboard.closeSheet")}
        onClick={onClose}
      />
      <section
        className="campaign-lb-sheet__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="campaign-lb-sheet-title"
      >
        <header className="campaign-lb-sheet__head">
          {onOpenChallengeHistory ? (
            <button
              type="button"
              className="campaign-lb-sheet__history-btn"
              onClick={onOpenChallengeHistory}
            >
              {t("leaderboard.challengeHistoryBtn")}
            </button>
          ) : null}
          <h2 id="campaign-lb-sheet-title" className="campaign-lb-sheet__title">
            {title}
          </h2>
          <button
            type="button"
            className="campaign-lb-sheet__close"
            aria-label={t("leaderboard.close")}
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <div className="campaign-lb-sheet__body">
          <p className={hintClass}>{t(leaderboardHintKey(settlementStatus))}</p>
          <CampaignLeaderboardPanel
            mode={mode}
            rows={rows}
            viewerUid={viewerUid}
            viewerReward={viewerReward}
          />
        </div>
      </section>
    </div>
  );
};
