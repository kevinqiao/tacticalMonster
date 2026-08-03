import {
  YATZ_CATEGORIES,
  YatzGameStatus,
  type YatzCategory,
  type YatzGameState,
} from "../../types/YatzTypes";
import {
  createInitialGameState,
  pickCategory,
  rollDice,
  toggleHold,
} from "../YatzGameEngine";
import type { YatzRecordedStep } from "./yatzRecordedOpTypes";

export function buildInitialState(seedId: string, gameId?: string): YatzGameState {
  return createInitialGameState(seedId, gameId ?? `yatz_replay_${seedId}`) as YatzGameState;
}

export function applyRecordedOp(
  state: YatzGameState,
  step: YatzRecordedStep
): { ok: true; state: YatzGameState } | { ok: false; reason: string } {
  if (step.op === "concede") {
    return {
      ok: true,
      state: { ...state, status: YatzGameStatus.CANCELLED },
    };
  }
  if (step.op === "roll") {
    const result = rollDice(state);
    if (!result.ok) return { ok: false, reason: result.error };
    return { ok: true, state: result.state };
  }
  if (step.op === "toggle_hold") {
    const result = toggleHold(state, step.index);
    if (!result.ok) return { ok: false, reason: result.error };
    return { ok: true, state: result.state };
  }
  if (step.op === "pick_category") {
    const result = pickCategory(state, step.category);
    if (!result.ok) return { ok: false, reason: result.error };
    return { ok: true, state: result.state };
  }
  return { ok: false, reason: "unknown_op" };
}

/** Replay a full step list; returns final state or first failure. */
export function replayRecordedSteps(
  seedId: string,
  steps: YatzRecordedStep[],
  gameId?: string
): { ok: true; state: YatzGameState } | { ok: false; reason: string; stepIndex: number } {
  let state = buildInitialState(seedId, gameId);
  for (let i = 0; i < steps.length; i++) {
    const applied = applyRecordedOp(state, steps[i]!);
    if (!applied.ok) return { ok: false, reason: applied.reason, stepIndex: i };
    state = applied.state;
  }
  return { ok: true, state };
}

export function isUpperCategory(category: YatzCategory): boolean {
  return (YATZ_CATEGORIES as readonly string[]).indexOf(category) < 6;
}
