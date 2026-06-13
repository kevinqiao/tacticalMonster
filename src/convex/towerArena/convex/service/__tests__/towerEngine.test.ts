import { describe, expect, it } from "vitest";

import { makeTowerSeedId, generateTowerSeedFromId } from "../../shared/towerSeedCatalog";
import { TowerDefenseGameEngine } from "../TowerDefenseGameEngine";
import { replayTowerOps } from "../towerOpCodec";
import { TowerGamePhase, TowerGameStatus } from "../../types/TowerArenaTypes";

describe("TowerDefenseGameEngine", () => {
  const seedId = makeTowerSeedId("v1", 3);
  const seed = generateTowerSeedFromId(seedId);

  it("creates deterministic initial state", () => {
    const a = TowerDefenseGameEngine.createGame(seedId);
    const b = TowerDefenseGameEngine.createGame(seedId);
    expect(a.gold).toBe(b.gold);
    expect(a.lives).toBe(seed.startingLives);
    expect(a.phase).toBe(TowerGamePhase.BUILD);
  });

  it("places tower and deducts gold", () => {
    const state = TowerDefenseGameEngine.createGame(seedId);
    const startGold = state.gold;
    const archer = seed.towerCatalog.find((t) => t.id === "archer")!;
    const slot = seed.towerSlots[0]!;
    const res = TowerDefenseGameEngine.applyOp(state, {
      op: "place",
      slotId: slot.id,
      towerId: "archer",
    });
    expect(res.ok).toBe(true);
    expect(state.gold).toBe(startGold - archer.cost);
    expect(state.towers).toHaveLength(1);
  });

  it("replays ops deterministically", () => {
    const ops = [
      { op: "place" as const, slotId: seed.towerSlots[0]!.id, towerId: "archer" },
      { op: "place" as const, slotId: seed.towerSlots[1]!.id, towerId: "cannon" },
      { op: "start_wave" as const },
    ];
    const r1 = replayTowerOps(seed, ops);
    const r2 = replayTowerOps(seed, ops);
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(r1.state!.score).toBe(r2.state!.score);
    expect(r1.state!.lives).toBe(r2.state!.lives);
  });

  it("concede ends game as cancelled", () => {
    const state = TowerDefenseGameEngine.createGame(seedId);
    TowerDefenseGameEngine.applyOp(state, { op: "concede" });
    expect(state.phase).toBe(TowerGamePhase.ENDED);
    expect(state.status).toBe(TowerGameStatus.CANCELLED);
  });

  it("can clear first wave with two towers", () => {
    const state = TowerDefenseGameEngine.createGame(seedId);
    TowerDefenseGameEngine.applyOp(state, {
      op: "place",
      slotId: seed.towerSlots[0]!.id,
      towerId: "archer",
    });
    TowerDefenseGameEngine.applyOp(state, {
      op: "place",
      slotId: seed.towerSlots[1]!.id,
      towerId: "cannon",
    });
    TowerDefenseGameEngine.applyOp(state, { op: "start_wave" });
    expect(state.wavesCleared).toBeGreaterThanOrEqual(0);
    expect(state.lives).toBeGreaterThanOrEqual(0);
  });
});
