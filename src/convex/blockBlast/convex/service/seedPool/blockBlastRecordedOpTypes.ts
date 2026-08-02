/**
 * Block Blast seed pool 类型：与 solitaireArena solitaireRecordedOpTypes 对齐。
 * 一个 recorded op 即一次落子（按当前手牌槽位 slot + 行列），形状由 seed + shapeCounter 确定性复现。
 */

/** 体验 KPI 档位：off=仅显式阈值；probe=体检警告；prod=硬拒 G 门 */
export type KpiProfile = "off" | "probe" | "prod";

/** 稳定可复现的落子 op —— 不含 shapeId（shapeId 由 seed 确定性生成） */
export type BlockBlastRecordedOp =
  | { op: "place"; slot: number; row: number; col: number }
  | { op: "concede" };

/** 持久化步骤：op + 可选 UI 间隔（真人录制用） */
export type BlockBlastRecordedStep =
  | { op: "place"; slot: number; row: number; col: number; pacingMs?: number }
  | { op: "concede"; pacingMs?: number };

export function toBlockBlastRecordedOp(step: BlockBlastRecordedStep): BlockBlastRecordedOp {
  if (step.op === "concede") return { op: "concede" };
  return { op: "place", slot: step.slot, row: step.row, col: step.col };
}

export type RolloutTerminalReason = "completed" | "stuck" | "time_up" | "exited";

/** v4：分段格数权重 + 手内弱约束（每手避免三块全 >3 格） */
export const BLOCK_BLAST_POLICY_VERSION = "block-blast-stochastic-v4" as const;

/** 单局仿真体验事件（summary 级） */
export type RolloutExperienceStats = {
  scoreAt60: number;
  scoreAt150: number;
  scoreAt240: number;
  mediumBurstCount: number;
  jackpotCount: number;
  maxStepClearedCells: number;
  firstMediumBurstAtSec: number | null;
  lastBurstAtSec: number | null;
  lateMediumBurstCount: number;
  reached180: boolean;
  reached240: boolean;
  nearDeathRecoverCount: number;
  earlyClear: boolean;
};

export type BlockBlastRolloutScript = {
  rolloutIndex: number;
  policyVersion: typeof BLOCK_BLAST_POLICY_VERSION;
  ops: BlockBlastRecordedOp[];
  /** 每个 op 的 UI 间隔（ms），与 ops 等长；旧 rollout 可省略。 */
  replayPacingMs?: number[];
  finalScore: number;
  moves: number;
  completed: boolean;
  terminalReason: RolloutTerminalReason;
  elapsedSimSeconds: number;
  experience?: RolloutExperienceStats;
};

export type SeedLayoutOutcome = "winnable" | "likely_dead" | "mixed";

export type ScoreQuantiles = {
  p10: number;
  p25: number;
  p30: number;
  p33: number;
  p50: number;
  p66: number;
  p70: number;
  p75: number;
  p90: number;
};

/** 本 seed rollout 分数上的 P30/P70 切点：底部 30% / 中部 40% / 顶部 30% */
export type BandThresholds = {
  lowMax: number;
  midMax: number;
};

export type ScoreHistogram = Record<string, number>;

export type RolloutDistributionMetrics = {
  rolloutCount: number;
  scoreMin: number;
  scoreP50: number;
  scoreP90: number;
  scoreMax: number;
  scoreQuantiles: ScoreQuantiles;
  scoreHistogram: ScoreHistogram;
  bandThresholds: BandThresholds;
  completedRate: number;
  stuckRate: number;
  exitedRate: number;
  timeUpRate: number;
  completedCount: number;
  hasAnyCompleted: boolean;
  layoutOutcome: SeedLayoutOutcome;
  openingMoveCount: number;
  scoreSpread: number;
  playerEaseScore: number;
  layoutFingerprint: string;
  policyVersion: typeof BLOCK_BLAST_POLICY_VERSION;
  matchTimeLimitSec: number;
  /** ≥1 次 medium burst (C>B) 的 rollout 比例 */
  mediumBurstRate: number;
  /** ≥1 次 jackpot (C>B+8) 的 rollout 比例 */
  jackpotRate: number;
  /** 存活到 180s 的 rollout 比例 */
  lateGameReachRate: number;
  /** ≥1 次濒死救场的 rollout 比例 */
  nearDeathRecoverRate: number;
  /** 180s 后出现 medium burst 的 rollout 比例 */
  lateBurstRate: number;
  /** 60s 内至少 1 次消行的比例 */
  earlyClearRate: number;
  scoreAt60P50: number;
  scoreAt150P50: number;
  scoreAt240P50: number;
  softPPassCount: number;
  experienceScore: number;
};

export type RolloutSummary = Pick<
  BlockBlastRolloutScript,
  "rolloutIndex" | "finalScore" | "moves" | "completed" | "terminalReason" | "elapsedSimSeconds"
> & {
  opCount: number;
  experience?: RolloutExperienceStats;
};

export type BlockBlastSeedTier = "easy" | "medium" | "hard";

export type SeedTierReportEntry = {
  seedId: string;
  layoutTier: BlockBlastSeedTier;
  difficultyScore: number;
  scoreDistribution: {
    min: number;
    max: number;
    quantiles: ScoreQuantiles;
    histogram: ScoreHistogram;
    bandThresholds: BandThresholds;
  };
  completedRate: number;
  stuckRate: number;
  exitedRate: number;
  timeUpRate: number;
  layoutOutcome: SeedLayoutOutcome;
  openingMoveCount: number;
  scoreSpread: number;
  playerEaseScore: number;
  experienceScore: number;
  mediumBurstRate: number;
  jackpotRate: number;
  lateGameReachRate: number;
  rolloutCount: number;
};

export type TierIndex = {
  poolVersion: string;
  rolloutCount: number;
  matchTimeLimitSec: number;
  generatedAt: string;
  tiers: Record<BlockBlastSeedTier, SeedTierReportEntry[]>;
};

export type SeedPoolEntry = {
  seedId: string;
  poolVersion: string;
  tier: BlockBlastSeedTier;
  difficultyScore: number;
  metrics: RolloutDistributionMetrics;
  /** index-only 池省略；可用 `simulateRolloutsForSeedEntry(seedId, …)` 重生成。 */
  rolloutSummaries?: RolloutSummary[];
};

export type SeedPoolRejectReason =
  | "duplicate_layout"
  | "dead_layout"
  | "verify_failed"
  | "no_opening_moves"
  | "opening_too_easy"
  | "low_player_ceiling"
  | "collapsed_scores"
  | "stuck_rate_too_high"
  | "time_up_rate_too_low"
  | "medium_burst_rate_too_low"
  | "jackpot_rate_too_low"
  | "late_game_reach_rate_too_low";

export type SeedPoolRejectedEntry = {
  seedId: string;
  reason: SeedPoolRejectReason;
  detail?: string;
  metrics?: Partial<RolloutDistributionMetrics>;
};

export type PlayerFriendlyOptions = {
  minOpeningMoves: number;
  /** 拒绝 openingMoveCount 高于此值的 seed（起手过松） */
  maxOpeningMoves: number;
  minScoreP25: number;
  minScoreSpread: number;
  rejectCollapsed: boolean;
  quickScreenRollouts: number;
  /** 0=关闭；拒绝 metrics.stuckRate 高于此值的 seed（≈要求 timeUpRate ≥ 1−max） */
  maxStuckRate: number;
  /** off=仅用上方显式阈值；probe/prod=叠加体验 Gate */
  kpiProfile: KpiProfile;
};

export type SeedPoolTierQuotas = {
  easy: number;
  medium: number;
};
