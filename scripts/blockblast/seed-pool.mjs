#!/usr/bin/env node
/**
 * Block Blast seed pool 便捷 CLI（与 scripts/solitaire/seed-pool.mjs 对齐）。
 * v3 推荐参数与流程：scripts/blockblast/README.md
 *
 *   npx tsx scripts/blockblast/seed-pool.mjs clean
 *   npx tsx scripts/blockblast/seed-pool.mjs create
 *   npx tsx scripts/blockblast/seed-pool.mjs create --resume
 *   npx tsx scripts/blockblast/seed-pool.mjs load
 *   npx tsx scripts/blockblast/seed-pool.mjs append
 *   npx tsx scripts/blockblast/seed-pool.mjs regen --seed blockblast-pool:v1:379 --sync
 *   npx tsx scripts/blockblast/seed-pool.mjs help
 *
 * 透传底层参数：命令后加 `--`，例如
 *   npx tsx scripts/blockblast/seed-pool.mjs create -- --count 100
 */
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { clearSeedPoolFully } from "../seed-catalog/run-convex-catalog.mjs";
import { CATALOG_GAME_TYPES } from "../seed-catalog/catalog-game-types.mjs";
import { loadPoolDefaults } from "./blockblast-pool-defaults.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

const DEFAULT_COUNT = 500;
const DEFAULT_ROLLOUTS = 24;
const DEFAULT_MATCH_SECONDS = 300;
/** v3 推荐：挑战与易上瘾平衡（见 scripts/blockblast/README.md） */
const DEFAULT_MIN_OPENING_MOVES = 42;
const DEFAULT_MAX_OPENING_MOVES = 112;
const DEFAULT_MIN_SCORE_P25 = 80;
const DEFAULT_MIN_SCORE_SPREAD = 95;
const DEFAULT_OVERSAMPLE_FACTOR = 15;
/** v3：matchSeconds=300 下池均 timeUp≈15% 的推荐缩放 */
const DEFAULT_THINK_TIME_SCALE = 1.5;
/** 拒绝 stuckRate 高于此值的 seed（0.85 ≈ 至少 15% timeUp） */
const DEFAULT_MAX_STUCK_RATE = 0.85;
const DEFAULT_MIN_ENTRIES = 0;
const DEFAULT_BATCH_SIZE = process.platform === "win32" ? 2 : 8;
const CATALOG_GAME_TYPE = CATALOG_GAME_TYPES.block_blast;

function usage(defaults) {
  const { policyVersion, poolVersion, outDir } = defaults;
  console.log(`Block Blast seed pool CLI

Usage:
  npx tsx scripts/blockblast/seed-pool.mjs <command> [options] [-- extra-args...]

Commands:
  clean     清空 casualPlatform seed pool（可选清本地 output）
  create    离线生成/续跑 index.json（generate-seed-pool.mjs）
  load      全量导入 casualPlatform（默认先 clean 再 import）
  append    增量导入 platform seed pool（仅 DB 中不存在的 seedId）
  regen     仅重算 rolloutSummaries（+ metrics）写回 index；--sync 同步 catalog rollout 子表
  help      显示本帮助

Defaults (from BLOCK_BLAST_POLICY_VERSION=${policyVersion}):
  poolVersion=${poolVersion}  out=${outDir}  matchSeconds=${DEFAULT_MATCH_SECONDS}

Common options (before --):
  --out <dir>             输出目录（默认 pool-${poolVersion}）
  --index <path>          index.json 路径
  --pool-version <v>      池版本（默认 ${poolVersion}）
  --count <n>             create：目标接纳条数（默认 ${DEFAULT_COUNT}）
  --rollouts <n>          create：每 seed rollout 数（默认 ${DEFAULT_ROLLOUTS}）
  --match-seconds <n>     create/regen：对局时间上限秒（默认 ${DEFAULT_MATCH_SECONDS}）
  --min-score-p25 <n>     create：最低 score P25（默认 ${DEFAULT_MIN_SCORE_P25}）
  --min-score-spread <n>  create：最低分数 spread（默认 ${DEFAULT_MIN_SCORE_SPREAD}）
  --min-opening-moves <n> create：最低 openingMoveCount（默认 ${DEFAULT_MIN_OPENING_MOVES}，透传 generate）
  --max-opening-moves <n> create：最高 openingMoveCount（默认 ${DEFAULT_MAX_OPENING_MOVES}，透传 generate）
  --oversample-factor <n> create：过采样倍数（默认 ${DEFAULT_OVERSAMPLE_FACTOR}）
  --think-time-scale <n> create/regen：模拟思考时间缩放（默认 ${DEFAULT_THINK_TIME_SCALE}）
  --max-stuck-rate <n>   create：拒绝 stuckRate 高于此值的 seed（默认 ${DEFAULT_MAX_STUCK_RATE}，0=关闭）
  --no-reject-collapsed   create：关闭 collapsed 布局拒绝
  --no-max-stuck-rate     create：关闭 stuckRate 过滤
  Sim think time fallback: blockBlastSimTime.ts BLOCK_BLAST_SIM_THINK_TIME_SCALE
  --min-entries <n>       load：finalize 最少条数（默认 0=index 实际条数）
  --batch-size <n>        load/append 批大小（默认 ${DEFAULT_BATCH_SIZE}）
  --no-clear              load 时不先 clean catalog
  --local                 clean 时同时删除本地 --out 目录
  --resume                create 断点续跑
  --index-only            不写 rolloutSummaries / 仅 metrics 导入
  --seed <seedId>         regen：只更新该 seed
  --sync                  regen：本地更新后 upsert catalog rollout 子表
  --all                   regen：index 内全部 seed（慎用，耗时长）

Examples:
  npm run blockblast:pool:create
  npm run blockblast:pool:create -- --resume
  npm run blockblast:pool:load
  npm run blockblast:pool:regen -- --seed blockblast-pool:v3:0 --sync
  npm run blockblast:pool:create -- --count 30
  文档: scripts/blockblast/README.md
`);
}

