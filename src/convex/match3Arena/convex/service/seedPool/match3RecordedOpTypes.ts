import type { Match3GameState } from "../../types/Match3Types";

export type Match3RecordedOp =
  | { op: "swap"; r1: number; c1: number; r2: number; c2: number }
  | { op: "concede" };

/** Persisted step: op + optional wall-clock gap before this step (human replay). */
export type Match3RecordedStep =
  | { op: "swap"; r1: number; c1: number; r2: number; c2: number; pacingMs?: number }
  | { op: "concede"; pacingMs?: number };

export function toMatch3RecordedOp(step: Match3RecordedStep): Match3RecordedOp {
  if (step.op === "concede") return { op: "concede" };
  return { op: "swap", r1: step.r1, c1: step.c1, r2: step.r2, c2: step.c2 };
}

export type RolloutTerminalReason = "completed" | "stuck" | "time_up" | "exited";

export const HUMAN_STOCHASTIC_POLICY_VERSION = "human-stochastic-v1" as const;

/** Stuck with moves at or below this counts as early death (opening 保活). */
export const MATCH3_EARLY_STUCK_MAX_MOVES = 5;

/** First N successful swaps contribute to onboarding / early cascade stats. */
export const MATCH3_EARLY_SWAP_WINDOW = 5;

export type Match3RolloutScript = {
  rolloutIndex: number;
  policyVersion: typeof HUMAN_STOCHASTIC_POLICY_VERSION;
  ops: Match3RecordedOp[];
  replayPacingMs?: number[];
  finalScore: number;
  moves: number;
  completed: boolean;
  terminalReason: RolloutTerminalReason;
  elapsedSimSeconds: number;
  /** True when terminal stuck and moves <= MATCH3_EARLY_STUCK_MAX_MOVES. */
  earlyStuck?: boolean;
  /** Max clear waves (combo length) on any single swap this rollout. */
  maxClearWaves?: number;
  /** Sum of clear waves over the first MATCH3_EARLY_SWAP_WINDOW swaps. */
  earlyClearWaveSum?: number;
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

export type Match3SeedTier = "easy" | "medium" | "hard";

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
  bandThresholds: BandThresholds;
  scoreHistogram: ScoreHistogram;
  completedRate: number;
  stuckRate: number;
  exitedRate: number;
  timeUpRate: number;
  completedCount: number;
  hasAnyCompleted: boolean;
  layoutOutcome: "winnable" | "likely_dead" | "mixed";
  openingMoveCount: number;
  scoreSpread: number;
  /** Opening / early-survival ease — not a p50 alias. */
  playerEaseScore: number;
  /** Ritual axis: early cascade / first-wave highlight (higher = friendlier ritual). */
  onboardingScore: number;
  /** Fraction of rollouts that stuck within MATCH3_EARLY_STUCK_MAX_MOVES. */
  earlyStuckRate: number;
  /** Mean earlyClearWaveSum across rollouts. */
  meanEarlyClearWaveSum: number;
  /** Fraction of rollouts with earlyClearWaveSum >= 2 (at least one cascade feel). */
  earlyCascadeHitRate: number;
  layoutFingerprint: string;
  policyVersion: typeof HUMAN_STOCHASTIC_POLICY_VERSION;
  matchTimeLimitSec: number;
};

export type SeedPoolEntry = {
  seedId: string;
  poolVersion: string;
  tier: Match3SeedTier;
  difficultyScore: number;
  metrics: RolloutDistributionMetrics;
  rolloutSummaries?: Array<{
    rolloutIndex: number;
    finalScore: number;
    moves: number;
    completed: boolean;
    terminalReason: RolloutTerminalReason;
    elapsedSimSeconds: number;
    opCount: number;
  }>;
};

export type Match3GameStateForReplay = Pick<
  Match3GameState,
  "grid" | "score" | "moves" | "status" | "seed" | "refillCounter"
>;

export function poolVersionFromPolicy(): string {
  const m = HUMAN_STOCHASTIC_POLICY_VERSION.match(/v(\d+)$/);
  return m ? `v${m[1]}` : "v1";
}

export function formatMatch3SeedId(poolVersion: string, index: number): string {
  return `match3-pool:${poolVersion}:${index}`;
}
