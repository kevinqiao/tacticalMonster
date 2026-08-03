/**
 * 周联赛静态配置：联赛段位、cohort 升降名额、League XP 权重、周尾奖励。
 */

export const CASUAL_WEEKLY_LEAGUE_ENABLED = true;

/** cohort 榜单总人数（真人 + bot） */
export const WEEKLY_LEAGUE_COHORT_SIZE = 30;

/** 每个 cohort 最多真人数量 */
export const WEEKLY_LEAGUE_MAX_HUMANS_PER_COHORT = 15;

/** 每个 cohort 固定 bot 池大小（与真人上限相加 = `WEEKLY_LEAGUE_COHORT_SIZE`） */
export const WEEKLY_LEAGUE_BOT_POOL_SIZE = 15;

/** 首真人入组时立即已 reveal 的 bot 数量区间 */
export const WEEKLY_LEAGUE_BOT_REVEALED_NOW_MIN = 5;
export const WEEKLY_LEAGUE_BOT_REVEALED_NOW_MAX = 10;

/** 首真人入组后，未立即 reveal 的 bot 在此后窗口内随机露面（ms） */
export const WEEKLY_LEAGUE_BOT_POST_ANCHOR_REVEAL_MS = 1 * 3600 * 1000;

export const WEEKLY_LEAGUE_TIER_IDS = [
  "bronze",
  "silver",
  "gold",
  "platinum",
  "diamond",
] as const;

export type WeeklyLeagueTierId = (typeof WEEKLY_LEAGUE_TIER_IDS)[number];

export const DEFAULT_WEEKLY_LEAGUE_TIER: WeeklyLeagueTierId = "bronze";

/** 各联赛段 cohort 内名次区间 → 周尾结果 */
export type WeeklyLeagueZone = "promote" | "safe" | "demote";

export type WeeklyLeagueZoneBands = {
  promoteMaxRank: number;
  safeMaxRank: number;
};

/** Bronze 3 区示例：1–10 晋级、11–25 保级、26–30 降级 */
export const WEEKLY_LEAGUE_ZONE_BANDS: Record<WeeklyLeagueTierId, WeeklyLeagueZoneBands> = {
  bronze: { promoteMaxRank: 10, safeMaxRank: 25 },
  silver: { promoteMaxRank: 8, safeMaxRank: 22 },
  gold: { promoteMaxRank: 7, safeMaxRank: 20 },
  platinum: { promoteMaxRank: 5, safeMaxRank: 18 },
  diamond: { promoteMaxRank: 3, safeMaxRank: 15 },
};

export function weeklyLeagueZoneForRank(
  tierId: WeeklyLeagueTierId,
  rank: number
): WeeklyLeagueZone {
  const bands = WEEKLY_LEAGUE_ZONE_BANDS[tierId];
  if (rank <= bands.promoteMaxRank) return "promote";
  if (rank <= bands.safeMaxRank) return "safe";
  return "demote";
}

export function nextWeeklyLeagueTier(tierId: WeeklyLeagueTierId): WeeklyLeagueTierId {
  const i = WEEKLY_LEAGUE_TIER_IDS.indexOf(tierId);
  if (i < 0 || i >= WEEKLY_LEAGUE_TIER_IDS.length - 1) return tierId;
  return WEEKLY_LEAGUE_TIER_IDS[i + 1]!;
}

export function prevWeeklyLeagueTier(tierId: WeeklyLeagueTierId): WeeklyLeagueTierId {
  const i = WEEKLY_LEAGUE_TIER_IDS.indexOf(tierId);
  if (i <= 0) return tierId;
  return WEEKLY_LEAGUE_TIER_IDS[i - 1]!;
}

export function compareWeeklyLeagueTiers(a: WeeklyLeagueTierId, b: WeeklyLeagueTierId): number {
  return WEEKLY_LEAGUE_TIER_IDS.indexOf(a) - WEEKLY_LEAGUE_TIER_IDS.indexOf(b);
}

export function maxWeeklyLeagueTier(
  a: WeeklyLeagueTierId,
  b: WeeklyLeagueTierId
): WeeklyLeagueTierId {
  return compareWeeklyLeagueTiers(a, b) >= 0 ? a : b;
}

/** 周尾名次奖励（Bronze 基准；高段 × tierRewardMultiplier） */
export type WeeklyLeaguePendingRewards = {
  coins?: number;
  gems?: number;
  seasonVoucher?: number;
};

export const WEEKLY_LEAGUE_TIER_REWARD_MULTIPLIER: Record<WeeklyLeagueTierId, number> = {
  bronze: 1,
  silver: 1.25,
  gold: 1.5,
  platinum: 2,
  diamond: 2.5,
};

export function scaleWeeklyLeagueRewards(
  base: WeeklyLeaguePendingRewards,
  tierId: WeeklyLeagueTierId
): WeeklyLeaguePendingRewards {
  const mult = WEEKLY_LEAGUE_TIER_REWARD_MULTIPLIER[tierId] ?? 1;
  const out: WeeklyLeaguePendingRewards = {};
  if (base.coins != null && base.coins > 0) {
    out.coins = Math.max(0, Math.floor(base.coins * mult));
  }
  if (base.gems != null && base.gems > 0) {
    out.gems = Math.max(0, Math.floor(base.gems * mult));
  }
  if (base.seasonVoucher != null && base.seasonVoucher > 0) {
    out.seasonVoucher = Math.max(0, Math.floor(base.seasonVoucher * mult));
  }
  return out;
}

/** 按 cohort 最终名次发放（Bronze 未乘倍率） */
export function weeklyLeagueRewardsForFinalRank(rank: number): WeeklyLeaguePendingRewards {
  if (rank === 1) return { coins: 240, gems: 6 };
  if (rank === 2) return { coins: 160, gems: 4 };
  if (rank === 3) return { coins: 100, gems: 2 };
  if (rank >= 4 && rank <= 10) return { coins: 60 };
  if (rank >= 11 && rank <= 25) return { coins: 20 };
  return {};
}

/** 晋级成功额外券（与 Pass 券桥衔接） */
export const WEEKLY_LEAGUE_PROMOTION_VOUCHER = 1;

/** p75 挑战：达标才计 League XP；日软顶见下 */
export const DAILY_LEAGUE_XP_SOFT_CAP = 40;

/** p75 达标单场 League XP（未达标 0） */
export const SOLO_CASUAL_LEAGUE_BASE_XP = 4;
