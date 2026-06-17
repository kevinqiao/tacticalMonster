#!/usr/bin/env node
/** Forwards to casualPlatform seed catalog import (`--game-type tower_arena`). */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const script = path.join(repoRoot, "scripts/seed-catalog/import-seed-pool.mjs");
const dir =
  (process.argv.includes("--dir") && process.argv[process.argv.indexOf("--dir") + 1]) ||
  path.join(path.dirname(fileURLToPath(import.meta.url)), "output", "pool-v1");
const extra = process.argv.slice(2).filter((a, i, arr) => {
  if (a === "--dir") return false;
  if (i > 0 && arr[i - 1] === "--dir") return false;
  return true;
});
const args = [
  "--game-type",
  "tower_arena",
  "--index",
  path.join(dir, "index.json"),
  ...extra,
];
const result = spawnSync("npx", ["tsx", script, ...args], {
  cwd: repoRoot,
  stdio: "inherit",
  shell: process.platform === "win32",
});
process.exit(result.status ?? 1);
