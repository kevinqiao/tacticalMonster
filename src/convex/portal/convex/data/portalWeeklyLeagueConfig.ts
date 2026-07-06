/**
 * Portal 周联赛配置（与 casualPlatform 独立，不共享常量）。
 */

export const PORTAL_WEEKLY_LEAGUE_ENABLED = true;

/** cohort 设计容量（UI 三区条按 50 人） */
export const PORTAL_WEEKLY_LEAGUE_COHORT_SIZE = 50;

/** 首真人入组时固定的 Bot 池规模（与真人合计 50 人） */
export const PORTAL_WEEKLY_LEAGUE_BOT_POOL_SIZE = 25;

/** 每个 cohort 最多真人数量（25 真人 + 25 Bot = 50） */
export const PORTAL_WEEKLY_LEAGUE_MAX_HUMANS_PER_COHORT = 25;

export const PORTAL_WEEKLY_LEAGUE_TIER_IDS = [
  "bronze",
  "silver",
  "gold",
  "platinum",
  "diamond",
] as const;

export type PortalWeeklyLeagueTierId = (typeof PORTAL_WEEKLY_LEAGUE_TIER_IDS)[number];

export const DEFAULT_PORTAL_WEEKLY_LEAGUE_TIER: PortalWeeklyLeagueTierId = "bronze";

export type PortalWeeklyLeagueZone = "promote" | "safe" | "demote";

export type PortalWeeklyLeagueZoneBands = {
  promoteMaxRank: number;
  safeMaxRank: number;
};

/** 50 人组：1–10 升、11–40 保、41–50 降 */
export const PORTAL_WEEKLY_LEAGUE_ZONE_BANDS: Record<
  PortalWeeklyLeagueTierId,
  PortalWeeklyLeagueZoneBands
> = {
  bronze: { promoteMaxRank: 10, safeMaxRank: 40 },
  silver: { promoteMaxRank: 10, safeMaxRank: 40 },
  gold: { promoteMaxRank: 10, safeMaxRank: 40 },
  platinum: { promoteMaxRank: 10, safeMaxRank: 40 },
  diamond: { promoteMaxRank: 10, safeMaxRank: 40 },
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
const PROJECTED_COINS: Record<
  PortalWeeklyLeagueTierId,
  { r1: number; r2_3: number; r4_10: number; r11_40: number }
> = {
  bronze: { r1: 200, r2_3: 120, r4_10: 60, r11_40: 20 },
  silver: { r1: 300, r2_3: 180, r4_10: 90, r11_40: 30 },
  gold: { r1: 500, r2_3: 300, r4_10: 150, r11_40: 50 },
  platinum: { r1: 800, r2_3: 480, r4_10: 240, r11_40: 80 },
  diamond: { r1: 1200, r2_3: 720, r4_10: 360, r11_40: 120 },
};

export function portalWeeklyLeagueProjectedCoins(
  tierId: PortalWeeklyLeagueTierId,
  rank: number
): number | null {
  if (rank <= 0 || rank > PORTAL_WEEKLY_LEAGUE_COHORT_SIZE) return null;
  const row = PROJECTED_COINS[tierId] ?? PROJECTED_COINS.bronze;
  if (rank === 1) return row.r1;
  if (rank <= 3) return row.r2_3;
  if (rank <= 10) return row.r4_10;
  if (rank <= 40) return row.r11_40;
  return null;
}
