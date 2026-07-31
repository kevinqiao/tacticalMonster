/**
 * Portal 周联赛配置（与 casualPlatform 独立，不共享常量）。
 * 经济相关（enabled / cohortSize / projectedCoins）← portalEconomyGenerated。
 */

import {
  PORTAL_WEEKLY_LEAGUE_ENABLED,
  PORTAL_WEEKLY_LEAGUE_COHORT_SIZE,
  PORTAL_WEEKLY_LEAGUE_PROJECTED_COINS,
} from "./portalEconomyGenerated";

export {
  PORTAL_WEEKLY_LEAGUE_ENABLED,
  PORTAL_WEEKLY_LEAGUE_COHORT_SIZE,
  PORTAL_WEEKLY_LEAGUE_PROJECTED_COINS,
};

/**
 * 创建分组时固定种入的 Bot 数（15 真人 + 15 Bot = 30）。
 * 可见：立即可见数 3–10 伪随机，其余在匹配窗口 5h 内陆续出现。
 * 匹配结束时若真人不足，再补 Bot 至 COHORT_SIZE。
 */
export const PORTAL_WEEKLY_LEAGUE_BOT_POOL_SIZE = 15;

/** 每个 cohort 最多真人数量（15 真人 + 15 Bot = 30） */
export const PORTAL_WEEKLY_LEAGUE_MAX_HUMANS_PER_COHORT = 15;

/** 分组创建后匹配窗口（亦为延迟 Bot 可见分布区间） */
export const PORTAL_WEEKLY_LEAGUE_MATCHING_DURATION_MS = 5 * 60 * 60 * 1000;

/** Bot 可见起始分（闭区间）— bronze 基线；高段位由曲线缩放抬升 */
export const PORTAL_WEEKLY_LEAGUE_BOT_START_POINTS_MIN = 2;
export const PORTAL_WEEKLY_LEAGUE_BOT_START_POINTS_MAX = 20;

export const PORTAL_WEEKLY_LEAGUE_TIER_IDS = [
  "bronze",
  "silver",
  "gold",
  "platinum",
  "diamond",
] as const;

export type PortalWeeklyLeagueTierId = (typeof PORTAL_WEEKLY_LEAGUE_TIER_IDS)[number];

export const DEFAULT_PORTAL_WEEKLY_LEAGUE_TIER: PortalWeeklyLeagueTierId = "bronze";

/** Bot 段位加压曲线：ease-in（低段缓、高段陡） */
export const PORTAL_WEEKLY_LEAGUE_BOT_TIER_CURVE_GAMMA = 1.6;

