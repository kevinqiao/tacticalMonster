#!/usr/bin/env node
/**
 * Casual 平台 · 产销比（faucet / sink）平衡测算（纯离线，不连 Convex）。
 *
 * 用法：
 *   node scripts/casual/economy-balance.mjs
 *   node scripts/casual/economy-balance.mjs --profile active
 *   node scripts/casual/economy-balance.mjs --no-decay
 *   node scripts/casual/economy-balance.mjs --json
 *   node scripts/casual/economy-balance.mjs --profile casual --fail
 *
 * 调参建议：npm run casual:economy:tune
 */

import { readFileSync } from "node:fs";
import {
  CASUAL_F2P_PASS_TARGET_BAND,
  CASUAL_F2P_PASS_TARGET_LEVELS,
  CASUAL_SEASON_NOMINAL_WEEKS,
  PASS_MAX_LEVEL,
  PASS_XP_PER_LEVEL,
  PROFILES,
  computeWeekly,
  r1,
} from "./economy-balance-core.mjs";
import {
  defaultTargetsFromConfig,
  evaluateWeekHealth,
  isAllHealthOk,
} from "./economy-balance-health.mjs";

function warn(label, net, lowOk, highOk) {
  if (net > highOk) return `⚠ ${label} 净流偏高(${r1(net)})：通胀风险`;
  if (net < lowOk) return `⚠ ${label} 净流偏低(${r1(net)})：可能过紧`;
  return `✓ ${label} 净流健康(${r1(net)})`;
}

function passTargetHealth(profileKey, passLevelsPerSeason) {
  if (profileKey === "casual") {
    if (
      passLevelsPerSeason >= CASUAL_F2P_PASS_TARGET_BAND.min &&
      passLevelsPerSeason <= CASUAL_F2P_PASS_TARGET_BAND.max
    ) {
      return `✓ Pass 一季 ~${CASUAL_F2P_PASS_TARGET_LEVELS} 级（${r1(passLevelsPerSeason)}，带 ${CASUAL_F2P_PASS_TARGET_BAND.min}–${CASUAL_F2P_PASS_TARGET_BAND.max}）`;
    }
    if (passLevelsPerSeason > CASUAL_F2P_PASS_TARGET_BAND.max) {
      return `⚠ Pass 一季 ~${r1(passLevelsPerSeason)} 级（高于封顶带 ${CASUAL_F2P_PASS_TARGET_BAND.max}）`;
    }
    return `⚠ Pass 一季仅 ~${r1(passLevelsPerSeason)} 级（低于 ${CASUAL_F2P_PASS_TARGET_BAND.min}）`;
  }
  if (passLevelsPerSeason > CASUAL_F2P_PASS_TARGET_LEVELS + 4) {
    return `⚠ Pass 一季 ~${r1(passLevelsPerSeason)} 级（显著高于 F2P 锚点 ${CASUAL_F2P_PASS_TARGET_LEVELS}）`;
  }
  return `✓ Pass 一季 ~${r1(passLevelsPerSeason)} 级（高于 F2P 锚点，符合更活跃画像）`;
}

function parseArgs(argv) {
  const out = {
    useDecay: true,
    includeShopSink: true,
    asJson: false,
    fail: false,
    profile: null,
    configPath: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--no-decay") out.useDecay = false;
    else if (a === "--no-shop-sink") out.includeShopSink = false;
    else if (a === "--json") out.asJson = true;
    else if (a === "--fail") out.fail = true;
    else if (a === "--profile") out.profile = argv[++i];
    else if (a === "--config") out.configPath = argv[++i];
  }
  return out;
}

function loadConfigTargets(configPath, profileKey) {
  if (!configPath) return null;
  const cfg = JSON.parse(readFileSync(configPath, "utf8"));
  return defaultTargetsFromConfig(profileKey, cfg.targets ?? {});
}

