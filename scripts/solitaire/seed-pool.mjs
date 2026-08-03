#!/usr/bin/env node
/**
 * Seed pool 便捷 CLI：clean / create / load / append
 *
 *   npx tsx scripts/solitaire/seed-pool.mjs clean
 *   npx tsx scripts/solitaire/seed-pool.mjs create
 *   npx tsx scripts/solitaire/seed-pool.mjs create-casual
 *   npx tsx scripts/solitaire/seed-pool.mjs create --resume
 *   npx tsx scripts/solitaire/seed-pool.mjs load
 *   npx tsx scripts/solitaire/seed-pool.mjs append
 *   npx tsx scripts/solitaire/seed-pool.mjs regen --seed solitaire-pool:v2:379 --sync
 *   npx tsx scripts/solitaire/seed-pool.mjs help
 *
 * 透传底层参数：命令后加 `--`，例如
 *   npx tsx scripts/solitaire/seed-pool.mjs create -- --count 100
 */
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { clearSeedPoolFully } from "../seed-catalog/run-convex-catalog.mjs";
import { CATALOG_GAME_TYPES } from "../seed-catalog/catalog-game-types.mjs";
import { loadPoolDefaults } from "./solitaire-pool-defaults.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const DEFAULT_COUNT = 500;
const DEFAULT_ROLLOUTS = 40;
const DEFAULT_MIN_SCORE_P25 = 200;
const DEFAULT_MIN_SCORE_SPREAD = 100;
const DEFAULT_OVERSAMPLE_FACTOR = 2;
/** 休闲向 create-casual 预设（偏简单、开局可走、easy tier 占比更高） */
const CASUAL_MIN_SCORE_P25 = 700;
const CASUAL_MIN_SCORE_SPREAD = 650;
const CASUAL_OVERSAMPLE_FACTOR = 3;
const CASUAL_MIN_OPENING_MOVES = 4;
const CASUAL_TIER_EASY = 0.4;
const CASUAL_TIER_MEDIUM = 0.35;
const DEFAULT_MIN_ENTRIES = 0; // 0 = 自动使用 index 实际条数
const DEFAULT_BATCH_SIZE = process.platform === "win32" ? 2 : 8;
const CATALOG_GAME_TYPE = CATALOG_GAME_TYPES.solitaire;

function usage(defaults) {
  const { policyVersion, poolVersion, outDir } = defaults;
  console.log(`Solitaire seed pool CLI

Usage:
  npx tsx scripts/solitaire/seed-pool.mjs <command> [options] [-- extra-args...]

Commands:
  clean         清空 casualPlatform seed pool（可选清本地 output）
  create        离线生成/续跑 index.json（generate-seed-pool.mjs）
  create-casual 休闲向生成（更高 P25、min-opening-moves=2、3× 过采样、easy 40%）
  load          全量导入 casualPlatform（默认先 clean 再 import）
  append    增量导入 platform seed pool（仅 DB 中不存在的 seedId）
  regen     仅重算 rolloutSummaries（+ metrics）写回 index；--sync 同步 catalog rollout 子表
  help      显示本帮助

Defaults (from HUMAN_STOCHASTIC_POLICY_VERSION=${policyVersion}):
  poolVersion=${poolVersion}  out=${outDir}

Common options (before --):
  --out <dir>           输出目录（默认 pool-${poolVersion}）
  --index <path>        index.json 路径
  --pool-version <v>    池版本（默认 ${poolVersion}，随 policy 自动推导）
  --count <n>           create：目标接纳条数（默认 ${DEFAULT_COUNT}）
  --rollouts <n>        create：每 seed rollout 数（默认 ${DEFAULT_ROLLOUTS}）
  --min-score-p25 <n>   create：最低 score P25（默认 ${DEFAULT_MIN_SCORE_P25}）
  --min-score-spread <n> create：最低分数 spread（默认 ${DEFAULT_MIN_SCORE_SPREAD}）
  --oversample-factor <n> create：过采样倍数（默认 ${DEFAULT_OVERSAMPLE_FACTOR}）
  --no-reject-collapsed create：关闭 collapsed 布局拒绝
  --min-entries <n>     load：finalize 最少条数（默认 0=index 实际条数；显式设 500 可强制质量门槛）
  --batch-size <n>      load/append 批大小（默认 ${DEFAULT_BATCH_SIZE}，Windows 含 rollout 时建议 ≤2）
  --no-clear            load 时不先 clean catalog
  --local               clean 时同时删除本地 --out 目录
  --resume              create 断点续跑（等同 generate --resume；优先读 checkpoint.json）
  --checkpoint-every N  每 N 个 seed 原子写入 checkpoint.json（默认=progress-every）
  --index-only          不写 rolloutSummaries / 仅 metrics 导入
  --skip-solvability    create：跳过可解性搜索（透传 generate）
  --require-solvable    create：只接纳可解 seed（unknown/unsolvable 拒绝并继续扫描）
  --seed <seedId>       regen：只更新该 seed
  --sync                regen：本地更新后 upsert catalog rollout 子表
  --all                 regen：index 内全部 seed（慎用，耗时长）

Examples:
  npx tsx scripts/solitaire/seed-pool.mjs create
  npx tsx scripts/solitaire/seed-pool.mjs create-casual
  npx tsx scripts/solitaire/seed-pool.mjs create-casual --resume
  npx tsx scripts/solitaire/seed-pool.mjs create --resume
  npx tsx scripts/solitaire/seed-pool.mjs load
  npx tsx scripts/solitaire/seed-pool.mjs load --no-clear --min-entries 100
  npx tsx scripts/solitaire/seed-pool.mjs append
  npx tsx scripts/solitaire/seed-pool.mjs clean --local
`);
}

