import { YATZ_CATEGORIES, YATZ_ROUND_COUNT, YatzGameStatus } from "../../types/YatzTypes";
import { scoreCategory } from "../yatzScoring";
import { YATZ_MANIFEST_POLICY_VERSION } from "../yatzSeedManifest";
import { applyRecordedOp, buildInitialState } from "./yatzOpCodec";
import type { YatzRecordedStep, YatzRolloutScript } from "./yatzRecordedOpTypes";
import {
  buildReplayPacingMs,
} from "./yatzSimTime";

export function rolloutReplaySeed(seedId: string, rolloutIndex: number): string {
  return `${seedId}:rollout:${rolloutIndex}`;
}

/** Greedy bot rollout — same policy as `simulateGreedyGame`, with recorded ops for watch replay. */
export function simulateRollout(seedId: string, rolloutIndex: number): YatzRolloutScript {
  const simSeed = rolloutReplaySeed(seedId, rolloutIndex);
  let state = buildInitialState(simSeed);
  const ops: YatzRecordedStep[] = [];

  const push = (step: YatzRecordedStep) => {
    ops.push(step);
  };

  while (state.status === YatzGameStatus.PLAYING && state.roundIndex < YATZ_ROUND_COUNT) {
    for (let i = 0; i < 3; i++) {
      const rolled = applyRecordedOp(state, { op: "roll" });
      if (!rolled.ok) break;
      state = rolled.state;
      push({ op: "roll" });
    }

    const available = YATZ_CATEGORIES.filter((c) => state.categoryScores[c] == null);
    if (available.length === 0) break;

    let bestCat = available[0]!;
    let bestScore = -1;
    for (const cat of available) {
      const s = scoreCategory(state.dice, cat);
      if (s > bestScore) {
        bestScore = s;
        bestCat = cat;
      }
    }

    const picked = applyRecordedOp(state, { op: "pick_category", category: bestCat });
    if (!picked.ok) break;
    state = picked.state;
    push({ op: "pick_category", category: bestCat });
  }

  const replayPacingMs = buildReplayPacingMs(ops, seedId, rolloutIndex);

  return {
    rolloutIndex,
    policyVersion: YATZ_MANIFEST_POLICY_VERSION,
    ops,
    replayPacingMs,
    finalScore: state.score,
    completed: state.status === YatzGameStatus.COMPLETED,
  };
}
