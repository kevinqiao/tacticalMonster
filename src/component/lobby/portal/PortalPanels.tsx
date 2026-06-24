import React from "react";

import type { OpenCasualRunAssignment } from "../casual/service/casualOpenRunAssignment";
import { canOpenPortalHistoryReport } from "./service/portalHistoryReport";
import type { PortalGameHistoryRow } from "./service/usePortalManager";
import { portalMatchTypeLabel } from "./service/portalOpenRunHelpers";

function formatMatchType(matchType: string): string {
  if (matchType === "solo_p75") return "单人挑战";
  if (matchType === "multi_ranked") return "多人竞技";
  return matchType;
}

export const PortalHistoryList: React.FC<{
  openAssignments: OpenCasualRunAssignment[];
  gameHistory: PortalGameHistoryRow[];
  onOpenAssignment: (hit: OpenCasualRunAssignment) => void;
  onOpenReport: (row: PortalGameHistoryRow) => void;
}> = ({ openAssignments, gameHistory, onOpenAssignment, onOpenReport }) => {
  if (openAssignments.length === 0 && gameHistory.length === 0) {
    return <p className="portal-muted portal-history-empty">暂无对局</p>;
  }

  return (
    <ul className="portal-history">
      {openAssignments.map((a) => (
        <li key={a.gameId}>
          <button
            type="button"
            className="portal-history-row portal-history-row--ongoing"
            onClick={() => onOpenAssignment(a)}
          >
            <div className="portal-history-main">
              <strong>{portalMatchTypeLabel(a.templateId)}</strong>
              <span className="portal-history-badge">进行中</span>
            </div>
            <div className="portal-history-meta">
              <span className="portal-history-enter">点击进入 ›</span>
              <span className="portal-muted">{new Date(a.createdAt).toLocaleString()}</span>
            </div>
          </button>
        </li>
      ))}
      {gameHistory.map((row) => {
        const showReport = canOpenPortalHistoryReport(row);
        const pendingSettlement = row.settlementPending === true;
        return (
          <li key={row.entryId} className="portal-history-row portal-history-row--done">
            <div className="portal-history-main">
              <strong>{formatMatchType(row.matchType)}</strong>
              <span>
                分数 {row.score ?? "—"}
                {row.rank != null ? ` · 第 ${row.rank} 名` : ""}
              </span>
            </div>
            <div className="portal-history-meta">
              {row.pointDelta != null && (
                <span className={row.pointDelta >= 0 ? "portal-pts-pos" : "portal-pts-neg"}>
                  {row.pointDelta >= 0 ? "+" : ""}
                  {row.pointDelta} 分
                </span>
              )}
              <span className="portal-muted">
                {pendingSettlement
                  ? "等待结算中"
                  : row.submittedAt
                    ? new Date(row.submittedAt).toLocaleString()
                    : "—"}
              </span>
            </div>
            {showReport && (
              <div className="portal-history-actions">
                <button
                  type="button"
                  className="portal-history-report-btn"
                  onClick={() => onOpenReport(row)}
                >
                  战报
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
}> = ({ rows, myPoints, myRank }) => (
  <div className="portal-lb">
    {typeof myPoints === "number" && (
      <p className="portal-lb-me portal-lb-me--block">
        我的本周 {myPoints} 分{myRank ? ` · 第 ${myRank} 名` : ""}
      </p>
    )}
    <table className="portal-lb-table">
      <thead>
        <tr>
          <th>#</th>
          <th>玩家</th>
          <th>积分</th>
          <th>局数</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={4} className="portal-muted">
              暂无排行数据
            </td>
          </tr>
        ) : (
          rows.map((r) => (
            <tr key={`${r.rank}-${r.uid}`}>
              <td>{r.rank}</td>
              <td>{r.displayName ?? r.uid.slice(0, 12)}</td>
              <td>{r.points}</td>
              <td>{r.matchCount}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);
