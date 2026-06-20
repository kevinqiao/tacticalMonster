/**
 * Block Blast 唯一的总分口径来源。
 *
 * 总分 = 基础消行分 + 消行加成(lines*5) + 步数加成(max(0, 100 - moves))。
 * findReport、休闲提交路径、种子池 bot 计分三处统一复用，避免公式漂移。
 */

/** 休闲对局时长上限（秒）；与种子池模拟、服务端 timeout scheduler 一致 */
export const BLOCK_BLAST_MATCH_TIME_LIMIT_SEC = 300;

export const BLOCK_BLAST_LINES_BONUS_PER_LINE = 5;
export const BLOCK_BLAST_MOVES_BONUS_BASE = 100;

export function blockBlastLinesBonus(lines: number): number {
  return Math.max(0, Math.floor(lines)) * BLOCK_BLAST_LINES_BONUS_PER_LINE;
}

export function blockBlastMovesBonus(moves: number): number {
  return Math.max(0, BLOCK_BLAST_MOVES_BONUS_BASE - Math.max(0, Math.floor(moves)));
}

/** 与 GameOverReport 显示一致的总分（向下取整、非负）。 */
export function computeBlockBlastTotalScore(
  baseScore: number,
  lines: number,
  moves: number
): number {
  return Math.max(
    0,
    Math.floor(baseScore) + blockBlastLinesBonus(lines) + blockBlastMovesBonus(moves)
  );
}
