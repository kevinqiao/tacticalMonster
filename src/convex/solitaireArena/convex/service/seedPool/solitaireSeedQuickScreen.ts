import { buildDealtState, openingMoveCount } from "./solitaireOpCodec";
import {
  isCollapsedDistribution,
  layoutFingerprint,
  percentile,
} from "./solitaireSeedDifficulty";
import type {
  PlayerFriendlyOptions,
  SeedPoolRejectReason,
  SeedPoolRejectedEntry,
} from "./solitaireRecordedOpTypes";
import { simulateRollout } from "./solitaireSeedSimulator";

export const DEFAULT_QUICK_SCREEN_ROLLOUTS = 1;

export function isPlayerFriendlyEnabled(opts: PlayerFriendlyOptions): boolean {
  return (
    opts.minOpeningMoves > 0 ||
    opts.minScoreP25 > 0 ||
    opts.minScoreSpread > 0 ||
    opts.rejectCollapsed
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
  matchSeconds: number
): QuickScreenResult {
  const initial = buildDealtState(seedId);
  const fp = layoutFingerprint(initial.cards);
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

  const k = opts.quickScreenRollouts;
  if (k <= 0) {
    return { ok: true, openingMoveCount: opens, scoreP25: 0, scoreSpread: 0, layoutFingerprint: fp };
  }

  const scores: number[] = [];
  for (let rolloutIndex = 0; rolloutIndex < k; rolloutIndex++) {
    scores.push(simulateRollout(seedId, rolloutIndex, { matchSeconds }).finalScore);
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
  metrics: {
    scoreQuantiles: { p25: number };
    scoreSpread: number;
    scoreHistogram: Record<string, number>;
    rolloutCount: number;
    openingMoveCount: number;
  },
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
  return null;
}
