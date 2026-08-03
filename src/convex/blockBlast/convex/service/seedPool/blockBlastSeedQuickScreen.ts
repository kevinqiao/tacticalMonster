import { buildInitialState, openingMoveCount } from "./blockBlastOpCodec";
import {
  isCollapsedDistribution,
  layoutFingerprint,
  percentile,
} from "./blockBlastSeedDifficulty";
import { evaluateExperienceGates } from "./blockBlastExperienceKpi";
import type {
  KpiProfile,
  PlayerFriendlyOptions,
  RolloutDistributionMetrics,
  SeedPoolRejectReason,
  SeedPoolRejectedEntry,
} from "./blockBlastRecordedOpTypes";
import { simulateRollout } from "./blockBlastSeedSimulator";

export const DEFAULT_QUICK_SCREEN_ROLLOUTS = 1;

export function isPlayerFriendlyEnabled(opts: PlayerFriendlyOptions): boolean {
  return (
    opts.minOpeningMoves > 0 ||
    opts.maxOpeningMoves > 0 ||
    opts.minScoreP25 > 0 ||
    opts.minScoreSpread > 0 ||
    opts.rejectCollapsed ||
    opts.maxStuckRate > 0 ||
    opts.kpiProfile === "probe" ||
    opts.kpiProfile === "prod"
  );
}

export type QuickScreenFail = {
  ok: false;
  entry: SeedPoolRejectedEntry;
};

export type QuickScreenPass = {
  ok: true;
  openingMoveCount: number;
  scoreP25: number;
  scoreSpread: number;
  layoutFingerprint: string;
};

export type QuickScreenResult = QuickScreenPass | QuickScreenFail;

function rejectQuick(
  seedId: string,
  reason: SeedPoolRejectReason,
  detail: string,
  openingMoveCount: number,
  layoutFingerprint: string
): QuickScreenFail {
  return {
    ok: false,
    entry: {
      seedId,
      reason,
      detail,
      metrics: { openingMoveCount, layoutFingerprint },
    },
  };
}

export function quickScreenSeed(
  seedId: string,
  opts: PlayerFriendlyOptions,
  matchSeconds: number,
  thinkTimeScale?: number
): QuickScreenResult {
  const initial = buildInitialState(seedId);
  const fp = layoutFingerprint(seedId);
  const opens = openingMoveCount(initial);

  if (opts.minOpeningMoves > 0 && opens < opts.minOpeningMoves) {
    return rejectQuick(
      seedId,
      "no_opening_moves",
      `openingMoveCount=${opens} min=${opts.minOpeningMoves}`,
      opens,
      fp
    );
  }

  if (opts.maxOpeningMoves > 0 && opens > opts.maxOpeningMoves) {
    return rejectQuick(
      seedId,
      "opening_too_easy",
      `openingMoveCount=${opens} max=${opts.maxOpeningMoves}`,
      opens,
      fp
    );
  }

  // Probe/prod：极端 opening 硬拒（空盘合法点常在 100–170）
  if (opts.kpiProfile === "probe" || opts.kpiProfile === "prod") {
    if (opens < 80) {
      return rejectQuick(
        seedId,
        "no_opening_moves",
        `openingMoveCount=${opens} hardMin=80`,
        opens,
        fp
      );
    }
    if (opens > 200) {
      return rejectQuick(
        seedId,
        "opening_too_easy",
        `openingMoveCount=${opens} hardMax=200`,
        opens,
        fp
      );
    }
  }

  const k = opts.quickScreenRollouts;
  if (k <= 0) {
    return { ok: true, openingMoveCount: opens, scoreP25: 0, scoreSpread: 0, layoutFingerprint: fp };
  }

  const scores: number[] = [];
  for (let rolloutIndex = 0; rolloutIndex < k; rolloutIndex++) {
    scores.push(simulateRollout(seedId, rolloutIndex, { matchSeconds, thinkTimeScale }).finalScore);
  }
  const sorted = [...scores].sort((a, b) => a - b);
  const scoreP25 = percentile(sorted, 0.25);
  const scoreSpread = (sorted[sorted.length - 1] ?? 0) - (sorted[0] ?? 0);

  if (opts.minScoreP25 > 0 && scoreP25 < opts.minScoreP25) {
    return rejectQuick(
      seedId,
      "low_player_ceiling",
      `quickScoreP25=${scoreP25} min=${opts.minScoreP25}`,
      opens,
      fp
    );
  }

  if (k >= 2 && opts.minScoreSpread > 0 && scoreSpread < opts.minScoreSpread) {
    return rejectQuick(
      seedId,
      "low_player_ceiling",
      `quickScoreSpread=${scoreSpread} min=${opts.minScoreSpread}`,
      opens,
      fp
    );
  }

  if (k >= 2 && opts.rejectCollapsed && scoreSpread === 0) {
    return rejectQuick(
      seedId,
      "collapsed_scores",
      `quickScoreSpread=0 rollouts=${k}`,
      opens,
      fp
    );
  }

  return { ok: true, openingMoveCount: opens, scoreP25, scoreSpread, layoutFingerprint: fp };
}

