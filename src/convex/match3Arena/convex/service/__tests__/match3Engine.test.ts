import { describe, expect, it } from "vitest";
import {
  buildBoardFromSeed,
  findValidMoves,
  hasInitialMatches,
  Match3GameEngine,
  resolveSwap,
} from "../Match3GameEngine";

describe("Match3GameEngine", () => {
  it("buildBoardFromSeed is deterministic", () => {
    const a = buildBoardFromSeed("match3-pool:v1:1");
    const b = buildBoardFromSeed("match3-pool:v1:1");
    expect(a).toEqual(b);
  });

  it("initial board has no matches and at least one valid move", () => {
    const grid = buildBoardFromSeed("match3-pool:v1:42");
    expect(hasInitialMatches(grid)).toBe(false);
    expect(findValidMoves(grid).length).toBeGreaterThan(0);
  });

  it("resolveSwap produces score and turn script", () => {
    const grid = buildBoardFromSeed("match3-pool:v1:99");
    const moves = findValidMoves(grid);
    expect(moves.length).toBeGreaterThan(0);
    const { r1, c1, r2, c2 } = moves[0];
    const result = resolveSwap(grid, r1, c1, r2, c2, "match3-pool:v1:99", 64);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.scoreDelta).toBeGreaterThan(0);
      expect(result.turnScript.length).toBeGreaterThan(0);
    }
  });

  it("createGame returns playable state", () => {
    const game = Match3GameEngine.createGame("match3-pool:v1:7", "test-game");
    expect(game.grid.length).toBe(8);
    expect(game.score).toBe(0);
    expect(game.status).toBe(0);
  });
});