function splitPassthrough(argv) {
  const i = argv.indexOf("--");
  if (i === -1) return { flags: argv, extra: [] };
  return { flags: argv.slice(0, i), extra: argv.slice(i + 1) };
}

function argvHasFlag(flags, extra, name) {
  return flags.includes(name) || extra.includes(name);
}

function applyCasualCreatePreset(opts, flags, extra) {
  if (!flags.includes("--min-score-p25")) opts.minScoreP25 = CASUAL_MIN_SCORE_P25;
  if (!flags.includes("--min-score-spread")) opts.minScoreSpread = CASUAL_MIN_SCORE_SPREAD;
  if (!flags.includes("--oversample-factor")) opts.oversampleFactor = CASUAL_OVERSAMPLE_FACTOR;
}

function buildCasualGenerateExtra(flags, extra) {
  const preset = [];
  if (!argvHasFlag(flags, extra, "--min-opening-moves")) {
    preset.push("--min-opening-moves", String(CASUAL_MIN_OPENING_MOVES));
  }
  if (!argvHasFlag(flags, extra, "--tier-easy")) {
    preset.push("--tier-easy", String(CASUAL_TIER_EASY));
  }
  if (!argvHasFlag(flags, extra, "--tier-medium")) {
    preset.push("--tier-medium", String(CASUAL_TIER_MEDIUM));
  }
  return [...preset, ...extra];
}

function parseCommon(flags, defaults) {
  const opts = {
    out: defaults.outDir,
    index: "",
    poolVersion: defaults.poolVersion,
    policyVersion: defaults.policyVersion,
    count: DEFAULT_COUNT,
    rollouts: DEFAULT_ROLLOUTS,
    minScoreP25: DEFAULT_MIN_SCORE_P25,
    minScoreSpread: DEFAULT_MIN_SCORE_SPREAD,
    oversampleFactor: DEFAULT_OVERSAMPLE_FACTOR,
    rejectCollapsed: true,
    minEntries: DEFAULT_MIN_ENTRIES,
    batchSize: DEFAULT_BATCH_SIZE,
    clearFirst: true,
    local: false,
    resume: false,
    /** null = let generate default (same as progress-every) */
    checkpointEvery: null,
    indexOnly: false,
    updateExisting: false,
    skipSolvability: false,
    requireSolvable: false,
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
    else if (a === "--min-score-p25") opts.minScoreP25 = Number(next());
    else if (a === "--min-score-spread") opts.minScoreSpread = Number(next());
    else if (a === "--oversample-factor") opts.oversampleFactor = Number(next());
    else if (a === "--no-reject-collapsed") opts.rejectCollapsed = false;
    else if (a === "--min-entries") opts.minEntries = Number(next());
    else if (a === "--batch-size") opts.batchSize = Number(next());
    else if (a === "--no-clear") opts.clearFirst = false;
    else if (a === "--local") opts.local = true;
    else if (a === "--resume") opts.resume = true;
    else if (a === "--checkpoint-every") opts.checkpointEvery = Number(next());
    else if (a === "--index-only") opts.indexOnly = true;
    else if (a === "--skip-solvability") opts.skipSolvability = true;
    else if (a === "--require-solvable") opts.requireSolvable = true;
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
    `create poolVersion=${opts.poolVersion} (policy ${opts.policyVersion}) out=${opts.out}`
  );
  const args = [
    "--version",
    opts.poolVersion,
    "--count",
    String(opts.count),
    "--rollouts",
    String(opts.rollouts),
    "--out",
    opts.out,
    "--write-rollout-summaries",
    "--min-score-p25",
    String(opts.minScoreP25),
    "--min-score-spread",
    String(opts.minScoreSpread),
    "--oversample-factor",
    String(opts.oversampleFactor),
  ];
  if (opts.rejectCollapsed) args.push("--reject-collapsed");
  if (opts.resume) args.push("--resume");
  if (opts.checkpointEvery != null && Number.isFinite(opts.checkpointEvery)) {
    args.push("--checkpoint-every", String(opts.checkpointEvery));
  }
  if (opts.indexOnly) args.push("--index-only", "true");
  if (opts.requireSolvable) args.push("--require-solvable");
  else if (opts.skipSolvability) args.push("--skip-solvability");
  args.push(...extra);
  console.log("create → generate-seed-pool.mjs", args.join(" "));
  runTsx("generate-seed-pool.mjs", args);
}

function cmdRegen(opts, extra) {
  const args = ["--in", opts.out, "--match-seconds", String(300)];
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
    case "create-casual":
      applyCasualCreatePreset(opts, flags, extra);
      console.log(
        `create-casual preset: minScoreP25=${opts.minScoreP25} minScoreSpread=${opts.minScoreSpread} ` +
          `oversample=${opts.oversampleFactor} minOpeningMoves=${CASUAL_MIN_OPENING_MOVES} ` +
          `tierEasy=${CASUAL_TIER_EASY} tierMedium=${CASUAL_TIER_MEDIUM}`
      );
      cmdCreate(opts, buildCasualGenerateExtra(flags, extra));
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
