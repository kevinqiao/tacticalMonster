/**
 * Casual 经济平衡 · 共享常量与测算（供 balance / tune 脚本复用）。
 * 配表常量见 economy-balance-data.mjs（npm run casual:economy:sync 从 Convex 配表生成）。
 */

import {
  CASUAL_F2P_PASS_TARGET_BAND,
  CASUAL_F2P_PASS_TARGET_LEVELS,
  CASUAL_SEASON_NOMINAL_WEEKS,
  DAILY_P75_COINS_SOFT_CAP,
  DEFAULT_P75,
  DEFAULT_TOURNAMENTS,
  DEFAULT_WEEKLY,
  DEFAULT_XP_DECAY_BY_ORDINAL,
  DAILY_MISSION_PASS_XP,
  NET_FLOW_BANDS,
  PASS_MAX_LEVEL,
  PASS_XP_PER_LEVEL,
  SEASON_CHALLENGE_VOUCHER_COST,
  SHOP_SINK_BY_PROFILE,
  SIGN_IN,
} from "./economy-balance-data.mjs";

export {
  CASUAL_F2P_PASS_TARGET_BAND,
  CASUAL_F2P_PASS_TARGET_LEVELS,
  CASUAL_SEASON_NOMINAL_WEEKS,
  DAILY_P75_COINS_SOFT_CAP,
  DEFAULT_P75,
  DEFAULT_TOURNAMENTS,
  DEFAULT_WEEKLY,
  DEFAULT_XP_DECAY_BY_ORDINAL,
  DAILY_MISSION_PASS_XP,
  NET_FLOW_BANDS,
  PASS_MAX_LEVEL,
  PASS_XP_PER_LEVEL,
  SEASON_CHALLENGE_VOUCHER_COST,
  SHOP_SINK_BY_PROFILE,
  SIGN_IN,
};

export const PROFILES = {
  casual: {
    label: "中度 8 局 async + 3 局 p75/日",
    daily: { A: 4, B: 3, C: 1, p75: 3, signIn: true, winRate: 0.45 },
    spotlightPerWeek: 1,
    completesWeeklyMissions: 0.7,
  },
  active: {
    label: "活跃（每日 ~8 局）",
    daily: { A: 4, B: 3, C: 1, p75: 1, signIn: true, winRate: 0.5 },
    spotlightPerWeek: 2,
    completesWeeklyMissions: 0.85,
  },
  grinder: {
    label: "硬核（每日 ~14 局）",
    daily: { A: 6, B: 5, C: 3, p75: 2, signIn: true, winRate: 0.55 },
    spotlightPerWeek: 3,
    completesWeeklyMissions: 1,
  },
};

export function decayMultiplier(ordinal, table) {
  const i = Math.max(0, Math.floor(ordinal));
  return i < table.length ? table[i] : table[table.length - 1];
}

export function simulateP75Coins(games, successRate, cap = DAILY_P75_COINS_SOFT_CAP, p75 = DEFAULT_P75) {
  let granted = 0;
  for (let i = 0; i < games; i++) {
    const raw = p75.baseCoins + p75.successCoins * successRate;
    const left = Math.max(0, cap - granted);
    granted += Math.min(raw, left);
  }
  return granted;
}

/**
 * @param {object} opts
 * @param {object} opts.profile
 * @param {object} [opts.tournaments]
 * @param {object} [opts.p75]
 * @param {number[]} [opts.xpDecay]
 * @param {object} [opts.weekly]
 * @param {boolean} [opts.useDecay=true]
 */
