#!/usr/bin/env node
/**
 * Tower seed pool CLI → casualPlatform seed catalog.
 */
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { CATALOG_GAME_TYPES } from "../seed-catalog/catalog-game-types.mjs";
import { clearSeedPoolFully } from "../seed-catalog/run-convex-catalog.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const CATALOG_GAME_TYPE = CATALOG_GAME_TYPES.tower_arena;
const DEFAULT_OUT = path.join(__dirname, "output/pool-v1");

function runTsx(script, args) {
  const scriptPath = path.isAbsolute(script) ? script : path.join(__dirname, script);
  const res = spawnSync("npx", ["tsx", scriptPath, ...args], {
    cwd: repoRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

function parseFlags(argv) {
  const opts = {
    out: DEFAULT_OUT,
    index: "",
    poolVersion: "v1",
    clearFirst: true,
    local: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === "--out") opts.out = path.resolve(next());
    else if (a === "--index") opts.index = path.resolve(next());
    else if (a === "--pool-version") opts.poolVersion = next();
    else if (a === "--no-clear") opts.clearFirst = false;
    else if (a === "--local") opts.local = true;
  }
  if (!opts.index) opts.index = path.join(opts.out, "index.json");
  return opts;
}

async function cmdClean(opts) {
  console.log(`clean catalog pool gameType=${CATALOG_GAME_TYPE} poolVersion=${opts.poolVersion}`);
  const res = await clearSeedPoolFully(CATALOG_GAME_TYPE, opts.poolVersion);
  console.log(res);
  if (opts.local) {
    await rm(opts.out, { recursive: true, force: true });
    console.log("local output removed");
  }
}

function cmdCreate(extra) {
  runTsx("generate-seed-pool.mjs", extra);
}

function cmdLoad(opts, extra) {
  const args = [
    "--game-type",
    CATALOG_GAME_TYPE,
    "--index",
    opts.index,
    "--pool-version",
    opts.poolVersion,
    ...extra,
  ];
  if (opts.clearFirst) args.push("--clear-first");
  runTsx(path.join(repoRoot, "scripts/seed-catalog/import-seed-pool.mjs"), args);
}

function usage() {
  console.log(`Tower seed pool CLI (casualPlatform)

  npx tsx scripts/tower/seed-pool.mjs create [--count 36]
  npx tsx scripts/tower/seed-pool.mjs load [--no-clear]
  npx tsx scripts/tower/seed-pool.mjs clean [--local]
`);
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv[0] === "help") {
    usage();
    return;
  }
  const cmd = argv[0];
  const dash = argv.indexOf("--");
  const flags = dash === -1 ? argv.slice(1) : argv.slice(1, dash);
  const extra = dash === -1 ? [] : argv.slice(dash + 1);
  const opts = parseFlags(flags);

  switch (cmd) {
    case "clean":
      await cmdClean(opts);
      break;
    case "create":
      cmdCreate(extra);
      break;
    case "load":
      await cmdLoad(opts, extra);
      break;
    default:
      console.error(`unknown command: ${cmd}`);
      usage();
      process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
