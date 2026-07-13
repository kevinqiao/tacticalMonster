import React from "react";

import { useTranslation } from "react-i18next";

import { resolvePlayerDisplayName } from "@/convex/shared/displayName";



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

};



export const CampaignLeaderboardPanel: React.FC<Props> = ({ mode, rows, viewerUid }) => {

  const { t } = useTranslation("campaign.player");



  if (rows.length === 0) {

    return <p className="campaign-leaderboard__empty">{t("leaderboard.empty")}</p>;

  }



  const valueHeader = mode === "solo" ? t("leaderboard.bestScore") : t("leaderboard.rankPoints");



  return (

    <ol className="campaign-leaderboard">

      {rows.map((row, index) => {

        const scoreLabel =

          mode === "solo"

            ? row.bestScore != null

              ? String(row.bestScore)

              : "—"

            : row.rankPoints != null

              ? String(row.rankPoints)

              : "—";

        const isViewer = !row.isBot && viewerUid != null && row.uid === viewerUid;

        const label =
          row.displayName ??
          (isViewer
            ? t("leaderboard.you")
            : row.isBot
              ? t("leaderboard.competitor")
              : resolvePlayerDisplayName({ uid: row.uid }));

        const rank = row.rank ?? index + 1;

        return (

          <li

            key={`${row.uid}-${index}`}

            className={`campaign-leaderboard__row${isViewer ? " campaign-leaderboard__row--me" : ""}${row.isBot ? " campaign-leaderboard__row--bot" : ""}`}

          >

            <span className="campaign-leaderboard__rank">{rank}</span>

            <span className="campaign-leaderboard__uid">{isViewer ? t("leaderboard.you") : label}</span>

            <span className="campaign-leaderboard__score" title={valueHeader}>

              {scoreLabel}

            </span>

          </li>

        );

      })}

    </ol>

  );

};


