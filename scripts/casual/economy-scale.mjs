#!/usr/bin/env node
/**
 * 按倍数 K 缩放钱包相关产销（入场、底奖、分位奖、p75、任务币/券、商店、周联赛尾奖等）。
 * 默认不缩放 Pass XP（--scale-pass-xp 可开）。
 *
 *   npm run casual:economy:scale -- --factor 2
 *   npm run casual:economy:scale -- --factor 2 --write
 *   npm run casual:economy:scale -- --factor 1.5 --write --scale-vouchers
 */

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
  missionTemplates: join(
    REPO_ROOT,
    "src/convex/casualPlatform/convex/data/casualMissionTemplates.ts"
  ),
  shopCatalog: join(
    REPO_ROOT,
    "src/convex/casualPlatform/convex/data/casualShopCatalog.ts"
  ),
  weeklyLeague: join(
    REPO_ROOT,
    "src/convex/casualPlatform/convex/data/casualWeeklyLeagueConfig.ts"
  ),
  snapshot: join(__dirname, "economy-config-snapshot.ts"),
};

function parseArgs(argv) {
  const out = {
    factor: null,
    write: false,
    scaleVouchers: false,
    scalePassXp: false,
    scaleSnapshotAnchors: true,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--write") out.write = true;
    else if (a === "--dry-run") out.write = false;
    else if (a === "--factor") out.factor = Number(argv[++i]);
    else if (a === "--scale-vouchers") out.scaleVouchers = true;
    else if (a === "--scale-pass-xp") out.scalePassXp = true;
    else if (a === "--no-snapshot-anchors") out.scaleSnapshotAnchors = false;
    else if (a === "--help" || a === "-h") out.help = true;
  }
  return out;
}

function scaleInt(n, factor) {
  return Math.max(0, Math.floor(Number(n) * factor));
}

function replaceScaled(content, pattern, factor) {
  let count = 0;
  const next = content.replace(pattern, (match, ...args) => {
    count += 1;
    const groups =
      args.length >= 2 && typeof args[args.length - 1] === "string"
        ? args.slice(0, -2)
        : args;
    if (groups.length === 3) {
      return `${groups[0]}${scaleInt(groups[1], factor)}${groups[2]}`;
    }
    if (groups.length === 1) {
      return match.replace(String(groups[0]), String(scaleInt(groups[0], factor)));
    }
    return match;
  });
  return { content: next, count };
}

function scaleSeasonConstants(content, factor) {
  let c = content;
  let total = 0;
  const rules = [
    [/^(export const DAILY_P75_COINS_SOFT_CAP = )(\d+)(;)/m, "DAILY_P75_COINS_SOFT_CAP"],
    [/^(export const ASYNC_ENTRY_COINS_A = )(\d+)(;)/m, "ASYNC_ENTRY_COINS_A"],
    [/^(export const ASYNC_ENTRY_COINS_B = )(\d+)(;)/m, "ASYNC_ENTRY_COINS_B"],
    [/^(export const ASYNC_ENTRY_GEMS_C = )(\d+)(;)/m, "ASYNC_ENTRY_GEMS_C"],
    [/^(export const ASYNC_BASE_COINS_A = )(\d+)(;)/m, "ASYNC_BASE_COINS_A"],
    [/^(export const ASYNC_BASE_COINS_B = )(\d+)(;)/m, "ASYNC_BASE_COINS_B"],
    [/^(export const ASYNC_BASE_GEMS_C = )(\d+)(;)/m, "ASYNC_BASE_GEMS_C"],
    [/coinsPerWeek: (\d+)/g, "shop sink coins"],
    [/gemsPerWeek: (\d+)/g, "shop sink gems"],
  ];
  const details = [];
  for (const [re, name] of rules) {
    const r = replaceScaled(c, re, factor);
    c = r.content;
    if (r.count) details.push(`${name}: ${r.count}`);
    total += r.count;
  }
  return { content: c, total, details };
}

