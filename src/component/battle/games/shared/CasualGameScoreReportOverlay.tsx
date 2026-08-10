import React, { useId } from 'react';
import { useTranslation } from 'react-i18next';

import { CasualAdReplayVideoIcon } from './CasualAdReplayVideoIcon';
import {
  CasualChallengeResultBlock,
  CasualChallengeResultTitle,
} from './CasualChallengeResultBlock';
import {
  formatCasualAdReplayQuotaBadge,
  getCasualAdReplayButtonLabel,
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
  /** 广告再战：今日剩余（与 cap 一起换算已用/上限，单独展示） */
  adReplayDailyRemaining?: number;
  adReplayDailyCap?: number;
  /** epoch ms；再战窗口倒计时展示在副按钮上 */
  replayWindowEndsAt?: number;
  /** 再战失败时在按钮下方展示 */
  secondaryError?: string;
};

/** 休闲场：结算后展示本局得分构成；单人挑战时即为最终页（含看广告再战）。 */
export const CasualGameScoreReportOverlay: React.FC<CasualGameScoreReportOverlayProps> = ({
  open,
  report,
  onConfirm,
  title,
  confirmLabel,
  secondaryLabel,
  onSecondary,
  secondaryDisabled = false,
  secondaryBusy = false,
  adReplayDailyRemaining,
  adReplayDailyCap,
  replayWindowEndsAt,
  secondaryError,
}) => {
  const { t } = useTranslation('shared.casual');
  const titleId = useId();
  const replayCountdown = useReplayWindowCountdown(replayWindowEndsAt);
  if (!open || !report) return null;

  const challenge = report.challenge;

  const isAdReplay =
    secondaryLabel === getCasualAdReplayButtonLabel() ||
    adReplayDailyRemaining != null ||
    adReplayDailyCap != null;
  const quotaBadge = isAdReplay
    ? formatCasualAdReplayQuotaBadge(adReplayDailyRemaining, adReplayDailyCap)
    : undefined;
  let secondaryText = secondaryLabel;
  if (secondaryText && secondaryBusy) {
    secondaryText = isAdReplay ? t('postSettle.adLoading') : t('postSettle.matching');
  } else if (secondaryText && secondaryDisabled) {
    secondaryText = `${secondaryText}${t('postSettle.unavailableSuffix')}`;
  }
  if (secondaryText && replayCountdown) {
    secondaryText = `${secondaryText} ${replayCountdown}`;
  }

  const showSecondary = Boolean(secondaryLabel && onSecondary);
  const buttonTitle = [secondaryLabel, quotaBadge].filter(Boolean).join(' ');
  const resolvedTitle = title ?? t('scoreReport.title');
  const resolvedConfirm = confirmLabel ?? t('scoreReport.confirm');

  return (
    <div className="msc-overlay" role="presentation">
      <button
        type="button"
        className="msc-backdrop"
        aria-label={t('postSettle.close')}
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
              <CasualChallengeResultTitle challenge={challenge} fallback={resolvedTitle} />
            </h2>
            {challenge ? <CasualChallengeResultBlock challenge={challenge} /> : null}
            <p className="ssc__body msc-scoreReportSub">
              {t('scoreReport.detailLead', { game: report.gameLabel })}
            </p>
            <ul className="msc-scoreReportList" aria-label={t('scoreReport.linesAria')}>
              {report.lines.map((line) => (
                <li key={line.label} className="msc-scoreReportList__row">
                  <span>{line.label}</span>
                  <span className="msc-scoreReportList__val">
                    {line.value.toLocaleString()}
                  </span>
                </li>
              ))}
              <li className="msc-scoreReportList__row msc-scoreReportList__row--total">
                <span>{t('scoreReport.total')}</span>
                <span className="msc-scoreReportList__val">
                  {report.totalScore.toLocaleString()}
                </span>
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
                onClick={() => onSecondary?.()}
                title={buttonTitle}
              >
                {isAdReplay && !secondaryBusy && !secondaryDisabled ? (
                  <CasualAdReplayVideoIcon />
                ) : null}
                <span className="ssc__replayMain">{secondaryText}</span>
                {quotaBadge ? (
                  <span
                    className="ssc__replayRemaining"
                    aria-label={t('postSettle.todayUsedAria', { quota: quotaBadge })}
                  >
                    {quotaBadge}
                  </span>
                ) : null}
              </button>
            ) : null}
            <button
              type="button"
              className={`ssc__btn ssc__btn--primary${showSecondary ? ' ssc__btn--continueWide' : ''}`}
              onClick={onConfirm}
            >
              {resolvedConfirm}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