export function computeDaily(profile, opts = {}) {
  const tournaments = opts.tournaments ?? DEFAULT_TOURNAMENTS;
  const p75Cfg = opts.p75 ?? DEFAULT_P75;
  const xpDecay = opts.xpDecay ?? DEFAULT_XP_DECAY_BY_ORDINAL;
  const useDecay = opts.useDecay ?? true;
  const weekly = opts.weekly ?? DEFAULT_WEEKLY;
  void weekly;

  const d = profile.daily;
  let coins = 0;
  let gems = 0;
  let passXp = 0;
  let passXpFromGames = 0;
  let entryCoins = 0;
  let entryGems = 0;
  let asyncGames = 0;
  let gamesByTier = { A: 0, B: 0, C: 0, p75: 0 };

  let asyncOrdinal = 0;
  for (const key of ["A", "B", "C"]) {
    const t = tournaments[key];
    const n = d[key] ?? 0;
    gamesByTier[key] = n;
    asyncGames += n;
    for (let i = 0; i < n; i++) {
      entryCoins += t.entryCoins ?? 0;
      entryGems += t.entryGems ?? 0;
      const xpDecayMult = useDecay ? decayMultiplier(asyncOrdinal, xpDecay) : 1;
      asyncOrdinal += 1;
      const winMult = 0.8 + 0.4 * d.winRate;
      const rawCoins = ((t.baseCoins ?? 0) + (t.expectScoreTierCoins ?? 0)) * winMult;
      const rawGems = ((t.baseGems ?? 0) + (t.expectScoreTierGems ?? 0)) * winMult;
      coins += Math.floor(rawCoins);
      gems += Math.floor(rawGems);
      const gamePass = Math.floor((t.passXp ?? 0) * xpDecayMult);
      passXp += gamePass;
      passXpFromGames += gamePass;
    }
  }

  const p75SuccessRate = d.winRate * 0.5 + 0.25;
  const p75Cap = opts.p75DailyCap ?? DAILY_P75_COINS_SOFT_CAP;
  coins += simulateP75Coins(d.p75 ?? 0, p75SuccessRate, p75Cap, p75Cfg);
  gamesByTier.p75 = d.p75 ?? 0;
  let p75Ordinal = 0;
  for (let i = 0; i < (d.p75 ?? 0); i++) {
    const xpDecayMult = useDecay ? decayMultiplier(p75Ordinal, xpDecay) : 1;
    p75Ordinal += 1;
    const gamePass = Math.floor(p75Cfg.passXp * xpDecayMult);
    passXp += gamePass;
    passXpFromGames += gamePass;
  }

  let passXpFromSignIn = 0;
  if (d.signIn) {
    coins += SIGN_IN.coins;
    passXp += SIGN_IN.passXp;
    passXpFromSignIn = SIGN_IN.passXp;
  }

  const passXpFromDailyMissions = DAILY_MISSION_PASS_XP;
  passXp += passXpFromDailyMissions;

  return {
    coins,
    gems,
    passXp,
    passXpFromGames,
    passXpFromSignIn,
    passXpFromDailyMissions,
    entryCoins,
    entryGems,
    netCoins: coins - entryCoins,
    netGems: gems - entryGems,
    asyncGames,
    gamesByTier,
  };
}

/**
 * @param {object} profile
 * @param {string} [profileKey]
 * @param {object} [opts] - same as computeDaily opts + includeShopSink, shopSink
 */
export function computeWeekly(profile, profileKey = "custom", opts = {}) {
  const weekly = opts.weekly ?? DEFAULT_WEEKLY;
  const useDecay = opts.useDecay ?? true;
  const includeShopSink = opts.includeShopSink ?? true;
  const day = computeDaily(profile, opts);
  const days = 7;
  const missionMult = profile.completesWeeklyMissions ?? 1;

  let coins = day.coins * days;
  let gems = day.gems * days;
  let passXp = day.passXp * days;
  let entryCoins = day.entryCoins * days;
  let entryGems = day.entryGems * days;

  coins += weekly.leagueEndCoinsExpect + weekly.passFreeCoinsPerWeek;
  gems += weekly.leagueEndGemsExpect;

  const weeklyMissionPassXp = weekly.missionPassXp * missionMult + weekly.seasonMissionPassXpPerWeek;
  passXp += weeklyMissionPassXp;

  const vouchers =
    weekly.leaguePromoteVoucherExpect +
    weekly.missionVouchersExpect * missionMult +
    weekly.passFreeVouchersPerWeek;
  const voucherSpend = (profile.spotlightPerWeek ?? 0) * SEASON_CHALLENGE_VOUCHER_COST;

  const shopSink =
    includeShopSink
      ? (opts.shopSink ??
          SHOP_SINK_BY_PROFILE[profileKey] ??
          SHOP_SINK_BY_PROFILE.casual ??
          { coinsPerWeek: 0, gemsPerWeek: 0 })
      : { coinsPerWeek: 0, gemsPerWeek: 0 };

  return {
    coins,
    gems,
    passXp,
    passXpFromGamesPerWeek: day.passXpFromGames * days,
    passXpFromDailyPerWeek: (day.passXpFromSignIn + day.passXpFromDailyMissions) * days,
    weeklyMissionPassXp,
    entryCoins,
    entryGems,
    shopSinkCoins: shopSink.coinsPerWeek,
    shopSinkGems: shopSink.gemsPerWeek,
    netCoins: coins - entryCoins - shopSink.coinsPerWeek,
    netGems: gems - entryGems - shopSink.gemsPerWeek,
    netCoinsBeforeShop: coins - entryCoins,
    netGemsBeforeShop: gems - entryGems,
    vouchers,
    voucherSpend,
    netVouchers: vouchers - voucherSpend,
    day,
  };
}

export function r1(n) {
  return Math.round(n * 10) / 10;
}

export function buildDecayForFullXpGames(fullXpGames, tailZero = true) {
  const n = Math.max(1, Math.floor(fullXpGames));
  const table = Array(n).fill(1);
  if (tailZero) table.push(0);
  return table;
}
