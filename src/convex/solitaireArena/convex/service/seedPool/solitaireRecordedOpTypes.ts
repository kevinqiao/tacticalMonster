import type { Card } from "../../types/SoloTypes";

export type SolitaireSuit = "hearts" | "diamonds" | "clubs" | "spades";
export type SolitaireRank =
  | "A"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K";

/** Stable replay op — no card UUIDs */
export type SolitaireRecordedOp =
  | { op: "draw" }
  | { op: "recycle" }
  | {
      op: "move";
      suit: SolitaireSuit;
      rank: SolitaireRank;
      from: string;
      to: string;
    }
  | { op: "concede" };

export type RolloutTerminalReason = "completed" | "stuck" | "time_up" | "exited";

export const HUMAN_STOCHASTIC_POLICY_VERSION = "human-stochastic-v6" as const;

export type SolitaireRolloutScript = {
  rolloutIndex: number;
  policyVersion: typeof HUMAN_STOCHASTIC_POLICY_VERSION;
  ops: SolitaireRecordedOp[];
  /** Per-op UI pacing (ms); same order as ops. Omitted in legacy rollouts. */
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

/** P30/P70 cut points on this seed's rollout scores: bottom 30% / middle 40% / top 30% */
export type BandThresholds = {
  /** max score in the lowest 30% of rollouts */
  lowMax: number;
  /** max score in the lowest 70% (bottom 30% + middle 40%) */
  midMax: number;
};

/** Fixed buckets for rollout finalScore histogram */
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
  policyVersion: typeof HUMAN_STOCHASTIC_POLICY_VERSION;
  matchTimeLimitSec: number;
};

export type RolloutSummary = Pick<
  SolitaireRolloutScript,
  | "rolloutIndex"
  | "finalScore"
  | "moves"
  | "completed"
  | "terminalReason"
  | "elapsedSimSeconds"
> & { opCount: number };

export type SolitaireSeedTier = "easy" | "medium" | "hard";

export type SeedTierReportEntry = {
  seedId: string;
  layoutTier: SolitaireSeedTier;
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
  tiers: Record<SolitaireSeedTier, SeedTierReportEntry[]>;
};

export type SeedPoolEntry = {
  seedId: string;
  poolVersion: string;
  tier: SolitaireSeedTier;
  difficultyScore: number;
  metrics: RolloutDistributionMetrics;
  /**
   * Omitted in index-only pools. Regenerate via `simulateRolloutsForSeedEntry(seedId, …)`.
   */
  rolloutSummaries?: RolloutSummary[];
};

export type SeedPoolRejectReason =
  | "duplicate_layout"
  | "dead_layout"
  | "verify_failed"
  | "no_opening_moves"
  | "low_player_ceiling"
  | "collapsed_scores";

export type SeedPoolRejectedEntry = {
  seedId: string;
  reason: SeedPoolRejectReason;
  detail?: string;
  metrics?: Partial<RolloutDistributionMetrics>;
};

export type PlayerFriendlyOptions = {
  minOpeningMoves: number;
  minScoreP25: number;
  minScoreSpread: number;
  rejectCollapsed: boolean;
  quickScreenRollouts: number;
};

export type SeedPoolTierQuotas = {
  easy: number;
  medium: number;
};

export type LayoutCardSnapshot = Pick<
  Card,
  "suit" | "rank" | "zoneId" | "zoneIndex" | "isRevealed"
>;
