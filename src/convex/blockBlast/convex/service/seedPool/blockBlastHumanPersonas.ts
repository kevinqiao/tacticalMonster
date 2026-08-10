/**
 * Block Blast 落子人格：不同熟练度/风格产生不同分数分布，铺开 easy/medium/hard 各 tier。
 *
 * 2026-08「保活优先」：在 thinkTimeScale≈0.6（~1s/步）下，抬 emptiness/hole/mobility，
 * 略降纯贪消，避免局局 stuck 导致分位锁死。
 */

export type HumanPersona = {
  id: string;
  /** 取 topN 候选中的范围（越大越随机/越弱）。 */
  tableauTopN: number;
  /** 选最优落子的概率；否则在 topN 内随机。 */
  greediness: number;
  /** 消行收益权重（越高越偏向能消行的落子）。 */
  lineClearBias: number;
  /** 盘面填充惩罚权重（越高越倾向保持盘面空旷）。 */
  emptinessBias: number;
  /** 孔洞惩罚权重（被包围的空格）。 */
  holeBias: number;
  /**
   * 落子后剩余手牌合法位数奖励（越高越保活）。
   * 见 blockBlastStochasticHumanPolicy.evaluatePlacement。
   */
  mobilityBias: number;
  /** 每步思考时间 base（秒）；运行时 × BLOCK_BLAST_SIM_THINK_TIME_SCALE。 */
  thinkTimeSec: number;
};

export const HUMAN_PERSONAS: HumanPersona[] = [
  {
    id: "expert",
    tableauTopN: 1,
    greediness: 0.98,
    lineClearBias: 70,
    emptinessBias: 2.2,
    holeBias: 12,
    mobilityBias: 4,
    thinkTimeSec: 2.4,
  },
  {
    id: "strong",
    tableauTopN: 1,
    greediness: 0.95,
    lineClearBias: 65,
    emptinessBias: 2.0,
    holeBias: 10,
    mobilityBias: 3.5,
    thinkTimeSec: 2.0,
  },
  {
    id: "balanced",
    tableauTopN: 1,
    greediness: 0.92,
    lineClearBias: 60,
    emptinessBias: 1.8,
    holeBias: 9,
    mobilityBias: 3,
    thinkTimeSec: 1.8,
  },
  {
    id: "casual",
    tableauTopN: 2,
    greediness: 0.85,
    lineClearBias: 55,
    emptinessBias: 1.5,
    holeBias: 7,
    mobilityBias: 2.5,
    thinkTimeSec: 1.5,
  },
  {
    id: "loose",
    tableauTopN: 3,
    greediness: 0.7,
    lineClearBias: 45,
    emptinessBias: 1.2,
    holeBias: 5,
    mobilityBias: 2,
    thinkTimeSec: 1.3,
  },
  {
    id: "novice",
    tableauTopN: 4,
    greediness: 0.55,
    lineClearBias: 35,
    emptinessBias: 0.9,
    holeBias: 3,
    mobilityBias: 1.5,
    thinkTimeSec: 1.1,
  },
];

export function personaForRollout(rolloutIndex: number): HumanPersona {
  return HUMAN_PERSONAS[rolloutIndex % HUMAN_PERSONAS.length]!;
}