function splitPassthrough(argv) {
  const i = argv.indexOf("--");
  if (i === -1) return { flags: argv, extra: [] };
  return { flags: argv.slice(0, i), extra: argv.slice(i + 1) };
}

function parseCommon(flags, defaults) {
  const opts = {
    out: defaults.outDir,
    index: "",
    poolVersion: defaults.poolVersion,
    policyVersion: defaults.policyVersion,
    count: DEFAULT_COUNT,
    rollouts: DEFAULT_ROLLOUTS,
    matchSeconds: DEFAULT_MATCH_SECONDS,
    minScoreP25: DEFAULT_MIN_SCORE_P25,
    minScoreSpread: DEFAULT_MIN_SCORE_SPREAD,
    minOpeningMoves: DEFAULT_MIN_OPENING_MOVES,
    maxOpeningMoves: DEFAULT_MAX_OPENING_MOVES,
    oversampleFactor: DEFAULT_OVERSAMPLE_FACTOR,
    thinkTimeScale: DEFAULT_THINK_TIME_SCALE,
    maxStuckRate: DEFAULT_MAX_STUCK_RATE,
    rejectCollapsed: true,
    minEntries: DEFAULT_MIN_ENTRIES,
    batchSize: DEFAULT_BATCH_SIZE,
    clearFirst: true,
    local: false,
    resume: false,
    indexOnly: false,
    updateExisting: false,
    seedId: "",
    sync: false,
    regenAll: false,
  };
  let indexFromFlag = false;
  for (let i = 0; i < flags.length; i++) {
    const a = flags[i];
    const next = () => flags[++i];
    if (a === "--out") opts.out = path.resolve(next());
    else if (a === "--index") {
      opts.index = path.resolve(next());
      indexFromFlag = true;
    } else if (a === "--pool-version") opts.poolVersion = next();
    else if (a === "--count") opts.count = Number(next());
    else if (a === "--rollouts") opts.rollouts = Number(next());
    else if (a === "--match-seconds") opts.matchSeconds = Number(next());
    else if (a === "--min-score-p25") opts.minScoreP25 = Number(next());
    else if (a === "--min-score-spread") opts.minScoreSpread = Number(next());
    else if (a === "--min-opening-moves") opts.minOpeningMoves = Number(next());
    else if (a === "--max-opening-moves") opts.maxOpeningMoves = Number(next());
    else if (a === "--oversample-factor") opts.oversampleFactor = Number(next());
    else if (a === "--think-time-scale") opts.thinkTimeScale = Number(next());
    else if (a === "--max-stuck-rate") opts.maxStuckRate = Number(next());
    else if (a === "--no-max-stuck-rate") opts.maxStuckRate = 0;
    else if (a === "--no-reject-collapsed") opts.rejectCollapsed = false;
    else if (a === "--min-entries") opts.minEntries = Number(next());
    else if (a === "--batch-size") opts.batchSize = Number(next());
    else if (a === "--no-clear") opts.clearFirst = false;
    else if (a === "--local") opts.local = true;
    else if (a === "--resume") opts.resume = true;
    else if (a === "--index-only") opts.indexOnly = true;
    else if (a === "--update-existing") opts.updateExisting = true;
    else if (a === "--seed") opts.seedId = next();
    else if (a === "--sync") opts.sync = true;
    else if (a === "--all") opts.regenAll = true;
  }
  if (!indexFromFlag) {
    opts.index = path.join(opts.out, "index.json");
  }
  return opts;
}