function main() {
  const cli = parseArgs(process.argv.slice(2));
  const profiles = cli.profile ? [cli.profile] : Object.keys(PROFILES);
  const out = {};
  let unhealthy = false;

  for (const key of profiles) {
    const profile = PROFILES[key];
    if (!profile) {
      console.error(`未知 profile: ${key}`);
      process.exit(1);
    }
    const targets = loadConfigTargets(cli.configPath, key);
    const week = computeWeekly(profile, key, {
      useDecay: cli.useDecay,
      includeShopSink: cli.includeShopSink,
    });
    const passLevelsPerWeek = week.passXp / PASS_XP_PER_LEVEL;
    const passLevelsPerSeason = (week.passXp / PASS_XP_PER_LEVEL) * CASUAL_SEASON_NOMINAL_WEEKS;
    const health = evaluateWeekHealth(key, week, passLevelsPerSeason, targets);
    if (!isAllHealthOk(health)) unhealthy = true;

    out[key] = {
      label: profile.label,
      useDecay: cli.useDecay,
      includeShopSink: cli.includeShopSink,
      week,
      passLevelsPerWeek,
      passLevelsPerSeason,
      weeksToMax: PASS_MAX_LEVEL / Math.max(0.01, passLevelsPerWeek),
      health,
      targets,
    };
  }

  if (cli.asJson) {
    console.log(JSON.stringify(out, null, 2));
    if (cli.fail && unhealthy) process.exit(1);
    return;
  }

  console.log(
    `\nCasual 经济产销比测算  (XP递减: ${cli.useDecay ? "开" : "关"}; 商店sink: ${cli.includeShopSink ? "开" : "关"})`
  );
  console.log("=".repeat(64));
  for (const key of profiles) {
    const o = out[key];
    const w = o.week;
    const t = o.targets;
    const coinsBand = t ? [t.coinsMin, t.coinsMax] : [-200, 700];
    const gemsBand = t ? [t.gemsMin, t.gemsMax] : [-15, 45];
    const vouchersBand = t ? [t.vouchersMin, t.vouchersMax] : [-1, 4];

    console.log(`\n■ ${key} — ${o.label}`);
    console.log(
      `    coins   产 ${r1(w.coins)} / 耗 ${r1(w.entryCoins + w.shopSinkCoins)}` +
        ` (入场 ${r1(w.entryCoins)} + 商店 ${r1(w.shopSinkCoins)}) → 净 ${r1(w.netCoins)}`
    );
    console.log(
      `    gems    产 ${r1(w.gems)} / 耗 ${r1(w.entryGems + w.shopSinkGems)}` +
        ` (入场 ${r1(w.entryGems)} + 商店 ${r1(w.shopSinkGems)}) → 净 ${r1(w.netGems)}`
    );
    console.log(
      `    券      产 ${r1(w.vouchers)} / 耗 ${r1(w.voucherSpend)} → 净 ${r1(w.netVouchers)}`
    );
    console.log(
      `    PassXP  ${r1(w.passXp)}/周 ≈ ${r1(o.passLevelsPerWeek)} 级/周` +
        ` · 一季(${CASUAL_SEASON_NOMINAL_WEEKS}周)≈${r1(o.passLevelsPerSeason)}级` +
        ` (目标 ${CASUAL_F2P_PASS_TARGET_LEVELS})`
    );
    console.log("  [健康判定]");
    console.log("    " + warn("coins", w.netCoins, coinsBand[0], coinsBand[1]));
    console.log("    " + warn("gems", w.netGems, gemsBand[0], gemsBand[1]));
    console.log("    " + warn("券", w.netVouchers, vouchersBand[0], vouchersBand[1]));
    if (t) {
      const passLine =
        o.health.pass === "ok"
          ? `✓ Pass 一季 ${r1(o.passLevelsPerSeason)} 级（带 ${t.passSeasonMin}–${t.passSeasonMax}）`
          : `⚠ Pass 一季 ${r1(o.passLevelsPerSeason)} 级（带外 ${t.passSeasonMin}–${t.passSeasonMax}）`;
      console.log("    " + passLine);
    } else {
      console.log("    " + passTargetHealth(key, o.passLevelsPerSeason));
    }
    if (o.health) {
      console.log(
        `    health: pass=${o.health.pass} coins=${o.health.coins} gems=${o.health.gems} vouchers=${o.health.vouchers}`
      );
    }
  }
  console.log(
    "\n注：分位奖 seed p33/p66/p90；p75 金日软顶 200；A/B/C 入场 35/45/7钻；B 底奖 52 金；" +
      "商店 sink 含再战令/外观 discretionary 消耗；调参建议见 npm run casual:economy:tune"
  );

  if (cli.fail && unhealthy) {
    console.error("\n验收失败：至少一项 health 非 ok（见上方 health 行）");
    process.exit(1);
  }
}

main();
