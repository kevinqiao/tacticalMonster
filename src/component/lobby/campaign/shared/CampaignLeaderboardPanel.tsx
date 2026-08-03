import React from "react";
import { useTranslation } from "react-i18next";

import { resolvePlayerDisplayName } from "@/convex/shared/displayName";

export type CampaignLeaderboardViewerReward = "won" | "not_won";

type Row = {
  rank?: number;
  uid: string;
  displayName?: string;
  isBot?: boolean;
  bestScore?: number;
  rankPoints?: number;
  plays?: number;
};

type Props = {
  mode: "solo" | "multi";
  rows: Row[];
  viewerUid?: string;
  /** 仅当前用户行展示；他人/Bot 永不展示，避免暴露 Bot */
  viewerReward?: CampaignLeaderboardViewerReward | null;
};

export const CampaignLeaderboardPanel: React.FC<Props> = ({
  mode,
  rows,
  viewerUid,
  viewerReward = null,
}) => {
  const { t } = useTranslation("campaign.player");

  if (rows.length === 0) {
    return <p className="campaign-leaderboard__empty">{t("leaderboard.empty")}</p>;
  }

  void mode;
  const valueHeader = t("leaderboard.rankPoints");

  return (
    <ol className="campaign-leaderboard">
      {rows.map((row, index) => {
        const scoreLabel = row.rankPoints != null ? String(row.rankPoints) : "—";
        const isViewer = !row.isBot && viewerUid != null && row.uid === viewerUid;
        const label =
          row.displayName ??
          (isViewer
            ? t("leaderboard.you")
            : row.isBot
              ? t("leaderboard.competitor")
              : resolvePlayerDisplayName({ uid: row.uid }));
        const rank = row.rank ?? index + 1;
        const rewardBadge =
          isViewer && viewerReward === "won"
            ? t("leaderboard.viewerRewarded")
            : isViewer && viewerReward === "not_won"
              ? t("leaderboard.viewerNotRewarded")
              : null;

        return (
          <li
            key={`${row.uid}-${index}`}
            className={`campaign-leaderboard__row${isViewer ? " campaign-leaderboard__row--me" : ""}${row.isBot ? " campaign-leaderboard__row--bot" : ""}`}
          >
            <span className="campaign-leaderboard__rank">{rank}</span>
            <span className="campaign-leaderboard__uid">
              <span className="campaign-leaderboard__name">
                {isViewer ? t("leaderboard.you") : label}
              </span>
              {rewardBadge ? (
                <span
                  className={`campaign-leaderboard__reward-badge campaign-leaderboard__reward-badge--${viewerReward}`}
                >
                  {rewardBadge}
                </span>
              ) : null}
            </span>
            <span className="campaign-leaderboard__score" title={valueHeader}>
              {scoreLabel}
            </span>
          </li>
        );
      })}
    </ol>
  );
};
