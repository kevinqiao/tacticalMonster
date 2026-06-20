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
export const DAILY_P75_COINS_SOFT_CAP = 200;

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
    entryCoins: 35,
    baseCoins: 23,
    baseGems: 0,
    passXp: 4,
    expectScoreTierCoins: 3.4,
  },
  B: {
    entryCoins: 45,
    baseCoins: 52,
    baseGems: 0,
    passXp: 5,
    expectScoreTierCoins: 5.4,
  },
  C: {
    entryGems: 7,
    baseCoins: 0,
    baseGems: 6,
    passXp: 8,
    expectScoreTierGems: 0.82,
  },
};

export const DEFAULT_P75 = {
  baseCoins: 8,
  successCoins: 40,
  passXp: 2,
};

export const SIGN_IN = {
  coins: 15,
  passXp: 8,
};

export const DEFAULT_XP_DECAY_BY_ORDINAL = [1, 1, 1, 1, 1, 1, 1, 1, 0];

/** 日任务 Pass XP（不含签到） */
export const DAILY_MISSION_PASS_XP = 65;

export const DEFAULT_WEEKLY = {
  leagueEndCoinsExpect: 25,
  leagueEndGemsExpect: 0.4,
  leaguePromoteVoucherExpect: 0.5,
  missionVouchersExpect: 4.5,
  passFreeVouchersPerWeek: 0.6,
  passFreeCoinsPerWeek: 35,
  missionPassXp: 290,
  seasonMissionPassXpPerWeek: 26.666666666666668 /* season_runs_60 / CASUAL_SEASON_NOMINAL_WEEKS */,
};

export const SEASON_CHALLENGE_VOUCHER_COST = 2;

export const SHOP_SINK_BY_PROFILE = {
  casual: {
    coinsPerWeek: 35,
    gemsPerWeek: 6,
  },
  active: {
    coinsPerWeek: 55,
    gemsPerWeek: 8,
  },
  grinder: {
    coinsPerWeek: 75,
    gemsPerWeek: 12,
  },
};
