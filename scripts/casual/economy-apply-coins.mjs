#!/usr/bin/env node
/**
 * 按 tune 金币缺口降压：p75 软顶/奖励 + A/B 底奖（8 async + p75 画像专用）。
 *
 *   npm run casual:economy:apply-coins -- --profile casual
 *   npm run casual:economy:apply-coins -- --config scripts/casual/economy-tune.example.json --write
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { computeWeekly, PROFILES } from "./economy-balance-core.mjs";
import { DEFAULT_P75, DEFAULT_TOURNAMENTS } from "./economy-balance-data.mjs";
import { loadTune, parseApplyArgs, REPO_ROOT } from "./economy-apply-common.mjs";

const PATHS = {
  seasonConstants: join(
    REPO_ROOT,
    "src/convex/casualPlatform/convex/data/casualSeasonEconomyConstants.ts"
  ),
  tournamentConfigs: join(
    REPO_ROOT,
    "src/convex/casualPlatform/convex/data/casualTournamentConfigs.ts"
  ),
};

const TIER_MATCH_TYPES = {
  A: ["tournament_a", "triathlon_a"],
  B: ["tournament_b", "triathlon_b"],
};

const TIER_CONSTANT = {
  A: "ASYNC_BASE_COINS_A",
  B: "ASYNC_BASE_COINS_B",
};

const P75_SOFT_CAP_RE = /export const DAILY_P75_COINS_SOFT_CAP = \d+;/;

/** @returns {{ skip?: boolean, reason?: string, plan?: object }} */
export function planCoinReduction(tune) {
  const coinPlan = tune.recommendations?.coins;
  if (!coinPlan) return { skip: true, reason: "无金币建议" };

  const gap = Number(coinPlan.gap);
  if (!Number.isFinite(gap) || gap > -5) {
    return { skip: true, reason: "金币净流未偏高（gap > -5）" };
  }

  const profile = tune.profile ?? PROFILES.casual;
  const ideal =
    tune.targets?.coinsIdeal ??
    (tune.targets?.coinsMin != null && tune.targets?.coinsMax != null
      ? (tune.targets.coinsMin + tune.targets.coinsMax) / 2
      : 62);

  const best = searchBestPlan(profile, ideal);
  if (!best) return { skip: true, reason: "未找到可写入的降压组合" };

  return {
    gap,
    ideal,
    plan: best,
    desc: `目标周净 ~${ideal}：p75 日软顶 ${best.cap}、参与 ${best.p75Base}/成功 ${best.p75Success}，A 底奖 ${best.targetABase}、B 底奖 ${best.targetBBase}（测算净 ${best.net}）`,
  };
}

function searchBestPlan(profile, target) {
  let best = null;

  for (let cap = 0; cap <= 60; cap += 4) {
    for (let aD = -10; aD <= 0; aD++) {
      for (let bD = -6; bD <= 0; bD++) {
        for (const scale of [0, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35]) {
          const net = simulateNet(profile, { cap, aD, bD, scale });
          const err = Math.abs(net - target);
          const penalty = Math.abs(aD) * 3 + Math.abs(bD) * 2 - scale * 8;
          const score = (err <= 5 ? err * 10 : err * 1000) + penalty;
          const bestScore = best ? (best.err <= 5 ? best.err * 10 : best.err * 1000) + best.penalty : Infinity;
          if (score < bestScore) {
            best = {
              err,
              cap,
              aD,
              bD,
              scale,
              net,
              penalty,
              targetABase: DEFAULT_TOURNAMENTS.A.baseCoins + aD,
              targetBBase: DEFAULT_TOURNAMENTS.B.baseCoins + bD,
              p75Base: Math.max(0, Math.round(DEFAULT_P75.baseCoins * scale)),
              p75Success: Math.max(0, Math.round(DEFAULT_P75.successCoins * scale)),
            };
          }
        }
      }
    }
  }

  return best;
}

function simulateNet(profile, { cap, aD, bD, scale }) {
  const tournaments = {
    A: { ...DEFAULT_TOURNAMENTS.A, baseCoins: DEFAULT_TOURNAMENTS.A.baseCoins + aD },
    B: { ...DEFAULT_TOURNAMENTS.B, baseCoins: DEFAULT_TOURNAMENTS.B.baseCoins + bD },
    C: DEFAULT_TOURNAMENTS.C,
  };
  const p75 = {
    ...DEFAULT_P75,
    baseCoins: Math.max(0, Math.round(DEFAULT_P75.baseCoins * scale)),
    successCoins: Math.max(0, Math.round(DEFAULT_P75.successCoins * scale)),
  };
  const w = computeWeekly(profile, "casual", { tournaments, p75, p75DailyCap: cap });
  return w.netCoins;
}

function readExportInt(content, name) {
  const m = content.match(new RegExp(`export const ${name} = (\\d+)`));
  if (!m) throw new Error(`未找到 ${name}`);
  return Number(m[1]);
}

function setExportInt(content, name, value) {
  const re = new RegExp(`(export const ${name} = )\\d+(;)`);
  if (!re.test(content)) throw new Error(`未找到 ${name}`);
  return content.replace(re, `$1${value}$2`);
}

function applyAsyncBaseCoinsAbsolute(content, tier, target) {
  return setExportInt(content, TIER_CONSTANT[tier], Math.max(0, target));
}

