/**
 * Match-3 游戏引擎：确定性盘面、交换、连消 cascade、TurnScript。
 */
import {
  MATCH3_CANDY_TYPES,
  MATCH3_GRID_COLS,
  MATCH3_GRID_ROWS,
  Match3Cell,
  Match3GameStatus,
  Match3TurnStep,
} from "../types/Match3Types";
import { createSeededRandom } from "../utils/seedRandom";
import { scoreForClearCount } from "./match3Scoring";

export function randomUuidCompat(): string {
  const c = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (c && typeof c.randomUUID === "function") {
    return c.randomUUID();
  }
  if (c && typeof c.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    c.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return `m3-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

export function generateDeterministicId(seed: string, index: number): string {
  let hash = 0;
  const seedStr = `${seed}-cell-${index}`;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash = hash & hash;
  }
  const positiveHash = Math.abs(hash);
  return `m3-${positiveHash.toString(16).padStart(8, "0")}-${index}`;
}

function cloneGrid(grid: Match3Cell[][]): Match3Cell[][] {
  return grid.map((row) => row.map((cell) => ({ ...cell })));
}

function isAdjacent(r1: number, c1: number, r2: number, c2: number): boolean {
  const dr = Math.abs(r1 - r2);
  const dc = Math.abs(c1 - c2);
  return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
}

export function hasInitialMatches(grid: Match3Cell[][]): boolean {
  return findMatchCells(grid).size > 0;
}

export function findMatchCells(grid: Match3Cell[][]): Set<string> {
  const matched = new Set<string>();
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;

  for (let r = 0; r < rows; r++) {
    let runAsset = -1;
    let runStart = 0;
    let runLen = 0;
    for (let c = 0; c <= cols; c++) {
      const asset = c < cols ? grid[r][c].asset : -999;
      if (asset === runAsset) {
        runLen++;
      } else {
        if (runLen >= 3 && runAsset >= 0) {
          for (let k = runStart; k < runStart + runLen; k++) {
            matched.add(`${r},${k}`);
          }
        }
        runAsset = asset;
        runStart = c;
        runLen = 1;
      }
    }
  }

  for (let c = 0; c < cols; c++) {
    let runAsset = -1;
    let runStart = 0;
    let runLen = 0;
    for (let r = 0; r <= rows; r++) {
      const asset = r < rows ? grid[r][c].asset : -999;
      if (asset === runAsset) {
        runLen++;
      } else {
        if (runLen >= 3 && runAsset >= 0) {
          for (let k = runStart; k < runStart + runLen; k++) {
            matched.add(`${k},${c}`);
          }
        }
        runAsset = asset;
        runStart = r;
        runLen = 1;
      }
    }
  }

  return matched;
}

export function findValidMoves(grid: Match3Cell[][]): Array<{ r1: number; c1: number; r2: number; c2: number }> {
  const moves: Array<{ r1: number; c1: number; r2: number; c2: number }> = [];
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const neighbors = [
        [r, c + 1],
        [r + 1, c],
      ] as const;
      for (const [nr, nc] of neighbors) {
        if (nr >= rows || nc >= cols) continue;
        const test = cloneGrid(grid);
        const a = test[r][c];
        const b = test[nr][nc];
        test[r][c] = { ...b, row: r, col: c };
        test[nr][nc] = { ...a, row: nr, col: nc };
        if (findMatchCells(test).size > 0) {
          moves.push({ r1: r, c1: c, r2: nr, c2: nc });
        }
      }
    }
  }
  return moves;
}

function swapCells(grid: Match3Cell[][], r1: number, c1: number, r2: number, c2: number): void {
  const a = grid[r1][c1];
  const b = grid[r2][c2];
  grid[r1][c1] = { ...b, row: r1, col: c1 };
  grid[r2][c2] = { ...a, row: r2, col: c2 };
}

function applyGravity(
  grid: Match3Cell[][],
  refillSeed: string,
  refillCounter: { value: number }
): { fallSteps: Match3TurnStep[]; spawnSteps: Match3TurnStep[] } {
  const fallSteps: Match3TurnStep[] = [];
  const spawnSteps: Match3TurnStep[] = [];
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;

  for (let c = 0; c < cols; c++) {
    const fallMoves: Array<{
      from: { row: number; col: number };
      to: { row: number; col: number };
      asset: number;
    }> = [];
    let writeRow = rows - 1;
    for (let r = rows - 1; r >= 0; r--) {
      const cell = grid[r][c];
      if (cell.asset >= 0) {
        if (writeRow !== r) {
          const moved = { ...cell, row: writeRow, col: c };
          grid[writeRow][c] = moved;
          grid[r][c] = { row: r, col: c, asset: -1, id: `empty-${r}-${c}` };
          fallMoves.push({
            from: { row: r, col: c },
            to: { row: writeRow, col: c },
            asset: cell.asset,
          });
        }
        writeRow--;
      }
    }

    const spawnCells: Array<{ row: number; col: number; asset: number }> = [];
    const rng = createSeededRandom(`${refillSeed}:refill:${refillCounter.value}`);
    for (let r = writeRow; r >= 0; r--) {
      const asset = Math.floor(rng() * MATCH3_CANDY_TYPES);
      const id = generateDeterministicId(refillSeed, refillCounter.value);
      refillCounter.value++;
      grid[r][c] = { row: r, col: c, asset, id };
      spawnCells.push({ row: r, col: c, asset });
    }

    if (fallMoves.length > 0) {
      fallSteps.push({ kind: "fall", moves: fallMoves });
    }
    if (spawnCells.length > 0) {
      spawnSteps.push({ kind: "spawn", cells: spawnCells });
    }
  }

  return { fallSteps, spawnSteps };
}

export function buildBoardFromSeed(seedId: string, maxAttempts = 200): Match3Cell[][] {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const attemptSeed = `${seedId}:board:${attempt}`;
    const rng = createSeededRandom(attemptSeed);
    const grid: Match3Cell[][] = [];
    let cellIndex = 0;
    for (let r = 0; r < MATCH3_GRID_ROWS; r++) {
      const row: Match3Cell[] = [];
      for (let c = 0; c < MATCH3_GRID_COLS; c++) {
        const asset = Math.floor(rng() * MATCH3_CANDY_TYPES);
        row.push({
          row: r,
          col: c,
          asset,
          id: generateDeterministicId(seedId, cellIndex++),
        });
      }
      grid.push(row);
    }
    if (!hasInitialMatches(grid) && findValidMoves(grid).length > 0) {
      return grid;
    }
  }
  throw new Error(`Failed to build valid board for seed: ${seedId}`);
}

export type ResolveSwapResult = {
  ok: true;
  grid: Match3Cell[][];
  scoreDelta: number;
  turnScript: Match3TurnStep[];
  refillCounter: number;
} | { ok: false; error: string };

export function resolveSwap(
  grid: Match3Cell[][],
  r1: number,
  c1: number,
  r2: number,
  c2: number,
  seed: string,
  refillCounter: number
): ResolveSwapResult {
  if (!isAdjacent(r1, c1, r2, c2)) {
    return { ok: false, error: "not_adjacent" };
  }

  const working = cloneGrid(grid);
  swapCells(working, r1, c1, r2, c2);

  if (findMatchCells(working).size === 0) {
    return { ok: false, error: "no_match" };
  }

  const turnScript: Match3TurnStep[] = [{ kind: "swap", r1, c1, r2, c2 }];
  let scoreDelta = 0;
  let comboIndex = 0;
  const counter = { value: refillCounter };

  while (true) {
    const matched = findMatchCells(working);
    if (matched.size === 0) break;

    comboIndex++;
    const clearCells = [...matched].map((key) => {
      const [row, col] = key.split(",").map(Number);
      return { row, col };
    });
    turnScript.push({ kind: "clear", cells: clearCells });
    scoreDelta += scoreForClearCount(clearCells.length, comboIndex);

    for (const key of matched) {
      const [row, col] = key.split(",").map(Number);
      working[row][col] = { row, col, asset: -1, id: `empty-${row}-${col}` };
    }

    const { fallSteps, spawnSteps } = applyGravity(working, seed, counter);
    turnScript.push(...fallSteps, ...spawnSteps);
  }

  return {
    ok: true,
    grid: working,
    scoreDelta,
    turnScript,
    refillCounter: counter.value,
  };
}

export class Match3GameEngine {
  static createGame(seed?: string, gameId = ""): Omit<import("../types/Match3Types").Match3GameState, "_id"> {
    const normalizedSeed = seed ?? `session-${Date.now()}`;
    const grid = buildBoardFromSeed(normalizedSeed);
    return {
      gameId,
      grid,
      score: 0,
      moves: 0,
      status: Match3GameStatus.PLAYING,
      seed: normalizedSeed,
      refillCounter: MATCH3_GRID_ROWS * MATCH3_GRID_COLS,
    };
  }

  static isValidSwap(
    grid: Match3Cell[][],
    r1: number,
    c1: number,
    r2: number,
    c2: number
  ): boolean {
    if (!isAdjacent(r1, c1, r2, c2)) return false;
    const test = cloneGrid(grid);
    swapCells(test, r1, c1, r2, c2);
    return findMatchCells(test).size > 0;
  }

  static applySwap(
    state: Pick<import("../types/Match3Types").Match3GameState, "grid" | "score" | "moves" | "seed" | "refillCounter">,
    r1: number,
    c1: number,
    r2: number,
    c2: number
  ): ResolveSwapResult & { moves: number; score: number } | { ok: false; error: string } {
    const seed = state.seed ?? "default";
    const result = resolveSwap(
      state.grid,
      r1,
      c1,
      r2,
      c2,
      seed,
      state.refillCounter ?? MATCH3_GRID_ROWS * MATCH3_GRID_COLS
    );
    if (!result.ok) return result;
    return {
      ...result,
      moves: (state.moves ?? 0) + 1,
      score: (state.score ?? 0) + result.scoreDelta,
    };
  }
}
