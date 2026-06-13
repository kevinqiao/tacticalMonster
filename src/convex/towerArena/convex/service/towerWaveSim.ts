import type { TowerArenaSeed, TowerPathDef, TowerWaypoint } from "../types/TowerArenaSeed";
import type { PlacedTower, TowerGameState } from "../types/TowerArenaTypes";
import { TowerGamePhase } from "../types/TowerArenaTypes";
import { syncScore } from "./towerScoring";

const TICK_MS = 100;
const PATH_SCALE = 1000;

type SimEnemy = {
  id: number;
  typeId: string;
  pathId: string;
  progress: number;
  hp: number;
  maxHp: number;
  bounty: number;
  speed: number;
};

type SimTower = PlacedTower & {
  cooldownMs: number;
};

function dist(a: TowerWaypoint, b: TowerWaypoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function pathTotalLength(path: TowerPathDef): number {
  let len = 0;
  for (let i = 1; i < path.waypoints.length; i++) {
    len += dist(path.waypoints[i - 1]!, path.waypoints[i]!);
  }
  return len || 1;
}

function progressToPosition(path: TowerPathDef, progress: number): TowerWaypoint {
  const total = pathTotalLength(path);
  const target = (progress / PATH_SCALE) * total;
  let acc = 0;
  for (let i = 1; i < path.waypoints.length; i++) {
    const seg = dist(path.waypoints[i - 1]!, path.waypoints[i]!);
    if (acc + seg >= target) {
      const t = seg > 0 ? (target - acc) / seg : 0;
      const a = path.waypoints[i - 1]!;
      const b = path.waypoints[i]!;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    acc += seg;
  }
  return path.waypoints[path.waypoints.length - 1]!;
}

function slotPosition(seed: TowerArenaSeed, slotId: string): TowerWaypoint | null {
  const slot = seed.towerSlots.find((s) => s.id === slotId);
  return slot ? { x: slot.x, y: slot.y } : null;
}

function towerStats(seed: TowerArenaSeed, tower: PlacedTower) {
  const def = seed.towerCatalog.find((t) => t.id === tower.towerId);
  if (!def) return null;
  const levelIdx = Math.min(tower.level - 1, def.statsByLevel.length - 1);
  return def.statsByLevel[levelIdx] ?? null;
}

function spawnQueueForWave(seed: TowerArenaSeed, waveIndex: number): Array<{ typeId: string; delayMs: number }> {
  const wave = seed.waves[waveIndex];
  if (!wave) return [];
  const queue: Array<{ typeId: string; delayMs: number }> = [];
  let t = 0;
  for (const group of wave.enemies) {
    for (let i = 0; i < group.count; i++) {
      queue.push({ typeId: group.typeId, delayMs: t });
      t += group.intervalMs;
    }
  }
  return queue;
}

export type WaveSimResult = {
  livesLost: number;
  goldEarned: number;
  elapsedMs: number;
  cleared: boolean;
};

export type WaveSimShot = { fromX: number; fromY: number; toX: number; toY: number };
export type WaveSimFrame = {
  simMs: number;
  enemies: Array<{
    id: number;
    typeId: string;
    x: number;
    y: number;
    hp: number;
    maxHp: number;
  }>;
  shots: WaveSimShot[];
};

type WaveSimRun = WaveSimResult & { frames: WaveSimFrame[] };

function runWaveSimulation(
  seed: TowerArenaSeed,
  waveIndex: number,
  towers: PlacedTower[],
  pathId: string,
  collectFrames: boolean,
  frameIntervalMs = 200
): WaveSimRun {
  const path = seed.paths.find((p) => p.id === pathId) ?? seed.paths[0];
  const frames: WaveSimFrame[] = [];
  if (!path) {
    return { livesLost: 0, goldEarned: 0, elapsedMs: 0, cleared: true, frames };
  }

  const spawnQueue = spawnQueueForWave(seed, waveIndex);
  let spawnIdx = 0;
  let nextEnemyId = 1;
  const enemies: SimEnemy[] = [];
  const simTowers: SimTower[] = towers.map((t) => ({ ...t, cooldownMs: 0 }));
  let elapsed = 0;
  let livesLost = 0;
  let goldEarned = 0;
  let lastFrameAt = -frameIntervalMs;
  const maxSimMs = seed.matchTimeLimitSec * 1000;

  const pushFrame = (shots: WaveSimShot[]) => {
    if (!collectFrames) return;
    frames.push({
      simMs: elapsed,
      shots: [...shots],
      enemies: enemies
        .filter((e) => e.hp > 0 && e.progress < PATH_SCALE)
        .map((e) => {
          const p = progressToPosition(path, e.progress);
          return {
            id: e.id,
            typeId: e.typeId,
            x: p.x,
            y: p.y,
            hp: e.hp,
            maxHp: e.maxHp,
          };
        }),
    });
  };

  while (elapsed < maxSimMs) {
    const shots: WaveSimShot[] = [];

    while (spawnIdx < spawnQueue.length && spawnQueue[spawnIdx]!.delayMs <= elapsed) {
      const spec = spawnQueue[spawnIdx]!;
      const def = seed.enemyCatalog.find((e) => e.id === spec.typeId);
      if (def) {
        enemies.push({
          id: nextEnemyId++,
          typeId: spec.typeId,
          pathId: path.id,
          progress: 0,
          hp: def.hp,
          maxHp: def.hp,
          bounty: def.bounty,
          speed: def.speed,
        });
      }
      spawnIdx++;
    }

    for (const enemy of enemies) {
      if (enemy.hp <= 0) continue;
      enemy.progress += (enemy.speed * TICK_MS) / 1000;
      if (enemy.progress >= PATH_SCALE) {
        enemy.hp = 0;
        livesLost++;
      }
    }

    for (const tower of simTowers) {
      const stats = towerStats(seed, tower);
      const pos = slotPosition(seed, tower.slotId);
      if (!stats || !pos) continue;
      tower.cooldownMs = Math.max(0, tower.cooldownMs - TICK_MS);
      if (tower.cooldownMs > 0) continue;

      let best: SimEnemy | null = null;
      for (const enemy of enemies) {
        if (enemy.hp <= 0 || enemy.pathId !== path.id) continue;
        const epos = progressToPosition(path, enemy.progress);
        const d = dist(pos, epos);
        if (d <= stats.range && (!best || enemy.progress > best.progress)) {
          best = enemy;
        }
      }
      if (best) {
        const epos = progressToPosition(path, best.progress);
        shots.push({ fromX: pos.x, fromY: pos.y, toX: epos.x, toY: epos.y });
        best.hp -= stats.damage;
        tower.cooldownMs = stats.fireCooldownMs;
        if (best.hp <= 0) {
          goldEarned += best.bounty;
        }
      }
    }

    elapsed += TICK_MS;

    if (collectFrames && elapsed - lastFrameAt >= frameIntervalMs) {
      pushFrame(shots);
      lastFrameAt = elapsed;
    }

    const allSpawned = spawnIdx >= spawnQueue.length;
    const allDeadOrLeaked = enemies.every((e) => e.hp <= 0 || e.progress >= PATH_SCALE);
    if (allSpawned && allDeadOrLeaked) {
      break;
    }
  }

  if (collectFrames) {
    pushFrame([]);
  }

  const cleared =
    spawnIdx >= spawnQueue.length &&
    enemies.every((e) => e.hp <= 0 || e.progress >= PATH_SCALE);
  return { livesLost, goldEarned, elapsedMs: elapsed, cleared, frames };
}

/** 确定性波次快进仿真 */
export function simulateWave(
  seed: TowerArenaSeed,
  waveIndex: number,
  towers: PlacedTower[],
  pathId = "main"
): WaveSimResult {
  const { frames: _f, ...result } = runWaveSimulation(seed, waveIndex, towers, pathId, false);
  return result;
}

/** 带可视化帧的波次仿真（客户端回放用，规则与 simulateWave 一致） */
export function simulateWaveWithFrames(
  seed: TowerArenaSeed,
  waveIndex: number,
  towers: PlacedTower[],
  pathId = "main",
  frameIntervalMs = 200
): WaveSimRun {
  return runWaveSimulation(seed, waveIndex, towers, pathId, true, frameIntervalMs);
}

export function computeMapBounds(seed: TowerArenaSeed): { width: number; height: number } {
  let maxX = 400;
  let maxY = 220;
  for (const path of seed.paths) {
    for (const wp of path.waypoints) {
      maxX = Math.max(maxX, wp.x + 40);
      maxY = Math.max(maxY, wp.y + 40);
    }
  }
  for (const slot of seed.towerSlots) {
    maxX = Math.max(maxX, slot.x + 40);
    maxY = Math.max(maxY, slot.y + 40);
  }
  return { width: maxX, height: maxY };
}

export function runWaveOnState(state: TowerGameState): { ok: boolean; error?: string } {
  if (state.phase !== TowerGamePhase.BUILD) {
    return { ok: false, error: "not_build_phase" };
  }
  const waveIndex = state.currentWave;
  if (waveIndex >= state.seed.waves.length) {
    return { ok: false, error: "no_more_waves" };
  }

  state.phase = TowerGamePhase.WAVE;
  const result = simulateWave(state.seed, waveIndex, state.towers);
  state.elapsedSimMs += result.elapsedMs;
  state.lives = Math.max(0, state.lives - result.livesLost);
  state.gold += result.goldEarned;

  if (result.cleared && state.lives > 0) {
    state.wavesCleared += 1;
    state.currentWave += 1;
    const bonus = state.seed.economy.waveClearBonus[waveIndex] ?? 0;
    state.gold += bonus;

    for (const prog of state.seed.inRunProgression ?? []) {
      if (prog.afterWave === state.wavesCleared) {
        if (prog.grant.type === "gold") {
          state.gold += prog.grant.amount;
        } else if (prog.grant.type === "unlockTower") {
          if (!state.unlockedTowerIds.includes(prog.grant.towerId)) {
            state.unlockedTowerIds.push(prog.grant.towerId);
          }
        }
      }
    }
  }

  if (state.lives <= 0 || state.currentWave >= state.seed.waves.length) {
    state.phase = TowerGamePhase.ENDED;
  } else {
    state.phase = TowerGamePhase.BUILD;
  }

  syncScore(state);
  return { ok: true };
}
