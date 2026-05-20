import React from 'react';

import type { CasualAsyncTableSummaryUI } from './casualAsyncTableSummaryUI';
import './manualSettleConfirmOverlay.css';

export const CasualTableSummaryPanel: React.FC<{ s: CasualAsyncTableSummaryUI }> = ({ s }) => {
  const slotNote =
    s.maxPlayers > 0 ? `本桌至多 ${s.maxPlayers} 席 · 已计分 ${s.rows.length} 人` : `已计分 ${s.rows.length} 人`;

  return (
    <div className="msc-tableSummary" role="group" aria-label="本桌成绩榜">
      <p className="msc-tableSummary__meta">{slotNote}</p>
      <div className="msc-lb-wrap">
        <table className="msc-lb-table">
          <thead>
            <tr>
              <th scope="col">名次</th>
              <th scope="col">玩家</th>
              <th scope="col">得分</th>
            </tr>
          </thead>
          <tbody>
            {s.rows.map((row, i) => (
              <tr
                key={`lb-${i}`}
                className={
                  row.isYou ? 'msc-lb-row--you' : row.isBot ? 'msc-lb-row--bot' : undefined
                }
              >
                <td>{row.rank}</td>
                <td>
                  {row.displayLabel}
                  {row.isBot ? (
                    <span className="msc-lb-botTag" aria-label="系统对手">
                      系统对手
                    </span>
                  ) : null}
                </td>
                <td>{row.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="msc-tableSummary__foot">
        分数越高名次越靠前。「补位」为系统对手自动补位，与真人同桌一并计名次。
      </p>
    </div>
  );
};
