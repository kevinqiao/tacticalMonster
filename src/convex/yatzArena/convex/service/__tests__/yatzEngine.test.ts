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
import { assignYatzTiers } from "../seedPool/yatzSeedDifficulty";
import { computePlayerEaseScore } from "../seedPool/yatzSeedPoolRunner";
import { simulateRollout } from "../seedPool/yatzSeedSimulator";

describe("yatz engine", () => {
  it("initial state uses manifest policy, not rngIndex", () => {
    const state = createInitialGameState("seed-a", "g1");
    expect(state.manifestPolicyVersion).toBe(YATZ_MANIFEST_POLICY_VERSION);
    expect("rngIndex" in state).toBe(false);
  });

  it("scores yahtzee category", () => {
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
    const seedId = "v1_yatz_00001";
    const rollout = simulateRollout(seedId, 0);
    expect(rollout.ops.length).toBeGreaterThan(0);
    const replay = replayRecordedSteps(seedId, rollout.ops);
    expect(replay.ok).toBe(true);
    if (!replay.ok) return;
    expect(replay.state.score).toBe(rollout.finalScore);
    expect(replay.state.status).toBe(YatzGameStatus.COMPLETED);

    let state = buildInitialState(seedId);
    for (const step of rollout.ops as YatzRecordedStep[]) {
      const applied = applyRecordedOp(state, step);
      expect(applied.ok).toBe(true);
      if (!applied.ok) return;
      state = applied.state;
    }
    expect(state.score).toBe(rollout.finalScore);
  });

  it("rollout matches greedy simulation score", () => {
    const greedy = simulateGreedyGame("v1_yatz_00002", { rolloutIndex: 1 });
    const rollout = simulateRollout("v1_yatz_00002", 1);
    expect(rollout.completed).toBe(greedy.completed);
    expect(rollout.finalScore).toBe(greedy.finalScore);
    expect(greedy.decisionStyle).toBe("standard");
  });

  it("rollout records hold toggles (not roll-only)", () => {
    const rollout = simulateRollout("v1_yatz_00001", 0);
    const holds = rollout.ops.filter((op) => op.op === "toggle_hold");
    expect(holds.length).toBeGreaterThan(0);
  });

  it("rollout pacing feels human-length (≈3–8 min with holds)", () => {
    const rollout = simulateRollout("v1_yatz_00001", 0);
    const totalMs = rollout.replayPacingMs?.reduce((a, b) => a + b, 0) ?? 0;
    expect(totalMs).toBeGreaterThan(120_000);
    expect(totalMs).toBeLessThan(480_000);
    expect(rollout.replayPacingMs?.every((ms) => ms >= 600)).toBe(true);
  });
});

describe("yatz playerEaseScore", () => {
  it("rewards floor + completion and penalizes spread", () => {
    const friendly = computePlayerEaseScore({
      p25: 140,
      spread: 40,
      completedCount: 20,
      rolloutCount: 20,
    });
    const harsh = computePlayerEaseScore({
      p25: 90,
      spread: 160,
      completedCount: 12,
      rolloutCount: 20,
    });
    expect(friendly).toBe(Math.round(140 * 0.5 + 100 - 40 * 0.25));
    expect(friendly).toBeGreaterThan(harsh);
  });
});

describe("yatz L2 assignTiers", () => {
  it("assigns high p50 to easy (relative quotas)", () => {
    const baseMetrics = {
      rolloutCount: 10,
      scoreMin: 80,
      scoreP50: 100,
      scoreP90: 140,
      scoreMax: 160,
      scoreSpread: 80,
      scoreQuantiles: {
        p10: 80,
        p25: 90,
        p30: 95,
        p33: 96,
        p50: 100,
        p66: 120,
        p70: 125,
        p75: 130,
        p90: 140,
      },
      playerEaseScore: 100,
      policyVersion: "yatz-manifest-v1" as const,
      decisionPolicyVersion: "yatz-decision-v2" as const,
    };
    const candidates = Array.from({ length: 10 }, (_, i) => ({
      seedId: `s${i}`,
      poolVersion: "v2",
      difficultyScore: 200 - i * 10,
      metrics: { ...baseMetrics, scoreP50: 200 - i * 10 },
    }));
    const entries = assignYatzTiers(candidates);
    // high p50 first → easy; lowest → hard
    expect(entries.find((e) => e.seedId === "s0")?.tier).toBe("easy");
    expect(entries.find((e) => e.seedId === "s9")?.tier).toBe("hard");
    expect(entries.filter((e) => e.tier === "easy")).toHaveLength(3);
    expect(entries.filter((e) => e.tier === "medium")).toHaveLength(4);
  });
});

describe("yatz greedy hold policy", () => {
  it("holdMaskForTarget locks matching upper faces", async () => {
    const { holdMaskForTarget } = await import("../seedPool/yatzGreedyHoldPolicy");
    expect(holdMaskForTarget([6, 2, 6, 1, 6], "sixes")).toEqual([
      true,
      false,
      true,
      false,
      true,
    ]);
  });

  it("chooseGreedyTarget prefers scored made hands", async () => {
    const { chooseGreedyTarget } = await import("../seedPool/yatzGreedyHoldPolicy");
    const cat = chooseGreedyTarget([5, 5, 5, 5, 5], ["yahtzee", "sixes", "chance"]);
    expect(cat).toBe("yahtzee");
  });
});
