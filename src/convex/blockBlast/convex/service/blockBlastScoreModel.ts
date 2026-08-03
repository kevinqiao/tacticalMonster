/**
 * Block Blast 唯一的总分口径来源。
 *
 * 对局内每步消行得分 = 本步清除格数 C + burstBonus(C)。
 * burst 以棋盘边长 B 为基准：超出 B 的格数越多，加成越高（激进档）。
 * 总分 = 对局内累计 score（结算不再叠 lines / moves 修正）。
 */

/** 休闲对局时长上限（秒）；与种子池模拟、服务端 timeout scheduler 一致 */
export const BLOCK_BLAST_MATCH_TIME_LIMIT_SEC = 300;

/** C > B+8 时额外固定大奖（激进 burst） */
export const BLOCK_BLAST_BURST_JACKPOT = 80;

/** 本步满行/满列并集去重后的清除格数 */
export function countBlockBlastClearedCells(
  rows: number[],
  cols: number[],
  gridSize: number
): number {
  const n = Math.max(1, Math.floor(gridSize));
  const unique = new Set<string>();
  for (const row of rows) {
    if (row < 0 || row >= n) continue;
    for (let c = 0; c < n; c++) {
      unique.add(`${row},${c}`);
    }
  }
  for (const col of cols) {
    if (col < 0 || col >= n) continue;
    for (let r = 0; r < n; r++) {
      unique.add(`${r},${col}`);
    }
  }
  return unique.size;
}

/**
 * 单步 burst 加成（激进）：
 * C ≤ B → 0
 * B < C ≤ B+4 → (C−B)×2
 * B+4 < C ≤ B+8 → (C−B)×4
 * C > B+8 → (C−B)×6 + JACKPOT
 */
export function blockBlastBurstBonus(clearedCells: number, gridSize: number): number {
  const C = Math.max(0, Math.floor(clearedCells));
  const B = Math.max(1, Math.floor(gridSize));
  if (C <= B) return 0;

  const excess = C - B;
  if (C <= B + 4) return excess * 2;
  if (C <= B + 8) return excess * 4;
  return excess * 6 + BLOCK_BLAST_BURST_JACKPOT;
}

/** 本步消行得分（格数 + burst） */
export function computeBlockBlastStepScore(clearedCells: number, gridSize: number): number {
  const C = Math.max(0, Math.floor(clearedCells));
  return C + blockBlastBurstBonus(C, gridSize);
}

export function computeBlockBlastStepScoreFromClear(
  rows: number[],
  cols: number[],
  gridSize: number
): number {
  return computeBlockBlastStepScore(
    countBlockBlastClearedCells(rows, cols, gridSize),
    gridSize
  );
}

/** 对局终局总分（score 已在每步累计 burst 口径） */
export function computeBlockBlastTotalScore(
  score: number,
  _lines?: number,
  _moves?: number
): number {
  return Math.max(0, Math.floor(score));
}
