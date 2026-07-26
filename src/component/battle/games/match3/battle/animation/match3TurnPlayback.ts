import { AudioBus } from 'host/service/audio';
import type { Match3Cell, Match3TurnStep } from '../types/Match3Types';
import { CELL_SIZE_PX, CELL_GAP_PX, CELL_STEP_PX } from './animationConfig';
import { playClearAnim, playFallAnim, playSpawnAnim } from './effects/cascadeAnim';
import type { GridCellRefs } from './gridCellRefs';
import {
  DEFAULT_MATCH3_BOARD_METRICS,
  type Match3BoardMetrics,
} from './boardMetrics';

export { CELL_SIZE_PX, CELL_GAP_PX, CELL_STEP_PX };

export function cellKey(r: number, c: number): string {
  return `${r},${c}`;
}

function cloneGrid(grid: Match3Cell[][]): Match3Cell[][] {
  return grid.map((row) => row.map((cell) => ({ ...cell })));
}

function swapCells(grid: Match3Cell[][], r1: number, c1: number, r2: number, c2: number): void {
  const a = grid[r1][c1];
  const b = grid[r2][c2];
  grid[r1][c1] = { ...b, row: r1, col: c1 };
  grid[r2][c2] = { ...a, row: r2, col: c2 };
}

function applyClear(grid: Match3Cell[][], cells: Array<{ row: number; col: number }>): void {
  for (const { row, col } of cells) {
    grid[row][col] = { row, col, asset: -1, id: `empty-${row}-${col}` };
  }
}

function applyFall(
  grid: Match3Cell[][],
  moves: Array<{
    from: { row: number; col: number };
    to: { row: number; col: number };
    asset: number;
  }>
): void {
  for (const m of moves) {
    const cell = grid[m.from.row][m.from.col];
    grid[m.to.row][m.to.col] = { ...cell, row: m.to.row, col: m.to.col, asset: m.asset };
    grid[m.from.row][m.from.col] = {
      row: m.from.row,
      col: m.from.col,
      asset: -1,
      id: `empty-${m.from.row}-${m.from.col}`,
    };
  }
}

function applySpawnFromFinal(
  grid: Match3Cell[][],
  cells: Array<{ row: number; col: number; asset: number }>,
  finalGrid: Match3Cell[][]
): void {
  for (const { row, col } of cells) {
    grid[row][col] = { ...finalGrid[row][col] };
  }
}

type CascadeRound = {
  clear: Extract<Match3TurnStep, { kind: 'clear' }>;
  falls: Array<Extract<Match3TurnStep, { kind: 'fall' }>>;
  spawns: Array<Extract<Match3TurnStep, { kind: 'spawn' }>>;
};

function groupCascadeRounds(turnScript: Match3TurnStep[]): CascadeRound[] {
  const rounds: CascadeRound[] = [];
  let i = 0;
  while (i < turnScript.length) {
    const step = turnScript[i];
    if (step.kind === 'swap') {
      i++;
      continue;
    }
    if (step.kind !== 'clear') {
      i++;
      continue;
    }
    const round: CascadeRound = { clear: step, falls: [], spawns: [] };
    i++;
    while (i < turnScript.length) {
      const next = turnScript[i];
      if (next.kind === 'clear' || next.kind === 'swap') break;
      if (next.kind === 'fall') round.falls.push(next);
      if (next.kind === 'spawn') round.spawns.push(next);
      i++;
    }
    rounds.push(round);
  }
  return rounds;
}

function buildSpawnDropSteps(
  spawnCells: Array<{ row: number; col: number; asset: number }>
): Record<string, number> {
  const byCol = new Map<number, number[]>();
  for (const cell of spawnCells) {
    const rows = byCol.get(cell.col) ?? [];
    rows.push(cell.row);
    byCol.set(cell.col, rows);
  }
  const dropSteps: Record<string, number> = {};
  for (const [col, rows] of byCol) {
    const sorted = [...rows].sort((a, b) => a - b);
    for (let i = 0; i < sorted.length; i++) {
      dropSteps[cellKey(sorted[i], col)] = sorted.length - i;
    }
  }
  return dropSteps;
}

function waitPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

