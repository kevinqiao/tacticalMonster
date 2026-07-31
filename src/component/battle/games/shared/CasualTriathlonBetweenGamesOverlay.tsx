import { useCrazyGamesMidgameBreak } from 'host/service/ads/midgame/useCrazyGamesMidgameBreak';
import React, { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { CasualGameScoreReportUI } from './casualGameScoreReportUI';
import {
  TRIATHLON_BETWEEN_LEG_AUTO_MS,
  triathlonGameLabel,
  type TriathlonLegScore,
} from './casualTriathlonSubmitFlow';
import type { TriathlonNextGame } from 'component/lobby/casual/service/useCasualTriathlonSession';
import './manualSettleConfirmOverlay.css';

type Props = {
  open: boolean;
  completedLeg: TriathlonLegScore;
  legScores: TriathlonLegScore[];
  nextGame: TriathlonNextGame;
  scoreReport?: CasualGameScoreReportUI | null;
  onContinue: () => void;
  autoAdvanceMs?: number;
};

export const CasualTriathlonBetweenGamesOverlay: React.FC<Props> = ({
  open,
  completedLeg,
  legScores,
  nextGame,
  scoreReport,
  onContinue,
  autoAdvanceMs = TRIATHLON_BETWEEN_LEG_AUTO_MS,
}) => {
  const { t } = useTranslation('shared.casual');
  const titleId = useId();
  const onContinueRef = useRef(onContinue);
  const [progressPct, setProgressPct] = useState(0);
  const midgameReady = useCrazyGamesMidgameBreak(open);
  onContinueRef.current = onContinue;

  useEffect(() => {
    if (!open || !midgameReady || autoAdvanceMs <= 0) return;

    setProgressPct(0);
    const startedAt = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const elapsed = now - startedAt;
      const pct = Math.min(100, (elapsed / autoAdvanceMs) * 100);
      setProgressPct(pct);
      if (elapsed >= autoAdvanceMs) {
        onContinueRef.current();
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [
    open,
    midgameReady,
    autoAdvanceMs,
    completedLeg.gameType,
    completedLeg.score,
    nextGame.gameId,
  ]);

  if (!open) return null;

  const runningTotal = legScores.reduce((sum, row) => sum + row.score, 0);
  const nextLabel = triathlonGameLabel(nextGame.gameType);
  const completedLegNumber = nextGame.gameIndex;
  const challenge = scoreReport?.challenge;
  const detailLines = scoreReport?.lines ?? [];
  const gameLabel =
    scoreReport?.gameLabel ?? triathlonGameLabel(completedLeg.gameType);

  return (
    <div className="msc-overlay" role="presentation">
      <div
        className="msc-dialog"
        role="dialog"
        aria-labelledby={titleId}
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ssc">
          <h2 id={titleId} className="ssc__title msc-successTitle">
            {challenge
              ? challenge.success
                ? t('triathlon.legChallengeSuccess', { n: completedLegNumber })
                : t('triathlon.legChallengeFail', { n: completedLegNumber })
              : t('triathlon.legComplete', { n: completedLegNumber })}
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
                {challenge.success
                  ? t('scoreReport.successBadge')
                  : t('scoreReport.failBadge')}
              </span>
              <div className="msc-challengeResult__rows">
                <div className="msc-challengeResult__row">
                  <span>{t('scoreReport.targetP75')}</span>
                  <span className="msc-challengeResult__val">
                    {challenge.targetScore.toLocaleString()}
                  </span>
                </div>
                <div className="msc-challengeResult__row">
                  <span>{t('scoreReport.gameScore')}</span>
                  <span className="msc-challengeResult__val">
                    {challenge.achievedScore.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          <p className="ssc__body msc-scoreReportSub">
            {t('triathlon.scoreDetail', { game: gameLabel })}
          </p>

          {detailLines.length > 0 ? (
            <ul className="msc-scoreReportList" aria-label={t('scoreReport.linesAria')}>
              {detailLines.map((line) => (
                <li key={line.label} className="msc-scoreReportList__row">
                  <span>{line.label}</span>
                  <span className="msc-scoreReportList__val">{line.value.toLocaleString()}</span>
                </li>
              ))}
              <li className="msc-scoreReportList__row msc-scoreReportList__row--total">
                <span>{t('triathlon.legTotal')}</span>
                <span className="msc-scoreReportList__val">
                  {(scoreReport?.totalScore ?? completedLeg.score).toLocaleString()}
                </span>
              </li>
            </ul>
          ) : (
            <p className="ssc__body msc-scoreReportSub">
              {t('triathlon.legScorePlain', {
                game: triathlonGameLabel(completedLeg.gameType),
                score: completedLeg.score.toLocaleString(),
              })}
            </p>
          )}

          {legScores.length > 1 ? (
            <>
              <p className="ssc__body msc-scoreReportSub">{t('triathlon.completedLegs')}</p>
              <ul className="ssc__lines">
                {legScores.map((row, idx) => (
                  <li key={`${row.gameType}-${idx}`} className="ssc__line">
                    <span>{triathlonGameLabel(row.gameType)}</span>
                    <span>{row.score.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          <p className="ssc__total">
            {t('triathlon.runningTotal')}{' '}
            <strong>{runningTotal.toLocaleString()}</strong>
          </p>
          <p className="ssc__body msc-scoreReportSub">
            {t('triathlon.nextLeg', { game: nextLabel })}
          </p>

          <div
            className="msc-triathlonAutoBar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progressPct)}
            aria-label={t('triathlon.autoNextAria')}
          >
            <div className="msc-triathlonAutoBar__fill" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="msc-triathlonAutoHint">{t('triathlon.autoNext')}</p>
          <div className="msc-actions">
            <button type="button" className="msc-btn msc-btn--primary" onClick={onContinue}>
              {t('triathlon.enterNextNow')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
