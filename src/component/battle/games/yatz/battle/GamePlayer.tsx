import React, { useEffect, useMemo, useState } from 'react';
import {
  YATZ_CATEGORIES,
  YATZ_CATEGORY_LABELS,
  YatzGameStatus,
  type YatzCategory,
} from './types/YatzTypes';
import { useYatzGameManager } from './service/GameManager';
import {
  ManualSettleConfirmOverlay,
  MANUAL_SETTLE_DEFAULT_MESSAGE_YATZ,
} from '../../shared/ManualSettleConfirmOverlay';
import { CasualGameScoreReportOverlay } from '../../shared/CasualGameScoreReportOverlay';
import { CasualPostSettleSummaryOverlay } from '../../shared/CasualPostSettleSummaryOverlay';
import { resolveCasualPostSettleReplayPresentation } from '../../shared/casualGameScoreReportUI';
import YatzWatchOverlay from './replay/YatzWatchOverlay';

const UPPER_CATEGORIES = YATZ_CATEGORIES.slice(0, 6);
const LOWER_CATEGORIES = YATZ_CATEGORIES.slice(6);

const CATEGORY_LABELS_ZH: Record<YatzCategory, string> = {
  ones: '一点',
  twos: '二点',
  threes: '三点',
  fours: '四点',
  fives: '五点',
  sixes: '六点',
  three_kind: '三条',
  four_kind: '四条',
  full_house: '葫芦',
  small_straight: '小顺',
  large_straight: '大顺',
  yahtzee: 'Yatz',
  chance: '机会',
};

const PIP_LAYOUT: Record<number, Array<[number, number]>> = {
  1: [[1, 1]],
  2: [
    [0, 0],
    [2, 2],
  ],
  3: [
    [0, 0],
    [1, 1],
    [2, 2],
  ],
  4: [
    [0, 0],
    [0, 2],
    [2, 0],
    [2, 2],
  ],
  5: [
    [0, 0],
    [0, 2],
    [1, 1],
    [2, 0],
    [2, 2],
  ],
  6: [
    [0, 0],
    [0, 2],
    [1, 0],
    [1, 2],
    [2, 0],
    [2, 2],
  ],
};

function DieFace({ value }: { value: number }) {
  const pips = PIP_LAYOUT[value] ?? [];
  return (
    <div className="yatz-die-inner" aria-hidden>
      {pips.map(([row, col], i) => (
        <span
          key={i}
          className="yatz-pip"
          style={{ gridRow: row + 1, gridColumn: col + 1 }}
        />
      ))}
    </div>
  );
}

