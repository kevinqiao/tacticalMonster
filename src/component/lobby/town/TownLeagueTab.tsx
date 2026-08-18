import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useModalManager } from "host/service/ModalManager";

import { modalDataForOpenAssignment } from "component/lobby/casual/service/casualOpenRunAssignment";
import { PortalHistoryList } from "component/lobby/portal/PortalPanels";
import {
  PortalHistoryReportOverlays,
  usePortalHistoryReport,
} from "component/lobby/portal/PortalHistoryReportOverlays";
import { inferPortalGameKindFromAssignment } from "component/lobby/portal/service/portalOpenRunHelpers";
import {
  portalPlayModalForGameType,
  usePortal,
} from "component/lobby/portal/service/usePortalManager";

import "./townShell.css";

const TIER_LABELS: Record<string, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
  diamond: "Diamond",
};

type TownLeagueTabProps = {
  leagueScopeKey?: string | null;
};

const TownLeagueTab: React.FC<TownLeagueTabProps> = ({ leagueScopeKey = null }) => {
  const { t } = useTranslation("portal.player");
  const { openModal } = useModalManager();
  const portal = usePortal();
  const league = portal.weeklyLeagueTierView;
  const board = portal.cohortLeaderboard;
  const historyReport = usePortalHistoryReport();
  const [historyOpen, setHistoryOpen] = useState(false);

  const townAssignments = useMemo(() => {
    if (!leagueScopeKey) return [];
    return portal.openRunAssignments.filter((row) => row.leagueScopeKey === leagueScopeKey);
  }, [leagueScopeKey, portal.openRunAssignments]);

  const promoteTo = league?.promoteTo ?? 8;
  const demoteFrom = league?.demoteFrom ?? 23;
  const cohortSize = league?.cohortSize ?? 30;
  const rank = league?.cohortRank;
  const markerPct =
    rank != null && cohortSize > 0
      ? Math.min(100, Math.max(0, ((rank - 0.5) / cohortSize) * 100))
      : null;

  return (
    <div className="town-tab-panel">
      <div className="town-league-head">
        <h2>League</h2>
        <button
          type="button"
          className="town-league-matches"
          onClick={() => setHistoryOpen(true)}
          aria-label={t("lobby.historyAria")}
        >
          {t("lobby.history")}
        </button>
      </div>
      <p>Week Score comes from Showdown only. Construction never changes Pod rank.</p>
      <div className="town-tab-panel__card">
        <strong>Weekly Pod</strong>
        <div className="town-league-zones" aria-label="Promotion and relegation">
          <div className="town-league-zones__promote">
            {t("lobby.zonePromote", { from: 1, to: promoteTo })}
          </div>
          <div className="town-league-zones__keep">
            {t("lobby.zoneKeep", { from: promoteTo + 1, to: demoteFrom - 1 })}
          </div>
          <div className="town-league-zones__demote">
            {t("lobby.zoneDemote", { from: demoteFrom, to: cohortSize })}
          </div>
          {markerPct != null ? (
            <div className="town-league-zones__marker" style={{ left: `${markerPct}%` }} />
          ) : null}
        </div>
      </div>
      {league ? (
        <>
          <div className="town-tab-panel__card">
            <div className="town-tab-panel__row">
              <span>Tier</span>
              <span>{TIER_LABELS[league.tierId ?? "bronze"] ?? league.tierId}</span>
            </div>
            <div className="town-tab-panel__row">
              <span>Week Score</span>
              <span>{league.points ?? 0}</span>
            </div>
            <div className="town-tab-panel__row">
              <span>Season Lv</span>
              <span>{league.seasonLevel ?? 1}</span>
            </div>
            {league.cohortRank != null ? (
              <div className="town-tab-panel__row">
                <span>Pod rank</span>
                <span>#{league.cohortRank}</span>
              </div>
            ) : null}
          </div>
          {board.length > 0 ? (
            <div className="town-tab-panel__card">
              <strong>{t("lobby.leaderboard")}</strong>
              {board.slice(0, 10).map((row) => (
                <div key={row.uid} className="town-tab-panel__row">
                  <span>
                    #{row.rank} {row.displayName ?? row.uid.slice(0, 8)}
                  </span>
                  <span>{row.points}</span>
                </div>
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <p className="town-tab-panel__empty">Play a Showdown to join this week&apos;s Pod.</p>
      )}

      {historyOpen ? (
        <div className="town-history-sheet" role="dialog" aria-modal="true" aria-labelledby="town-history-title">
          <div className="town-history-sheet__head">
            <h3 id="town-history-title">{t("modals.historyTitle")}</h3>
            <button
              type="button"
              className="town-history-sheet__close"
              onClick={() => setHistoryOpen(false)}
              aria-label={t("common.close")}
            >
              ×
            </button>
          </div>
          <div className="town-history-sheet__body">
            <PortalHistoryList
              openAssignments={townAssignments}
              gameHistory={portal.gameHistory}
              onOpenAssignment={(hit) => {
                setHistoryOpen(false);
                openModal({
                  name: portalPlayModalForGameType(inferPortalGameKindFromAssignment(hit)),
                  data: {
                    ...modalDataForOpenAssignment(hit),
                    fromTown: true,
                  },
                });
              }}
              onOpenReport={historyReport.openReport}
            />
          </div>
        </div>
      ) : null}

      <PortalHistoryReportOverlays
        scoreReport={historyReport.scoreReport}
        scoreWatchContext={historyReport.scoreWatchContext}
        reportSummary={historyReport.reportSummary}
        reportTableMetaNote={historyReport.reportTableMetaNote}
        watchTarget={historyReport.watchTarget}
        watchLabel={historyReport.watchLabel}
        watchGameType={historyReport.watchGameType}
        onCloseReport={historyReport.closeReport}
        onCloseWatch={historyReport.closeWatch}
        onWatchFromReport={historyReport.openWatchFromReport}
        onWatchFromScoreReport={historyReport.openWatchFromScoreReport}
      />
    </div>
  );
};

export default TownLeagueTab;
