/**
 * AUTO-GENERATED — 勿手改。由配表同步：
 *   npm run casual:economy:sync
 * 源：casualSeasonEconomyConstants · casualPayoutPolicy · casualTournamentConfigs · casualMissionTemplates
 */
export const PASS_XP_PER_LEVEL = 1000;
export const PASS_MAX_LEVEL = 20;
export const CASUAL_SEASON_NOMINAL_WEEKS = 12;
export const CASUAL_F2P_PASS_TARGET_LEVELS = 12;
export const CASUAL_F2P_PASS_TARGET_BAND = {
  min: 11,
  max: 13,
};
export const DAILY_P75_COINS_SOFT_CAP = 32;

export const NET_FLOW_BANDS = {
  coins: {
    min: -200,
    max: 700,
  },
  gems: {
    min: -15,
    max: 45,
  },
  vouchers: {
    min: -1,
    max: 4,
  },
};

export const DEFAULT_TOURNAMENTS = {
  A: {
    entryCoins: 70,
    baseCoins: 36,
    baseGems: 0,
    passXp: 4,
    expectScoreTierCoins: 5.7,
  },
  B: {
    entryCoins: 90,
    baseCoins: 103,
    baseGems: 0,
    passXp: 5,
    expectScoreTierCoins: 10.8,
  },
  C: {
    entryGems: 24,
    baseCoins: 0,
    baseGems: 24,
    passXp: 8,
    expectScoreTierGems: 1.64,
  },
};

export const DEFAULT_P75 = {
  baseCoins: 2,
  successCoins: 16,
  passXp: 2,
};

export const SIGN_IN = {
  coins: 30,
  passXp: 8,
};

export const DEFAULT_XP_DECAY_BY_ORDINAL = [1, 1, 1, 1, 1, 1, 1, 1, 0];

/** 日任务 Pass XP（不含签到） */
export const DAILY_MISSION_PASS_XP = 65;

export const DEFAULT_WEEKLY = {
  leagueEndCoinsExpect: 50,
  leagueEndGemsExpect: 0.8,
  leaguePromoteVoucherExpect: 0.5,
  missionVouchersExpect: 6,
  passFreeVouchersPerWeek: 0.6,
  passFreeCoinsPerWeek: 70,
  missionPassXp: 290,
  seasonMissionPassXpPerWeek: 26.666666666666668 /* season_runs_60 / CASUAL_SEASON_NOMINAL_WEEKS */,
};

export const SEASON_CHALLENGE_VOUCHER_COST = 3;

export const SHOP_SINK_BY_PROFILE = {
  casual: {
    coinsPerWeek: 70,
    gemsPerWeek: 12,
  },
  active: {
    coinsPerWeek: 110,
    gemsPerWeek: 16,
  },
  grinder: {
    coinsPerWeek: 150,
    gemsPerWeek: 24,
  },
};