function formatMatchRemainingSec(sec: number): string {
  const total = Math.max(0, Math.ceil(sec));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function ProgressRing({ round }: { round: number }) {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(round / 13, 1);
  const offset = circumference * (1 - progress);

  return (
    <div className="yatz-progress-ring" aria-hidden>
      <svg viewBox="0 0 42 42">
        <circle className="yatz-progress-ring-bg" cx="21" cy="21" r={radius} />
        <circle
          className="yatz-progress-ring-fg"
          cx="21"
          cy="21"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
    </div>
  );
}

function ScoreSection({
  title,
  titleClass,
  categories,
  categoryScores,
  used,
  mustPickCategory,
  busy,
  onPick,
}: {
  title: string;
  titleClass?: string;
  categories: readonly YatzCategory[];
  categoryScores: Partial<Record<YatzCategory, number>>;
  used: Set<YatzCategory>;
  mustPickCategory: boolean;
  busy: boolean;
  onPick: (cat: YatzCategory) => void;
}) {
  return (
    <div className="yatz-scorecard-section">
      <div className={`yatz-scorecard-title ${titleClass ?? ''}`}>{title}</div>
      <div className="yatz-scorecard">
        {categories.map((cat) => {
          const scored = categoryScores[cat];
          const isUsed = used.has(cat);
          const pickable = mustPickCategory && !isUsed && !busy;
          return (
            <div
              key={cat}
              className={`yatz-score-row ${isUsed ? 'yatz-score-row--used' : ''} ${pickable ? 'yatz-score-row--pickable' : ''} ${cat === 'yahtzee' ? 'yatz-score-row--yahtzee' : ''}`}
            >
              <button
                type="button"
                disabled={!pickable}
                onClick={() => pickable && onPick(cat)}
              >
                {CATEGORY_LABELS_ZH[cat] ?? YATZ_CATEGORY_LABELS[cat]}
              </button>
              <span className="yatz-score-value">{scored != null ? scored : '—'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const GamePlayer: React.FC = () => {
  const yatz = useYatzGameManager();
  const gs = yatz.gameState;

  const used = useMemo(() => {
    if (!gs) return new Set<YatzCategory>();
    return new Set(YATZ_CATEGORIES.filter((c) => gs.categoryScores[c] != null));
  }, [gs]);

  const postSettleReplay = useMemo(
    () =>
      resolveCasualPostSettleReplayPresentation({
        replayOffered: yatz.postCasualReplayOffered,
        canReplay: yatz.postCasualCanReplay,
        replayMode: yatz.postCasualReplayMode,
        adReplayDailyRemaining: yatz.postCasualAdReplayDailyRemaining,
        replayWindowEndsAt: yatz.postCasualReplayWindowEndsAt,
      }),
    [
      yatz.postCasualReplayOffered,
      yatz.postCasualCanReplay,
      yatz.postCasualReplayMode,
      yatz.postCasualAdReplayDailyRemaining,
      yatz.postCasualReplayWindowEndsAt,
    ]
  );

  const upperSubtotal = useMemo(() => {
    if (!gs) return 0;
    return UPPER_CATEGORIES.reduce((sum, cat) => sum + (gs.categoryScores[cat] ?? 0), 0);
  }, [gs]);

  const [dueRemainingSec, setDueRemainingSec] = useState<number | null>(null);
  useEffect(() => {
    const dueTime = yatz.gameState?.dueTime;
    if (dueTime == null || !Number.isFinite(dueTime)) {
      setDueRemainingSec(null);
      return;
    }
    const tick = () => {
      setDueRemainingSec(Math.max(0, (dueTime - Date.now()) / 1000));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [yatz.gameState?.dueTime]);

  if (yatz.loadError) {
    return (
      <div className="yatz-layout">
        <p className="yatz-error">加载失败：{yatz.loadError}</p>
      </div>
    );
  }

  if (!gs) {
    return (
      <div className="yatz-layout">
        <p className="yatz-round-hint">加载中…</p>
      </div>
    );
  }

  const playing = gs.status === YatzGameStatus.PLAYING;
  const canRoll = playing && gs.rollCount < 3;
  const mustPickCategory = playing && gs.rollCount > 0;
  const roundDisplay = Math.min(gs.roundIndex + 1, 13);
  const rolling = yatz.busy && canRoll;

  return (
    <>
      <div className="yatz-layout">
        <div className="yatz-playfield">
        <header className="yatz-header">
          <div className="yatz-header-stats">
            <div className="yatz-stat">
              <span className="yatz-stat-label">总分</span>
              <span className="yatz-stat-value">{gs.score}</span>
            </div>
            {yatz.targetScore != null ? (
              <div className="yatz-stat">
                <span className="yatz-stat-label">目标</span>
                <span className="yatz-stat-value yatz-stat-value--target">{yatz.targetScore}</span>
              </div>
            ) : null}
            {gs.yahtzeeBonus > 0 ? (
              <div className="yatz-stat">
                <span className="yatz-stat-label">奖励</span>
                <span className="yatz-stat-value yatz-stat-value--accent">+{gs.yahtzeeBonus}</span>
              </div>
            ) : null}
            {dueRemainingSec != null ? (
              <div className="yatz-stat yatz-stat--timer">
                <span className="yatz-stat-label">剩余</span>
                <span className="yatz-stat-value yatz-stat-value--timer">
                  {formatMatchRemainingSec(dueRemainingSec)}
                </span>
              </div>
            ) : null}
          </div>
          {playing ? (
            <div className="yatz-header-actions">
              <button
                type="button"
                className="yatz-btn yatz-btn--end"
                disabled={yatz.busy}
                onClick={() => void yatz.settleManuallyAndExit()}
              >
                结束对局
              </button>
            </div>
          ) : null}
          <div className="yatz-progress-wrap">
            <ProgressRing round={roundDisplay} />
            <span className="yatz-progress-label">
              第 {roundDisplay}/13 回合 · 投掷 {gs.rollCount}/3
              {mustPickCategory ? ' · 请选择计分类别' : ''}
            </span>
          </div>
        </header>

        <div className="yatz-dice-stage">
          <div className="yatz-dice-row">
            {gs.dice.map((value, index) => {
              const empty = value <= 0;
              return (
                <button
                  key={index}
                  type="button"
                  className={`yatz-die ${gs.held[index] ? 'yatz-die--held' : ''} ${empty ? 'yatz-die--empty' : ''} ${rolling ? 'yatz-die--rolling' : ''}`}
                  disabled={!playing || yatz.busy || gs.rollCount === 0 || empty}
                  aria-label={empty ? '空骰' : `骰子 ${value}${gs.held[index] ? '，已锁定' : ''}`}
                  onClick={() => void yatz.toggleHold(index)}
                >
                  {empty ? (
                    <div className="yatz-die-inner">
                      <span className="yatz-die-placeholder">?</span>
                    </div>
                  ) : (
                    <DieFace value={value} />
                  )}
                </button>
              );
            })}
          </div>
          {mustPickCategory ? (
            <p className="yatz-round-hint yatz-round-hint--pick">点击计分卡中的类别完成本回合</p>
          ) : (
            <p className="yatz-round-hint">
              {gs.rollCount === 0 ? '掷骰开始本回合' : '点击骰子可锁定，再掷剩余骰子'}
            </p>
          )}
        </div>

        <div className="yatz-actions">
          <button
            type="button"
            className="yatz-btn yatz-btn--primary"
            disabled={!canRoll || yatz.busy}
            onClick={() => void yatz.roll()}
          >
            {gs.rollCount === 0 ? '掷骰' : '再掷一次'}
          </button>
        </div>
        </div>

        <div className="yatz-scorecard-wrap">
          <ScoreSection
            title="上区 · 点数"
            categories={UPPER_CATEGORIES}
            categoryScores={gs.categoryScores}
            used={used}
            mustPickCategory={mustPickCategory}
            busy={yatz.busy}
            onPick={(cat) => void yatz.pickCategory(cat)}
          />
          <div className="yatz-score-subtotal">
            <span>上区小计</span>
            <strong>
              {upperSubtotal}
              {upperSubtotal >= 63 ? ' · 已获得 +35 奖励' : ` · 距 +35 奖励还差 ${63 - upperSubtotal}`}
            </strong>
          </div>
          <ScoreSection
            title="下区 · 组合"
            titleClass="yatz-scorecard-title--lower"
            categories={LOWER_CATEGORIES}
            categoryScores={gs.categoryScores}
            used={used}
            mustPickCategory={mustPickCategory}
            busy={yatz.busy}
            onPick={(cat) => void yatz.pickCategory(cat)}
          />
        </div>
      </div>

      <ManualSettleConfirmOverlay
        open={yatz.settleConfirmOpen}
        defaultMessage={MANUAL_SETTLE_DEFAULT_MESSAGE_YATZ}
        onCancel={yatz.cancelSettleConfirm}
        onConfirm={yatz.confirmSettleAndExit}
        onSuccessClose={yatz.finishManualSettleSuccess}
      />
      <CasualGameScoreReportOverlay
        open={yatz.postCasualScoreReportOpen && yatz.watchTarget == null}
        report={yatz.postCasualScoreReport}
        onConfirm={yatz.dismissPostCasualScoreReport}
      />
      <CasualPostSettleSummaryOverlay
        open={yatz.postCasualSummaryOpen && yatz.watchTarget == null}
        title="同桌成绩"
        summary={yatz.postCasualTableSummary}
        waitingForPeers={yatz.postCasualWaitingForPeers}
        onDismiss={yatz.dismissPostCasualSummary}
        replayAvailable={postSettleReplay.showReplay}
        replayMode={yatz.postCasualReplayMode}
        replayWindowEndsAt={yatz.postCasualReplayWindowEndsAt}
        replayBusy={yatz.casualReplayBusy}
        onReplay={postSettleReplay.showReplay ? () => void yatz.replayCasualRun() : undefined}
        replayLabel={postSettleReplay.replayLabel}
      />
      <YatzWatchOverlay
        open={yatz.watchTarget != null}
        watchContext={yatz.watchTarget}
        displayLabel={yatz.watchTargetLabel}
        onClose={yatz.closeWatch}
      />
    </>
  );
};

export default GamePlayer;
