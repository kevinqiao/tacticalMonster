import { CELL_GAP_PX, CELL_SIZE_PX, CELL_STEP_PX } from './animationConfig';

export type Match3BoardMetrics = {
  cellSizePx: number;
  cellGapPx: number;
  cellStepPx: number;
};

export const DEFAULT_MATCH3_BOARD_METRICS: Match3BoardMetrics = {
  cellSizePx: CELL_SIZE_PX,
  cellGapPx: CELL_GAP_PX,
  cellStepPx: CELL_STEP_PX,
};

export function measureMatch3Board(
  boardEl: HTMLElement,
  rows: number,
  cols: number
): Match3BoardMetrics {
  const rect = boardEl.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return DEFAULT_MATCH3_BOARD_METRICS;
  }

  const style = getComputedStyle(boardEl);
  const gap = parseFloat(style.columnGap || style.gap) || CELL_GAP_PX;
  const padX = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
  const padY = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0);
  const innerW = rect.width - padX;
  const innerH = rect.height - padY;
  const cellW = (innerW - gap * (cols - 1)) / cols;
  const cellH = (innerH - gap * (rows - 1)) / rows;
  const cellSizePx = Math.max(1, Math.min(cellW, cellH));

  return {
    cellSizePx,
    cellGapPx: gap,
    cellStepPx: cellSizePx + gap,
  };
}
