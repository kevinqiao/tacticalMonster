/**
 * Block Blast 体验 KPI：probe（体检）/ prod（硬拒）两档。
 * 出块策略不变时，用仿真事件筛 seed。
 */

import type {
  KpiProfile,
  RolloutDistributionMetrics,
  SeedPoolRejectReason,
} from "./blockBlastRecordedOpTypes";

export type { KpiProfile };

export const LATE_GAME_REACH_SEC = 180;
export const SCORE_MARK_SECS = [60, 150, 240] as const;

/** medium burst: C > B；jackpot: C > B+8（与 blockBlastScoreModel 一致） */
export function isMediumBurst(clearedCells: number, gridSize: number): boolean {
  return clearedCells > gridSize;
}

export function isJackpotBurst(clearedCells: number, gridSize: number): boolean {
  return clearedCells > gridSize + 8;
}

export type ExperienceGateThresholds = {
  minTimeUpRate: number;
  maxStuckRate: number;
  minOpeningMoves: number;
  maxOpeningMoves: number;
  /** Probe 极端硬拒下限（小于则死局感） */
  hardMinOpeningMoves: number;
  hardMaxOpeningMoves: number;
  minScoreP25: number;
  minScoreSpread: number;
  minMediumBurstRate: number;
  minJackpotRate: number;
  minLateGameReachRate: number;
  collapsedBucketFraction: number;
};

/**
 * 阈值按 v4 + thinkTimeScale≈3~4 的 bot 仿真校准：
 * opening 常在 100–170；jackpot 稀有；scale=1 时几乎全 stuck。
 */
export const KPI_THRESHOLDS_PROBE: ExperienceGateThresholds = {
  minTimeUpRate: 0.05,
  maxStuckRate: 0.98,
  minOpeningMoves: 96,
  maxOpeningMoves: 180,
  hardMinOpeningMoves: 80,
  hardMaxOpeningMoves: 200,
  minScoreP25: 16,
  minScoreSpread: 50,
  minMediumBurstRate: 0.12,
  minJackpotRate: 0,
  minLateGameReachRate: 0.2,
  collapsedBucketFraction: 0.9,
};

export const KPI_THRESHOLDS_PROD: ExperienceGateThresholds = {
  minTimeUpRate: 0.08,
  // v6 出块更硬：再宽 stuck / 稀有 KPI，保可生成量
  maxStuckRate: 0.96,
  minOpeningMoves: 100,
  maxOpeningMoves: 175,
  hardMinOpeningMoves: 80,
  hardMaxOpeningMoves: 200,
  minScoreP25: 16,
  minScoreSpread: 60,
  minMediumBurstRate: 0.12,
  minJackpotRate: 0.008,
  minLateGameReachRate: 0.22,
  collapsedBucketFraction: 0.85,
};

export function thresholdsForProfile(profile: KpiProfile): ExperienceGateThresholds | null {
  if (profile === "probe") return KPI_THRESHOLDS_PROBE;
  if (profile === "prod") return KPI_THRESHOLDS_PROD;
  return null;
}

export type SoftPTargets = {
  minScoreAt60P50: number;
  minEarlyClearRate: number;
  scoreGrowthMin: number;
  scoreGrowthMax: number;
  minMidToLateGrowth: number;
  minLateBurstRate: number;
  minNearDeathRecoverRate: number;
};

export const SOFT_P_PROBE: SoftPTargets = {
  minScoreAt60P50: 8,
  minEarlyClearRate: 0.5,
  scoreGrowthMin: 1.5,
  scoreGrowthMax: 6,
  minMidToLateGrowth: 0.2,
  minLateBurstRate: 0.12,
  minNearDeathRecoverRate: 0.08,
};

export const SOFT_P_PROD: SoftPTargets = {
  minScoreAt60P50: 15,
  minEarlyClearRate: 0.7,
  scoreGrowthMin: 1.8,
  scoreGrowthMax: 4.5,
  minMidToLateGrowth: 0.35,
  minLateBurstRate: 0.25,
  minNearDeathRecoverRate: 0.15,
};

export function softPTargetsForProfile(profile: KpiProfile): SoftPTargets {
  return profile === "prod" ? SOFT_P_PROD : SOFT_P_PROBE;
}

export type ExperienceMetricsSlice = Pick<
  RolloutDistributionMetrics,
  | "timeUpRate"
  | "stuckRate"
  | "openingMoveCount"
  | "scoreQuantiles"
  | "scoreSpread"
  | "mediumBurstRate"
  | "jackpotRate"
  | "lateGameReachRate"
  | "nearDeathRecoverRate"
  | "lateBurstRate"
  | "earlyClearRate"
  | "scoreAt60P50"
  | "scoreAt150P50"
  | "scoreAt240P50"
  | "layoutOutcome"
  | "scoreHistogram"
  | "rolloutCount"
