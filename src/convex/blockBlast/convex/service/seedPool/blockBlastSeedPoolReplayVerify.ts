import type { BlockBlastRolloutScript } from "./blockBlastRecordedOpTypes";
import {
  DEFAULT_MATCH_TIME_LIMIT_SEC,
  replayOpsWithTimeLimit,
} from "./blockBlastSimTime";

export type ReplayVerifyResult =
  | { ok: true }
  | { ok: false; rolloutIndex: number; reason: string };

export function verifyRollout(
  seedId: string,
  rollout: BlockBlastRolloutScript,
  matchSeconds: number = DEFAULT_MATCH_TIME_LIMIT_SEC,
  thinkTimeScale?: number
): ReplayVerifyResult {
  try {
    const replayed = replayOpsWithTimeLimit(
      seedId,
      rollout.ops,
      matchSeconds,
      rollout.rolloutIndex,
      thinkTimeScale
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
  rollouts: BlockBlastRolloutScript[],
  matchSeconds: number = DEFAULT_MATCH_TIME_LIMIT_SEC,
  thinkTimeScale?: number
): ReplayVerifyResult {
  for (const rollout of rollouts) {
    const res = verifyRollout(seedId, rollout, matchSeconds, thinkTimeScale);
    if (!res.ok) return res;
  }
  return { ok: true };
}
