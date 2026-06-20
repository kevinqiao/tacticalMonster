#!/usr/bin/env node
/**
 * 按 economy:tune 金币建议写配表（默认仅抬 A 底奖，单旋钮）。
 *
 *   npm run casual:economy:apply-wallet -- --config scripts/casual/economy-tune.example.json
 *   npm run casual:economy:apply-wallet -- --from tune.json --write
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");

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

function parseArgs(argv) {
  const out = { write: false, fromPath: null, forward: [], help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--write") out.write = true;
    else if (a === "--dry-run") out.write = false;
    else if (a === "--from") out.fromPath = argv[++i];
    else if (a === "--help" || a === "-h") out.help = true;
    else out.forward.push(a);
  }
  return out;
}

function runTuneJson(forwardArgs) {
  const tuneScript = join(__dirname, "economy-tune.mjs");
  const json = execFileSync(process.execPath, [tuneScript, ...forwardArgs, "--json"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return JSON.parse(json);
}

function loadTune(cli) {
  if (cli.fromPath) return JSON.parse(readFileSync(cli.fromPath, "utf8"));
  return runTuneJson(cli.forward);
}

function planCoinDelta(tune) {
  const coinPlan = tune.recommendations?.coins;
  if (!coinPlan) return null;

  const gap = Number(coinPlan.gap);
  if (!Number.isFinite(gap) || Math.abs(gap) < 5) {
    return { skip: true, reason: "金币净流已接近目标（|gap| < 5）" };
  }

  const daily = tune.profile?.daily ?? {};
  const weeklyA = (daily.A ?? 0) * 7;
  const weeklyB = (daily.B ?? 0) * 7;

  if (gap > 0) {
    if (weeklyA > 0) {
      const delta = Math.ceil(gap / weeklyA);
      return {
        tier: "A",
        delta,
        gap,
        weeklyGames: weeklyA,
        desc: `A baseCoins +${delta}（周 ${weeklyA} 局，约补周净 +${gap}）`,
      };
    }
    if (weeklyB > 0) {
      const delta = Math.ceil(gap / weeklyB);
      return {
        tier: "B",
        delta,
        gap,
        weeklyGames: weeklyB,
        desc: `B baseCoins +${delta}（周 ${weeklyB} 局，约补周净 +${gap}）`,
      };
    }
    return { skip: true, reason: "无 A/B 日局数，无法自动抬底奖" };
  }

  return {
    skip: true,
    reason: `金币净流偏高（gap ${gap}），请手调入场或商店 sink`,
  };
}

function applyAsyncBaseCoinsConstant(content, tier, delta) {
  const name = TIER_CONSTANT[tier];
  const re = new RegExp(`(export const ${name} = )(\\d+)(;)`);
  const next = content.replace(re, (_, p1, n, p3) => `${p1}${Number(n) + delta}${p3}`);
  if (next === content) throw new Error(`未找到 ${name}（casualSeasonEconomyConstants.ts）`);
  return next;
}

function applyBaseCoinsInTournamentConfigs(content, tier, delta) {
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
      const newVal = Number(mBase[2]) + delta;
      changes += 1;
      out.push(line.replace(/coins:\s*\d+/, `coins: ${newVal}`));
      continue;
    }
    out.push(line);
  }

  return { content: out.join("\n"), changes };
}

function printHelp() {
  console.log(`
Casual 经济 · 按 tune 建议写金币底奖（默认 A 档单旋钮）

  npm run casual:economy:apply-wallet -- --config scripts/casual/economy-tune.example.json
  npm run casual:economy:apply-wallet -- --config ... --write

选项：
  --write / --dry-run     是否写入（默认 dry-run）
  --from <tune.json>      使用已保存 tune --json，不再重跑 tune
  其余参数透传给 economy:tune（与 apply-tune 相同）

写入：
  - casualSeasonEconomyConstants.ts   ASYNC_BASE_COINS_A|B
  - casualTournamentConfigs.ts        tournament_a|triathlon_a（或 B 档）底奖

写入后：npm run casual:economy:sync && npm run casual:economy:balance
`);
}

function main() {
  const cli = parseArgs(process.argv.slice(2));
  if (cli.help) {
    printHelp();
    return;
  }

  const tune = loadTune(cli);
  const plan = planCoinDelta(tune);

  console.log("Casual 经济 apply-wallet");
  console.log("=".repeat(56));
  console.log(`模式: ${cli.write ? "写入" : "dry-run"}`);
  console.log(`Tune 画像: ${tune.profileKey ?? "?"}`);
  console.log("");

  if (!plan || plan.skip) {
    console.log(`跳过钱包写表: ${plan?.reason ?? "无金币建议"}`);
    return;
  }

  console.log(`■ ${plan.desc}`);
  console.log(`    档位: ${plan.tier} · 常量 ${TIER_CONSTANT[plan.tier]} +${plan.delta}`);
  console.log("");

  const constBefore = readFileSync(PATHS.seasonConstants, "utf8");
  const tourBefore = readFileSync(PATHS.tournamentConfigs, "utf8");

  const constAfter = applyAsyncBaseCoinsConstant(constBefore, plan.tier, plan.delta);
  const tourResult = applyBaseCoinsInTournamentConfigs(tourBefore, plan.tier, plan.delta);

  console.log(`    ${TIER_CONSTANT[plan.tier]}: 已计划 +${plan.delta}`);
  console.log(`    casualTournamentConfigs: ${tourResult.changes} 处 baseRewards.coins`);

  if (!cli.write) {
    console.log("\n以上为计划变更。确认后加 --write 写入。");
    return;
  }

  if (constBefore !== constAfter) {
    writeFileSync(PATHS.seasonConstants, constAfter, "utf8");
    console.log(`已写入 ${PATHS.seasonConstants}`);
  }
  if (tourBefore !== tourResult.content) {
    writeFileSync(PATHS.tournamentConfigs, tourResult.content, "utf8");
    console.log(`已写入 ${PATHS.tournamentConfigs}`);
  }

  console.log("\n下一步: npm run casual:economy:sync && npm run casual:economy:balance");
}

main();
