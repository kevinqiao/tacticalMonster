/**
 * 计奖场次递减与软币日上限（历史政策表）。
 * 当场对局结算（`applyCasualTemplateScoreEffects`）已停用；防刷靠门票 + 名次赛季分 ±。
 * 表 `casual_payout_daily_counters` 可保留供日后运营实验复用。
 */

import type { CasualTournamentDefinition } from "./casualTournamentConfigs";

/** 当日第 1～N 场计奖的币/钻/Pass XP 乘子（0 基：首场用 [0]） */
export const WALLET_DECAY_BY_ORDINAL: readonly number[] = [1, 1, 1, 0.75, 0.5, 0.35, 0.2, 0.1];

/** 赛季分乘子（较钱包更宽松，避免榜完全 stagnate） */
export const SEASON_POINTS_DECAY_BY_ORDINAL: readonly number[] = [1, 1, 1, 0.85, 0.7, 0.55, 0.4, 0.25];

/** 当日软币产出硬顶（仅 tournament_a / b；C 场钻不走此表） */
export const DAILY_COINS_CAP: Record<string, number> = {
  tournament_a: 180,
  tournament_b: 400,
};

/** 当日赛季分硬顶（按 matchType）；专场按名次±分，与 B 档同级参考上限 */
export const DAILY_SEASON_POINTS_CAP: Record<string, number> = {
  tournament_a: 24,
  tournament_b: 40,
  tournament_c: 80,
  season_challenge: 40,
};

export type PayoutBucket = "tournament_a" | "tournament_b" | "tournament_c" | "season_challenge";

export function payoutBucketFromDef(def: CasualTournamentDefinition): PayoutBucket {
  if (def.matchType === "season_challenge") return "season_challenge";
  if (def.matchType === "tournament_c") return "tournament_c";
  if (def.matchType === "tournament_b") return "tournament_b";
  return "tournament_a";
}

export function decayMultiplier(ordinal: number, table: readonly number[]): number {
  const i = Math.max(0, Math.floor(ordinal));
  if (i < table.length) return table[i]!;
  return table[table.length - 1] ?? 0;
}

export function scaleFloor(n: number, mult: number): number {
  if (mult <= 0 || n <= 0) return 0;
  return Math.max(0, Math.floor(n * mult));
}
