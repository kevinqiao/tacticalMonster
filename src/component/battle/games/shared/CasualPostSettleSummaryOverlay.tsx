import React, { useId } from 'react';

import type { CasualAsyncTableSummaryUI } from './casualAsyncTableSummaryUI';
import { CasualTableSummaryPanel } from './CasualTableSummaryPanel';
import './manualSettleConfirmOverlay.css';

export type CasualPostSettleSummaryOverlayProps = {
  open: boolean;
  title?: string;
  subtitle?: string;
  /** 有数据时展示本桌完整名次表（每行一玩家） */
  summary: CasualAsyncTableSummaryUI | null;
  /** 后端 `pendingOthers`：成绩已记，本桌尚未全员提交，暂无摘要 */
  waitingForPeers?: boolean;
  onDismiss: () => void;
  dismissLabel?: string;
};

/**
 * 休闲 run 提交成功后展示同桌摘要（自然终局等非 ManualSettle 流程）。
 */
export const CasualPostSettleSummaryOverlay: React.FC<CasualPostSettleSummaryOverlayProps> = ({
  open,
  title = '本局已结算',
  subtitle,
  summary,
  waitingForPeers = false,
  onDismiss,
  dismissLabel = '继续',
}) => {
  const titleId = useId();
  const showTable = Boolean(summary?.rows?.length);
  const showPending = Boolean(waitingForPeers) && !showTable;
  const showSubmittedOnly = open && !showTable && !showPending;

  if (!open || (!showTable && !showPending && !showSubmittedOnly)) return null;

  const defaultSub =
    showTable
      ? '你已提交成绩，以下为本桌全部玩家得分与名次。'
      : showPending
        ? '你的成绩已记录。本桌尚有同桌未完成，暂无法计算名次与分差。'
        : '本局成绩已成功提交。';

  const body = subtitle != null && subtitle.trim() ? subtitle.trim() : defaultSub;

  return (
    <div className="msc-overlay" role="presentation">
      <button
        type="button"
        className="msc-backdrop"
        aria-label="关闭"
        onClick={onDismiss}
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
          {body ? <p className="ssc__body">{body}</p> : null}
          {showTable && summary ? <CasualTableSummaryPanel s={summary} /> : null}
          {showPending ? (
            <p className="ssc__body msc-pendingPeersNote" role="status">
              全部同桌提交后，可在下一场对局结束时的结算页查看本桌名次。
            </p>
          ) : null}
          <div className="ssc__actions">
            <button type="button" className="ssc__btn ssc__btn--primary" onClick={onDismiss}>
              {dismissLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
