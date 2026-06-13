import { createSeededRandom } from "../../utils/seedRandom";
import type { TowerArenaSeed } from "../../types/TowerArenaSeed";
import type { TowerGameState, TowerRecordedOp } from "../../types/TowerArenaTypes";
import { TowerGamePhase } from "../../types/TowerArenaTypes";
import { applyTowerOp, buildInitialState } from "../towerOpCodec";

export type StochasticPolicyContext = {
  rng: () => number;
  rolloutIndex: number;
};

export function createStochasticPolicyContext(seedId: string, rolloutIndex: number): StochasticPolicyContext {
  return {
    rng: createSeededRandom(`${seedId}:rollout:${rolloutIndex}`),
    rolloutIndex,
  };
}

function pickPlacement(state: TowerGameState, ctx: StochasticPolicyContext): TowerRecordedOp | null {
  const seed = state.seed;
  const emptySlots = seed.towerSlots.filter((s) => !state.towers.some((t) => t.slotId === s.id));
  if (emptySlots.length === 0) return null;

  const affordable = seed.towerCatalog.filter(
    (t) => state.unlockedTowerIds.includes(t.id) && state.gold >= t.cost
  );
  if (affordable.length === 0) return null;

  const slot = emptySlots[Math.floor(ctx.rng() * emptySlots.length)]!;
  const tower = affordable[Math.floor(ctx.rng() * affordable.length)]!;
  return { op: "place", slotId: slot.id, towerId: tower.id };
}

function pickUpgrade(state: TowerGameState, ctx: StochasticPolicyContext): TowerRecordedOp | null {
  const candidates = state.towers.filter((t) => {
    const def = state.seed.towerCatalog.find((c) => c.id === t.towerId);
    if (!def || t.level >= def.maxLevel) return false;
    const stats = def.statsByLevel[t.level - 1];
    return stats && state.gold >= stats.upgradeCost;
  });
  if (candidates.length === 0) return null;
  const tower = candidates[Math.floor(ctx.rng() * candidates.length)]!;
  return { op: "upgrade", slotId: tower.slotId };
}

export function pickNextOp(
  state: TowerGameState,
  ctx: StochasticPolicyContext
): TowerRecordedOp | null {
  if (state.phase === TowerGamePhase.ENDED) return null;

  if (state.phase === TowerGamePhase.BUILD) {
    if (state.currentWave < state.seed.waves.length) {
      if (ctx.rng() < 0.55) {
        return { op: "start_wave" };
      }
      const upgrade = pickUpgrade(state, ctx);
      if (upgrade && ctx.rng() < 0.4) return upgrade;
      const place = pickPlacement(state, ctx);
      if (place) return place;
      return { op: "start_wave" };
    }
    return null;
  }
  return null;
}

export function runPolicyOnSeed(
  seed: TowerArenaSeed,
  seedId: string,
  rolloutIndex: number,
  maxOps = 200
): { ops: TowerRecordedOp[]; state: TowerGameState } {
  const ctx = createStochasticPolicyContext(seedId, rolloutIndex);
  const state = buildInitialState(seed);
  const ops: TowerRecordedOp[] = [];
  for (let i = 0; i < maxOps; i++) {
    const op = pickNextOp(state, ctx);
    if (!op) break;
    const res = applyTowerOp(state, op);
    if (!res.ok) continue;
    ops.push(op);
    if (state.phase === TowerGamePhase.ENDED) break;
  }
  return { ops, state };
}
