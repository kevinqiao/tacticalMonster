import React, { useId } from 'react';

import type { CasualGameScoreReportUI } from './casualGameScoreReportUI';
import './manualSettleConfirmOverlay.css';

export type CasualGameScoreReportOverlayProps = {
  open: boolean;
  report: CasualGameScoreReportUI | null;
  onConfirm: () => void;
  title?: string;
  confirmLabel?: string;
};

/** 休闲场：结算后第一步，展示本局得分构成（非同桌总榜；再战仅在同桌摘要页）。 */
export const CasualGameScoreReportOverlay: React.FC<CasualGameScoreReportOverlayProps> = ({
  open,
  report,
  onConfirm,
  title = '本局得分',
  confirmLabel = '确定',
}) => {
  const titleId = useId();
  if (!open || !report) return null;

  return (
    <div className="msc-overlay" role="presentation">
      <button
        type="button"
        className="msc-backdrop"
        aria-label="关闭"
        onClick={onConfirm}
      />
      <div
        className="msc-dialog"
        role="dialog"
        aria-labelledby={titleId}
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ssc">
          <h2 id={titleId} className="ssc__title msc-successTitle">
            {title}
          </h2>
          <p className="ssc__body msc-scoreReportSub">
            {report.gameLabel} · 以下为当局得分明细
          </p>
          <ul className="msc-scoreReportList" aria-label="得分明细">
            {report.lines.map((line) => (
              <li key={line.label} className="msc-scoreReportList__row">
                <span>{line.label}</span>
                <span className="msc-scoreReportList__val">
                  {line.value >= 0 ? line.value.toLocaleString() : line.value.toLocaleString()}
                </span>
              </li>
            ))}
            <li className="msc-scoreReportList__row msc-scoreReportList__row--total">
              <span>总分</span>
              <span className="msc-scoreReportList__val">{report.totalScore.toLocaleString()}</span>
            </li>
          </ul>
          <div className="ssc__actions">
            <button type="button" className="ssc__btn ssc__btn--primary" onClick={onConfirm}>
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
