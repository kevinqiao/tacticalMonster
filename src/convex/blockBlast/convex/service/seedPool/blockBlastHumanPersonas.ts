/**
 * Block Blast 落子人格：不同熟练度/风格产生不同分数分布，铺开 easy/medium/hard 各 tier。
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
  /** 每步思考时间 base（秒）；运行时 × BLOCK_BLAST_SIM_THINK_TIME_SCALE。 */
  thinkTimeSec: number;
};

export const HUMAN_PERSONAS: HumanPersona[] = [
  {
    id: "expert",
    tableauTopN: 1,
    greediness: 0.95,
    lineClearBias: 120,
    emptinessBias: 1.2,
    holeBias: 6,
    thinkTimeSec: 2.4,
  },
  {
    id: "strong",
    tableauTopN: 2,
    greediness: 0.85,
    lineClearBias: 100,
    emptinessBias: 1.0,
    holeBias: 5,
    thinkTimeSec: 2.0,
  },
  {
    id: "balanced",
    tableauTopN: 3,
    greediness: 0.7,
    lineClearBias: 80,
    emptinessBias: 0.8,
    holeBias: 4,
    thinkTimeSec: 1.8,
  },
  {
    id: "casual",
    tableauTopN: 4,
    greediness: 0.55,
    lineClearBias: 60,
    emptinessBias: 0.6,
    holeBias: 3,
    thinkTimeSec: 1.5,
  },
  {
    id: "loose",
    tableauTopN: 6,
    greediness: 0.4,
    lineClearBias: 45,
    emptinessBias: 0.4,
    holeBias: 2,
    thinkTimeSec: 1.3,
  },
  {
    id: "novice",
    tableauTopN: 8,
    greediness: 0.25,
    lineClearBias: 30,
    emptinessBias: 0.25,
    holeBias: 1,
    thinkTimeSec: 1.1,
  },
];

export function personaForRollout(rolloutIndex: number): HumanPersona {
  return HUMAN_PERSONAS[rolloutIndex % HUMAN_PERSONAS.length]!;
}
