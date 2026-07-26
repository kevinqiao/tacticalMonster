import {
  assignTiers,
  computeDistributionMetrics,
  isDeadLayout,
  type TierCandidate,
} from "./solitaireSeedDifficulty";
import { verifyAllRollouts } from "./solitaireSeedPoolReplayVerify";
import {
  DEFAULT_QUICK_SCREEN_ROLLOUTS,
  isPlayerFriendlyEnabled,
  quickScreenSeed,
  rejectPlayerFriendlyMetrics,
} from "./solitaireSeedQuickScreen";
import type {
  PlayerFriendlyOptions,
  RolloutSummary,
  SeedPoolEntry,
  SeedPoolRejectedEntry,
  SeedPoolTierQuotas,
  SolitaireRolloutScript,
} from "./solitaireRecordedOpTypes";
import { DEFAULT_MATCH_TIME_LIMIT_SEC } from "./solitaireSimTime";
import { buildDealtState, openingMoveCount } from "./solitaireOpCodec";
import { layoutFingerprint } from "./solitaireSeedDifficulty";
import { simulateSeedRollouts } from "./solitaireSeedSimulator";
import {
  resolveSeedSolvability,
  type SolitaireSolveOptions,
} from "./solitaireSolver";

/** Generate-time solvability defaults (tighter than offline annotate). */
export const DEFAULT_GENERATE_SOLVE_OPTS: SolitaireSolveOptions = {
  algorithm: "greedy",
  maxNodes: 50_000,
  timeoutMs: 15_000,
  allowFoundationToTableau: false,
  preferFoundation: true,
};

export type GeneratePoolOptions = {
  poolVersion: string;
  start: number;
  count: number;
  rejectDead: boolean;
  tierQuotas: SeedPoolTierQuotas;
  rolloutCount: number;
  matchSeconds: number;
  playerFriendly: PlayerFriendlyOptions;
  /** When true, include rolloutSummaries in index (no ops). */
  writeRolloutSummaries: boolean;
  /** When true, also write rollouts/*.json with full ops (implies summaries). */
  writeRolloutFiles: boolean;
  /** When false, skip solvability search (faster). Default true. */
  checkSolvability?: boolean;
  /**
   * When true, only accept seeds with status `solvable` (forces solvability check).
   * `unknown` / `unsolvable` are rejected as `not_solvable`.
   */
  requireSolvable?: boolean;
  solveOpts?: SolitaireSolveOptions;
};

export const DEFAULT_PLAYER_FRIENDLY_OPTIONS: PlayerFriendlyOptions = {
  minOpeningMoves: 0,
  minScoreP25: 0,
  minScoreSpread: 0,
  rejectCollapsed: false,
  quickScreenRollouts: DEFAULT_QUICK_SCREEN_ROLLOUTS,
};

export type GeneratePoolResult = {
  entries: SeedPoolEntry[];
  rejected: SeedPoolRejectedEntry[];
};

export type ProcessOneSeedResult =
  | {
      kind: "accepted";
      candidate: TierCandidate;
      rollouts: SolitaireRolloutScript[];
    }
  | { kind: "rejected"; entry: SeedPoolRejectedEntry };

export function toRolloutSummaries(rollouts: SolitaireRolloutScript[]): RolloutSummary[] {
  return rollouts.map((r) => ({
    rolloutIndex: r.rolloutIndex,
    finalScore: r.finalScore,
    moves: r.moves,
    completed: r.completed,
    terminalReason: r.terminalReason,
    elapsedSimSeconds: r.elapsedSimSeconds,
    opCount: r.ops.length,
  }));
}

export function makeSeedId(poolVersion: string, index: number): string {
  return `solitaire-pool:${poolVersion}:${index}`;
}

