import { describe, expect, it } from "vitest";

import { pickCategory, rollDice, simulateGreedyGame } from "../YatzGameEngine";
import { createInitialGameState } from "../YatzGameEngine";
import { scoreCategory } from "../yatzScoring";
import { YATZ_MANIFEST_POLICY_VERSION } from "../yatzSeedManifest";
import { YatzGameStatus } from "../../types/YatzTypes";
import {
  applyRecordedOp,
  buildInitialState,
  replayRecordedSteps,
} from "../seedPool/yatzOpCodec";
import type { YatzRecordedStep } from "../seedPool/yatzRecordedOpTypes";
import { simulateRollout } from "../seedPool/yatzSeedSimulator";

describe("yatz engine", () => {
  it("initial state uses manifest policy, not rngIndex", () => {
    const state = createInitialGameState("seed-a", "g1");
    expect(state.manifestPolicyVersion).toBe(YATZ_MANIFEST_POLICY_VERSION);
    expect("rngIndex" in state).toBe(false);
  });  it("scores yahtzee category", () => {
    expect(scoreCategory([6, 6, 6, 6, 6], "yahtzee")).toBe(50);
    expect(scoreCategory([1, 2, 3, 4, 5], "large_straight")).toBe(40);
  });

  it("completes greedy simulation", () => {
    const sim = simulateGreedyGame("test-seed-001");
    expect(sim.completed).toBe(true);
    expect(sim.finalScore).toBeGreaterThan(0);
  });

  it("deterministic rolls from seed", () => {
    const a = createInitialGameState("seed-a", "g1") as ReturnType<typeof createInitialGameState> & { status: YatzGameStatus };
    let s = { ...a, status: YatzGameStatus.PLAYING };
    const r1 = rollDice(s);
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    s = r1.state;
    const r2 = rollDice(createInitialGameState("seed-a", "g2") as any);
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    expect(r2.state.dice).toEqual(s.dice);
  });

  it("requires roll before category", () => {
    const state = createInitialGameState("seed-b", "g3") as any;
    const picked = pickCategory(state, "ones");
    expect(picked.ok).toBe(false);
  });

  it("recordedOps accumulate when appended after state merge", () => {
    let game = createInitialGameState("v1_yatz_00001", "g1") as ReturnType<
      typeof createInitialGameState
    > & { status: YatzGameStatus; recordedOps: YatzRecordedStep[] };
    game.status = YatzGameStatus.PLAYING;

    const rolled = rollDice(game);
    expect(rolled.ok).toBe(true);
    if (!rolled.ok) return;
    Object.assign(game, rolled.state);
    game.recordedOps = [...(game.recordedOps ?? []), { op: "roll" }];
    expect(game.recordedOps).toHaveLength(1);

    const picked = pickCategory(game, "ones");
    expect(picked.ok).toBe(true);
    if (!picked.ok) return;
    Object.assign(game, picked.state);
    game.recordedOps = [
      ...(game.recordedOps ?? []),
      { op: "pick_category", category: "ones" },
    ];
    expect(game.recordedOps).toHaveLength(2);
  });
});

describe("yatz replay codec", () => {
  it("replays recorded steps deterministically", () => {
    const rollout = simulateRollout("v1_yatz_00001", 0);
    expect(rollout.ops.length).toBeGreaterThan(0);
    const replay = replayRecordedSteps("v1_yatz_00001:rollout:0", rollout.ops);
    expect(replay.ok).toBe(true);
    if (!replay.ok) return;
    expect(replay.state.score).toBe(rollout.finalScore);
    expect(replay.state.status).toBe(YatzGameStatus.COMPLETED);

    let state = buildInitialState("v1_yatz_00001:rollout:0");
    for (const step of rollout.ops as YatzRecordedStep[]) {
      const applied = applyRecordedOp(state, step);
      expect(applied.ok).toBe(true);
      if (!applied.ok) return;
      state = applied.state;
    }
    expect(state.score).toBe(rollout.finalScore);
  });

  it("rollout matches greedy simulation score", () => {
    const greedy = simulateGreedyGame("v1_yatz_00002:rollout:1");
    const rollout = simulateRollout("v1_yatz_00002", 1);
    expect(rollout.completed).toBe(greedy.completed);
    expect(rollout.finalScore).toBe(greedy.finalScore);
  });

  it("rollout pacing feels human-length (≈3–5 min)", () => {
    const rollout = simulateRollout("v1_yatz_00001", 0);
    const totalMs = rollout.replayPacingMs?.reduce((a, b) => a + b, 0) ?? 0;
    expect(totalMs).toBeGreaterThan(120_000);
    expect(totalMs).toBeLessThan(360_000);
    expect(rollout.replayPacingMs?.every((ms) => ms >= 600)).toBe(true);
  });
});
