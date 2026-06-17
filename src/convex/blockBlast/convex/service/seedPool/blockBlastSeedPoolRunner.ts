import {
  assignTiers,
  computeDistributionMetrics,
  isDeadLayout,
  layoutFingerprint,
  type TierCandidate,
} from "./blockBlastSeedDifficulty";
import { buildInitialState, openingMoveCount } from "./blockBlastOpCodec";
import { verifyAllRollouts } from "./blockBlastSeedPoolReplayVerify";
import {
  DEFAULT_QUICK_SCREEN_ROLLOUTS,
  isPlayerFriendlyEnabled,
  quickScreenSeed,
  rejectPlayerFriendlyMetrics,
} from "./blockBlastSeedQuickScreen";
import type {
  BlockBlastRolloutScript,
  PlayerFriendlyOptions,
  RolloutSummary,
  SeedPoolEntry,
  SeedPoolRejectedEntry,
  SeedPoolTierQuotas,
} from "./blockBlastRecordedOpTypes";
import { DEFAULT_MATCH_TIME_LIMIT_SEC } from "./blockBlastSimTime";
import { simulateSeedRollouts } from "./blockBlastSeedSimulator";

export type GeneratePoolOptions = {
  poolVersion: string;
  start: number;
  count: number;
  rejectDead: boolean;
  tierQuotas: SeedPoolTierQuotas;
  rolloutCount: number;
  matchSeconds: number;
  thinkTimeScale?: number;
  playerFriendly: PlayerFriendlyOptions;
  /** index 中带 rolloutSummaries（无 ops）。 */
  writeRolloutSummaries: boolean;
  /** 额外写 rollouts/*.json 全 ops（隐含 summaries）。 */
  writeRolloutFiles: boolean;
};

export const DEFAULT_PLAYER_FRIENDLY_OPTIONS: PlayerFriendlyOptions = {
  minOpeningMoves: 0,
  maxOpeningMoves: 0,
  minScoreP25: 0,
  minScoreSpread: 0,
  rejectCollapsed: false,
  quickScreenRollouts: DEFAULT_QUICK_SCREEN_ROLLOUTS,
  maxStuckRate: 0,
};

export type GeneratePoolResult = {
  entries: SeedPoolEntry[];
  rejected: SeedPoolRejectedEntry[];
};

export type ProcessOneSeedResult =
  | {
      kind: "accepted";
      candidate: TierCandidate;
      rollouts: BlockBlastRolloutScript[];
    }
  | { kind: "rejected"; entry: SeedPoolRejectedEntry };

export function toRolloutSummaries(rollouts: BlockBlastRolloutScript[]): RolloutSummary[] {
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
  return `blockblast-pool:${poolVersion}:${index}`;
}

export function processOneSeed(
  seedIndex: number,
  options: Pick<
    GeneratePoolOptions,
    | "poolVersion"
    | "rejectDead"
    | "rolloutCount"
    | "matchSeconds"
    | "thinkTimeScale"
    | "playerFriendly"
    | "writeRolloutSummaries"
    | "writeRolloutFiles"
  >,
  seenFingerprints: Set<string>
): ProcessOneSeedResult {
  const {
    poolVersion,
    rejectDead,
    rolloutCount,
    matchSeconds,
    thinkTimeScale,
    playerFriendly,
    writeRolloutSummaries,
    writeRolloutFiles,
  } = options;
  const persistRolloutDetail = writeRolloutSummaries || writeRolloutFiles;
  const seedId = makeSeedId(poolVersion, seedIndex);

  if (isPlayerFriendlyEnabled(playerFriendly)) {
    const quick = quickScreenSeed(seedId, playerFriendly, matchSeconds, thinkTimeScale);
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
          metrics: {
            openingMoveCount: quick.openingMoveCount,
            layoutFingerprint: quick.layoutFingerprint,
          },
        },
      };
    }
  }

  const { rollouts, allRollouts, metrics } = simulateSeedRollouts(seedId, rolloutCount, {
    matchSeconds,
    thinkTimeScale,
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

  const verify = verifyAllRollouts(seedId, allRollouts, matchSeconds, thinkTimeScale);
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

  return {
    kind: "accepted",
    candidate: {
      seedId,
      poolVersion,
      difficultyScore: metrics.scoreP50,
      metrics,
      rolloutSummaries: persistRolloutDetail ? toRolloutSummaries(allRollouts) : [],
    },
    rollouts: writeRolloutFiles ? rollouts : [],
  };
}

/** 逐个种子处理；index-only 模式不持久化 rollout 脚本。 */
export function generateSeedPool(options: GeneratePoolOptions): GeneratePoolResult {
  const { tierQuotas, start, count, ...oneSeedOpts } = options;
  const rejected: SeedPoolRejectedEntry[] = [];
  const candidates: TierCandidate[] = [];
  const seenFingerprints = new Set<string>();

  for (let i = start; i < start + count; i++) {
    const result = processOneSeed(i, oneSeedOpts, seenFingerprints);
    if (result.kind === "rejected") {
      rejected.push(result.entry);
      continue;
    }
    candidates.push(result.candidate);
  }

  const entries = assignTiers(candidates, tierQuotas);

  return { entries, rejected };
}

export const DEFAULT_ROLLOUT_COUNT = 200;
export const DEFAULT_POOL_MATCH_SECONDS = DEFAULT_MATCH_TIME_LIMIT_SEC;

export function candidateFromRollouts(
  seedId: string,
  poolVersion: string,
  rollouts: BlockBlastRolloutScript[],
  layout: { openingMoveCount: number; layoutFingerprint: string; matchTimeLimitSec: number }
): TierCandidate {
  const metrics = computeDistributionMetrics(rollouts, layout);
  return {
    seedId,
    poolVersion,
    difficultyScore: metrics.scoreP50,
    metrics,
    rolloutSummaries: toRolloutSummaries(rollouts),
  };
}

export function layoutContextForSeed(seedId: string, matchTimeLimitSec: number) {
  const initial = buildInitialState(seedId);
  return {
    openingMoveCount: openingMoveCount(initial),
    layoutFingerprint: layoutFingerprint(seedId),
    matchTimeLimitSec,
  };
}