function scaleTournamentConfigs(content, factor, opts) {
  let c = content;
  let total = 0;
  const details = [];

  const rules = [
    [/kind: "coins", amount: (\d+)/g, "entry coins"],
    [/kind: "gems", amount: (\d+)/g, "entry gems"],
    [/baseRewards: \{ coins: (\d+)/g, "baseRewards.coins"],
    [/baseRewards: \{ coins: \d+, gems: (\d+)/g, "baseRewards.gems"],
    [/baseRewards: \{ coins: 0, gems: (\d+)/g, "baseRewards.gems-only"],
    [/seedQuantileSuccess: \{ quantile: "p75", coins: (\d+)/g, "p75 success coins"],
    [/\{ quantile: "p\d+", coins: (\d+)/g, "score tier coins"],
    [/\{ quantile: "p\d+", gems: (\d+)/g, "score tier gems"],
  ];

  for (const [re, name] of rules) {
    const r = replaceScaled(c, re, factor);
    c = r.content;
    if (r.count) details.push(`${name}: ${r.count}`);
    total += r.count;
  }

  if (opts.scaleVouchers) {
    const v = replaceScaled(c, /kind: "seasonVouchers", amount: (\d+)/g, factor);
    c = v.content;
    if (v.count) details.push(`seasonVouchers entry: ${v.count}`);
    total += v.count;
  }

  if (opts.scalePassXp) {
    let passCount = 0;
    c = c.replace(/^(\s*)seasonXpOnSettle: (\d+),$/gm, (match, indent, n) => {
      passCount += 1;
      return `${indent}seasonXpOnSettle: ${scaleInt(n, factor)},`;
    });
    if (passCount) details.push(`seasonXpOnSettle: ${passCount}`);
    total += passCount;
  }

  return { content: c, total, details };
}

function scaleMissionTemplates(content, factor, scaleVouchers) {
  let c = content;
  let total = 0;
  const details = [];
  const coins = replaceScaled(c, /rewardCoins: (\d+)/g, factor);
  c = coins.content;
  if (coins.count) details.push(`rewardCoins: ${coins.count}`);
  total += coins.count;
  if (scaleVouchers) {
    const v = replaceScaled(c, /rewardVouchers: (\d+)/g, factor);
    c = v.content;
    if (v.count) details.push(`rewardVouchers: ${v.count}`);
    total += v.count;
  }
  return { content: c, total, details };
}

function scaleShopCatalog(content, factor) {
  let c = content;
  let total = 0;
  const details = [];
  for (const [re, name] of [
    [/priceCoins: (\d+)/g, "priceCoins"],
    [/priceGems: (\d+)/g, "priceGems"],
    [/grantCoins: (\d+)/g, "grantCoins"],
    [/grantGems: (\d+)/g, "grantGems"],
  ]) {
    const r = replaceScaled(c, re, factor);
    c = r.content;
    if (r.count) details.push(`${name}: ${r.count}`);
    total += r.count;
  }
  return { content: c, total, details };
}

function scaleWeeklyLeague(content, factor, scaleVouchers) {
  let c = content;
  let total = 0;
  const details = [];

  let rankBoth = 0;
  c = c.replace(/return \{ coins: (\d+), gems: (\d+) \}/g, (_, co, ge) => {
    rankBoth += 1;
    return `return { coins: ${scaleInt(co, factor)}, gems: ${scaleInt(ge, factor)} }`;
  });
  if (rankBoth) details.push(`league rank coins+gems: ${rankBoth}`);
  total += rankBoth;

  let rankCoins = 0;
  c = c.replace(/return \{ coins: (\d+) \}/g, (match, n) => {
    rankCoins += 1;
    return `return { coins: ${scaleInt(n, factor)} }`;
  });
  if (rankCoins) details.push(`league rank coins: ${rankCoins}`);
  total += rankCoins;

  if (scaleVouchers) {
    const v = replaceScaled(
      c,
      /^(export const WEEKLY_LEAGUE_PROMOTION_VOUCHER = )(\d+)(;)/m,
      factor
    );
    c = v.content;
    if (v.count) details.push(`WEEKLY_LEAGUE_PROMOTION_VOUCHER`);
    total += v.count;
  }

  return { content: c, total, details };
}

function scaleSnapshotAnchors(content, factor) {
  let c = content;
  let total = 0;
  const details = [];
  for (const [re, name] of [
    [/leagueEndCoinsExpect: (\d+)/g, "leagueEndCoinsExpect"],
    [/passFreeCoinsPerWeek: (\d+)/g, "passFreeCoinsPerWeek"],
    [/missionVouchersExpect: ([\d.]+)/g, "missionVouchersExpect"],
  ]) {
    const r = replaceScaled(c, re, factor);
    c = r.content;
    if (r.count) details.push(`${name}: ${r.count}`);
    total += r.count;
  }
  // gems 0.4 -> scale and keep one decimal
  c = c.replace(/leagueEndGemsExpect: ([\d.]+)/g, (_, n) => {
    total += 1;
    return `leagueEndGemsExpect: ${Math.round(Number(n) * factor * 10) / 10}`;
  });
  if (total) details.push("leagueEndGemsExpect");
  return { content: c, total, details };
}

function printHelp() {
  console.log(`
Casual 经济 · 钱包产销倍数缩放

  npm run casual:economy:scale -- --factor 2
  npm run casual:economy:scale -- --factor 2 --write
  npm run casual:economy:scale -- --factor 1.5 --write --scale-vouchers

选项：
  --factor <K>           倍数（必填，如 2、1.5）
  --write                写入文件（默认 dry-run）
  --scale-vouchers       同时缩放券（专场入场、任务券、周联赛晋级券）
  --scale-pass-xp        同时缩放 seasonXpOnSettle（默认不动，Pass 仍 ~12 级）
  --no-snapshot-anchors  不缩放 economy-config-snapshot 内周锚点

缩放范围（运行时 SSOT）：
  casualSeasonEconomyConstants · casualTournamentConfigs · casualMissionTemplates
  casualShopCatalog · casualWeeklyLeagueConfig · economy-config-snapshot（周锚点）

写入后：
  npm run casual:economy:sync
  npm run casual:economy:balance
`);
}

function main() {
  const cli = parseArgs(process.argv.slice(2));
  if (cli.help) {
    printHelp();
    return;
  }
  if (!cli.factor || !Number.isFinite(cli.factor) || cli.factor <= 0) {
    console.error("请指定 --factor（正数），例如 --factor 2");
    process.exit(1);
  }

  const factor = cli.factor;
  const opts = { scaleVouchers: cli.scaleVouchers, scalePassXp: cli.scalePassXp };

  console.log("Casual 经济 scale");
  console.log("=".repeat(48));
  console.log(`倍数 K = ${factor} · 模式: ${cli.write ? "写入" : "dry-run"}`);
  console.log(
    `券: ${cli.scaleVouchers ? "缩放" : "不缩放"} · Pass XP: ${cli.scalePassXp ? "缩放" : "不缩放"}`
  );
  console.log("");

  const jobs = [
    {
      name: "casualSeasonEconomyConstants.ts",
      path: PATHS.seasonConstants,
      run: (c) => scaleSeasonConstants(c, factor),
    },
    {
      name: "casualTournamentConfigs.ts",
      path: PATHS.tournamentConfigs,
      run: (c) => scaleTournamentConfigs(c, factor, opts),
    },
    {
      name: "casualMissionTemplates.ts",
      path: PATHS.missionTemplates,
      run: (c) => scaleMissionTemplates(c, factor, cli.scaleVouchers),
    },
    {
      name: "casualShopCatalog.ts",
      path: PATHS.shopCatalog,
      run: (c) => scaleShopCatalog(c, factor),
    },
    {
      name: "casualWeeklyLeagueConfig.ts",
      path: PATHS.weeklyLeague,
      run: (c) => scaleWeeklyLeague(c, factor, cli.scaleVouchers),
    },
  ];

  if (cli.scaleSnapshotAnchors) {
    jobs.push({
      name: "economy-config-snapshot.ts",
      path: PATHS.snapshot,
      run: (c) => scaleSnapshotAnchors(c, factor),
    });
  }

  const writes = [];
  for (const job of jobs) {
    const before = readFileSync(job.path, "utf8");
    const result = job.run(before);
    console.log(`■ ${job.name}`);
    if (result.details?.length) {
      for (const d of result.details) console.log(`    ${d}`);
    }
    console.log(`    替换约 ${result.total} 处`);
    if (before !== result.content) writes.push({ path: job.path, after: result.content });
    else console.log("    （无变化）");
    console.log("");
  }

  if (!writes.length) {
    console.log("没有文件需要更新。");
    return;
  }

  if (!cli.write) {
    console.log("以上为计划变更。确认后加 --write 写入。");
    console.log("然后: npm run casual:economy:sync && npm run casual:economy:balance");
    return;
  }

  for (const w of writes) {
    writeFileSync(w.path, w.after, "utf8");
    console.log(`已写入 ${w.path}`);
  }

  console.log("\n下一步:");
  console.log("  npm run casual:economy:sync");
  console.log("  npm run casual:economy:balance");
  console.log("  cd src/convex/casualPlatform && npx convex dev --once");
  if (!cli.scaleVouchers) {
    console.log("  商店 DB: npx convex run service/shop/casualShopService:syncShopCatalogSkus");
  }
}

main();