>;

export type GateEvalItem = {
  id: string;
  ok: boolean;
  value: number;
  threshold: number;
  rejectReason?: SeedPoolRejectReason;
  detail: string;
};

export type GateEvalResult = {
  hardRejects: GateEvalItem[];
  warnings: GateEvalItem[];
};

function item(
  id: string,
  ok: boolean,
  value: number,
  threshold: number,
  detail: string,
  rejectReason?: SeedPoolRejectReason
): GateEvalItem {
  return { id, ok, value, threshold, detail, rejectReason };
}

export type ExperienceGateOverrides = {
  /**
   * CLI `--max-stuck-rate`：undefined=用 profile 默认；
   * 0=关闭 G2（含 prod）；>0=G2 用此上限。
   */
  maxStuckRate?: number;
};

/** Probe：仅极端 opening / dead 硬拒；其余不达标进 warnings。Prod：G1–G9 硬拒。 */
export function evaluateExperienceGates(
  metrics: ExperienceMetricsSlice,
  profile: KpiProfile,
  overrides?: ExperienceGateOverrides
): GateEvalResult {
  const t = thresholdsForProfile(profile);
  if (!t || profile === "off") {
    return { hardRejects: [], warnings: [] };
  }

  const hardRejects: GateEvalItem[] = [];
  const warnings: GateEvalItem[] = [];
  const push = (g: GateEvalItem, hard: boolean) => {
    if (g.ok) return;
    if (hard) hardRejects.push(g);
    else warnings.push(g);
  };

  const openingHardLow = metrics.openingMoveCount < t.hardMinOpeningMoves;
  const openingHardHigh = metrics.openingMoveCount > t.hardMaxOpeningMoves;
  push(
    item(
      "G3hard",
      !openingHardLow,
      metrics.openingMoveCount,
      t.hardMinOpeningMoves,
      `openingMoveCount=${metrics.openingMoveCount} hardMin=${t.hardMinOpeningMoves}`,
      "no_opening_moves"
    ),
    true
  );
  push(
    item(
      "G3hardMax",
      !openingHardHigh,
      metrics.openingMoveCount,
      t.hardMaxOpeningMoves,
      `openingMoveCount=${metrics.openingMoveCount} hardMax=${t.hardMaxOpeningMoves}`,
      "opening_too_easy"
    ),
    true
  );

  if (metrics.layoutOutcome === "likely_dead") {
    hardRejects.push(
      item("dead", false, metrics.scoreQuantiles.p25, 0, "layoutOutcome=likely_dead", "dead_layout")
    );
  }

  const prodHard = profile === "prod";

  push(
    item(
      "G1",
      metrics.timeUpRate >= t.minTimeUpRate,
      metrics.timeUpRate,
      t.minTimeUpRate,
      `timeUpRate=${metrics.timeUpRate} min=${t.minTimeUpRate}`,
      "time_up_rate_too_low"
    ),
    prodHard
  );
  const stuckCap =
    overrides?.maxStuckRate !== undefined ? overrides.maxStuckRate : t.maxStuckRate;
  if (stuckCap > 0) {
    push(
      item(
        "G2",
        metrics.stuckRate <= stuckCap,
        metrics.stuckRate,
        stuckCap,
        `stuckRate=${metrics.stuckRate} max=${stuckCap}`,
        "stuck_rate_too_high"
      ),
      prodHard
    );
  }
  push(
    item(
      "G3min",
      metrics.openingMoveCount >= t.minOpeningMoves,
      metrics.openingMoveCount,
      t.minOpeningMoves,
      `openingMoveCount=${metrics.openingMoveCount} min=${t.minOpeningMoves}`,
      "no_opening_moves"
    ),
    prodHard
  );
  push(
    item(
      "G3max",
      metrics.openingMoveCount <= t.maxOpeningMoves,
      metrics.openingMoveCount,
      t.maxOpeningMoves,
      `openingMoveCount=${metrics.openingMoveCount} max=${t.maxOpeningMoves}`,
      "opening_too_easy"
    ),
    prodHard
  );
  push(
    item(
      "G4",
      metrics.scoreQuantiles.p25 >= t.minScoreP25,
      metrics.scoreQuantiles.p25,
      t.minScoreP25,
      `scoreP25=${metrics.scoreQuantiles.p25} min=${t.minScoreP25}`,
      "low_player_ceiling"
    ),
    prodHard
  );
  push(
    item(
      "G5",
      metrics.scoreSpread >= t.minScoreSpread,
      metrics.scoreSpread,
      t.minScoreSpread,
      `scoreSpread=${metrics.scoreSpread} min=${t.minScoreSpread}`,
      "low_player_ceiling"
    ),
    prodHard
  );
  push(
    item(
      "G7",
      metrics.mediumBurstRate >= t.minMediumBurstRate,
      metrics.mediumBurstRate,
      t.minMediumBurstRate,
      `mediumBurstRate=${metrics.mediumBurstRate} min=${t.minMediumBurstRate}`,
      "medium_burst_rate_too_low"
    ),
    prodHard
  );
  push(
    item(
      "G8",
      metrics.jackpotRate >= t.minJackpotRate,
      metrics.jackpotRate,
      t.minJackpotRate,
      `jackpotRate=${metrics.jackpotRate} min=${t.minJackpotRate}`,
      "jackpot_rate_too_low"
    ),
    prodHard
  );
  push(
    item(
      "G9",
      metrics.lateGameReachRate >= t.minLateGameReachRate,
      metrics.lateGameReachRate,
      t.minLateGameReachRate,
      `lateGameReachRate=${metrics.lateGameReachRate} min=${t.minLateGameReachRate}`,
      "late_game_reach_rate_too_low"
    ),
    prodHard
  );

  return { hardRejects, warnings };
}

