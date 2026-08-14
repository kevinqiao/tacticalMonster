import React from "react";

import { usePortal } from "component/lobby/portal/service/usePortalManager";

import "./townShell.css";

const TIER_LABELS: Record<string, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
  diamond: "Diamond",
};

const TownLeagueTab: React.FC = () => {
  const portal = usePortal();
  const league = portal.weeklyLeagueTierView;
  const board = portal.cohortLeaderboard;

  return (
    <div className="town-tab-panel">
      <h2>League · 市长评级</h2>
      <p>Week Score comes from Showdown only. Zone passive never counts toward Pod rank.</p>
      {league ? (
        <>
          <div className="town-tab-panel__card">
            <div className="town-tab-panel__row">
              <span>Term Standing</span>
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
              <strong>Pod leaderboard</strong>
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
    </div>
  );
};

export default TownLeagueTab;
