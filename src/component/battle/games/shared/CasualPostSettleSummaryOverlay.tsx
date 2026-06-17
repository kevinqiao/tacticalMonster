import React, { useId } from 'react';

import type { WeeklyLeagueSettleUI } from './casualWeeklyLeagueScoreUI';
import { formatWeeklyLeagueSettleLines } from './casualWeeklyLeagueScoreUI';

import type { CasualAsyncTableSummaryUI, Match3WatchContext } from './casualAsyncTableSummaryUI';
import { CasualTableSummaryPanel } from './CasualTableSummaryPanel';
import { useReplayWindowCountdown } from './useReplayWindowCountdown';
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
  /** 模板允许再战且在窗口内时展示（可与 `onReplay` 分离以支持灰态） */
  replayAvailable?: boolean;
  /** 展示再战但不可点（如无再战令） */
  replayDisabled?: boolean;
  replayDisabledHint?: string;
  replayLabel?: string;
  onReplay?: () => void;
  replayBusy?: boolean;
  /** epoch ms，再战窗口结束时刻 */
  replayWindowEndsAt?: number;
  onWatchRow?: (ctx: Match3WatchContext, displayLabel: string) => void;
  watchButtonLabel?: string;
  weeklyLeagueSettle?: WeeklyLeagueSettleUI | null;
  /** 内容区滚动时底部操作栏固定可见（历史 LeaderBoard 等） */
  pinFooter?: boolean;
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
  replayAvailable = false,
  replayDisabled = false,
  replayDisabledHint = '需要再战令（商店购买）',
  replayLabel = '再战',
  onReplay,
  replayBusy = false,
  replayWindowEndsAt,
  onWatchRow,
  watchButtonLabel,
  weeklyLeagueSettle,
  pinFooter = false,
}) => {
  const titleId = useId();
  const countdown = useReplayWindowCountdown(replayWindowEndsAt);
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

  const showReplayBtn = replayAvailable && countdown != null;
  const replayBtnDisabled = replayBusy || replayDisabled || !onReplay;
  let replayBtnText = replayLabel;
  if (replayBusy) {
    replayBtnText = '匹配中…';
  } else if (replayDisabled) {
    replayBtnText = `${replayLabel}（无令）`;
  }
  if (countdown) {
    replayBtnText = `${replayBtnText} ${countdown}`;
  }

  const leagueLines = formatWeeklyLeagueSettleLines(weeklyLeagueSettle);

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
        <div className={pinFooter ? 'ssc ssc--pinnedFooter' : 'ssc'}>
          <div className={pinFooter ? 'ssc__scroll' : undefined}>
            <h2 id={titleId} className="ssc__title msc-successTitle">
              {title}
            </h2>
            {body ? <p className="ssc__body">{body}</p> : null}
            {showTable && summary ? (
              <CasualTableSummaryPanel
                s={summary}
                onWatchRow={onWatchRow}
                watchButtonLabel={watchButtonLabel}
              />
            ) : null}
            {showPending ? (
              <p className="ssc__body msc-pendingPeersNote" role="status">
                全部同桌提交后，可在下一场对局结束时的结算页查看本桌名次。
              </p>
            ) : null}
            {leagueLines.length > 0 ? (
              <ul className="ssc__leagueLines" aria-label="周联赛">
                {leagueLines.map((line) => (
                  <li key={line.label}>
                    {line.label} <b>{line.value}</b>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className={pinFooter ? 'ssc__actions ssc__actions--pinned' : 'ssc__actions'}>
            {showReplayBtn ? (
              <button
                type="button"
                className="ssc__btn ssc__btn--secondary"
                disabled={replayBtnDisabled}
                title={replayDisabled ? replayDisabledHint : undefined}
                onClick={() => onReplay?.()}
              >
                {replayBtnText}
              </button>
            ) : null}
            <button type="button" className="ssc__btn ssc__btn--primary" onClick={onDismiss}>
              {dismissLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
