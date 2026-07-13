import React, { useEffect, useState } from 'react';

import type { CasualAsyncTableSummaryUI, Match3WatchContext } from './casualAsyncTableSummaryUI';
import './manualSettleConfirmOverlay.css';

function formatBotPlayingElapsedMs(elapsedMs: number): string {
  const sec = Math.max(0, Math.floor(elapsedMs / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m > 0) {
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
  return `${s}秒`;
}

function botPlayingScoreLabel(row: CasualAsyncTableSummaryUI['rows'][number], now: number): string {
  if (row.revealAt != null && Number.isFinite(row.revealAt)) {
    const elapsed = formatBotPlayingElapsedMs(now - row.revealAt);
    return `对局中 · ${elapsed}`;
  }
  return '对局中';
}

export const CasualTableSummaryPanel: React.FC<{
  s: CasualAsyncTableSummaryUI;
  onWatchRow?: (ctx: Match3WatchContext, displayLabel: string) => void;
  watchButtonLabel?: string;
  /** 覆盖默认「本桌至多 N 席 · 已计分 M 人」（历史战报等） */
  metaNote?: string;
}> = ({ s, onWatchRow, watchButtonLabel = '观战', metaNote }) => {
  const hasPlayingBot = s.rows.some(
    (r) => r.isBot && r.rowState === 'playing' && r.revealAt != null
  );
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!hasPlayingBot) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [hasPlayingBot, s.rows]);

  const tickNow = hasPlayingBot ? now : Date.now();
  const scoredCount = s.rows.filter((r) => r.rowState !== 'playing' && r.rowState !== 'matching').length;
  const slotNote =
    metaNote ??
    (s.maxPlayers > 0
      ? `本桌至多 ${s.maxPlayers} 席 · 已计分 ${scoredCount} 人`
      : `已计分 ${scoredCount} 人`);

  const scoreCell = (row: CasualAsyncTableSummaryUI['rows'][number]) => {
    if (row.rowState === 'matching') return '正在匹配中';
    if (row.rowState === 'playing') {
      return row.isBot ? botPlayingScoreLabel(row, tickNow) : 'Playing';
    }
    return row.score;
  };

  const rowClass = (row: CasualAsyncTableSummaryUI['rows'][number]) => {
    if (row.isYou) return 'msc-lb-row--you';
    if (row.rowState === 'matching') return 'msc-lb-row--matching';
    if (row.isBot && row.rowState === 'playing') return 'msc-lb-row--bot msc-lb-row--bot-playing';
    if (row.isBot) return 'msc-lb-row--bot';
    return undefined;
  };

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
              {onWatchRow ? <th scope="col">{watchButtonLabel}</th> : null}
            </tr>
          </thead>
          <tbody>
            {s.rows.map((row, i) => (
              <tr key={`lb-${i}`} className={rowClass(row)}>
                <td>
                  {row.rowState === 'playing' || row.rowState === 'matching' ? '—' : row.rank}
                </td>
                <td>
                  {row.displayLabel}
                  {row.isBot && row.rowState === 'scored' ? (
                    <span className="msc-lb-botTag" aria-label="系统对手">
                      系统对手
                    </span>
                  ) : null}
                  {row.isBot && row.rowState === 'playing' ? (
                    <span className="msc-lb-botTag" aria-label="系统对手">
                      系统对手
                    </span>
                  ) : null}
                </td>
                <td>{scoreCell(row)}</td>
                {onWatchRow ? (
                  <td>
                    {row.watchContext ? (
                      <button
                        type="button"
                        className="msc-lb-watchBtn"
                        onClick={() => onWatchRow(row.watchContext!, row.displayLabel)}
                      >
                        {watchButtonLabel}
                      </button>
                    ) : (
                      '—'
                    )}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="msc-tableSummary__foot">
        分数越高名次越靠前。带「系统对手」标记的为自动补位玩家，与真人同桌一并计名次。
      </p>
    </div>
  );
};
