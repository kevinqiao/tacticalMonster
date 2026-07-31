import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { CasualAsyncTableSummaryUI, Match3WatchContext } from './casualAsyncTableSummaryUI';
import './manualSettleConfirmOverlay.css';

function formatBotPlayingElapsedMs(
  elapsedMs: number,
  secondsSuffix: (n: number) => string
): string {
  const sec = Math.max(0, Math.floor(elapsedMs / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m > 0) {
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
  return secondsSuffix(s);
}

function WatchReplayIcon() {
  return (
    <svg
      className="msc-lb-watchBtn__icon"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M8 5.14v13.72a1 1 0 0 0 1.55.83l10.12-6.86a1 1 0 0 0 0-1.66L9.55 4.31A1 1 0 0 0 8 5.14z"
      />
    </svg>
  );
}

export const CasualTableSummaryPanel: React.FC<{
  s: CasualAsyncTableSummaryUI;
  onWatchRow?: (ctx: Match3WatchContext, displayLabel: string) => void;
  /** 用于按钮 aria-label（图标按钮不展示文案） */
  watchButtonLabel?: string;
  /** 覆盖默认「本桌至多 N 席 · 已计分 M 人」（历史战报等） */
  metaNote?: string;
}> = ({ s, onWatchRow, watchButtonLabel, metaNote }) => {
  const { t } = useTranslation('shared.casual');
  const watchLabel = watchButtonLabel ?? t('tableSummary.watch');
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
      ? t('tableSummary.metaSlots', { max: s.maxPlayers, scored: scoredCount })
      : t('tableSummary.metaScoredOnly', { scored: scoredCount }));

  const botPlayingScoreLabel = (row: CasualAsyncTableSummaryUI['rows'][number]) => {
    if (row.revealAt != null && Number.isFinite(row.revealAt)) {
      const elapsed = formatBotPlayingElapsedMs(tickNow - row.revealAt, (n) =>
        t('tableSummary.secondsSuffix', { n })
      );
      return t('tableSummary.playingWithTime', { time: elapsed });
    }
    return t('tableSummary.playing');
  };

  const scoreCell = (row: CasualAsyncTableSummaryUI['rows'][number]) => {
    if (row.rowState === 'matching') return t('tableSummary.matching');
    if (row.rowState === 'playing') {
      return row.isBot ? botPlayingScoreLabel(row) : t('tableSummary.playing');
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
    <div className="msc-tableSummary" role="group" aria-label={t('tableSummary.boardAria')}>
      <p className="msc-tableSummary__meta">{slotNote}</p>
      <div className="msc-lb-wrap">
        <table className="msc-lb-table">
          <thead>
            <tr>
              <th scope="col">{t('tableSummary.rank')}</th>
              <th scope="col">{t('tableSummary.player')}</th>
              <th scope="col">{t('tableSummary.score')}</th>
              {onWatchRow ? (
                <th scope="col" className="msc-lb-watchCol">
                  <span className="msc-lb-srOnly">{watchLabel}</span>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {s.rows.map((row, i) => {
              const playerLabel = row.isYou
                ? t('tableSummary.you')
                : row.rowState === 'matching'
                  ? t('tableSummary.matching')
                  : row.displayLabel;
              return (
              <tr key={`lb-${i}`} className={rowClass(row)}>
                <td>
                  {row.rowState === 'playing' || row.rowState === 'matching' ? '—' : row.rank}
                </td>
                <td>{playerLabel}</td>
                <td>{scoreCell(row)}</td>
                {onWatchRow ? (
                  <td className="msc-lb-watchCol">
                    {row.watchContext ? (
                      <button
                        type="button"
                        className="msc-lb-watchBtn"
                        aria-label={`${watchLabel} ${playerLabel}`}
                        title={watchLabel}
                        onClick={() => onWatchRow(row.watchContext!, playerLabel)}
                      >
                        <WatchReplayIcon />
                      </button>
                    ) : (
                      '—'
                    )}
                  </td>
                ) : null}
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="msc-tableSummary__foot">{t('tableSummary.higherScoreNote')}</p>
    </div>
  );
};
