import React from "react";
import { GameReport } from "./BattleReport";
import "./report.css";
interface Props {
  rank: number;
  gameReport: GameReport;
}
const ReportItem: React.FC<Props> = ({ rank, gameReport }) => {
  return (
    <div key={gameReport.uid} className="report-item">
      <div className="report-trophy">
        <span>{rank}</span>
        {/* {typeof gameReport.rank != "undefined" ? <PrizeIcon rank={gameReport.rank + 1}></PrizeIcon> : null} */}
      </div>
      <div className="score-summary">
        <div>{gameReport.player?.name}</div>
        {typeof gameReport.score === "undefined" && gameReport.uid ? (
          <div className="battle-prize">Now Playing</div>
        ) : (
          <div>{gameReport.score}</div>
        )}
      </div>
    </div>
  );
};

export default ReportItem;