export type PortalWeeklyLeagueBotTierScaling = {
  startPointsMin: number;
  startPointsMax: number;
  personaFloor: number;
  personaCeiling: number;
  playIntentMul: number;
  /** solo 失败后「等效广告再战」救回概率；不接 ads 表 */
  replayRecoveryBias: number;
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function isPortalWeeklyLeagueTierId(id: string): id is PortalWeeklyLeagueTierId {
  return (PORTAL_WEEKLY_LEAGUE_TIER_IDS as readonly string[]).includes(id);
}

/** pressure ∈ [0,1]：bronze=0 … diamond=1，γ>1 前缓后陡 */
export function portalWeeklyLeagueBotTierPressure(
  tierId: PortalWeeklyLeagueTierId | string
): number {
  const ids = PORTAL_WEEKLY_LEAGUE_TIER_IDS;
  const i = isPortalWeeklyLeagueTierId(tierId) ? ids.indexOf(tierId) : 0;
  const t = Math.max(0, i) / Math.max(1, ids.length - 1);
  return Math.pow(t, PORTAL_WEEKLY_LEAGUE_BOT_TIER_CURVE_GAMMA);
}

export function resolvePortalWeeklyLeagueBotTierScaling(
  tierId: PortalWeeklyLeagueTierId | string
): PortalWeeklyLeagueBotTierScaling {
  const p = portalWeeklyLeagueBotTierPressure(tierId);
  return {
    startPointsMin: Math.round(lerp(PORTAL_WEEKLY_LEAGUE_BOT_START_POINTS_MIN, 8, p)),
    startPointsMax: Math.round(lerp(PORTAL_WEEKLY_LEAGUE_BOT_START_POINTS_MAX, 35, p)),
    personaFloor: lerp(0.25, 0.48, p),
    personaCeiling: 1,
    playIntentMul: lerp(1, 1.22, p),
    replayRecoveryBias: lerp(0, 0.18, p),
  };
}

export type PortalWeeklyLeagueZone = "promote" | "safe" | "demote";

export type PortalWeeklyLeagueZoneBands = {
  promoteMaxRank: number;
  safeMaxRank: number;
};

/** 30 人组：1–8 升、9–22 保、23–30 降 */
export const PORTAL_WEEKLY_LEAGUE_ZONE_BANDS: Record<
  PortalWeeklyLeagueTierId,
  PortalWeeklyLeagueZoneBands
> = {
  bronze: { promoteMaxRank: 8, safeMaxRank: 22 },
  silver: { promoteMaxRank: 8, safeMaxRank: 22 },
  gold: { promoteMaxRank: 8, safeMaxRank: 22 },
  platinum: { promoteMaxRank: 8, safeMaxRank: 22 },
  diamond: { promoteMaxRank: 8, safeMaxRank: 22 },
};

export function portalWeeklyLeagueZoneForRank(
  tierId: PortalWeeklyLeagueTierId,
  rank: number
): PortalWeeklyLeagueZone {
  const bands = PORTAL_WEEKLY_LEAGUE_ZONE_BANDS[tierId];
  if (rank <= bands.promoteMaxRank) return "promote";
  if (rank <= bands.safeMaxRank) return "safe";
  return "demote";
}

export function nextPortalWeeklyLeagueTier(
  tierId: PortalWeeklyLeagueTierId
): PortalWeeklyLeagueTierId {
  const i = PORTAL_WEEKLY_LEAGUE_TIER_IDS.indexOf(tierId);
  if (i < 0 || i >= PORTAL_WEEKLY_LEAGUE_TIER_IDS.length - 1) return tierId;
  return PORTAL_WEEKLY_LEAGUE_TIER_IDS[i + 1]!;
}

export function prevPortalWeeklyLeagueTier(
  tierId: PortalWeeklyLeagueTierId
): PortalWeeklyLeagueTierId {
  const i = PORTAL_WEEKLY_LEAGUE_TIER_IDS.indexOf(tierId);
  if (i <= 0) return tierId;
  return PORTAL_WEEKLY_LEAGUE_TIER_IDS[i - 1]!;
}

export function maxPortalWeeklyLeagueTier(
  a: PortalWeeklyLeagueTierId,
  b: PortalWeeklyLeagueTierId
): PortalWeeklyLeagueTierId {
  const ia = PORTAL_WEEKLY_LEAGUE_TIER_IDS.indexOf(a);
  const ib = PORTAL_WEEKLY_LEAGUE_TIER_IDS.indexOf(b);
  return ia >= ib ? a : b;
}

/** 周尾结算按最终名次发放的金币（与 projectedCoins 矩阵一致）。 */
export function portalWeeklyLeagueRewardsForFinalRank(
  tierId: PortalWeeklyLeagueTierId,
  rank: number
): { coins?: number } | null {
  const coins = portalWeeklyLeagueProjectedCoins(tierId, rank);
  if (coins == null || coins <= 0) return null;
  return { coins };
}

const COHORT_CODE_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const COHORT_CODE_DIGITS = "23456789";
const COHORT_CODE_ALPHANUM = COHORT_CODE_LETTERS + COHORT_CODE_DIGITS;

export const PORTAL_COHORT_DISPLAY_CODE_LENGTH = 8;

function fnv1a32(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type PortalCohortDisplaySeed = {
  weekKey: string;
  gameType: string;
  leagueTierId: string;
  cohortIndex: number;
};

/** 用户可见 8 位组号（大写字母 + 数字，且同时包含字母与数字）。 */
export function portalWeeklyLeagueDisplayCohortNo(args: PortalCohortDisplaySeed): string {
  const seed = `${args.weekKey}|${args.gameType}|${args.leagueTierId}|${args.cohortIndex}`;
  let state = fnv1a32(seed);
  const pick = (alphabet: string) => {
    state = Math.imul(state ^ alphabet.length, 2654435761) >>> 0;
    return alphabet[state % alphabet.length]!;
  };

  const chars = [pick(COHORT_CODE_LETTERS), pick(COHORT_CODE_DIGITS)];
  for (let i = 2; i < PORTAL_COHORT_DISPLAY_CODE_LENGTH; i++) {
    chars.push(pick(COHORT_CODE_ALPHANUM));
  }

  for (let i = chars.length - 1; i > 0; i--) {
    state = Math.imul(state + i, 2246822519) >>> 0;
    const j = state % (i + 1);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }

  return chars.join("");
}

export function resolvePortalCohortDisplayCode(
  cohort: PortalCohortDisplaySeed & { displayCode?: string }
): string {
  const stored = cohort.displayCode?.trim().toUpperCase();
  if (
    stored &&
    stored.length === PORTAL_COHORT_DISPLAY_CODE_LENGTH &&
    /^[A-Z0-9]+$/.test(stored) &&
    /[A-Z]/.test(stored) &&
    /[0-9]/.test(stored)
  ) {
    return stored;
  }
  return portalWeeklyLeagueDisplayCohortNo(cohort);
}

/** 按当前组内名次预估结算金币（与 PortalRulesContent 矩阵对齐） */
export function portalWeeklyLeagueProjectedCoins(
  tierId: PortalWeeklyLeagueTierId,
  rank: number
): number | null {
  if (rank <= 0 || rank > PORTAL_WEEKLY_LEAGUE_COHORT_SIZE) return null;
  const row =
    PORTAL_WEEKLY_LEAGUE_PROJECTED_COINS[tierId] ??
    PORTAL_WEEKLY_LEAGUE_PROJECTED_COINS.bronze;
  if (rank === 1) return row.r1;
  if (rank <= 3) return row.r2_3;
  if (rank <= 8) return row.r4_8;
  if (rank <= 22) return row.r9_22;
  return null;
}
