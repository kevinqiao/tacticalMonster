import React, { useMemo } from 'react';

import {
  YATZ_CATEGORIES,
  YATZ_CATEGORY_LABELS,
  type YatzCategory,
  type YatzGameState,
} from '../types/YatzTypes';

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

type Props = {
  gameState: YatzGameState;
  readOnly?: boolean;
};

const YatzReplayBoard: React.FC<Props> = ({ gameState }) => {
  const used = useMemo(
    () => new Set(YATZ_CATEGORIES.filter((c) => gameState.categoryScores[c] != null)),
    [gameState.categoryScores]
  );

  const upperSubtotal = UPPER_CATEGORIES.reduce(
    (sum, cat) => sum + (gameState.categoryScores[cat] ?? 0),
    0
  );

  return (
    <div className="yatz-replay-board">
      <div className="yatz-dice-stage yatz-dice-stage--replay">
        <div className="yatz-dice-row">
          {gameState.dice.map((value, index) => {
            const empty = value <= 0;
            return (
              <div
                key={index}
                className={`yatz-die yatz-die--static ${gameState.held[index] ? 'yatz-die--held' : ''} ${empty ? 'yatz-die--empty' : ''}`}
              >
                {empty ? (
                  <div className="yatz-die-inner">
                    <span className="yatz-die-placeholder">?</span>
                  </div>
                ) : (
                  <DieFace value={value} />
                )}
              </div>
            );
          })}
        </div>
        <p className="yatz-round-hint">
          第 {Math.min(gameState.roundIndex + 1, 13)}/13 回合 · 投掷 {gameState.rollCount}/3
        </p>
      </div>

      <div className="yatz-scorecard-wrap yatz-scorecard-wrap--compact">
        <div className="yatz-scorecard-section">
          <div className="yatz-scorecard-title">上区</div>
          <div className="yatz-scorecard">
            {UPPER_CATEGORIES.map((cat) => (
              <div
                key={cat}
                className={`yatz-score-row ${used.has(cat) ? 'yatz-score-row--used' : ''}`}
              >
                <span>{CATEGORY_LABELS_ZH[cat] ?? YATZ_CATEGORY_LABELS[cat]}</span>
                <span className="yatz-score-value">
                  {gameState.categoryScores[cat] != null ? gameState.categoryScores[cat] : '—'}
                </span>
              </div>
            ))}
          </div>
          <div className="yatz-score-subtotal">
            <span>上区小计</span>
            <strong>{upperSubtotal}</strong>
          </div>
        </div>
        <div className="yatz-scorecard-section">
          <div className="yatz-scorecard-title yatz-scorecard-title--lower">下区</div>
          <div className="yatz-scorecard">
            {LOWER_CATEGORIES.map((cat) => (
              <div
                key={cat}
                className={`yatz-score-row ${used.has(cat) ? 'yatz-score-row--used' : ''} ${cat === 'yahtzee' ? 'yatz-score-row--yahtzee' : ''}`}
              >
                <span>{CATEGORY_LABELS_ZH[cat] ?? YATZ_CATEGORY_LABELS[cat]}</span>
                <span className="yatz-score-value">
                  {gameState.categoryScores[cat] != null ? gameState.categoryScores[cat] : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default YatzReplayBoard;
