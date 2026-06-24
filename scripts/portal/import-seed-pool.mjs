#!/usr/bin/env node
/**
 * Import seed catalog into Portal Convex (`src/convex/portal`).
 *
 *   npm run portal:seed-pool:import -- --game-type block_blast --index scripts/blockblast/output/pool-v3/index.json
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const script = path.join(repoRoot, "scripts/seed-catalog/import-seed-pool.mjs");
const env = {
  ...process.env,
  SEED_CATALOG_CONVEX_DIR: "src/convex/portal",
};
const result = spawnSync("npx", ["tsx", script, ...process.argv.slice(2)], {
  cwd: repoRoot,
  stdio: "inherit",
  shell: process.platform === "win32",
  env,
});
process.exit(result.status ?? 1);