function collectClearRefs(round: CascadeRound, refs: GridCellRefs): HTMLElement[] {
  const out: HTMLElement[] = [];
  for (const { row, col } of round.clear.cells) {
    const el = refs[row]?.[col];
    if (el) out.push(el);
  }
  return out;
}

function collectFallMoves(
  round: CascadeRound,
  refs: GridCellRefs,
  cellStepPx: number
): Array<{ el: HTMLElement; dx: number; dy: number }> {
  const out: Array<{ el: HTMLElement; dx: number; dy: number }> = [];
  for (const fall of round.falls) {
    for (const m of fall.moves) {
      const el = refs[m.from.row]?.[m.from.col];
      if (!el) continue;
      out.push({
        el,
        dx: (m.to.col - m.from.col) * cellStepPx,
        dy: (m.to.row - m.from.row) * cellStepPx,
      });
    }
  }
  return out;
}

async function playCascadeRoundGsap(
  working: Match3Cell[][],
  round: CascadeRound,
  finalGrid: Match3Cell[][],
  refs: GridCellRefs,
  commitGrid: (grid: Match3Cell[][]) => void,
  cellStepPx: number
): Promise<void> {
  const spawnCells = round.spawns.flatMap((s) => s.cells);
  const spawnDropSteps = buildSpawnDropSteps(spawnCells);

  const clearRefs = collectClearRefs(round, refs);
  AudioBus.emit('game.match3.clear');
  await playClearAnim(clearRefs);

  applyClear(working, round.clear.cells);
  commitGrid(cloneGrid(working));
  await waitPaint();

  AudioBus.emit('game.match3.fall');
  await playFallAnim(collectFallMoves(round, refs, cellStepPx));

  for (const fall of round.falls) applyFall(working, fall.moves);
  commitGrid(cloneGrid(working));
  await waitPaint();

  if (spawnCells.length > 0) {
    AudioBus.emit('game.match3.spawn');
    const spawnTargets = spawnCells
      .map((cell) => {
        const el = refs[cell.row]?.[cell.col];
        if (!el) return null;
        return {
          el,
          dropSteps: spawnDropSteps[cellKey(cell.row, cell.col)] ?? 1,
        };
      })
      .filter((t): t is { el: HTMLDivElement; dropSteps: number } => t != null);

    applySpawnFromFinal(working, spawnCells, finalGrid);
    commitGrid(cloneGrid(working));
    await playSpawnAnim(spawnTargets, cellStepPx);
  }
}

export function gridAfterSwap(
  grid: Match3Cell[][],
  r1: number,
  c1: number,
  r2: number,
  c2: number
): Match3Cell[][] {
  const next = cloneGrid(grid);
  swapCells(next, r1, c1, r2, c2);
  return next;
}

export function turnScriptAfterSwap(turnScript: Match3TurnStep[]): Match3TurnStep[] {
  if (turnScript[0]?.kind === 'swap') return turnScript.slice(1);
  return turnScript;
}

/**
 * Block Blast 风格：底格由 commitGrid 分阶段提交，GSAP 只操作 gridCellRefs 对应 DOM。
 * 消除与下落并行；未涉及的格子 DOM 与数据均不触碰。
 */
export async function playMatch3TurnScript(args: {
  turnScript: Match3TurnStep[];
  finalGrid: Match3Cell[][];
  gridCellRefs: GridCellRefs;
  commitGrid: (grid: Match3Cell[][]) => void;
  initialWorkingGrid: Match3Cell[][];
  boardMetrics?: Match3BoardMetrics;
}): Promise<void> {
  const cellStepPx = args.boardMetrics?.cellStepPx ?? DEFAULT_MATCH3_BOARD_METRICS.cellStepPx;
  const working = cloneGrid(args.initialWorkingGrid);
  const rounds = groupCascadeRounds(args.turnScript);

  for (const round of rounds) {
    await playCascadeRoundGsap(
      working,
      round,
      args.finalGrid,
      args.gridCellRefs,
      args.commitGrid,
      cellStepPx
    );
  }

  for (let r = 0; r < working.length; r++) {
    for (let c = 0; c < working[r].length; c++) {
      working[r][c] = { ...args.finalGrid[r][c] };
    }
  }
  args.commitGrid(cloneGrid(working));
}
