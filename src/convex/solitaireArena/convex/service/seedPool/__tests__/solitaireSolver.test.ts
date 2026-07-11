import { describe, expect, it } from "vitest";

import {
  GameInteractionPhase,
  SoloGameStatus,
  ZoneType,
  type SoloGameState,
} from "../../../types/SoloTypes";
import { createZones } from "../../SoloGameEngine";
import { SoloRuleManager } from "../../SoloRuleManager";
import { buildDealtState, cloneSimState } from "../solitaireOpCodec";
import {
  enumerateLegalOps,
  resolveSeedSolvability,
  solveSolitaireSeed,
  solveSolitaireState,
} from "../solitaireSolver";

function emptyDeckState(): SoloGameState {
  const suits = ["hearts", "diamonds", "clubs", "spades"] as const;
  const ranks = [
    "A",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "J",
    "Q",
    "K",
  ] as const;
  const cards = [];
  let id = 0;
  for (const suit of suits) {
    const isRed = suit === "hearts" || suit === "diamonds";
    for (let i = 0; i < ranks.length; i++) {
      const rank = ranks[i]!;
      cards.push({
        id: `c${id++}`,
        suit,
        rank,
        value: i + 1,
        isRed,
        isRevealed: true,
        zone: ZoneType.FOUNDATION,
        zoneId: `foundation-${suit}`,
        zoneIndex: i,
      });
    }
  }
  return {
    gameId: "test-won",
    cards,
    zones: createZones(),
    status: SoloGameStatus.PLAYING,
    score: 0,
    moves: 0,
  };
}

/** 三色已满；红心 A–Q 在 foundation，K 在 waste → 一着通关 */
function oneMoveWinState(): SoloGameState {
  const state = emptyDeckState();
  for (const c of state.cards) {
    if (c.suit !== "hearts") continue;
    if (c.rank === "K") {
      c.zone = ZoneType.WASTE;
      c.zoneId = "waste";
      c.zoneIndex = 0;
      c.isRevealed = true;
    } else {
      c.zone = ZoneType.FOUNDATION;
      c.zoneId = "foundation-hearts";
      c.zoneIndex = c.value - 1; // A=0 .. Q=11
      c.isRevealed = true;
    }
  }
  expect(
    state.cards.filter((c) => c.zoneId === "foundation-hearts").length
  ).toBe(12);
  expect(state.cards.find((c) => c.suit === "hearts" && c.rank === "K")?.zone).toBe(
    ZoneType.WASTE
  );
  expect(new SoloRuleManager(state, GameInteractionPhase.idle).isGameWon()).toBe(false);
  return state;
}

describe("solitaireSolver", () => {
  it("enumerateLegalOps includes draw/moves on a dealt seed", () => {
    const state = buildDealtState("solitaire-pool:v6:0");
    const ops = enumerateLegalOps(state);
    expect(ops.length).toBeGreaterThan(0);
    const kinds = new Set(ops.map((o) => o.op));
    expect(kinds.has("draw") || ops.some((o) => o.op === "move")).toBe(true);
  });

  it("already-won state is solvable with empty path", () => {
    const won = emptyDeckState();
    expect(new SoloRuleManager(won, GameInteractionPhase.idle).isGameWon()).toBe(true);
    const r = solveSolitaireState(won, { maxNodes: 10 });
    expect(r.status).toBe("solvable");
    expect(r.path).toEqual([]);
  });

  it("finds a one-move win from waste K to foundation", () => {
    const state = oneMoveWinState();
    const ops = enumerateLegalOps(state);
    expect(
      ops.some(
        (o) =>
          o.op === "move" &&
          o.rank === "K" &&
          o.suit === "hearts" &&
          o.to === "foundation-hearts"
      )
    ).toBe(true);
    const r = solveSolitaireState(state, { maxNodes: 100, algorithm: "bfs" });
    expect(r.status).toBe("solvable");
    expect(r.pathLength).toBe(1);
    expect(r.path?.[0]).toMatchObject({
      op: "move",
      suit: "hearts",
      rank: "K",
      to: "foundation-hearts",
    });
  });

  it("restricted exhaust is unknown, not unsolvable", () => {
    const r = solveSolitaireSeed("solitaire-pool:v6:0", {
      maxNodes: 50,
      timeoutMs: 2_000,
      algorithm: "greedy",
      preferFoundation: true,
      allowFoundationToTableau: false,
    });
    expect(["solvable", "unknown"]).toContain(r.status);
    if (r.status === "unknown" && r.reason === "exhausted_restricted") {
      expect(r.nodesExpanded).toBeGreaterThan(0);
    }
  });

  it("complete search may report unsolvable when tiny budget exhausts open", () => {
    // 极小预算下更常 unknown；完备模式下穷尽才是 unsolvable
    const r = solveSolitaireSeed("solitaire-pool:v6:0", {
      maxNodes: 5,
      timeoutMs: 2_000,
      algorithm: "dfs",
      preferFoundation: false,
      allowFoundationToTableau: true,
    });
    expect(["solvable", "unsolvable", "unknown"]).toContain(r.status);
  });

  it("solveSolitaireSeed returns a structured result within bounds", () => {
    const r = solveSolitaireSeed("solitaire-pool:v6:0", {
      maxNodes: 2_000,
      timeoutMs: 5_000,
      algorithm: "dfs",
    });
    expect(["solvable", "unsolvable", "unknown"]).toContain(r.status);
    expect(r.nodesExpanded).toBeGreaterThan(0);
    expect(r.elapsedMs).toBeGreaterThanOrEqual(0);
    if (r.status === "unknown") {
      expect(["max_nodes", "timeout"]).toContain(r.reason);
    }
  });

  it("resolveSeedSolvability short-circuits on completed rollout", () => {
    const r = resolveSeedSolvability({
      seedId: "solitaire-pool:v6:0",
      hasAnyCompleted: true,
      solveOpts: { maxNodes: 1, timeoutMs: 1 },
    });
    expect(r.solvable).toBe("solvable");
    expect(r.solvableSource).toBe("empirical_completed");
    expect(r.nodesExpanded).toBe(0);
  });

  it("resolveSeedSolvability runs search when no completion", () => {
    const r = resolveSeedSolvability({
      seedId: "solitaire-pool:v6:0",
      hasAnyCompleted: false,
      rolloutSummaries: [{ completed: false }],
      solveOpts: { maxNodes: 500, timeoutMs: 3_000, algorithm: "greedy" },
    });
    expect(["solvable", "unsolvable", "unknown"]).toContain(r.solvable);
    expect(r.solvableSource).toBe("search");
  });
});
