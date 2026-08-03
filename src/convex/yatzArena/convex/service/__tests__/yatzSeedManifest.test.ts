import { describe, expect, it } from "vitest";

import { rollDice, toggleHold } from "../YatzGameEngine";
import { createInitialGameState } from "../YatzGameEngine";
import {
  applyRerollPool,
  expandYatzSeedManifest,
} from "../yatzSeedManifest";
import { YATZ_ROUND_COUNT, YatzGameStatus } from "../../types/YatzTypes";

describe("yatz seed manifest", () => {
  it("expands 13 rounds with 5 dice each layer", () => {
    const m = expandYatzSeedManifest("pool-v2_yatz_00001");
    expect(m.rounds).toHaveLength(YATZ_ROUND_COUNT);
    for (const round of m.rounds) {
      for (const face of round.roll1) expect(face).toBeGreaterThanOrEqual(1);
      for (const face of round.roll1) expect(face).toBeLessThanOrEqual(6);
      expect(round.reroll2Pool).toHaveLength(5);
      expect(round.reroll3Pool).toHaveLength(5);
    }
  });

  it("is stable for the same seedId", () => {
    const a = expandYatzSeedManifest("seed-stable");
    const b = expandYatzSeedManifest("seed-stable");
    expect(a.rounds[0]!.roll1).toEqual(b.rounds[0]!.roll1);
    expect(a.rounds[12]!.reroll3Pool).toEqual(b.rounds[12]!.reroll3Pool);
  });

  it("applyRerollPool fills unheld slots left-to-right", () => {
    const next = applyRerollPool(
      [6, 6, 6, 6, 2],
      [true, true, true, true, false],
      [1, 3, 5, 2, 4]
    );
    expect(next).toEqual([6, 6, 6, 6, 1]);
  });

  it("same seed same first roll for different gameIds", () => {
    const g1 = createInitialGameState("seed-a", "game-1") as ReturnType<
      typeof createInitialGameState
    > & { status: YatzGameStatus };
    const g2 = createInitialGameState("seed-a", "game-2") as ReturnType<
      typeof createInitialGameState
    > & { status: YatzGameStatus };
    const r1 = rollDice({ ...g1, status: YatzGameStatus.PLAYING });
    const r2 = rollDice({ ...g2, status: YatzGameStatus.PLAYING });
    expect(r1.ok && r2.ok).toBe(true);
    if (!r1.ok || !r2.ok) return;
    expect(r2.state.dice).toEqual(r1.state.dice);
  });

  it("different hold choices yield deterministic different dice", () => {
    const manifest = expandYatzSeedManifest("hold-test");
    const roll1 = manifest.rounds[0]!.roll1;

    const heldA = [true, true, true, true, false];
    const heldB = [false, false, false, true, true];
    const afterA = applyRerollPool(roll1, heldA, manifest.rounds[0]!.reroll2Pool);
    const afterB = applyRerollPool(roll1, heldB, manifest.rounds[0]!.reroll2Pool);
    expect(afterA).not.toEqual(afterB);

    const againA = applyRerollPool(roll1, heldA, manifest.rounds[0]!.reroll2Pool);
    expect(againA).toEqual(afterA);
  });

  it("toggle hold then reroll matches manifest pool", () => {
    let state = createInitialGameState("hold-reroll", "g") as ReturnType<
      typeof createInitialGameState
    > & { status: YatzGameStatus };
    state = { ...state, status: YatzGameStatus.PLAYING };
    const m = expandYatzSeedManifest("hold-reroll");

    const r1 = rollDice(state);
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    state = r1.state;

    const held = toggleHold(state, 4);
    expect(held.ok).toBe(true);
    if (!held.ok) return;
    state = held.state;

    const r2 = rollDice(state);
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    const expected = applyRerollPool(
      m.rounds[0]!.roll1,
      state.held,
      m.rounds[0]!.reroll2Pool
    );
    expect(r2.state.dice).toEqual(expected);
  });
});
