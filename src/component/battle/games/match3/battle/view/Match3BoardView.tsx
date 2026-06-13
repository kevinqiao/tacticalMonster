import React, { useLayoutEffect, useRef } from 'react';

import {
  DEFAULT_MATCH3_BOARD_METRICS,
  measureMatch3Board,
  type Match3BoardMetrics,
} from '../animation/boardMetrics';
import { cellKey } from '../animation/match3TurnPlayback';
import type { GridCellRefs } from '../animation/gridCellRefs';
import {
  CANDY_COLORS,
  MATCH3_GRID_COLS,
  MATCH3_GRID_ROWS,
  type Match3GameState,
} from '../types/Match3Types';

const CANDY_EMOJI = ['🍎', '🍇', '🍋', '🍑', '🫐', '🍉'];

type Props = {
  gameState: Match3GameState;
  gridCellRefs: React.RefObject<GridCellRefs | null>;
  boardMetricsRef: React.RefObject<Match3BoardMetrics>;
  onMetrics?: (m: Match3BoardMetrics) => void;
  className?: string;
};

export const Match3BoardView: React.FC<Props> = ({
  gameState,
  gridCellRefs,
  boardMetricsRef,
  onMetrics,
  className,
}) => {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const board = boardRef.current;
    if (!board) return;

    const runMeasure = () => {
      const metrics = measureMatch3Board(board, MATCH3_GRID_ROWS, MATCH3_GRID_COLS);
      boardMetricsRef.current = metrics;
      onMetrics?.(metrics);
    };

    runMeasure();
    const ro = new ResizeObserver(runMeasure);
    ro.observe(board);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [boardMetricsRef, gameState.gameId, onMetrics]);

  const cellSizePx = boardMetricsRef.current?.cellSizePx ?? DEFAULT_MATCH3_BOARD_METRICS.cellSizePx;
  const cellGapPx = boardMetricsRef.current?.cellGapPx ?? DEFAULT_MATCH3_BOARD_METRICS.cellGapPx;

  const setCellRef = (r: number, c: number, el: HTMLDivElement | null) => {
    const matrix = gridCellRefs.current;
    if (!matrix?.[r]) return;
    matrix[r][c] = el;
  };

  return (
    <div className={className ?? 'match3-board-wrap'} ref={containerRef}>
      <div
        ref={boardRef}
        className="match3-board match3-board--watch"
        style={{
          gridTemplateColumns: `repeat(${MATCH3_GRID_COLS}, 1fr)`,
          gridTemplateRows: `repeat(${MATCH3_GRID_ROWS}, 1fr)`,
          ['--match3-cell-size' as string]: `${cellSizePx}px`,
          ['--match3-cell-gap' as string]: `${cellGapPx}px`,
          pointerEvents: 'none',
        }}
      >
        {gameState.grid.flatMap((row, r) =>
          row.map((cell, c) => {
            const key = cellKey(r, c);
            const isEmpty = cell.asset < 0;
            const color = isEmpty
              ? 'transparent'
              : CANDY_COLORS[cell.asset % CANDY_COLORS.length];
            return (
              <div
                key={key}
                ref={(el) => setCellRef(r, c, el)}
                data-match3-cell
                className={`match3-cell${isEmpty ? ' match3-cell--empty' : ''}`}
                style={{ background: color }}
              >
                {!isEmpty && CANDY_EMOJI[cell.asset % CANDY_EMOJI.length]}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Match3BoardView;
