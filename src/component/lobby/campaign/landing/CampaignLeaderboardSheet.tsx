import React, { useEffect } from "react";

import { useTranslation } from "react-i18next";



import { CampaignLeaderboardPanel } from "../shared/CampaignLeaderboardPanel";



type LeaderboardRow = {

  rank?: number;

  uid: string;

  displayName?: string;

  isBot?: boolean;

  bestScore?: number;

  rankPoints?: number;

  plays?: number;

};



type Props = {

  open: boolean;

  title: string;

  mode: "solo" | "multi";

  rows: LeaderboardRow[];

  viewerUid?: string;

  onClose: () => void;

};



export const CampaignLeaderboardSheet: React.FC<Props> = ({

  open,

  title,

  mode,

  rows,

  viewerUid,

  onClose,

}) => {

  const { t } = useTranslation("campaign.player");



  useEffect(() => {

    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {

      if (event.key === "Escape") onClose();

    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);

  }, [open, onClose]);



  if (!open) return null;



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

          <p className="campaign-leaderboard__hint">{t("leaderboard.hint")}</p>

          <CampaignLeaderboardPanel mode={mode} rows={rows} viewerUid={viewerUid} />

        </div>

      </section>

    </div>

  );

};


