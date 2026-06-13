import { MATCH3_GRID_COLS, MATCH3_GRID_ROWS } from '../types/Match3Types';

export type GridCellRefs = (HTMLDivElement | null)[][];

export function allocateGridCellRefs(
  rows = MATCH3_GRID_ROWS,
  cols = MATCH3_GRID_COLS
): GridCellRefs {
  return Array.from({ length: rows }, () => Array<HTMLDivElement | null>(cols).fill(null));
}
