import React, { useId } from 'react';
import { useTranslation } from 'react-i18next';

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
  title,
  subtitle,
  summary,
  onDismiss,
  dismissLabel,
  onWatchRow,
  watchButtonLabel,
  tableMetaNote,
}) => {
  const { t } = useTranslation('shared.casual');
  const titleId = useId();
  const legs = summary?.triathlonLegs ?? [];
  const showOverall = Boolean(summary?.rows?.length);

  if (!open || !summary || (!showOverall && legs.length === 0)) return null;

  const resolvedTitle = title ?? t('triathlon.reportTitle');
  const resolvedDismiss = dismissLabel ?? t('postSettle.close');
  const resolvedWatch = watchButtonLabel ?? t('triathlon.replay');
  const body =
    subtitle != null && subtitle.trim()
      ? subtitle.trim()
      : t('triathlon.reportSubtitle');

  return (
    <div className="msc-overlay" role="presentation">
      <button
        type="button"
        className="msc-backdrop"
        aria-label={t('postSettle.close')}
        onClick={onDismiss}
      />
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
              {resolvedTitle}
            </h2>
            {body ? <p className="ssc__body">{body}</p> : null}
            {showOverall && summary ? (
              <div className="msc-triathlonSection">
                <h3 className="msc-triathlonSection__title">{t('triathlon.sessionTotal')}</h3>
                <CasualTableSummaryPanel s={summary} metaNote={tableMetaNote} />
              </div>
            ) : null}
            {legs.map((leg) => (
              <div key={`tri-leg-${leg.gameIndex}`} className="msc-triathlonSection">
                <h3 className="msc-triathlonSection__title">
                  {t('triathlon.legLabel', {
                    n: leg.gameIndex + 1,
                    game: leg.label,
                  })}
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
                  watchButtonLabel={resolvedWatch}
                />
              </div>
            ))}
          </div>
          <div className="ssc__actions ssc__actions--pinned">
            <button type="button" className="ssc__btn ssc__btn--primary" onClick={onDismiss}>
              {resolvedDismiss}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CasualTriathlonHistoryReportOverlay;