export function countSoftPPasses(
  metrics: ExperienceMetricsSlice,
  profile: KpiProfile
): number {
  const p = softPTargetsForProfile(profile);
  let n = 0;
  if (metrics.scoreAt60P50 >= p.minScoreAt60P50) n += 1;
  if (metrics.earlyClearRate >= p.minEarlyClearRate) n += 1;
  const growth =
    metrics.scoreAt60P50 > 0 ? metrics.scoreAt150P50 / metrics.scoreAt60P50 : 0;
  if (growth >= p.scoreGrowthMin && growth <= p.scoreGrowthMax) n += 1;
  const mid = metrics.scoreAt150P50;
  const lateGain = metrics.scoreAt240P50 - mid;
  if (mid <= 0 ? lateGain >= 0 : lateGain >= mid * p.minMidToLateGrowth) n += 1;
  if (metrics.lateBurstRate >= p.minLateBurstRate) n += 1;
  if (metrics.nearDeathRecoverRate >= p.minNearDeathRecoverRate) n += 1;
  return n;
}

function clamp01(x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return x;
}

/** 将大致落在 [0, ref] 的值归一到 [0,1] */
function normBy(value: number, ref: number): number {
  if (ref <= 0) return 0;
  return clamp01(value / ref);
}

/**
 * 体验分：存活 + 爆发 + 晚段到达 + 分差 + soft P + 救场。
 * dead/collapsed 大罚在调用方用 layoutOutcome / 直方图处理。
 */
export function computeExperienceScore(
  metrics: ExperienceMetricsSlice & { softPPassCount?: number },
  profile: KpiProfile = "prod"
): number {
  if (metrics.layoutOutcome === "likely_dead") return -1000;

  const soft =
    metrics.softPPassCount ?? countSoftPPasses(metrics, profile === "off" ? "probe" : profile);

  return (
    0.25 * clamp01(metrics.timeUpRate) +
    0.2 * clamp01(metrics.mediumBurstRate) +
    0.15 * clamp01(metrics.jackpotRate / 0.2) +
    0.15 * clamp01(metrics.lateGameReachRate) +
    0.1 * normBy(metrics.scoreSpread, 200) +
    0.1 * (soft / 6) +
    0.05 * clamp01(metrics.nearDeathRecoverRate / 0.3)
  );
}

export type PoolHealthReport = {
  profile: KpiProfile;
  seedCount: number;
  meanTimeUpRate: number;
  meanJackpotRate: number;
  meanMediumBurstRate: number;
  meanLateGameReachRate: number;
  meanExperienceScore: number;
  gatePassRate: number;
  softPMean: number;
};

export function summarizePoolHealth(
  entries: Array<{ metrics: RolloutDistributionMetrics }>,
  profile: KpiProfile
): PoolHealthReport {
  const n = entries.length || 1;
  let timeUp = 0;
  let jackpot = 0;
  let medium = 0;
  let late = 0;
  let exp = 0;
  let gateOk = 0;
  let soft = 0;
  for (const e of entries) {
    const m = e.metrics;
    timeUp += m.timeUpRate;
    jackpot += m.jackpotRate;
    medium += m.mediumBurstRate;
    late += m.lateGameReachRate;
    exp += m.experienceScore;
    soft += m.softPPassCount;
    const { hardRejects } = evaluateExperienceGates(m, profile === "off" ? "prod" : profile);
    if (hardRejects.length === 0) gateOk += 1;
  }
  return {
    profile,
    seedCount: entries.length,
    meanTimeUpRate: timeUp / n,
    meanJackpotRate: jackpot / n,
    meanMediumBurstRate: medium / n,
    meanLateGameReachRate: late / n,
    meanExperienceScore: exp / n,
    gatePassRate: gateOk / n,
    softPMean: soft / n,
  };
}