export function processOneSeed(
  seedIndex: number,
  options: Pick<
    GeneratePoolOptions,
    | "poolVersion"
    | "rejectDead"
    | "rolloutCount"
    | "matchSeconds"
    | "playerFriendly"
    | "writeRolloutSummaries"
    | "writeRolloutFiles"
    | "checkSolvability"
    | "requireSolvable"
    | "solveOpts"
  >,
  seenFingerprints: Set<string>
): ProcessOneSeedResult {
  const {
    poolVersion,
    rejectDead,
    rolloutCount,
    matchSeconds,
    playerFriendly,
    writeRolloutSummaries,
    writeRolloutFiles,
    requireSolvable = false,
    solveOpts,
  } = options;
  const checkSolvability = requireSolvable || options.checkSolvability !== false;
  const persistRolloutDetail = writeRolloutSummaries || writeRolloutFiles;
  const seedId = makeSeedId(poolVersion, seedIndex);

  if (isPlayerFriendlyEnabled(playerFriendly)) {
    const quick = quickScreenSeed(seedId, playerFriendly, matchSeconds);
    if (!quick.ok) {
      return { kind: "rejected", entry: quick.entry };
    }
    if (seenFingerprints.has(quick.layoutFingerprint)) {
      return {
        kind: "rejected",
        entry: {
          seedId,
          reason: "duplicate_layout",
          detail: quick.layoutFingerprint,
          metrics: { openingMoveCount: quick.openingMoveCount, layoutFingerprint: quick.layoutFingerprint },
        },
      };
    }
  }

  const { rollouts, allRollouts, metrics } = simulateSeedRollouts(seedId, rolloutCount, {
    matchSeconds,
    keepDuplicateRollouts: persistRolloutDetail,
  });

  if (seenFingerprints.has(metrics.layoutFingerprint)) {
    return {
      kind: "rejected",
      entry: {
        seedId,
        reason: "duplicate_layout",
        detail: metrics.layoutFingerprint,
        metrics,
      },
    };
  }
  seenFingerprints.add(metrics.layoutFingerprint);

  const verify = verifyAllRollouts(seedId, allRollouts, matchSeconds);
  if (!verify.ok) {
    return {
      kind: "rejected",
      entry: {
        seedId,
        reason: "verify_failed",
        detail: verify.reason,
        metrics,
      },
    };
  }

  if (rejectDead && isDeadLayout(metrics)) {
    return {
      kind: "rejected",
      entry: {
        seedId,
        reason: "dead_layout",
        detail: `scoreMax=${metrics.scoreMax}`,
        metrics,
      },
    };
  }

  if (isPlayerFriendlyEnabled(playerFriendly)) {
    const pfReject = rejectPlayerFriendlyMetrics(seedId, metrics, playerFriendly);
    if (pfReject) {
      return { kind: "rejected", entry: pfReject };
    }
  }

  const rolloutSummaries = persistRolloutDetail ? toRolloutSummaries(allRollouts) : [];
  const solvability = checkSolvability
    ? resolveSeedSolvability({
        seedId,
        hasAnyCompleted: metrics.hasAnyCompleted,
        rolloutSummaries: persistRolloutDetail
          ? rolloutSummaries
          : allRollouts.map((r) => ({ completed: r.completed })),
        solveOpts: { ...DEFAULT_GENERATE_SOLVE_OPTS, ...solveOpts },
      })
    : null;

  if (requireSolvable && solvability?.solvable !== "solvable") {
    return {
      kind: "rejected",
      entry: {
        seedId,
        reason: "not_solvable",
        detail:
          solvability == null
            ? "solvability_unchecked"
            : `${solvability.solvable}${
                solvability.solvableReason ? `:${solvability.solvableReason}` : ""
              }`,
        metrics,
      },
    };
  }

  return {
    kind: "accepted",
    candidate: {
      seedId,
      poolVersion,
      difficultyScore: metrics.scoreP50,
      metrics,
      rolloutSummaries,
      ...(solvability
        ? {
            solvable: solvability.solvable,
            solvableSource: solvability.solvableSource,
            solvableReason: solvability.solvableReason,
          }
        : {}),
    },
    rollouts: writeRolloutFiles ? rollouts : [],
  };
}

/** Processes seeds one at a time; index-only mode skips persisting rollout scripts. */
export function generateSeedPool(options: GeneratePoolOptions): GeneratePoolResult {
  const { tierQuotas, start, count, requireSolvable = false, ...oneSeedOpts } = options;
  const rejected: SeedPoolRejectedEntry[] = [];
  const candidates: TierCandidate[] = [];
  const seenFingerprints = new Set<string>();
  const oneOpts = { ...oneSeedOpts, requireSolvable };

  if (requireSolvable) {
    // Keep scanning indices until `count` solvable seeds are accepted.
    const maxScan = Math.max(count * 20, count);
    for (let i = start; i < start + maxScan && candidates.length < count; i++) {
      const result = processOneSeed(i, oneOpts, seenFingerprints);
      if (result.kind === "rejected") {
        rejected.push(result.entry);
        continue;
      }
      candidates.push(result.candidate);
    }
  } else {
    for (let i = start; i < start + count; i++) {
      const result = processOneSeed(i, oneOpts, seenFingerprints);
      if (result.kind === "rejected") {
        rejected.push(result.entry);
        continue;
      }
      candidates.push(result.candidate);
    }
  }

  const entries = assignTiers(candidates, tierQuotas);

  return { entries, rejected };
}

export const DEFAULT_ROLLOUT_COUNT = 200;
export const DEFAULT_POOL_MATCH_SECONDS = DEFAULT_MATCH_TIME_LIMIT_SEC;

export function candidateFromRollouts(
  seedId: string,
  poolVersion: string,
  rollouts: SolitaireRolloutScript[],
  layout: { openingMoveCount: number; layoutFingerprint: string; matchTimeLimitSec: number },
  solvabilityOpts?: {
    checkSolvability?: boolean;
    solveOpts?: SolitaireSolveOptions;
  }
): TierCandidate {
  const metrics = computeDistributionMetrics(rollouts, layout);
  const summaries = toRolloutSummaries(rollouts);
  const check = solvabilityOpts?.checkSolvability !== false;
  const solvability = check
    ? resolveSeedSolvability({
        seedId,
        hasAnyCompleted: metrics.hasAnyCompleted,
        rolloutSummaries: summaries,
        solveOpts: { ...DEFAULT_GENERATE_SOLVE_OPTS, ...solvabilityOpts?.solveOpts },
      })
    : null;
  return {
    seedId,
    poolVersion,
    difficultyScore: metrics.scoreP50,
    metrics,
    rolloutSummaries: summaries,
    ...(solvability
      ? {
          solvable: solvability.solvable,
          solvableSource: solvability.solvableSource,
          solvableReason: solvability.solvableReason,
        }
      : {}),
  };
}

export function layoutContextForSeed(seedId: string, matchTimeLimitSec: number) {
  const initial = buildDealtState(seedId);
  return {
    openingMoveCount: openingMoveCount(initial),
    layoutFingerprint: layoutFingerprint(initial.cards),
    matchTimeLimitSec,
  };
}
