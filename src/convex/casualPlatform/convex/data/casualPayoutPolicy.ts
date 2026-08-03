/**
 * 当日场次递减政策表。
 *
 * 设计口径（见 docs/casual-platform-economy-loop-design.md §6）：
 * - A/B/C/专场 均有**入场费**（金币 / 钻 / 券），入场费本身已是水槽，
 *   故对局结算的**币 / 钻 / 券产出不衰减、不封顶**；
 * - 真正需要防「多打刷量」的是**成长线 XP**：League XP 与 Battle Pass XP，
 *   按当日 **payout bucket** 场次序号递减（首 3 局满额，第 4 局起衰减，下限 0.1）。
 * - 三条计数线：`async`（A/B/C/三合一统一）、`season_challenge`（专场）、`solo_p75`（p75）。
 */

import type { CasualTournamentDefinition } from "./casualTournamentConfigs";

/** 当日第 1～N 场 League XP / Pass XP 乘子（0 基：首场用 [0]）。币/钻/券不参与。 */
export const XP_DECAY_BY_ORDINAL: readonly number[] = [1, 1, 1, 1, 1, 1, 1, 1, 0];

export type PayoutBucket = "async" | "season_challenge" | "solo_p75";

/** 当日 XP 递减 bucket：async 统一计 A/B/C/三合一；专场与 p75 各独立。 */
export function payoutBucketFromDef(def: CasualTournamentDefinition): PayoutBucket {
  if (def.matchType === "season_challenge") return "season_challenge";
  if (def.matchType === "solo_p75_challenge") return "solo_p75";
  return "async";
}

/** 专场：券已是水槽，Pass/League 不做当日场次 ordinal 递减。 */
export function usesXpOrdinalDecay(def: CasualTournamentDefinition): boolean {
  return def.matchType !== "season_challenge";
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
