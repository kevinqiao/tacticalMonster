import type { TowerArenaSeed } from "../types/TowerArenaSeed";
import type { TowerGameState } from "../types/TowerArenaTypes";
import { TowerGamePhase, TowerGameStatus } from "../types/TowerArenaTypes";

export function computeTowerFinalScore(state: TowerGameState): number {
  const w = state.seed.scoreWeights;
  const lifeScore = state.lives * w.lifePoint;
  const waveScore = state.wavesCleared * w.waveBonus;
  const goldScore = state.gold * w.goldBonus;
  const timeSec = Math.floor(state.elapsedSimMs / 1000);
  const timePenalty = timeSec * w.timePenaltyPerSec;
  return Math.max(0, Math.floor(lifeScore + waveScore + goldScore - timePenalty));
}

export function buildTowerCashGameReport(
  state: Pick<TowerGameState, "lives" | "wavesCleared" | "gold" | "elapsedSimMs" | "seed">
): { totalScore: number; lifeScore: number; waveScore: number; goldScore: number; timePenalty: number } {
  const w = state.seed.scoreWeights;
  const lifeScore = state.lives * w.lifePoint;
  const waveScore = state.wavesCleared * w.waveBonus;
  const goldScore = state.gold * w.goldBonus;
  const timeSec = Math.floor(state.elapsedSimMs / 1000);
  const timePenalty = timeSec * w.timePenaltyPerSec;
  const totalScore = Math.max(0, Math.floor(lifeScore + waveScore + goldScore - timePenalty));
  return { totalScore, lifeScore, waveScore, goldScore, timePenalty };
}

export function resolveLiveGameElapsedSec(playStartedAt?: number): number {
  if (playStartedAt == null) return 0;
  return Math.max(0, Math.floor((Date.now() - playStartedAt) / 1000));
}

export function resolveCasualIngestScoreFromTowerRow(game: {
  score?: number;
  playStartedAt?: number;
  elapsedSimMs?: number;
  seed?: TowerArenaSeed;
  lives?: number;
  wavesCleared?: number;
  gold?: number;
}): number {
  if (game.seed) {
    return buildTowerCashGameReport({
      lives: game.lives ?? 0,
      wavesCleared: game.wavesCleared ?? 0,
      gold: game.gold ?? 0,
      elapsedSimMs: game.elapsedSimMs ?? resolveLiveGameElapsedSec(game.playStartedAt) * 1000,
      seed: game.seed,
    }).totalScore;
  }
  return Math.max(0, Math.floor(Number(game.score ?? 0)));
}

export const TOWER_MATCH_TIME_LIMIT_SEC = 480;

export function isTerminalTowerStatus(status: number): boolean {
  return status === TowerGameStatus.COMPLETED || status === TowerGameStatus.CANCELLED;
}

export function createInitialTowerState(seed: TowerArenaSeed): TowerGameState {
  const unlocked = seed.towerCatalog.map((t) => t.id);
  return {
    seed,
    phase: TowerGamePhase.BUILD,
    status: TowerGameStatus.CREATED,
    lives: seed.startingLives,
    gold: seed.economy.startGold,
    currentWave: 0,
    wavesCleared: 0,
    towers: [],
    unlockedTowerIds: unlocked,
    score: 0,
    elapsedSimMs: 0,
    moves: 0,
  };
}

export function syncScore(state: TowerGameState): void {
  state.score = computeTowerFinalScore(state);
}

export function finalizeIfDone(state: TowerGameState): void {
  syncScore(state);
  if (state.phase === TowerGamePhase.ENDED) {
    state.status =
      state.lives <= 0 || state.currentWave >= state.seed.waves.length
        ? TowerGameStatus.COMPLETED
        : TowerGameStatus.CANCELLED;
  }
}
