/**
 * Block Blast 计分：复用全局唯一总分口径
 * （基础消行分 + lines*5 + max(0,100-moves)），与 GameOverReport / 提交路径一致。
 */
export { computeBlockBlastTotalScore } from "../blockBlastScoreModel";

export const BLOCK_BLAST_MATCH_TIME_LIMIT_SEC = 300;
