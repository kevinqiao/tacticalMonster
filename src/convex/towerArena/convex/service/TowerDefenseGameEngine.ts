import { resolveTowerSeed } from "../shared/towerSeedCatalog";
import type { TowerArenaSeed } from "../types/TowerArenaSeed";
import type { TowerGameState, TowerRecordedOp } from "../types/TowerArenaTypes";
import { applyTowerOp, buildInitialState, replayTowerOps } from "./towerOpCodec";
import { syncScore } from "./towerScoring";

export class TowerDefenseGameEngine {
  static resolveSeed(seedOrId: string): TowerArenaSeed {
    return resolveTowerSeed(seedOrId);
  }

  static createGame(seedOrId: string): TowerGameState {
    const seed = resolveTowerSeed(seedOrId);
    return buildInitialState(seed);
  }

  static applyOp(state: TowerGameState, op: TowerRecordedOp) {
    return applyTowerOp(state, op);
  }

  static replay(seedOrId: string, ops: TowerRecordedOp[]) {
    const seed = resolveTowerSeed(seedOrId);
    return replayTowerOps(seed, ops);
  }

  static computeScore(state: TowerGameState): number {
    syncScore(state);
    return state.score;
  }
}

export { applyTowerOp, buildInitialState, replayTowerOps };