export function rejectPlayerFriendlyMetrics(
  seedId: string,
  metrics: RolloutDistributionMetrics,
  opts: PlayerFriendlyOptions
): SeedPoolRejectedEntry | null {
  if (opts.minOpeningMoves > 0 && metrics.openingMoveCount < opts.minOpeningMoves) {
    return {
      seedId,
      reason: "no_opening_moves",
      detail: `openingMoveCount=${metrics.openingMoveCount} min=${opts.minOpeningMoves}`,
      metrics,
    };
  }
  if (opts.maxOpeningMoves > 0 && metrics.openingMoveCount > opts.maxOpeningMoves) {
    return {
      seedId,
      reason: "opening_too_easy",
      detail: `openingMoveCount=${metrics.openingMoveCount} max=${opts.maxOpeningMoves}`,
      metrics,
    };
  }
  if (opts.minScoreP25 > 0 && metrics.scoreQuantiles.p25 < opts.minScoreP25) {
    return {
      seedId,
      reason: "low_player_ceiling",
      detail: `scoreP25=${metrics.scoreQuantiles.p25} min=${opts.minScoreP25}`,
      metrics,
    };
  }
  if (
    metrics.rolloutCount >= 2 &&
    opts.minScoreSpread > 0 &&
    metrics.scoreSpread < opts.minScoreSpread
  ) {
    return {
      seedId,
      reason: "low_player_ceiling",
      detail: `scoreSpread=${metrics.scoreSpread} min=${opts.minScoreSpread}`,
      metrics,
    };
  }
  if (
    metrics.rolloutCount >= 2 &&
    opts.rejectCollapsed &&
    isCollapsedDistribution(metrics.scoreHistogram, metrics.rolloutCount)
  ) {
    return {
      seedId,
      reason: "collapsed_scores",
      detail: `maxHistogramBucket>${metrics.rolloutCount * 0.85}`,
      metrics,
    };
  }
  if (opts.maxStuckRate > 0 && metrics.stuckRate > opts.maxStuckRate) {
    return {
      seedId,
      reason: "stuck_rate_too_high",
      detail: `stuckRate=${metrics.stuckRate} max=${opts.maxStuckRate}`,
      metrics,
    };
  }

  const profile: KpiProfile = opts.kpiProfile ?? "off";
  if (profile === "probe" || profile === "prod") {
    const { hardRejects } = evaluateExperienceGates(metrics, profile);
    if (hardRejects.length > 0) {
      const first = hardRejects[0]!;
      return {
        seedId,
        reason: first.rejectReason ?? "low_player_ceiling",
        detail: first.detail,
        metrics,
      };
    }
  }

  return null;
}
