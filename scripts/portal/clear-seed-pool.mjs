#!/usr/bin/env node
/**
 * Clear seed pools on Portal Convex.
 *
 *   npm run op -- seeds clear --game=solitaire --apply
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const script = path.join(repoRoot, "scripts/seed-catalog/clear-seed-pool.mjs");
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
