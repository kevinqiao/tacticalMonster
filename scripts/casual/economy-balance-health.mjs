/**
 * 平衡脚本健康判定（balance / auto 共用）。
 */

import {
  CASUAL_F2P_PASS_TARGET_BAND,
  CASUAL_F2P_PASS_TARGET_LEVELS,
  NET_FLOW_BANDS,
} from "./economy-balance-data.mjs";

export function healthStatus(value, min, max) {
  if (value < min) return "low";
  if (value > max) return "high";
  return "ok";
}

export function defaultTargetsFromConfig(profileKey, overrides = {}) {
  const t = {
    passSeasonLevels: CASUAL_F2P_PASS_TARGET_LEVELS,
    passSeasonMin: CASUAL_F2P_PASS_TARGET_BAND.min,
    passSeasonMax: CASUAL_F2P_PASS_TARGET_BAND.max,
    coinsMin: NET_FLOW_BANDS.coins.min,
    coinsMax: NET_FLOW_BANDS.coins.max,
    coinsIdeal: profileKey === "casual" ? 62 : null,
    gemsMin: NET_FLOW_BANDS.gems.min,
    gemsMax: NET_FLOW_BANDS.gems.max,
    gemsIdeal: profileKey === "casual" ? -3.6 : null,
    vouchersMin: NET_FLOW_BANDS.vouchers.min,
    vouchersMax: NET_FLOW_BANDS.vouchers.max,
    vouchersIdeal: profileKey === "casual" ? 2.3 : null,
  };
  return { ...t, ...overrides };
}

export function evaluateWeekHealth(profileKey, week, passLevelsPerSeason, targets) {
  const t = targets ?? defaultTargetsFromConfig(profileKey);
  return {
    pass: healthStatus(passLevelsPerSeason, t.passSeasonMin, t.passSeasonMax),
    coins: healthStatus(week.netCoins, t.coinsMin, t.coinsMax),
    gems: healthStatus(week.netGems, t.gemsMin, t.gemsMax),
    vouchers: healthStatus(week.netVouchers, t.vouchersMin, t.vouchersMax),
  };
}

export function isAllHealthOk(health) {
  return Object.values(health).every((v) => v === "ok");
}
