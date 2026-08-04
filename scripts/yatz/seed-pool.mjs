#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { CATALOG_GAME_TYPES } from "../seed-catalog/catalog-game-types.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const CATALOG_GAME_TYPE = CATALOG_GAME_TYPES.yatz;
const DEFAULT_INDEX = path.join(repoRoot, "scripts/yatz/output/pool-v2/index.json");

function runImport(args) {
  const script = path.join(repoRoot, "scripts/seed-catalog/import-seed-pool.mjs");
  const res = spawnSync("npx", ["tsx", script, ...args], {
    stdio: "inherit",
    cwd: repoRoot,
    shell: process.platform === "win32",
  });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

function runNode(script, extra = []) {
  const res = spawnSync(process.execPath, ["--import", "tsx", path.join(__dirname, script), ...extra], {
    stdio: "inherit",
    cwd: repoRoot,
  });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

const cmd = process.argv[2];
const rest = process.argv.slice(3);

async function main() {
  if (cmd === "create") {
    runNode("generate-seed-pool.mjs", rest);
  } else if (cmd === "load" || cmd === "append") {
    const clearFirst = cmd === "load" && !rest.includes("--no-clear");
    const poolVersion =
      (rest.includes("--pool-version") && rest[rest.indexOf("--pool-version") + 1]) || "v2";
    const index =
      (rest.includes("--index") && rest[rest.indexOf("--index") + 1]) || DEFAULT_INDEX;
    const importArgs = [
      "--game-type",
      CATALOG_GAME_TYPE,
      "--index",
      index,
      "--pool-version",
      poolVersion,
      ...rest.filter((x) => x !== "--no-clear"),
    ];
    if (cmd === "append") importArgs.push("--append");
    else if (clearFirst) importArgs.push("--clear-first");
    runImport(importArgs);
  } else if (cmd === "regen") {
    runNode("regen-rollout-summaries.mjs", rest);
  } else if (cmd === "help" || !cmd) {
    console.log(`Yatz seed pool CLI (casualPlatform)

  npx tsx scripts/yatz/seed-pool.mjs create [--count 50]
  npx tsx scripts/yatz/seed-pool.mjs regen --all [--sync]
  npx tsx scripts/yatz/seed-pool.mjs load [--no-clear] [--index path]
  npx tsx scripts/yatz/seed-pool.mjs append [--index path]
`);
  } else {
    console.error(`unknown command: ${cmd}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
