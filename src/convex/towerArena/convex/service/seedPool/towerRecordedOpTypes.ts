import type { TowerRecordedOp } from "../types/TowerArenaTypes";

export type RolloutTerminalReason = "completed" | "stuck" | "time_up" | "exited";

export const TOWER_STOCHASTIC_POLICY_VERSION = "tower-stochastic-v1" as const;

export type TowerRolloutScript = {
  rolloutIndex: number;
  policyVersion: typeof TOWER_STOCHASTIC_POLICY_VERSION;
  ops: TowerRecordedOp[];
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
  policyVersion: typeof TOWER_STOCHASTIC_POLICY_VERSION;
  matchTimeLimitSec: number;
};

export type RolloutSummary = {
  rolloutIndex: number;
  finalScore: number;
  moves: number;
  completed: boolean;
  terminalReason: RolloutTerminalReason;
  elapsedSimSeconds: number;
  opCount: number;
};

export type TowerSeedTier = "easy" | "medium" | "hard";

export type SeedPoolEntry = {
  seedId: string;
  poolVersion: string;
  tier: TowerSeedTier;
  difficultyScore: number;
  metrics: RolloutDistributionMetrics;
  rolloutSummaries?: RolloutSummary[];
};

export type SeedPoolRejectReason =
  | "duplicate_layout"
  | "unwinnable"
  | "trivial"
  | "verify_failed"
  | "duplicate_map";

export type SeedPoolRejectedEntry = {
  seedId: string;
  reason: SeedPoolRejectReason;
  detail?: string;
  metrics?: Partial<RolloutDistributionMetrics>;
};

export type PlayerFriendlyOptions = {
  minScoreP25: number;
  minScoreSpread: number;
  rejectCollapsed: boolean;
  quickScreenRollouts: number;
};

export type SeedPoolTierQuotas = {
  easy: number;
  medium: number;
};

export type TierIndex = {
  poolVersion: string;
  rolloutCount: number;
  matchTimeLimitSec: number;
  generatedAt: string;
  tiers: Record<TowerSeedTier, SeedPoolEntry[]>;
};
