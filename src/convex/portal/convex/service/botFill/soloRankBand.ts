import type { ScoreQuantiles } from "../../shared/scoreQuantiles";

/** 允许的名次区间：ceilRank=最好（数字最小），floorRank=最差（数字最大） */
export type SoloRankBand = {
  ceilRank: number;
  floorRank: number;
};

/** 5 人桌参考档；其它 maxPlayers 线性缩放名次数字 */
const REFERENCE_MAX_PLAYERS = 5;

const REFERENCE_BANDS: SoloRankBand[] = [
  { ceilRank: 1, floorRank: 1 }, // > p90
  { ceilRank: 1, floorRank: 3 }, // (p70, p90]
  { ceilRank: 2, floorRank: 4 }, // (p50, p70]
  { ceilRank: 3, floorRank: 5 }, // (p33, p50]
  { ceilRank: 4, floorRank: 5 }, // <= p33
];

export function scaleRankForMaxPlayers(rank: number, maxPlayers: number): number {
  if (maxPlayers <= 1) return 1;
  if (REFERENCE_MAX_PLAYERS <= 1) return 1;
  const scaled =
    1 + Math.round(((rank - 1) * (maxPlayers - 1)) / (REFERENCE_MAX_PLAYERS - 1));
  return Math.min(maxPlayers, Math.max(1, scaled));
}

function scaleBandForMaxPlayers(band: SoloRankBand, maxPlayers: number): SoloRankBand {
  const ceilRank = scaleRankForMaxPlayers(band.ceilRank, maxPlayers);
  const floorRank = scaleRankForMaxPlayers(band.floorRank, maxPlayers);
  return {
    ceilRank: Math.min(ceilRank, floorRank),
    floorRank: Math.max(ceilRank, floorRank),
  };
}

/** 按 humanScore 与 seed 分位数分档，并按 maxPlayers 缩放名次区间 */
export function rankBandFromScore(
  humanScore: number,
  scoreQuantiles: ScoreQuantiles,
  maxPlayers: number
): SoloRankBand {
  const { p90, p70, p50, p33 } = scoreQuantiles;
  let ref: SoloRankBand;
  if (humanScore > p90) ref = REFERENCE_BANDS[0]!;
  else if (humanScore > p70) ref = REFERENCE_BANDS[1]!;
  else if (humanScore > p50) ref = REFERENCE_BANDS[2]!;
  else if (humanScore > p33) ref = REFERENCE_BANDS[3]!;
  else ref = REFERENCE_BANDS[4]!;
  return scaleBandForMaxPlayers(ref, maxPlayers);
}

export function clampTargetRankToBand(
  targetRank: number,
  band: SoloRankBand,
  maxPlayers: number
): number {
  const lo = Math.max(1, Math.min(band.ceilRank, maxPlayers));
  const hi = Math.max(lo, Math.min(band.floorRank, maxPlayers));
  return Math.min(Math.max(targetRank, lo), hi);
}

/** v3：effectiveRank = targetRank 在 rankBand 内 clamp；bot 补位后人类 settle 名次应等于此值。 */
export function resolveEffectiveRank(args: {
  targetRank: number;
  band: SoloRankBand;
  maxPlayers: number;
}): number {
  return clampTargetRankToBand(args.targetRank, args.band, args.maxPlayers);
}
