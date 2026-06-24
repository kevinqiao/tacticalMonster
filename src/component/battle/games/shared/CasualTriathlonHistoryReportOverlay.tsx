import React, { useId } from 'react';

import type {
  CasualAsyncTableSummaryUI,
  CasualWatchRowHandler,
} from './casualAsyncTableSummaryUI';
import { CasualTableSummaryPanel } from './CasualTableSummaryPanel';
import './manualSettleConfirmOverlay.css';

export type CasualTriathlonHistoryReportOverlayProps = {
  open: boolean;
  title?: string;
  subtitle?: string;
  summary: CasualAsyncTableSummaryUI | null;
  onDismiss: () => void;
  dismissLabel?: string;
  onWatchRow?: CasualWatchRowHandler;
  watchButtonLabel?: string;
  tableMetaNote?: string;
};

/** 历史页三场合战：总分榜 + 各局单局榜与回放 */
export const CasualTriathlonHistoryReportOverlay: React.FC<
  CasualTriathlonHistoryReportOverlayProps
> = ({
  open,
  title = '对局报告',
  subtitle,
  summary,
  onDismiss,
  dismissLabel = '关闭',
  onWatchRow,
  watchButtonLabel = '回放',
  tableMetaNote,
}) => {
  const titleId = useId();
  const legs = summary?.triathlonLegs ?? [];
  const showOverall = Boolean(summary?.rows?.length);

  if (!open || !summary || (!showOverall && legs.length === 0)) return null;

  const defaultSub =
    '以下为本桌三局累计总分与各局单局得分。点击各行「回放」可查看该玩家该局操作。';
  const body = subtitle != null && subtitle.trim() ? subtitle.trim() : defaultSub;

  return (
    <div className="msc-overlay" role="presentation">
      <button type="button" className="msc-backdrop" aria-label="关闭" onClick={onDismiss} />
      <div
        className="msc-dialog msc-dialog--triathlon"
        role="dialog"
        aria-labelledby={titleId}
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ssc ssc--pinnedFooter">
          <div className="ssc__scroll">
            <h2 id={titleId} className="ssc__title msc-successTitle">
              {title}
            </h2>
            {body ? <p className="ssc__body">{body}</p> : null}
            {showOverall && summary ? (
              <div className="msc-triathlonSection">
                <h3 className="msc-triathlonSection__title">三局累计总分</h3>
                <CasualTableSummaryPanel s={summary} metaNote={tableMetaNote} />
              </div>
            ) : null}
            {legs.map((leg) => (
              <div key={`tri-leg-${leg.gameIndex}`} className="msc-triathlonSection">
                <h3 className="msc-triathlonSection__title">
                  第 {leg.gameIndex + 1} 局 · {leg.label}
                </h3>
                <CasualTableSummaryPanel
                  s={{ maxPlayers: summary!.maxPlayers, rows: leg.rows }}
                  onWatchRow={
                    onWatchRow
                      ? (ctx, label) =>
                          onWatchRow(
                            ctx,
                            label,
                            leg.gameType === 'solitaire'
                              ? 'solitaire'
                              : leg.gameType === 'block_blast'
                                ? 'block_blast'
                                : 'match_3'
                          )
                      : undefined
                  }
                  watchButtonLabel={watchButtonLabel}
                />
              </div>
            ))}
          </div>
          <div className="ssc__actions ssc__actions--pinned">
            <button type="button" className="ssc__btn ssc__btn--primary" onClick={onDismiss}>
              {dismissLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CasualTriathlonHistoryReportOverlay;
