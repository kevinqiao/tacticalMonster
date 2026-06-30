import React from "react";
import { useTranslation } from "react-i18next";

import { campaignGameTypeLabel } from "../shared/campaignDetailsDisplay";
import type { CampaignPlayHistoryEntry } from "../shared/campaignTypes";
import { CampaignCenterModal } from "./CampaignCenterModal";

type Props = {
  open: boolean;
  onClose: () => void;
  authed: boolean;
  entries: CampaignPlayHistoryEntry[];
  locale: string;
};

function isInProgressStatus(status: CampaignPlayHistoryEntry["status"]): boolean {
  return status === "open" || status === "replaying";
}

export const CampaignHistorySheet: React.FC<Props> = ({
  open,
  onClose,
  authed,
  entries,
  locale,
}) => {
  const { t } = useTranslation("campaign.player");

  const fmt = (ms: number) =>
    new Date(ms).toLocaleString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <CampaignCenterModal
      open={open}
      title={t("history.title")}
      titleId="campaign-history-title"
      onClose={onClose}
    >
      <div className="campaign-history">
        {!authed ? (
          <p className="campaign-history__empty">{t("history.signInHint")}</p>
        ) : entries.length === 0 ? (
          <p className="campaign-history__empty">{t("history.empty")}</p>
        ) : (
          <ul className="campaign-history__list">
            {entries.map((entry) => {
              const inProgress = isInProgressStatus(entry.status);
              const statusLabel = inProgress
                ? t("history.status.inProgress")
                : t(`history.status.${entry.status}`, { defaultValue: entry.status });

              return (
                <li key={entry.matchId} className="campaign-history__item">
                  <div className="campaign-history__row">
                    <strong className="campaign-history__game">
                      {campaignGameTypeLabel(entry.gameType)}
                    </strong>
                    <span
                      className={`campaign-history__status${
                        inProgress ? " campaign-history__status--active" : ""
                      }`}
                    >
                      {statusLabel}
                    </span>
                  </div>
                  <div className="campaign-history__stats">
                    {entry.score != null ? (
                      <span className="campaign-history__score">
                        {t("history.score", { score: entry.score })}
                      </span>
                    ) : (
                      <span className="campaign-history__score campaign-history__score--muted">
                        {t("history.noScore")}
                      </span>
                    )}
                    {entry.rank != null ? (
                      <span className="campaign-history__rank">
                        {t("history.rank", { rank: entry.rank })}
                      </span>
                    ) : null}
                  </div>
                  <p className="campaign-history__meta">
                    {t("history.playedAt", { at: fmt(entry.playedAt) })}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </CampaignCenterModal>
  );
};
