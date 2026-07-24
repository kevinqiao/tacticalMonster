import React, { useId } from 'react';

import { CasualAdReplayVideoIcon } from './CasualAdReplayVideoIcon';
import {
  CASUAL_AD_REPLAY_BUTTON_LABEL,
  type CasualGameScoreReportUI,
} from './casualGameScoreReportUI';
import { useReplayWindowCountdown } from './useReplayWindowCountdown';
import './manualSettleConfirmOverlay.css';

export type CasualGameScoreReportOverlayProps = {
  open: boolean;
  report: CasualGameScoreReportUI | null;
  onConfirm: () => void;
  title?: string;
  confirmLabel?: string;
  secondaryLabel?: string;
  onSecondary?: () => void;
  secondaryDisabled?: boolean;
  secondaryBusy?: boolean;
  /** 广告再战：今日剩余次数（单独展示，避免加载态盖掉） */
  adReplayDailyRemaining?: number;
  /** epoch ms；再战窗口倒计时展示在副按钮上 */
  replayWindowEndsAt?: number;
  /** 再战失败时在按钮下方展示 */
  secondaryError?: string;
};

/** 休闲场：结算后展示本局得分构成；单人 P75 挑战时即为最终页（含看广告再战）。 */
export const CasualGameScoreReportOverlay: React.FC<CasualGameScoreReportOverlayProps> = ({
  open,
  report,
  onConfirm,
  title = '本局得分',
  confirmLabel = '确定',
  secondaryLabel,
  onSecondary,
  secondaryDisabled = false,
  secondaryBusy = false,
  adReplayDailyRemaining: _adReplayDailyRemaining,
  replayWindowEndsAt,
  secondaryError,
}) => {
  const titleId = useId();
  const replayCountdown = useReplayWindowCountdown(replayWindowEndsAt);
  if (!open || !report) return null;

  const challenge = report.challenge;
  const isAdReplay =
    secondaryLabel === CASUAL_AD_REPLAY_BUTTON_LABEL ||
    (secondaryLabel?.includes('广告') ?? false);
  let secondaryText = secondaryLabel;
  if (secondaryText && secondaryBusy) {
    secondaryText = isAdReplay ? '广告加载中…' : '匹配中…';
  } else if (secondaryText && secondaryDisabled) {
    secondaryText = `${secondaryText}（不可用）`;
  }
  if (secondaryText && replayCountdown) {
    secondaryText = `${secondaryText} ${replayCountdown}`;
  }

  const showSecondary = Boolean(secondaryLabel && onSecondary);

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
        <div className="ssc ssc--pinnedFooter">
          <div className="ssc__scroll">
            <h2 id={titleId} className="ssc__title msc-successTitle">
              {challenge ? (challenge.success ? '挑战成功' : '未达成目标') : title}
            </h2>
            {challenge ? (
              <div
                className={
                  challenge.success
                    ? 'msc-challengeResult msc-challengeResult--success'
                    : 'msc-challengeResult msc-challengeResult--fail'
                }
                role="status"
              >
                <span className="msc-challengeResult__badge">
                  {challenge.success ? '成功' : '未达成'}
                </span>
                <div className="msc-challengeResult__rows">
                  <div className="msc-challengeResult__row">
                    <span>目标分（P75）</span>
                    <span className="msc-challengeResult__val">
                      {challenge.targetScore.toLocaleString()}
                    </span>
                  </div>
                  <div className="msc-challengeResult__row">
                    <span>游戏分数</span>
                    <span className="msc-challengeResult__val">
                      {challenge.achievedScore.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
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
            {secondaryError ? (
              <p className="ssc__body msc-scoreReportSub msc-scoreReportSub--error" role="alert">
                {secondaryError}
              </p>
            ) : null}
          </div>
          <div
            className={[
              'ssc__actions',
              'ssc__actions--pinned',
              showSecondary ? 'ssc__actions--withReplay' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {showSecondary ? (
              <button
                type="button"
                className="ssc__btn ssc__btn--secondary ssc__btn--replayCompact"
                disabled={secondaryDisabled || secondaryBusy}
                onClick={onSecondary}
                title={secondaryLabel}
              >
                {isAdReplay && !secondaryBusy ? <CasualAdReplayVideoIcon /> : null}
                <span className="ssc__replayMain">{secondaryText ?? secondaryLabel}</span>
              </button>
            ) : null}
            <button
              type="button"
              className={`ssc__btn ssc__btn--primary${showSecondary ? ' ssc__btn--continueWide' : ''}`}
              onClick={onConfirm}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
