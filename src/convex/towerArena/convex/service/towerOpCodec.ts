import type { TowerArenaSeed } from "../types/TowerArenaSeed";
import type { PlacedTower, TowerGameState, TowerRecordedOp } from "../types/TowerArenaTypes";
import { TowerGamePhase, TowerGameStatus } from "../types/TowerArenaTypes";
import { createInitialTowerState, finalizeIfDone, syncScore } from "./towerScoring";
import { runWaveOnState } from "./towerWaveSim";

function findTower(state: TowerGameState, slotId: string): PlacedTower | undefined {
  return state.towers.find((t) => t.slotId === slotId);
}

function towerDef(seed: TowerArenaSeed, towerId: string) {
  return seed.towerCatalog.find((t) => t.id === towerId);
}

function slotDef(seed: TowerArenaSeed, slotId: string) {
  return seed.towerSlots.find((s) => s.id === slotId);
}

export function applyTowerOp(
  state: TowerGameState,
  op: TowerRecordedOp
): { ok: boolean; error?: string } {
  if (state.phase === TowerGamePhase.ENDED) {
    return { ok: false, error: "game_ended" };
  }

  switch (op.op) {
    case "place": {
      if (state.phase !== TowerGamePhase.BUILD) return { ok: false, error: "not_build_phase" };
      if (!slotDef(state.seed, op.slotId)) return { ok: false, error: "invalid_slot" };
      if (findTower(state, op.slotId)) return { ok: false, error: "slot_occupied" };
      const def = towerDef(state.seed, op.towerId);
      if (!def) return { ok: false, error: "invalid_tower" };
      if (!state.unlockedTowerIds.includes(op.towerId)) return { ok: false, error: "tower_locked" };
      if (state.gold < def.cost) return { ok: false, error: "insufficient_gold" };
      state.gold -= def.cost;
      state.towers.push({ slotId: op.slotId, towerId: op.towerId, level: 1 });
      state.moves += 1;
      if (state.status === TowerGameStatus.CREATED) {
        state.status = TowerGameStatus.PLAYING;
      }
      syncScore(state);
      return { ok: true };
    }
    case "upgrade": {
      if (state.phase !== TowerGamePhase.BUILD) return { ok: false, error: "not_build_phase" };
      const tower = findTower(state, op.slotId);
      if (!tower) return { ok: false, error: "no_tower" };
      const def = towerDef(state.seed, tower.towerId);
      if (!def) return { ok: false, error: "invalid_tower" };
      if (tower.level >= def.maxLevel) return { ok: false, error: "max_level" };
      const stats = def.statsByLevel[tower.level - 1];
      if (!stats) return { ok: false, error: "invalid_level" };
      if (state.gold < stats.upgradeCost) return { ok: false, error: "insufficient_gold" };
      state.gold -= stats.upgradeCost;
      tower.level += 1;
      state.moves += 1;
      syncScore(state);
      return { ok: true };
    }
    case "sell": {
      if (state.phase !== TowerGamePhase.BUILD) return { ok: false, error: "not_build_phase" };
      const idx = state.towers.findIndex((t) => t.slotId === op.slotId);
      if (idx < 0) return { ok: false, error: "no_tower" };
      const tower = state.towers[idx]!;
      const def = towerDef(state.seed, tower.towerId);
      if (!def) return { ok: false, error: "invalid_tower" };
      let invested = def.cost;
      for (let lv = 1; lv < tower.level; lv++) {
        invested += def.statsByLevel[lv - 1]?.upgradeCost ?? 0;
      }
      state.gold += Math.floor(invested * 0.7);
      state.towers.splice(idx, 1);
      state.moves += 1;
      syncScore(state);
      return { ok: true };
    }
    case "start_wave": {
      const res = runWaveOnState(state);
      if (res.ok) {
        state.moves += 1;
        finalizeIfDone(state);
      }
      return res;
    }
    case "concede": {
      state.phase = TowerGamePhase.ENDED;
      state.status = TowerGameStatus.CANCELLED;
      syncScore(state);
      state.moves += 1;
      return { ok: true };
    }
    default:
      return { ok: false, error: "unknown_op" };
  }
}

export function replayTowerOps(
  seed: TowerArenaSeed,
  ops: TowerRecordedOp[]
): { ok: boolean; state?: TowerGameState; error?: string } {
  const state = createInitialTowerState(seed);
  for (const op of ops) {
    const res = applyTowerOp(state, op);
    if (!res.ok) {
      return { ok: false, error: res.error };
    }
  }
  finalizeIfDone(state);
  return { ok: true, state };
}

export function buildInitialState(seed: TowerArenaSeed): TowerGameState {
  return createInitialTowerState(seed);
}
