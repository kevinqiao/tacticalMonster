#!/usr/bin/env node
/**
 * 经济平衡一键闭环（优先画像：economy-tune.example.json · 8 局/日 · Pass ~12）。
 *
 *   npm run casual:economy:auto -- --config scripts/casual/economy-tune.example.json
 *   npm run casual:economy:auto -- --write
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const DEFAULT_CONFIG = join(__dirname, "economy-tune.example.json");

const NODE = process.execPath;

function parseArgs(argv) {
  const out = {
    config: DEFAULT_CONFIG,
    write: false,
    skipPass: false,
    skipWallet: false,
    skipGem: false,
    skipVoucher: false,
    skipCoins: false,
    applyProfile: "casual",
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--write") out.write = true;
    else if (a === "--dry-run") out.write = false;
    else if (a === "--config") out.config = argv[++i];
    else if (a === "--skip-pass") out.skipPass = true;
    else if (a === "--skip-wallet") out.skipWallet = true;
    else if (a === "--skip-gem") out.skipGem = true;
    else if (a === "--skip-voucher") out.skipVoucher = true;
    else if (a === "--skip-coins") out.skipCoins = true;
    else if (a === "--apply-profile") out.applyProfile = argv[++i];
    else if (a === "--help" || a === "-h") out.help = true;
  }
  return out;
}

function run(scriptName, args, { allowFail = false } = {}) {
  const script = join(__dirname, scriptName);
  console.log(`\n▶ node ${scriptName} ${args.join(" ")}`);
  try {
    const out = execFileSync(NODE, [script, ...args], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (out.trim()) process.stdout.write(out);
    return out;
  } catch (e) {
    if (allowFail && e.stdout) process.stdout.write(e.stdout);
    if (allowFail && e.stderr) process.stderr.write(e.stderr);
    if (!allowFail) throw e;
    return null;
  }
}

function runTuneJson(configPath) {
  const json = run("economy-tune.mjs", ["--config", configPath, "--json"]);
  return JSON.parse(json);
}

function allHealthOk(health) {
  return health && Object.values(health).every((v) => v === "ok");
}

function printHelp() {
  console.log(`
Casual 经济 · 一键调优闭环

默认画像: scripts/casual/economy-tune.example.json（8 局/日 · 前 8 场满额 · Pass ~12）

  npm run casual:economy:auto
  npm run casual:economy:auto -- --write
  npm run casual:economy:auto -- --config path.json --write

步骤（--write 时写运行时配表 + PROFILES.casual）：
  1. tune 诊断
  2. apply-tune（Pass 衰减 / seasonXpOnSettle）
  3. apply-wallet（A 底奖，仅金币不足时抬）
  4. apply-coins（p75 软顶/奖励 + A/B 底奖，金币偏高时降压）
  5. apply-gem（C 入场钻）
  6. apply-voucher（周任务券 + 专场券耗）
  7. sync 镜像
  8. balance --profile casual --fail 验收

选项：
  --config <json>       画像与锚点（默认 economy-tune.example.json）
  --write / --dry-run   是否写入配表（默认 dry-run）
  --skip-pass           跳过 apply-tune
  --skip-wallet         跳过 apply-wallet
  --skip-coins          跳过 apply-coins（金币降压）
  --skip-gem            跳过 apply-gem
  --skip-voucher        跳过 apply-voucher
  --apply-profile casual  同步画像到 PROFILES.casual（默认 casual）
`);
}

function main() {
  const cli = parseArgs(process.argv.slice(2));
  if (cli.help) {
    printHelp();
    return;
  }

  console.log("Casual 经济 auto");
  console.log("=".repeat(56));
  console.log(`配置: ${cli.config}`);
  console.log(`模式: ${cli.write ? "写入" : "dry-run"}`);
  console.log(`画像同步: PROFILES.${cli.applyProfile}`);

  const before = runTuneJson(cli.config);
  console.log("\n■ 调优前");
  printSnapshot(before);

  const tuneArgs = ["--config", cli.config];
  const applyTuneArgs = [
    ...tuneArgs,
    ...(cli.write ? ["--write"] : []),
    "--apply-profile",
    cli.applyProfile,
  ];

  if (!cli.skipPass) {
    run("economy-apply-tune.mjs", applyTuneArgs, { allowFail: true });
  }

  if (!cli.skipWallet) {
    const walletArgs = [...tuneArgs, ...(cli.write ? ["--write"] : [])];
    run("economy-apply-wallet.mjs", walletArgs, { allowFail: true });
  }

  if (!cli.skipCoins) {
    const coinsArgs = [...tuneArgs, ...(cli.write ? ["--write"] : [])];
    run("economy-apply-coins.mjs", coinsArgs, { allowFail: true });
  }

  if (!cli.skipGem) {
    const gemArgs = [...tuneArgs, ...(cli.write ? ["--write"] : [])];
    run("economy-apply-gem.mjs", gemArgs, { allowFail: true });
  }

  if (!cli.skipVoucher) {
    const voucherArgs = [...tuneArgs, ...(cli.write ? ["--write"] : [])];
    run("economy-apply-voucher.mjs", voucherArgs, { allowFail: true });
  }

  if (cli.write) {
    run("economy-sync.mjs", []);
  }

  const verifyProfile = cli.applyProfile === "custom" ? "casual" : cli.applyProfile;
  const balanceArgs = [
    "--profile",
    verifyProfile,
    "--config",
    cli.config,
    ...(cli.write ? ["--fail"] : []),
  ];

  if (cli.write) {
    run("economy-balance.mjs", balanceArgs, { allowFail: true });
    const after = runTuneJson(cli.config);
    console.log("\n■ 调优后（tune 复核）");
    printSnapshot(after);

    if (!allHealthOk(after.health)) {
      console.error("\n验收未通过：部分 health 非 ok。请查看上方 tune 复核或手调剩余旋钮。");
      process.exit(1);
    }
    console.log("\n✓ 四维 health 均为 ok");
    console.log("\n上线: cd src/convex/casualPlatform && npx convex dev --once");
  } else {
    console.log("\n以上为 dry-run 计划。确认后加 --write 执行写表 + sync + 验收。");
    console.log(
      "将执行: apply-tune → apply-wallet → apply-coins → apply-gem → apply-voucher → sync → balance --fail（以 PROFILES." +
        verifyProfile +
        " 验收）"
    );
  }
}

function printSnapshot(tune) {
  const c = tune.current ?? {};
  const h = tune.health ?? {};
  console.log(
    `  Pass 一季: ${c.passLevelsPerSeason} [${h.pass}] · coins 周净 ${c.netCoins} [${h.coins}]`
  );
  console.log(
    `  gems 周净 ${c.netGems} [${h.gems}] · 券周净 ${c.netVouchers} [${h.vouchers}]`
  );
}

main();
