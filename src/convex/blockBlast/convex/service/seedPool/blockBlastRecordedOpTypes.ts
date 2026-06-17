/**
 * Block Blast seed pool 类型：与 solitaireArena solitaireRecordedOpTypes 对齐。
 * 一个 recorded op 即一次落子（按当前手牌槽位 slot + 行列），形状由 seed + shapeCounter 确定性复现。
 */

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

export const BLOCK_BLAST_POLICY_VERSION = "block-blast-stochastic-v3" as const;

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
};

export type RolloutSummary = Pick<
  BlockBlastRolloutScript,
  "rolloutIndex" | "finalScore" | "moves" | "completed" | "terminalReason" | "elapsedSimSeconds"
> & { opCount: number };

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
  | "stuck_rate_too_high";

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
};

export type SeedPoolTierQuotas = {
  easy: number;
  medium: number;
};