async function readPoolVersionFromIndex(indexPath, fallback) {
  try {
    const raw = await readFile(indexPath, "utf8");
    const j = JSON.parse(raw);
    return j.poolVersion || fallback;
  } catch {
    return fallback;
  }
}

function runTsx(scriptName, args) {
  const script = path.isAbsolute(scriptName) ? scriptName : path.join(__dirname, scriptName);
  const result = spawnSync("npx", ["tsx", script, ...args], {
    cwd: repoRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

async function cmdClean(opts) {
  const poolVersion =
    opts.poolVersion || (await readPoolVersionFromIndex(opts.index, opts.poolVersion));
  console.log(`clean catalog pool gameType=${CATALOG_GAME_TYPE} poolVersion=${poolVersion}`);
  const res = await clearSeedPoolFully(CATALOG_GAME_TYPE, poolVersion);
  console.log(res);

  if (opts.local) {
    console.log(`clean local out=${opts.out}`);
    await rm(opts.out, { recursive: true, force: true });
    console.log("local output removed");
  }
}

function cmdCreate(opts, extra) {
  console.log(
    `create poolVersion=${opts.poolVersion} (policy ${opts.policyVersion}) out=${opts.out} matchSeconds=${opts.matchSeconds} thinkTimeScale=${opts.thinkTimeScale} maxStuckRate=${opts.maxStuckRate || "off"}`
  );
  const args = [
    "--version",
    opts.poolVersion,
    "--count",
    String(opts.count),
    "--rollouts",
    String(opts.rollouts),
    "--match-seconds",
    String(opts.matchSeconds),
    "--out",
    opts.out,
    "--write-rollout-summaries",
    "--min-score-p25",
    String(opts.minScoreP25),
    "--min-score-spread",
    String(opts.minScoreSpread),
    "--oversample-factor",
    String(opts.oversampleFactor),
    "--min-opening-moves",
    String(opts.minOpeningMoves),
    "--max-opening-moves",
    String(opts.maxOpeningMoves),
    "--think-time-scale",
    String(opts.thinkTimeScale),
    "--max-stuck-rate",
    String(opts.maxStuckRate),
  ];
  if (opts.rejectCollapsed) args.push("--reject-collapsed");
  if (opts.resume) args.push("--resume");
  if (opts.indexOnly) args.push("--index-only", "true");
  args.push(...extra);
  console.log("create → generate-seed-pool.mjs", args.join(" "));
  runTsx("generate-seed-pool.mjs", args);
}

function cmdRegen(opts, extra) {
  const args = ["--in", opts.out, "--match-seconds", String(opts.matchSeconds)];
  if (opts.thinkTimeScale > 0) {
    args.push("--think-time-scale", String(opts.thinkTimeScale));
  }
  if (opts.regenAll) args.push("--all");
  else if (opts.seedId) args.push("--seed", opts.seedId);
  else {
    console.error("regen requires --seed <seedId> or --all");
    process.exit(1);
  }
  if (opts.sync) args.push("--sync");
  if (opts.poolVersion) args.push("--pool-version", opts.poolVersion);
  args.push(...extra);
  console.log("regen → regen-rollout-summaries.mjs", args.join(" "));
  runTsx("regen-rollout-summaries.mjs", args);
}

function cmdLoad(opts, extra, { append = false } = {}) {
  const args = [
    "--game-type",
    CATALOG_GAME_TYPE,
    "--index",
    opts.index,
    "--pool-version",
    opts.poolVersion,
    "--batch-size",
    String(opts.batchSize),
    "--min-entries",
    String(opts.minEntries),
  ];
  if (opts.clearFirst && !append) args.push("--clear-first");
  if (append) {
    args.push("--append");
    if (opts.updateExisting) args.push("--update-existing");
  }
  if (opts.indexOnly) args.push("--index-only");
  args.push(...extra);
  console.log(`${append ? "append" : "load"} → seed-catalog/import-seed-pool.mjs`, args.join(" "));
  runTsx(path.join(repoRoot, "scripts/seed-catalog/import-seed-pool.mjs"), args);
}

async function main() {
  const defaults = await loadPoolDefaults(repoRoot);
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv[0] === "help" || argv[0] === "-h" || argv[0] === "--help") {
    usage(defaults);
    return;
  }

  const command = argv[0];
  const { flags, extra } = splitPassthrough(argv.slice(1));
  const opts = parseCommon(flags, defaults);

  switch (command) {
    case "clean":
      await cmdClean(opts);
      break;
    case "create":
      cmdCreate(opts, extra);
      break;
    case "load":
      cmdLoad(opts, extra, { append: false });
      break;
    case "append":
      opts.clearFirst = false;
      cmdLoad(opts, extra, { append: true });
      break;
    case "regen":
      cmdRegen(opts, extra);
      break;
    default:
      console.error(`unknown command: ${command}\n`);
      usage(defaults);
      process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
