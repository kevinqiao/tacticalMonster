#!/usr/bin/env node
/**
 * Bootstrap Portal seed pools for all games that have generated index.json in repo.
 *
 *   npm run op -- seeds bootstrap
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const importer = path.join(repoRoot, "scripts/portal/import-seed-pool.mjs");

const pools = [
  { gameType: "block_blast", index: "scripts/blockblast/output/pool-v3/index.json" },
  { gameType: "match_3", index: "scripts/match3/output/pool-v1/index.json" },
  { gameType: "tower_arena", index: "scripts/tower/output/pool-v1/index.json" },
  { gameType: "yatz", index: "scripts/yatz/output/pool-v1/index.json" },
  { gameType: "solitaire", index: "scripts/solitaire/output/pool-v6/index.json" },
];

const argv = process.argv.slice(2);
if (argv.some((a) => a === "help" || a === "-h" || a === "--help")) {
  console.log(`Usage:
  npm run op -- seeds bootstrap
  npm run portal:seed-pool:bootstrap

Imports all known game seed pools into Portal Convex (dev by default via importer).
Does not wipe player data.

Re-run / duplicates:
  Upserts by gameType+poolVersion+seedId — same seedId will not be duplicated.
  Does NOT --clear-first: entries removed from the index may linger in DB.
  Clean replace one game:
    npm run op -- seeds import --game=solitaire --clear-first
  Add-only (skip existing seedIds):
    npm run op -- seeds import --game=solitaire --append

Games:
${pools.map((p) => `  - ${p.gameType}  ← ${p.index}`).join("\n")}

Single game:
  npm run op -- seeds import --game=solitaire
  npm run op -- seeds help`);
  process.exit(0);
}

for (const { gameType, index } of pools) {
  console.log(`\n=== portal seed import: ${gameType} ===`);
  const result = spawnSync(
    "npx",
    ["tsx", importer, gameType, "--index", index],
    { cwd: repoRoot, stdio: "inherit", shell: process.platform === "win32" }
  );
  if (result.status !== 0) {
    console.error(`Failed importing ${gameType}`);
    process.exit(result.status ?? 1);
  }
}

console.log("\nPortal seed pools ready.");
