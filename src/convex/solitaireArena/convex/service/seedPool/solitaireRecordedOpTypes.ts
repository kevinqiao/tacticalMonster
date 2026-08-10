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

/** Persisted step: op + optional wall-clock gap before this step (human replay). */
export type SolitaireRecordedStep =
  | { op: "draw"; pacingMs?: number }
  | { op: "recycle"; pacingMs?: number }
  | {
      op: "move";
      suit: SolitaireSuit;
      rank: SolitaireRank;
      from: string;
      to: string;
      pacingMs?: number;
    }
  | { op: "concede"; pacingMs?: number };

export function toSolitaireRecordedOp(step: SolitaireRecordedStep): SolitaireRecordedOp {
  if (step.op === "draw") return { op: "draw" };
  if (step.op === "recycle") return { op: "recycle" };
  if (step.op === "concede") return { op: "concede" };
  return {
    op: "move",
    suit: step.suit,
    rank: step.rank,
    from: step.from,
    to: step.to,
  };
}

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
  /** Peak cards on foundation during this rollout (0–52). */
  foundationCardsPeak: number;
  /**
   * Sim seconds until first move onto foundation.
   * null = never reached foundation this rollout.
   */
  timeToFirstFoundationSec: number | null;
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
  /**
   * Clear-board friendliness (higher = easier to clear).
   * Uses solvability path/nodes when available; 0 if not solvable / unchecked.
   */
  clearEaseScore: number;
  /**
   * Platform ritual axis for L3 segment A (unified onboardingScore).
   * Solitaire: foundation progress primary + downweighted clearEase.
   */
  onboardingScore: number;
  /**
   * Foundation progress (L2 Gate, analogous to BB survivalTime / earlyClear):
   * peak foundation-card count percentiles across rollouts.
   */
  foundationCardsP25: number;
  foundationCardsP50: number;
  foundationCardsP90: number;
  /**
   * Median sim-seconds to first foundation move.
   * Rollouts that never reach foundation contribute matchTimeLimitSec.
   */
  timeToFirstFoundationP50: number;
  /** Fraction of rollouts that placed ≥1 card on foundation. */
  foundationReachRate: number;
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
  clearEaseScore: number;
  onboardingScore: number;
  foundationCardsP25: number;
  foundationCardsP50: number;
  foundationCardsP90: number;
  timeToFirstFoundationP50: number;
  foundationReachRate: number;
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
  /** Layout solvability (seed-level; not per-rollout). */
  solvable?: SeedSolvableStatus;
  solvableSource?: SeedSolvableSource;
  solvableReason?: string | null;
};

export type SeedSolvableStatus = "solvable" | "unsolvable" | "unknown";
export type SeedSolvableSource = "empirical_completed" | "search";

export type SeedPoolRejectReason =
  | "duplicate_layout"
  | "dead_layout"
  | "verify_failed"
  | "no_opening_moves"
  | "low_player_ceiling"
  | "collapsed_scores"
  | "not_solvable"
  | "low_foundation_progress";

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
  /** 0 = off. Reject when foundationCardsP25 is below this. */
  minFoundationCardsP25: number;
  /** 0 = off. Reject when timeToFirstFoundationP50 exceeds this (sim seconds). */
  maxTimeToFirstFoundationP50: number;
};

export type SeedPoolTierQuotas = {
  easy: number;
  medium: number;
};

export type LayoutCardSnapshot = Pick<
  Card,
  "suit" | "rank" | "zoneId" | "zoneIndex" | "isRevealed"
>;
