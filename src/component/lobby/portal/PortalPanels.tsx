import React from "react";
import { useTranslation } from "react-i18next";

import {
  inferCasualGameKindFromAssignment,
  type OpenCasualRunAssignment,
} from "../casual/service/casualOpenRunAssignment";
import { canOpenPortalHistoryReport } from "./service/portalHistoryReport";
import {
  isValidPortalGameType,
  portalGameDisplayName,
  type PortalGameHistoryRow,
} from "./service/usePortalManager";
import { portalMatchTypeLabel } from "./service/portalOpenRunHelpers";
import { resolvePlayerDisplayName } from "@/convex/shared/displayName";

function historyGameTypeLabel(gameType: string | undefined): string | null {
  if (!gameType) return null;
  if (isValidPortalGameType(gameType)) return portalGameDisplayName(gameType);
  return gameType;
}

export const PortalHistoryList: React.FC<{
  openAssignments: OpenCasualRunAssignment[];
  gameHistory: PortalGameHistoryRow[];
  onOpenAssignment: (hit: OpenCasualRunAssignment) => void;
  onOpenReport: (row: PortalGameHistoryRow) => void;
}> = ({ openAssignments, gameHistory, onOpenAssignment, onOpenReport }) => {
  const { t } = useTranslation("portal.player");

  if (openAssignments.length === 0 && gameHistory.length === 0) {
    return <p className="portal-muted portal-history-empty">{t("history.empty")}</p>;
  }

  return (
    <ul className="portal-history">
      {openAssignments.map((a) => {
        const gameLabel = historyGameTypeLabel(inferCasualGameKindFromAssignment(a));
        return (
        <li key={a.gameId}>
          <button
            type="button"
            className="portal-history-row portal-history-row--ongoing"
            onClick={() => onOpenAssignment(a)}
          >
            <div className="portal-history-main">
              <strong>{portalMatchTypeLabel(a.templateId)}</strong>
              {gameLabel ? (
                <span className="portal-history-game">{t("history.gameType", { name: gameLabel })}</span>
              ) : null}
              <span className="portal-history-badge">{t("history.ongoing")}</span>
            </div>
            <div className="portal-history-meta">
              <span className="portal-history-enter">{t("history.enter")}</span>
              <span className="portal-muted">{new Date(a.createdAt).toLocaleString()}</span>
            </div>
          </button>
        </li>
        );
      })}
      {gameHistory.map((row) => {
        const showReport = canOpenPortalHistoryReport(row);
        const pendingSettlement = row.settlementPending === true;
        const isSoloChallenge = row.matchType === "solo_p75";
        const gameLabel = historyGameTypeLabel(row.gameType);
        const detail = isSoloChallenge ? (
          <>
            {t("history.soloScore", { score: row.score ?? t("common.dash") })}
            {row.seedScoreThreshold != null
              ? ` · ${t("history.soloTarget", { target: row.seedScoreThreshold })}`
              : ""}
            {row.challengeSuccess === true
              ? ` · ${t("history.challengeSuccess")}`
              : row.challengeSuccess === false
                ? ` · ${t("history.challengeFail")}`
                : ""}
          </>
        ) : (
          <>
            {t("history.score", { score: row.score ?? t("common.dash") })}
            {row.rank != null ? ` · ${t("history.rank", { rank: row.rank })}` : ""}
          </>
        );
        return (
          <li key={row.entryId} className="portal-history-row portal-history-row--done">
            <div className="portal-history-main">
              <strong>{portalMatchTypeLabel(row.tournamentId || row.matchType)}</strong>
              {gameLabel ? (
                <span className="portal-history-game">{t("history.gameType", { name: gameLabel })}</span>
              ) : null}
              <span>{detail}</span>
            </div>
            <div className="portal-history-meta">
              {row.pointDelta != null && (
                <span className={row.pointDelta >= 0 ? "portal-pts-pos" : "portal-pts-neg"}>
                  {t("history.points", {
                    delta: `${row.pointDelta >= 0 ? "+" : ""}${row.pointDelta}`,
                  })}
                </span>
              )}
              {row.coinsGranted != null && row.coinsGranted > 0 ? (
                <span className="portal-pts-pos">
                  {t("history.coins", { coins: `+${row.coinsGranted}` })}
                </span>
              ) : null}
              <span className="portal-muted">
                {pendingSettlement
                  ? t("history.pendingSettlement")
                  : row.submittedAt
                    ? new Date(row.submittedAt).toLocaleString()
                    : t("common.dash")}
              </span>
            </div>
            {showReport && (
              <div className="portal-history-actions">
                <button
                  type="button"
                  className="portal-history-report-btn"
                  onClick={() => onOpenReport(row)}
                >
                  {t("history.report")}
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
};

export const PortalWeeklyLeaderboardPanel: React.FC<{
  rows: {
    rank: number;
    uid: string;
    points: number;
    matchCount: number;
    displayName?: string;
    isBot?: boolean;
  }[];
  myPoints?: number;
  myRank?: number | null;
  /** Logged-in viewer — their row shows localized "You" instead of real name. */
  viewerUid?: string | null;
}> = ({ rows, myPoints, myRank, viewerUid }) => {
  const { t } = useTranslation("portal.player");

  return (
    <div className="portal-lb">
      {typeof myPoints === "number" && (
        <p className="portal-lb-me portal-lb-me--block">
          {myRank
            ? t("leaderboard.myWeekWithRank", { points: myPoints, rank: myRank })
            : t("leaderboard.myWeek", { points: myPoints })}
        </p>
      )}
      <table className="portal-lb-table">
        <thead>
          <tr>
            <th>{t("leaderboard.columns.rank")}</th>
            <th>{t("leaderboard.columns.player")}</th>
            <th>{t("leaderboard.columns.points")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={3} className="portal-muted">
                {t("leaderboard.empty")}
              </td>
            </tr>
          ) : (
            rows.map((r) => {
              const isYou =
                Boolean(viewerUid) && !r.isBot && r.uid === viewerUid;
              return (
                <tr
                  key={`${r.rank}-${r.uid}`}
                  className={isYou ? "portal-lb-row--you" : undefined}
                >
                  <td>{r.rank}</td>
                  <td>
                    {isYou
                      ? t("leaderboard.you")
                      : (r.displayName ?? resolvePlayerDisplayName({ uid: r.uid }))}
                  </td>
                  <td>{r.points}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};
