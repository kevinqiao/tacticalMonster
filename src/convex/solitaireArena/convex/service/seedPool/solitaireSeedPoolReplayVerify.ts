import { applyOp, buildDealtState } from "./solitaireOpCodec";
import {
  pickNextOp,
  replayPolicyContext,
  shouldCashEarlyExit,
} from "./solitaireStochasticHumanPolicy";
import type { SolitaireRolloutScript } from "./solitaireRecordedOpTypes";
import {
  DEFAULT_MATCH_TIME_LIMIT_SEC,
  replayOpsWithTimeLimit,
} from "./solitaireSimTime";

export type ReplayVerifyResult =
  | { ok: true }
  | { ok: false; rolloutIndex: number; reason: string };

function nextOpAfterRecordedOps(seedId: string, rollout: SolitaireRolloutScript) {
  const state = buildDealtState(seedId);
  const ctx = replayPolicyContext(seedId, rollout.rolloutIndex, rollout.ops, state);
  return pickNextOp(state, ctx);
}

export function verifyRollout(
  seedId: string,
  rollout: SolitaireRolloutScript,
  matchSeconds: number = DEFAULT_MATCH_TIME_LIMIT_SEC
): ReplayVerifyResult {
  try {
    const nextOpAfterReplay = nextOpAfterRecordedOps(seedId, rollout);
    // Score/time verification uses seeded sim costs, not UI pacing ms (avoids rounding drift).
    const replayed = replayOpsWithTimeLimit(
      seedId,
      rollout.ops,
      matchSeconds,
      rollout.rolloutIndex,
      nextOpAfterReplay
    );

    if (replayed.finalScore !== rollout.finalScore) {
      return {
        ok: false,
        rolloutIndex: rollout.rolloutIndex,
        reason: `score mismatch: recorded=${rollout.finalScore} replay=${replayed.finalScore}`,
      };
    }
    if (replayed.moves !== rollout.moves) {
      return {
        ok: false,
        rolloutIndex: rollout.rolloutIndex,
        reason: `moves mismatch: recorded=${rollout.moves} replay=${replayed.moves}`,
      };
    }
    if (replayed.completed !== rollout.completed) {
      return {
        ok: false,
        rolloutIndex: rollout.rolloutIndex,
        reason: `completed mismatch: recorded=${rollout.completed} replay=${replayed.completed}`,
      };
    }
    if (replayed.terminalReason !== rollout.terminalReason) {
      return {
        ok: false,
        rolloutIndex: rollout.rolloutIndex,
        reason: `terminalReason mismatch: recorded=${rollout.terminalReason} replay=${replayed.terminalReason}`,
      };
    }
    if (replayed.elapsedSimSeconds !== rollout.elapsedSimSeconds) {
      return {
        ok: false,
        rolloutIndex: rollout.rolloutIndex,
        reason: `elapsedSimSeconds mismatch: recorded=${rollout.elapsedSimSeconds} replay=${replayed.elapsedSimSeconds}`,
      };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, rolloutIndex: rollout.rolloutIndex, reason: msg };
  }
}

export function verifyAllRollouts(
  seedId: string,
  rollouts: SolitaireRolloutScript[],
  matchSeconds: number = DEFAULT_MATCH_TIME_LIMIT_SEC
): ReplayVerifyResult {
  for (const rollout of rollouts) {
    const res = verifyRollout(seedId, rollout, matchSeconds);
    if (!res.ok) return res;
  }
  return { ok: true };
}
