#!/usr/bin/env node
/**
 * Bootstrap Portal seed pools for all games that have generated index.json in repo.
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
];

for (const { gameType, index } of pools) {
  console.log(`\n=== portal seed import: ${gameType} ===`);
  const result = spawnSync(
    "npx",
    ["tsx", importer, "--game-type", gameType, "--index", index],
    { cwd: repoRoot, stdio: "inherit", shell: process.platform === "win32" }
  );
  if (result.status !== 0) {
    console.error(`Failed importing ${gameType}`);
    process.exit(result.status ?? 1);
  }
}

console.log("\nPortal seed pools ready.");
