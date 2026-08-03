/**
 * Block Blast 计分：复用全局唯一总分口径（格数累计 + 激进 burst）。
 */
export {
  BLOCK_BLAST_BURST_JACKPOT,
  BLOCK_BLAST_MATCH_TIME_LIMIT_SEC,
  blockBlastBurstBonus,
  computeBlockBlastStepScore,
  computeBlockBlastStepScoreFromClear,
  computeBlockBlastTotalScore,
  countBlockBlastClearedCells,
} from "../blockBlastScoreModel";
