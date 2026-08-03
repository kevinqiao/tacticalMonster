#!/usr/bin/env node
/** Forwards to casualPlatform seed catalog import (`--game-type solitaire`). */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const script = path.join(repoRoot, "scripts/seed-catalog/import-seed-pool.mjs");
const args = ["--game-type", "solitaire", ...process.argv.slice(2)];
const result = spawnSync("npx", ["tsx", script, ...args], {
  cwd: repoRoot,
  stdio: "inherit",
  shell: process.platform === "win32",
});
process.exit(result.status ?? 1);
