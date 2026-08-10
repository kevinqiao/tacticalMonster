import { describe, expect, it } from "vitest";

import { BlockBlastGameEngine } from "../BlockBlastGameEngine";
import { BlockBlastGameStatus } from "../../types/BlockBlastTypes";

describe("BlockBlastGameEngine target win", () => {
  it("does not WON when score reaches targetScore — play continues until stuck", () => {
    const game = BlockBlastGameEngine.createInitialGame("bb-target-win", "seed-target-win-1");
    const shape = game.shapes[0];
    expect(shape).toBeTruthy();

    let placed: ReturnType<typeof BlockBlastGameEngine.applyPlaceShape> | undefined;
    for (let row = 0; row < 8 && !placed?.ok; row++) {
      for (let col = 0; col < 8 && !placed?.ok; col++) {
        const tryPlace = BlockBlastGameEngine.applyPlaceShape(
          { ...game, targetScore: 0 },
          shape!.id,
          row,
          col
        );
        if (tryPlace.ok) placed = tryPlace;
      }
    }
    expect(placed?.ok).toBe(true);
    if (!placed?.ok) return;
    expect(placed.data.status).not.toBe(BlockBlastGameStatus.WON);
    expect(placed.data.score).toBeGreaterThanOrEqual(0);
  });

  it("does not WON when below target and still playable", () => {
    const game = BlockBlastGameEngine.createInitialGame("bb-target-play", "seed-target-play-1");
    const shape = game.shapes[0];
    expect(shape).toBeTruthy();
    let placed: ReturnType<typeof BlockBlastGameEngine.applyPlaceShape> | undefined;
    for (let row = 0; row < 8 && !placed?.ok; row++) {
      for (let col = 0; col < 8 && !placed?.ok; col++) {
        const tryPlace = BlockBlastGameEngine.applyPlaceShape(
          { ...game, targetScore: 1_000_000 },
          shape!.id,
          row,
          col
        );
        if (tryPlace.ok) placed = tryPlace;
      }
    }
    expect(placed?.ok).toBe(true);
    if (!placed?.ok) return;
    expect(placed.data.status).not.toBe(BlockBlastGameStatus.WON);
  });
});