function applyBaseCoinsAbsoluteInTournamentConfigs(content, tier, target) {
  const matchTypes = TIER_MATCH_TYPES[tier];
  const lines = content.split("\n");
  let currentMatchType = null;
  let changes = 0;
  const out = [];

  for (const line of lines) {
    const mMatch = line.match(/matchType:\s*"([^"]+)"/);
    if (mMatch) currentMatchType = mMatch[1];

    const mBase = line.match(/^(\s*)baseRewards:\s*\{\s*coins:\s*(\d+)/);
    if (mBase && currentMatchType && matchTypes.includes(currentMatchType)) {
      changes += 1;
      out.push(line.replace(/coins:\s*\d+/, `coins: ${target}`));
      continue;
    }
    out.push(line);
  }

  return { content: out.join("\n"), changes };
}

function applyP75SoftCap(content, cap) {
  const replacement = `export const DAILY_P75_COINS_SOFT_CAP = ${cap};`;
  if (!P75_SOFT_CAP_RE.test(content)) {
    throw new Error("未找到 DAILY_P75_COINS_SOFT_CAP");
  }
  return content.replace(P75_SOFT_CAP_RE, replacement);
}

function applyP75RewardsInTournamentConfigs(content, baseCoins, successCoins) {
  const lines = content.split("\n");
  let currentMatchType = null;
  let baseChanges = 0;
  let successChanges = 0;
  const out = [];

  for (const line of lines) {
    const mMatch = line.match(/matchType:\s*"([^"]+)"/);
    if (mMatch) currentMatchType = mMatch[1];

    if (currentMatchType === "solo_p75_challenge") {
      const mBase = line.match(/^(\s*)baseRewards:\s*\{\s*coins:\s*(\d+)/);
      if (mBase) {
        baseChanges += 1;
        out.push(line.replace(/coins:\s*\d+/, `coins: ${baseCoins}`));
        continue;
      }
      const mSuccess = line.match(/^(\s*)seedQuantileSuccess:\s*\{\s*quantile:\s*"p75",\s*coins:\s*(\d+)\s*\},?\s*$/);
      if (mSuccess) {
        successChanges += 1;
        out.push(`${mSuccess[1]}seedQuantileSuccess: { quantile: "p75", coins: ${successCoins} },`);
        continue;
      }
    }
    out.push(line);
  }

  return { content: out.join("\n"), baseChanges, successChanges };
}

function printHelp() {
  console.log(`
Casual 经济 · 按 tune 降压金币（p75 软顶/奖励 + A/B 底奖）

  npm run casual:economy:apply-coins -- --profile casual
  npm run casual:economy:apply-coins -- --config scripts/casual/economy-tune.example.json --write

仅当金币净流偏高（gap < -5）时写入。与 apply-wallet（只抬币）互补。

写入：
  - casualSeasonEconomyConstants.ts   DAILY_P75_COINS_SOFT_CAP、ASYNC_BASE_COINS_A/B
  - casualTournamentConfigs.ts        p75 参与/成功奖、A/B 底奖

写入后：npm run casual:economy:sync && npm run casual:economy:balance
`);
}

function main() {
  const cli = parseApplyArgs(process.argv.slice(2));
  if (cli.help) {
    printHelp();
    return;
  }

  const tune = loadTune(cli);
  const result = planCoinReduction(tune);

  console.log("Casual 经济 apply-coins");
  console.log("=".repeat(56));
  console.log(`模式: ${cli.write ? "写入" : "dry-run"}`);
  console.log(`Tune 画像: ${tune.profileKey ?? "?"}`);
  console.log("");

  if (result.skip) {
    console.log(`跳过金币降压: ${result.reason}`);
    return;
  }

  const { plan } = result;
  const p75Base = plan.p75Base;
  const p75Success = plan.p75Success;

  console.log(`■ ${result.desc}`);
  console.log(`    p75: baseCoins=${p75Base}, successCoins=${p75Success}, 日软顶=${plan.cap}`);
  console.log(`    A 底奖 → ${plan.targetABase} · B 底奖 → ${plan.targetBBase}`);
  console.log("");

  const constBefore = readFileSync(PATHS.seasonConstants, "utf8");
  const tourBefore = readFileSync(PATHS.tournamentConfigs, "utf8");

  let constAfter = applyP75SoftCap(constBefore, plan.cap);
  constAfter = applyAsyncBaseCoinsAbsolute(constAfter, "A", plan.targetABase);
  constAfter = applyAsyncBaseCoinsAbsolute(constAfter, "B", plan.targetBBase);

  let tourAfter = tourBefore;
  const p75Result = applyP75RewardsInTournamentConfigs(tourAfter, p75Base, p75Success);
  tourAfter = p75Result.content;
  const tourA = applyBaseCoinsAbsoluteInTournamentConfigs(tourAfter, "A", plan.targetABase);
  tourAfter = tourA.content;
  const tourB = applyBaseCoinsAbsoluteInTournamentConfigs(tourAfter, "B", plan.targetBBase);
  tourAfter = tourB.content;

  console.log(`    p75 模板: base ${p75Result.baseChanges} 处, success ${p75Result.successChanges} 处`);
  console.log(`    A/B 底奖: ${tourA.changes + tourB.changes} 处`);

  if (!cli.write) {
    console.log("\n以上为计划变更。确认后加 --write 写入。");
    return;
  }

  if (constBefore !== constAfter) {
    writeFileSync(PATHS.seasonConstants, constAfter, "utf8");
    console.log(`已写入 ${PATHS.seasonConstants}`);
  }
  if (tourBefore !== tourAfter) {
    writeFileSync(PATHS.tournamentConfigs, tourAfter, "utf8");
    console.log(`已写入 ${PATHS.tournamentConfigs}`);
  }

  console.log("\n下一步: npm run casual:economy:sync && npm run casual:economy:balance");
}

main();
